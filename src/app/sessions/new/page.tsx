"use client";

import React, {
  Suspense,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/session-store";
import { Button } from "@/components/ui/button";
import { AlertCircle, PhoneOff, Mic, Phone } from "lucide-react";
import gsap from "gsap";
import { Portal } from "@/components/portal";

// ---------------------------------------------------------------------------
// Proper telephone ring tone (PH/EU standard: 400Hz, 0.4s+0.4s on, 2s off)
// ---------------------------------------------------------------------------
function useRingTone(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
  }, []);

  const play = useCallback(() => {
    stop();
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      runningRef.current = true;

      // Philippine telephone ring: 400 Hz tone, two 0.4s bursts, 2s silence
      const burst = (startAt: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = 400;
        // Smooth envelope to avoid clicks
        gain.gain.setValueAtTime(0, startAt);
        gain.gain.linearRampToValueAtTime(0.22, startAt + 0.02);
        gain.gain.setValueAtTime(0.22, startAt + dur - 0.02);
        gain.gain.linearRampToValueAtTime(0, startAt + dur);
        osc.start(startAt);
        osc.stop(startAt + dur);
      };

      const scheduleRing = () => {
        if (!runningRef.current || !ctxRef.current) return;
        const now = ctxRef.current.currentTime;
        burst(now + 0.05, 0.4);        // first burst
        burst(now + 0.55, 0.4);        // second burst
        // Repeat every 3s (0.4 + gap + 0.4 + 2s silence)
        timerRef.current = setTimeout(scheduleRing, 3000);
      };

      scheduleRing();
    } catch {
      /* Web Audio unavailable */
    }
  }, [stop]);

  useEffect(() => {
    if (active) play();
    else stop();
    return stop;
  }, [active, play, stop]);
}

// ---------------------------------------------------------------------------
// Ringing screen with GSAP animations
// ---------------------------------------------------------------------------
interface RingingScreenHandle {
  exit: (mode?: "answered" | "cancel") => Promise<void>;
}

const RingingScreen = React.forwardRef<
  RingingScreenHandle,
  {
    debtorName?: string;
    status: "ringing" | "connecting";
    phase: "calling" | "ringing";
    onCancel: () => void;
  }
