"use client";

import { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { CatMascotSvg } from "./CatMascotSvg";

interface MascotLoaderProps {
  onComplete: () => void;
  /** Minimum display time in ms before allowing completion */
  minDuration?: number;
  /** Primary shimmer text under the mascot */
  text?: string;
  /** Optional subtitle shown below the primary text */
  subtitle?: string;
  /** Exit transition: "circle" expands a purple takeover; "fade" simply fades out */
  transition?: "circle" | "fade";
}

const whiskerShapes = [
  { target: ".wave-right-top", base: "M33.75 23.05C35.05 22.86 36.15 22.55 37.35 22.35", crest: "M33.75 23.05C35.05 23.28 36.1 21.95 37.35 22.35", trough: "M33.75 23.05C35.0 22.3 36.1 23.08 37.35 22.35" },
  { target: ".wave-left-top", base: "M10.75 23.05C9.45 22.86 8.2 22.55 6.95 22.32", crest: "M10.75 23.05C9.45 23.28 8.25 21.95 6.95 22.32", trough: "M10.75 23.05C9.55 22.3 8.2 23.08 6.95 22.32" },
  { target: ".wave-left-mid", base: "M10.55 24.45C9.28 24.56 8.18 24.78 7.05 24.95", crest: "M10.55 24.45C9.22 24.08 8.25 25.28 7.05 24.95", trough: "M10.55 24.45C9.26 24.98 8.2 24.28 7.05 24.95" },
  { target: ".wave-right-mid", base: "M33.75 24.45C35.05 24.56 36.18 24.78 37.45 24.98", crest: "M33.75 24.45C35.0 24.08 36.12 25.28 37.45 24.98", trough: "M33.75 24.45C35.02 24.98 36.18 24.28 37.45 24.98" },
  { target: ".wave-right-low", base: "M33.65 25.95C34.85 26.25 36.0 26.72 37.05 27.12", crest: "M33.65 25.95C34.78 26.85 35.98 26.18 37.05 27.12", trough: "M33.65 25.95C34.9 25.72 36.0 27.18 37.05 27.12" },
  { target: ".wave-left-low", base: "M10.65 25.95C9.45 26.25 8.38 26.72 7.35 27.12", crest: "M10.65 25.95C9.45 26.85 8.38 26.18 7.35 27.12", trough: "M10.65 25.95C9.42 25.72 8.38 27.18 7.35 27.12" },
];

export function MascotLoader({
  onComplete,
  minDuration = 2400,
  text = "Purring",
  subtitle,
  transition = "circle",
}: MascotLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const takeoverRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const startTimeRef = useRef(Date.now());
  const completedRef = useRef(false);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Build mascot idle animation — matching the HTML prototype exactly
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const fill = container.querySelector(".logo-fill") as SVGElement | null;
    const face = container.querySelector(".face-detail") as SVGElement | null;
    const waveWhiskerEls = container.querySelectorAll(".wave-whisker");
    const glareBarEls = container.querySelectorAll(".glare-bars");

    if (!fill || !face) return;

    if (prefersReduced) {
      const tl = gsap.timeline({ repeat: -1, yoyo: true });
      tl.to(fill, { opacity: 0.92, duration: 1.8, ease: "sine.inOut" });
      timelineRef.current = tl;
      return () => { tl.kill(); };
    }

    // Set transform origins matching the HTML prototype's CSS
    gsap.set(fill, { transformOrigin: "50% 58%", transformBox: "fill-box" });
    gsap.set(face, { transformOrigin: "50% 52%", transformBox: "fill-box" });
    gsap.set(waveWhiskerEls, { transformOrigin: "50% 50%", transformBox: "fill-box" });
    gsap.set(glareBarEls, { x: -6, y: -4 });

    // Reset whisker paths to base
    whiskerShapes.forEach(({ target, base }) => {
      const el = container.querySelector(target);
      if (el) el.setAttribute("d", base);
    });

    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 0.38,
      defaults: { ease: "sine.inOut" },
    });

    // Squash down
    tl.to(fill, {
      scaleX: 1.035,
      scaleY: 0.965,
      y: 1.1,
      duration: 0.22,
    });

    // Bounce up
    tl.to(fill, {
      scaleX: 0.985,
      scaleY: 1.028,
      y: -2,
      duration: 0.32,
      ease: "power2.out",
    });

    tl.to(face, {
      y: -0.65,
      duration: 0.28,
      ease: "power2.out",
    }, "<0.04");

    // Glare sweep
    tl.fromTo(glareBarEls,
      { x: -6, y: -4 },
      { x: 6, y: 4, duration: 0.78, stagger: 0.06, ease: "power1.inOut" },
      0.02
    );

    // Whisker wave — animate each whisker individually (crest)
    const whiskerCrestStart = tl.duration();
    whiskerShapes.forEach(({ target, crest }, i) => {
      const el = container.querySelector(target);
      if (el) {
        tl.to(el, { attr: { d: crest }, duration: 0.2, ease: "sine.inOut" }, whiskerCrestStart + i * 0.035);
      }
    });

    // Whisker wave — trough
    const whiskerTroughStart = tl.duration() - 0.1;
    whiskerShapes.forEach(({ target, trough }, i) => {
      const el = container.querySelector(target);
      if (el) {
        tl.to(el, { attr: { d: trough }, duration: 0.2, ease: "sine.inOut" }, whiskerTroughStart + i * 0.035);
      }
    });

    // Whisker wave — back to base
    const whiskerBaseStart = tl.duration() - 0.08;
    whiskerShapes.forEach(({ target, base }, i) => {
      const el = container.querySelector(target);
      if (el) {
        tl.to(el, { attr: { d: base }, duration: 0.24, ease: "sine.out" }, whiskerBaseStart + i * 0.025);
      }
    });

    // Settle / breathing
    tl.to(fill, {
      scaleX: 1.012,
      scaleY: 0.992,
      y: -0.35,
      duration: 0.34,
      ease: "sine.inOut",
    }, "+=0.08");

    tl.to(face, {
      y: 0.45,
      scaleY: 0.985,
      duration: 0.12,
      repeat: 1,
      yoyo: true,
      ease: "sine.inOut",
    }, "<");

    // Reset to neutral
    tl.to(fill, {
      scaleX: 1,
      scaleY: 1,
      y: 0,
      duration: 0.48,
      ease: "elastic.out(1, 0.45)",
    }, "+=0.08");

    tl.to([face, waveWhiskerEls], {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 0.34,
      ease: "sine.out",
    }, "<0.02");

    timelineRef.current = tl;
    return () => { tl.kill(); };
  }, [prefersReduced]);

  // Auto-complete after minDuration
  useEffect(() => {
    const timer = setTimeout(() => {
      completeLoading();
    }, minDuration);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDuration]);

  const completeLoading = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, minDuration - elapsed);

    setTimeout(() => {
      if (timelineRef.current) timelineRef.current.pause();
      playTransition();
    }, remaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playTransition = useCallback(() => {
    const container = containerRef.current;
    const takeover = takeoverRef.current;
    if (!container) {
      onComplete();
      return;
    }

    // Simple fade-out (no expanding circle) — used for the pre-login intro
    if (transition === "fade") {
      if (prefersReduced) {
        gsap.to(container, { autoAlpha: 0, duration: 0.4, onComplete });
        return;
      }
      gsap
        .timeline({ defaults: { ease: "power2.inOut" } })
        .to(container.querySelector(".loading-text-group"), {
          autoAlpha: 0,
          y: 8,
          duration: 0.28,
          ease: "sine.out",
        })
        .to(
          container.querySelector(".cat-mascot-svg"),
          { scale: 1.06, y: -4, duration: 0.24, ease: "power2.out" },
          "<"
        )
        .to(container, { autoAlpha: 0, duration: 0.4, ease: "sine.out" }, "-=0.05")
        .call(() => onComplete());
      return;
    }

    if (!takeover) {
      onComplete();
      return;
    }

    const logo = container.querySelector(".cat-mascot-svg") as HTMLElement | null;
    if (!logo) {
      onComplete();
      return;
    }

    const svgEl = logo.querySelector("svg");
    const logoBox = (svgEl ?? logo).getBoundingClientRect();
    const centerX = logoBox.left + logoBox.width / 2;
    const centerY = logoBox.top + logoBox.height / 2;
    const maxRadius = Math.hypot(
      Math.max(centerX, window.innerWidth - centerX),
      Math.max(centerY, window.innerHeight - centerY)
    );
    const takeoverSize = 40;
    const takeoverScale = (maxRadius * 2.25) / takeoverSize;

    // Position takeover circle at cat center, BEHIND the cat (z-index 3 vs cat at z-index 4)
    gsap.set(takeover, {
      left: centerX,
      top: centerY,
      scale: 0,
      autoAlpha: 1,
    });

    if (prefersReduced) {
      gsap.to(container, { autoAlpha: 0, duration: 0.4, onComplete });
      return;
    }

    // The loading-stage stays at z-60, takeover is z-59 (behind)
    // Cat details remain visible as the purple expands behind them
    gsap.timeline({ defaults: { ease: "power3.inOut" } })
      // Fade out the "Purring" text
      .to(container.querySelector(".loading-text"), {
        autoAlpha: 0,
        y: 8,
        duration: 0.22,
        ease: "sine.out",
      })
      // Slight scale up on the mascot
      .to(logo, {
        scale: 1.08,
        y: -4,
        filter: "drop-shadow(0 0 0 rgba(0,0,0,0))",
        duration: 0.18,
        ease: "power2.out",
      }, "<")
      // Expand the purple circle from behind the cat
      .to(takeover, { scale: takeoverScale, duration: 0.78 }, "-=0.02")
      // Fade out the entire loading stage (cat fades AFTER takeover covers most of screen)
      .to(container, { autoAlpha: 0, duration: 0.32, ease: "sine.out" }, "-=0.06")
      .call(() => onComplete());
  }, [onComplete, prefersReduced, transition]);

  return (
    <>
      {/* Background gradient layer */}
      <div
        className="fixed inset-0 z-[57]"
        style={{ background: "linear-gradient(180deg, #8F6AE0 0%, #FFFFFF 100%)" }}
        aria-hidden="true"
      />

      {/* Purple takeover circle — only used by the "circle" exit transition */}
      {transition === "circle" && (
        <div
          ref={takeoverRef}
          className="fixed w-10 h-10 rounded-full bg-[#8F6AE0] z-[58] opacity-0 pointer-events-none -translate-x-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
      )}

      {/* Cat + text layer — sits in front of takeover so cat details stay visible */}
      <div
        ref={containerRef}
        className="fixed inset-0 z-[60] grid place-items-center pointer-events-none"
        aria-label="Loading"
      >
        <div className="w-[min(34vw,200px)] min-w-[100px] grid place-items-center gap-[16px]">
          <div className="cat-mascot-svg relative z-[2] w-full h-auto overflow-visible">
            <CatMascotSvg id="loader" className="w-full h-auto" />
          </div>
          <div className="loading-text-group relative z-[2] grid place-items-center gap-1 text-center">
            <p
              className="loading-text m-0 whitespace-nowrap text-[clamp(20px,3.4vw,30px)] font-extrabold leading-[1.2] text-[#2B2339] px-[2px]"
              data-text={text}
              style={{
                fontFamily: '"SF Compact Rounded", "SF Pro Rounded", ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif',
              }}
            >
              {text}
            </p>
            {subtitle && (
              <p
                className="m-0 text-[clamp(10px,1.7vw,13px)] font-medium leading-[1.4] text-[#2B2339]/70 px-2"
                style={{
                  fontFamily: '"SF Compact Rounded", "SF Pro Rounded", ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Shimmer animation styles */}
      <style jsx>{`
        .loading-text::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          padding: inherit;
          color: #8f6ae0;
          -webkit-text-fill-color: #8f6ae0;
          mask-image: linear-gradient(105deg, transparent 0%, #000 42%, #000 58%, transparent 100%);
          -webkit-mask-image: linear-gradient(105deg, transparent 0%, #000 42%, #000 58%, transparent 100%);
          mask-repeat: no-repeat;
          -webkit-mask-repeat: no-repeat;
          mask-size: 56px 100%;
          -webkit-mask-size: 56px 100%;
          animation: text-shimmer 1.35s linear infinite;
          pointer-events: none;
        }
        @keyframes text-shimmer {
          0% { mask-position: -64px 0; -webkit-mask-position: -64px 0; }
          100% { mask-position: calc(100% + 64px) 0; -webkit-mask-position: calc(100% + 64px) 0; }
        }
      `}</style>
    </>
  );
}
