"use client";

import { useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";

/**
 * Full-screen purple overlay that performs a circular wipe reveal
 * only on hard page load (browser refresh / initial load).
 * Does NOT trigger on client-side navigation or tab switches.
 */
export function DashboardReveal() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const hasPlayed = useRef(false);

  useEffect(() => {
    // Don't play on login page
    if (pathname === "/login") return;

    // Only play once per hard page load
    if (hasPlayed.current) return;
    hasPlayed.current = true;

    const overlay = overlayRef.current;
    if (!overlay) return;

    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Make overlay visible
    overlay.style.display = "block";
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

    // Circular wipe shrink from center to reveal page
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
      delay: 0.15,
      onComplete: () => {
        overlay.style.display = "none";
      },
    });
  }, [pathname]);

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