>(function RingingScreen({ debtorName, status, phase, onCancel }, ref) {
  useRingTone(status === "ringing");

  const containerRef = useRef<HTMLDivElement>(null);
  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);
  const ring3Ref = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const phoneIconRef = useRef<HTMLDivElement>(null);
  const bounceDotsRef = useRef<HTMLDivElement>(null);

  // The Portal returns null on its first render, so the phone-frame elements
  // (and their refs) aren't in the DOM yet. We flip `ready` after mount so the
  // GSAP entrance animations run once the refs are actually attached — without
  // this, every element stays stuck at opacity:0 and the phone renders blank.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  // Expose exit via ref — two modes: answered (green flash then fade) or cancel (just fade)
  React.useImperativeHandle(ref, () => ({
    exit: (mode: "answered" | "cancel" = "cancel") =>
      new Promise<void>((resolve) => {
        if (mode === "answered" && avatarRef.current && statusRef.current) {
          // Flash avatar green + show "Connected"
          const tl = gsap.timeline({ onComplete: resolve });
          tl.to(ring1Ref.current, { opacity: 0, duration: 0.3 }, 0)
            .to(ring2Ref.current, { opacity: 0, duration: 0.3 }, 0)
            .to(ring3Ref.current, { opacity: 0, duration: 0.3 }, 0)
            .to(avatarRef.current, {
              backgroundColor: "#1f7a45",
              scale: 1.12,
              boxShadow: "0 0 0 8px rgba(31,122,69,0.25), 0 20px 60px rgba(31,122,69,0.4)",
              duration: 0.35,
              ease: "back.out(1.5)",
            }, 0.1)
            .to(avatarRef.current, { scale: 1, duration: 0.25, ease: "power2.out" }, 0.45)
            .set(statusRef.current, { innerHTML: "Connected ✓" })
            .to(containerRef.current, { opacity: 0, scale: 0.96, duration: 0.45, ease: "power2.in" }, 0.9);
        } else {
          gsap.to(containerRef.current, {
            opacity: 0,
            scale: 0.95,
            duration: 0.4,
            ease: "power2.in",
            onComplete: resolve,
          });
        }
      }),
  }));

  // Entrance animation — useEffect so Portal DOM is ready (guards all null refs)
  useEffect(() => {
    if (
      !containerRef.current || !avatarRef.current ||
      !nameRef.current || !statusRef.current || !btnRef.current
    ) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power2.out" }
      );
      gsap.fromTo(
        avatarRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(2)", delay: 0.15 }
      );
      gsap.fromTo(
        [statusRef.current, nameRef.current].filter(Boolean),
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.1, delay: 0.35 }
      );
      gsap.fromTo(
        btnRef.current,
        { scale: 0.85, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)", delay: 0.55 }
      );

      const rings = [ring1Ref.current, ring2Ref.current, ring3Ref.current].filter(Boolean);
      rings.forEach((ring, i) => {
        gsap.fromTo(
          ring,
          { scale: 0.7, opacity: 0.4 },
          {
            scale: 2.6,
            opacity: 0,
            duration: 2,
            ease: "power1.out",
            delay: i * 0.55,
            repeat: -1,
            repeatDelay: 0.1,
          }
        );
      });

      // Stagger the control buttons in
      if (dotsRef.current) {
        gsap.fromTo(
          dotsRef.current.children,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: "power2.out", stagger: 0.08, delay: 0.45 }
        );
      }
    });

    return () => ctx.revert();
  }, [ready]);

  // Body phase animations — phone icon (calling) / bounce dots (ringing)
  useEffect(() => {
    if (!ready) return;
    const ctx = gsap.context(() => {
      if (phase === "calling" && phoneIconRef.current) {
        gsap.fromTo(
          phoneIconRef.current,
          { scale: 0.6, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
        );
        // Gentle wiggle of the phone icon (like a real ringing phone)
        gsap.to(phoneIconRef.current, {
          rotate: 12,
          duration: 0.12,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          repeatDelay: 1.4,
          transformOrigin: "center bottom",
        });
      }
      if (phase === "ringing") {
        if (glowRef.current) {
          gsap.fromTo(
            glowRef.current,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }
          );
        }
        if (bounceDotsRef.current) {
          gsap.fromTo(
            bounceDotsRef.current.children,
            { y: 0, opacity: 0.4 },
            {
              y: -6,
              opacity: 1,
              duration: 0.4,
              ease: "sine.inOut",
              stagger: 0.15,
              yoyo: true,
              repeat: -1,
            }
          );
        }
      }
    });
    return () => ctx.revert();
  }, [phase, ready]);

  // When status switches to "connecting" — morph UI
  useEffect(() => {
    if (status === "connecting") {
      [ring1Ref, ring2Ref, ring3Ref].forEach((r) =>
        gsap.to(r.current, { opacity: 0, duration: 0.4 })
      );
      gsap.to(avatarRef.current, {
        scale: 1.08,
        duration: 0.3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: 3,
      });
    }
  }, [status]);

  const initial = debtorName ? debtorName.charAt(0).toUpperCase() : "?";

  return (
    <Portal className="!z-[500]">
      {/* Dark stage holding the centered phone — matches the in-call frame exactly */}
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center p-4"
        style={{ background: "radial-gradient(ellipse at center, #1e1530 0%, #0d0a17 100%)" }}
      >
        {/* Phone frame — identical to /sessions/call so the transition is seamless */}
        <div className="flex h-[calc(100vh-2rem)] max-h-[760px] w-full max-w-sm flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-black/40">
          {/* Caller header — same purple gradient as the call screen */}
          <div className="relative bg-gradient-to-b from-secondary to-card px-5 pb-6 pt-8">
            <div className="flex flex-col items-center text-center">
              {/* Avatar with pulsing rings */}
              <div className="relative flex items-center justify-center">
                {[ring1Ref, ring2Ref, ring3Ref].map((r, i) => (
                  <div
                    key={i}
                    ref={r}
                    className="absolute h-20 w-20 rounded-full border-2 border-primary/40"
                    style={{ opacity: 0 }}
                  />
                ))}
                <div
                  ref={avatarRef}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-2xl font-semibold text-primary"
                  style={{ opacity: 0 }}
                >
                  {initial}
                </div>
              </div>

              {/* Name */}
              <div ref={nameRef} style={{ opacity: 0 }}>
                <h1 className="mt-4 text-xl font-medium leading-tight text-foreground">
                  {debtorName ?? "Debtor"}
                </h1>
              </div>

              {/* Status */}
              <div
                ref={statusRef}
                role="status"
                aria-live="polite"
                className="mt-1.5 inline-flex items-center gap-2"
                style={{ opacity: 0 }}
              >
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                <span className="text-sm text-muted-foreground">
                  {status === "connecting"
                    ? "Connecting…"
                    : phase === "calling"
                    ? "Calling…"
                    : "Ringing…"}
                </span>
              </div>
            </div>
          </div>

          {/* Body — Frame 3: big phone icon while "Calling"; Frame 4: bouncing dots while "Ringing" */}
          <div className="flex flex-1 flex-col items-center justify-center border-t border-border bg-muted/30 px-6 text-center">
            {phase === "calling" ? (
              <div ref={phoneIconRef} className="flex flex-col items-center" style={{ opacity: 0 }}>
                <div className="relative flex h-24 w-24 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/15 motion-reduce:animate-none" />
                  <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                    <Phone className="h-9 w-9 text-primary" aria-hidden="true" />
                  </span>
                </div>
              </div>
            ) : (
              <div ref={glowRef} className="flex flex-col items-center gap-4" style={{ opacity: 0 }}>
                <div ref={bounceDotsRef} className="flex items-center gap-2" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 rounded-full bg-primary/50" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Calling {debtorName ?? "the debtor"}…
                </p>
              </div>
            )}
          </div>

          {/* Controls — same bar as call screen; End button active */}
          <div className="border-t border-border bg-card px-5 py-4">
            <div ref={dotsRef} className="flex items-center justify-center gap-6">
              {/* Disabled mic (not yet connected) */}
              <button
                disabled
                aria-label="Microphone (available once connected)"
                className="flex h-16 w-16 cursor-not-allowed items-center justify-center rounded-full bg-secondary text-secondary-foreground opacity-40"
              >
                <Mic className="h-6 w-6" aria-hidden="true" />
              </button>

              {/* End call — active */}
              <button
                ref={btnRef}
                onClick={onCancel}
                aria-label="Cancel call"
                className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-destructive text-white shadow-lg shadow-destructive/30 transition-transform active:scale-90"
                style={{ opacity: 0 }}
              >
                <PhoneOff className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {status === "connecting"
                ? "Connecting…"
                : phase === "calling"
                ? "Dialing… tap to cancel"
                : "Ringing… tap to cancel"}
            </p>
          </div>
        </div>
      </div>
    </Portal>
  );
});

