"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";

/**
 * Full-screen purple overlay that performs a circular wipe reveal
 * when the user arrives at the dashboard after login.
 * It checks for a sessionStorage flag set during login flow.
 */
export function DashboardReveal() {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shouldReveal = sessionStorage.getItem("cat_reveal_dashboard");
    if (!shouldReveal) return;

    sessionStorage.removeItem("cat_reveal_dashboard");

    const overlay = overlayRef.current;
    if (!overlay) return;

    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Make overlay visible
    overlay.style.visibility = "visible";
    overlay.style.opacity = "1";

    if (prefersReduced) {
      gsap.to(overlay, {
        autoAlpha: 0,
        duration: 0.4,
        onComplete: () => {
          overlay.style.display = "none";
        },
      });
      return;
    }

    // Circular wipe shrink from center to reveal dashboard
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.35;
    const maxRadius = Math.hypot(
      Math.max(cx, window.innerWidth - cx),
      Math.max(cy, window.innerHeight - cy)
    );

    // Start fully covering, then shrink the circle to reveal
    overlay.style.clipPath = `circle(${maxRadius * 1.35}px at ${cx}px ${cy}px)`;

    gsap.to(overlay, {
      clipPath: `circle(0px at ${cx}px ${cy}px)`,
      duration: 0.72,
      ease: "power3.inOut",
      delay: 0.1,
      onComplete: () => {
        overlay.style.display = "none";
      },
    });
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] pointer-events-none"
      style={{
        background: "#8F6AE0",
        visibility: "hidden",
        opacity: 0,
      }}
      aria-hidden="true"
    />
  );
}
