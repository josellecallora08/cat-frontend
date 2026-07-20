"use client";

import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

export interface FilterTab {
  value: string;
  label: string;
}

interface FilterTabsProps {
  /** Available filter options */
  tabs: FilterTab[];
  /** Currently active filter value */
  activeTab: string;
  /** Callback when a tab is selected */
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Generic filter tabs with animated sliding pill indicator.
 *
 * Provides a consistent, accessible tab-filter pattern with a gsap-animated
 * active indicator that slides between tabs. Respects prefers-reduced-motion.
 */
export function FilterTabs({ tabs, activeTab, onChange, className }: FilterTabsProps) {
  const tablistRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const movePill = useCallback(
    (animate: boolean) => {
      const el = tabRefs.current[activeTab];
      const pill = pillRef.current;
      const list = tablistRef.current;
      if (!el || !pill || !list) return;

      const listBox = list.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      gsap.to(pill, {
        left: box.left - listBox.left,
        top: box.top - listBox.top,
        width: box.width,
        height: box.height,
        opacity: 1,
        duration: animate && !prefersReduced ? 0.4 : 0,
        ease: "power3.out",
      });
    },
    [activeTab],
  );

  // Position pill on mount
  useEffect(() => {
    movePill(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate pill when active tab changes
  useEffect(() => {
    movePill(true);
  }, [activeTab, movePill]);

  // Reposition on resize
  useEffect(() => {
    const onResize = () => movePill(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [movePill]);

  return (
    <div
      ref={tablistRef}
      role="tablist"
      aria-label="Filter options"
      className={cn(
        "relative flex flex-wrap items-center gap-1 rounded-xl bg-muted p-1",
        className,
      )}
    >
      {/* Animated pill indicator */}
      <span
        ref={pillRef}
        aria-hidden="true"
        className="absolute rounded-lg bg-background shadow-sm"
        style={{ left: 0, width: 0, height: 0, opacity: 0 }}
      />

      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              tabRefs.current[tab.value] = el;
            }}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative z-10 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