// ---------------------------------------------------------------------------
// Error card
// ---------------------------------------------------------------------------
function ErrorCard({
  title,
  message,
  onBack,
  onRetry,
}: {
  title: string;
  message: string;
  onBack: () => void;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        role="alert"
        className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-border bg-card px-8 py-10 text-center shadow-sm"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-lg font-medium text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            Back to scenarios
          </Button>
          {onRetry && (
            <Button size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function NewSessionPage() {
  return (
    <Suspense fallback={<RingingScreen status="ringing" phase="calling" onCancel={() => {}} />}>
      <NewSessionContent />
    </Suspense>
  );
}

function NewSessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scenarioId = searchParams.get("scenario_id");
  const debtorName = searchParams.get("debtor_name") ?? undefined;

  const { status, error, sessionId, createSession, reset } = useSessionStore();
  const hasInitiated = useRef(false);
  const screenRef = useRef<RingingScreenHandle>(null);

  // Frame 3 → Frame 4: "Calling…" for ~1.2s, then "Ringing…"
  const [phase, setPhase] = useState<"calling" | "ringing">("calling");
  useEffect(() => {
    const id = setTimeout(() => setPhase("ringing"), 1300);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!scenarioId) return;
    hasInitiated.current = false;
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  useEffect(() => {
    if (!scenarioId) return;
    if (status === "idle" && !hasInitiated.current) {
      hasInitiated.current = true;
      createSession(scenarioId);
    }
  }, [scenarioId, status, createSession]);

  // Connecting: wait for min ring time + GSAP exit, then navigate
  useEffect(() => {
    if (status !== "connecting" || !sessionId) return;

    const navigate = async () => {
      // Ensure the ringing experience plays fully (calling 1.3s + ringing ~1.5s)
      await new Promise((r) => setTimeout(r, 3000));
      if (screenRef.current?.exit) await screenRef.current.exit("answered");
      router.push(`/sessions/call?session_id=${sessionId}`);
    };

    navigate();
  }, [status, sessionId, router]);

  const handleCancel = useCallback(async () => {
    if (screenRef.current?.exit) await screenRef.current.exit("cancel");
    reset();
    router.push("/scenarios");
  }, [reset, router]);

  if (!scenarioId) {
    return (
      <ErrorCard
        title="No scenario selected"
        message="Choose a scenario first, then start a call from its page."
        onBack={() => router.push("/scenarios")}
      />
    );
  }

  if (status === "error") {
    return (
      <ErrorCard
        title="Couldn't start the session"
        message={error ?? "An unexpected error occurred."}
        onBack={() => { reset(); router.push("/scenarios"); }}
        onRetry={() => { reset(); createSession(scenarioId); }}
      />
    );
  }

  const ringStatus =
    status === "connecting" ? "connecting" : "ringing";

  return (
    <RingingScreen
      ref={screenRef}
      debtorName={debtorName}
      status={ringStatus}
      phase={phase}
      onCancel={handleCancel}
    />
  );
}
