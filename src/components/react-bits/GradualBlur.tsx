"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  type CSSProperties,
} from "react";

type Position = "top" | "bottom" | "left" | "right";
type Curve = "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";
type Target = "parent" | "page";

interface GradualBlurProps {
  position?: Position;
  strength?: number;
  height?: string;
  width?: string;
  divCount?: number;
  exponential?: boolean;
  zIndex?: number;
  animated?: boolean | "scroll";
  duration?: string;
  easing?: string;
  opacity?: number;
  curve?: Curve;
  responsive?: boolean;
  target?: Target;
  className?: string;
  style?: CSSProperties;
  hoverIntensity?: number;
  preset?: string;
  onAnimationComplete?: () => void;
}

const DEFAULT_CONFIG: Required<
  Pick<
    GradualBlurProps,
    | "position"
    | "strength"
    | "height"
    | "divCount"
    | "exponential"
    | "zIndex"
    | "animated"
    | "duration"
    | "easing"
    | "opacity"
    | "curve"
    | "responsive"
    | "target"
    | "className"
    | "style"
  >
> = {
  position: "bottom",
  strength: 2,
  height: "6rem",
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: "0.3s",
  easing: "ease-out",
  opacity: 1,
  curve: "linear",
  responsive: false,
  target: "parent",
  className: "",
  style: {},
};

const CURVE_FUNCTIONS: Record<Curve, (p: number) => number> = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  "ease-in": (p) => p * p,
  "ease-out": (p) => 1 - Math.pow(1 - p, 2),
  "ease-in-out": (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
};

const getGradientDirection = (position: Position): string =>
  ({
    top: "to top",
    bottom: "to bottom",
    left: "to left",
    right: "to right",
  })[position] || "to bottom";

function GradualBlur(props: GradualBlurProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const config = useMemo(
    () => ({ ...DEFAULT_CONFIG, ...props }),
    [props]
  ) as Required<GradualBlurProps>;

  const blurDivs = useMemo(() => {
    const divs: React.ReactNode[] = [];
    const increment = 100 / config.divCount;
    const currentStrength =
      isHovered && config.hoverIntensity
        ? config.strength * config.hoverIntensity
        : config.strength;
    const curveFunc = CURVE_FUNCTIONS[config.curve] || CURVE_FUNCTIONS.linear;

    for (let i = 1; i <= config.divCount; i++) {
      let progress = i / config.divCount;
      progress = curveFunc(progress);

      let blurValue: number;
      if (config.exponential) {
        blurValue = Math.pow(2, progress * 4) * 0.0625 * currentStrength;
      } else {
        blurValue = 0.0625 * (progress * config.divCount + 1) * currentStrength;
      }

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      const direction = getGradientDirection(config.position);
      const divStyle: CSSProperties = {
        position: "absolute",
        inset: 0,
        maskImage: `linear-gradient(${direction}, ${gradient})`,
        WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
        backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        opacity: config.opacity,
      };
      divs.push(<div key={i} style={divStyle} />);
    }
    return divs;
  }, [config, isHovered]);

  const containerStyle = useMemo<CSSProperties>(() => {
    const isVertical = ["top", "bottom"].includes(config.position);
    const isHorizontal = ["left", "right"].includes(config.position);
    const isPageTarget = config.target === "page";

    const baseStyle: CSSProperties = {
      position: isPageTarget ? "fixed" : "absolute",
      pointerEvents: "none",
      zIndex: isPageTarget ? config.zIndex + 100 : config.zIndex,
      ...config.style,
    };

    if (isVertical) {
      baseStyle.height = config.height;
      baseStyle.width = config.width || "100%";
      (baseStyle as Record<string, unknown>)[config.position] = 0;
      baseStyle.left = 0;
      baseStyle.right = 0;
    } else if (isHorizontal) {
      baseStyle.width = config.width || config.height;
      baseStyle.height = "100%";
      (baseStyle as Record<string, unknown>)[config.position] = 0;
      baseStyle.top = 0;
      baseStyle.bottom = 0;
    }
    return baseStyle;
  }, [config]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleId = "gradual-blur-styles";
    if (document.getElementById(styleId)) return;
    const styleElement = document.createElement("style");
    styleElement.id = styleId;
    styleElement.textContent = `
      .gradual-blur { pointer-events: none; isolation: isolate; }
      .gradual-blur-parent { overflow: hidden; }
      .gradual-blur-inner { pointer-events: none; position: relative; width: 100%; height: 100%; }
      .gradual-blur-inner > div { -webkit-backdrop-filter: inherit; backdrop-filter: inherit; }
    `;
    document.head.appendChild(styleElement);
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`gradual-blur ${
        config.target === "page" ? "gradual-blur-page" : "gradual-blur-parent"
      } ${config.className}`}
      style={containerStyle}
      onMouseEnter={config.hoverIntensity ? () => setIsHovered(true) : undefined}
      onMouseLeave={config.hoverIntensity ? () => setIsHovered(false) : undefined}
    >
      <div className="gradual-blur-inner">{blurDivs}</div>
    </div>
  );
}

const GradualBlurMemo = React.memo(GradualBlur);
GradualBlurMemo.displayName = "GradualBlur";

export default GradualBlurMemo;
