"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type SpringOptions,
} from "motion/react";
import {
  Children,
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
} from "react";
import "./Dock.css";

export interface DockItemData {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
  active?: boolean;
}

interface DockProps {
  items: DockItemData[];
  className?: string;
  spring?: SpringOptions;
  magnification?: number;
  distance?: number;
  panelHeight?: number;
  dockHeight?: number;
  baseItemSize?: number;
}

interface DockItemProps {
  children: ReactNode;
  className?: string;
  onClick: () => void;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  spring: SpringOptions;
  distance: number;
  magnification: number;
  baseItemSize: number;
  active?: boolean;
}

function DockItem({
  children,
  className = "",
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  active,
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize,
    };
    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  );

  const size = useSpring(targetSize, spring);

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item ${active ? "active" : ""} ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
    >
      {Children.map(children, (child) =>
        cloneElement(child as ReactElement<{ isHovered?: typeof isHovered }>, {
          isHovered,
        })
      )}
    </motion.div>
  );
}

function DockLabel({
  children,
  className = "",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  isHovered?: ReturnType<typeof useMotionValue<number>>;
}) {
  const { isHovered } = rest as {
    isHovered: ReturnType<typeof useMotionValue<number>>;
  };
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const unsubscribe = isHovered.on("change", (latest) => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`dock-label ${className}`}
          role="tooltip"
          style={{ x: "-50%" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
  isHovered?: unknown;
}) {
  return <div className={`dock-icon ${className}`}>{children}</div>;
}

export default function Dock({
  items,
  className = "",
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  baseItemSize = 50,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);

  // Fixed outer height large enough for the magnified items so the
  // layout never reflows (prevents the up/down hover glitch).
  const outerHeight = Math.max(magnification, panelHeight) + 24;

  return (
    <div
      style={{ height: outerHeight, scrollbarWidth: "none" }}
      className="dock-outer"
    >
      <motion.div
        onMouseMove={({ pageX }) => {
          mouseX.set(pageX);
        }}
        onMouseLeave={() => {
          mouseX.set(Infinity);
        }}
        className={`dock-panel ${className}`}
        style={{ minHeight: panelHeight }}
        role="toolbar"
        aria-label="Application dock"
      >
        {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            active={item.active}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </div>
  );
}
