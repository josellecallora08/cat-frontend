"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { useSessionStore } from "@/stores/session-store";
import { useScenario } from "@/hooks/use-scenarios";
import { cn } from "@/lib/utils";
import gsap from "gsap";
import {
  Mic,
  PhoneOff,
  Loader2,
  AlertCircle,
  User,
  Info,
  Target,
  CircleDollarSign,
  CalendarClock,
  X,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type CallStatus =
  | "idle"
  | "active"
  | "listening"
  | "processing"
  | "speaking"
  | "ended"
  | "error";

interface TranscriptItem {
  speaker: "agent" | "debtor";
  text: string;
  system?: boolean;
}

// Status visuals map onto existing palette tokens only, always with a label.
const statusConfig: Record<CallStatus, { label: string; dot: string; pulse: boolean }> = {
  idle: { label: "Ready", dot: "bg-muted-foreground", pulse: false },
  active: { label: "Your turn", dot: "bg-primary", pulse: false },
  listening: { label: "Listening", dot: "bg-accent-foreground", pulse: true },
  processing: { label: "Thinking", dot: "bg-muted-foreground", pulse: true },
  speaking: { label: "Speaking", dot: "bg-secondary-foreground", pulse: true },
  ended: { label: "Call ended", dot: "bg-muted-foreground", pulse: false },
  error: { label: "Connection issue", dot: "bg-destructive", pulse: false },
};

function formatPHP(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function CallPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");

  const session = useSessionStore((s) => s.session);
  const personaName = session?.persona?.name ?? "Debtor";
  const { data: scenario } = useScenario(session?.scenario_id ?? "");

  const [status, setStatus] = useState<CallStatus>("active");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const elapsed = useElapsed(status !== "ended");

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, status]);

  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang: "tl" }),
        });
        if (!res.ok) throw new Error("TTS request failed");
        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        await audio.play();
      } catch {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fil-PH";
        utterance.rate = 0.9;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        speechSynthesis.speak(utterance);
      }
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    async function startCall() {
      setStatus("processing");
      await new Promise((r) => setTimeout(r, 500));
      try {
        // First check if session is still valid
        const checkRes = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`);
        if (checkRes.ok) {
          const sessionData = await checkRes.json();
          if (sessionData.status === "completed" || sessionData.status === "error") {
            // Session already ended — redirect back to scenarios
            console.warn("Session already completed, redirecting...");
            if (!cancelled) {
              setError("This session has already ended. Starting a new one...");
              setTimeout(() => router.push("/"), 1500);
            }
            return;
          }
        }

        const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "[The phone is ringing. You pick up the call.]",
          }),
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        if (cancelled) return;
        const data = await res.json();
        setTranscript([{ speaker: "debtor", text: data.text }]);
        setStatus("speaking");
        await speakText(data.text);
        if (!cancelled) setStatus("active");
      } catch (e) {
        console.error("Failed to initialize call:", e);
        if (!cancelled) setStatus("active");
      }
    }
    startCall();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!sessionId || !text.trim()) return;
      setError(null);
      setTranscript((prev) => [...prev, { speaker: "agent", text }]);
      setStatus("processing");
      try {
        const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setTranscript((prev) => [...prev, { speaker: "debtor", text: data.text }]);

        // If debtor is interrupting, play immediately (cut any ongoing audio)
        if (data.interrupt) {
          speechSynthesis.cancel(); // Stop any browser TTS
        }

        setStatus("speaking");
        await speakText(data.text);
        if (data.call_ended) {
          setTranscript((prev) => [
            ...prev,
            { speaker: "debtor", text: "The debtor ended the call.", system: true },
          ]);
          setStatus("ended");
          try {
            await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/end`, { method: "POST" });
          } catch {
            /* best-effort */
          }
          // Reset the session store so a new session can be created next time
          useSessionStore.getState().reset();
          setTimeout(() => router.push(`/sessions/${sessionId}/results`), 2000);
          return;
        }
        setStatus("active");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to get a response.");
        setStatus("active");
      }
    },
    [sessionId, speakText, router]
  );

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition isn't supported here. Please use Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "fil-PH";

    recognition.onstart = () => setStatus("listening");

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Get the latest final result
      const lastResult = event.results[event.results.length - 1];
      if (lastResult && lastResult[0]) {
        const text = lastResult[0].transcript.trim();
        if (text) {
          // Pause recognition while processing response
          recognition.stop();
          sendMessage(text);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        // These are normal — restart listening
        return;
      }
      setError(`Speech error: ${event.error}`);
    };

    recognition.onend = () => {
      // Auto-restart if call is still active and in continuous mode
      setStatus((currentStatus) => {
        if (currentStatus === "listening" && continuousMode) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch { /* already started or page navigating away */ }
          }, 300);
        }
        return currentStatus;
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [sendMessage, continuousMode]);

  // Auto-restart listening after debtor finishes speaking (continuous mode only)
  // Add a short delay to avoid picking up tail-end of TTS audio
  useEffect(() => {
    if (status === "active" && recognitionRef.current && continuousMode) {
      const timer = setTimeout(() => {
        try {
          recognitionRef.current?.start();
          setStatus("listening");
        } catch { /* already running */ }
      }, 600); // 600ms delay after TTS to avoid echo pickup
      return () => clearTimeout(timer);
    }
  }, [status, continuousMode]);

  // Stop recognition while debtor is speaking (prevent mic picking up TTS)
  useEffect(() => {
    if (status === "speaking" || status === "processing") {
      try {
        recognitionRef.current?.stop();
      } catch { /* not running */ }
    }
  }, [status]);

  // Auto-start listening when call begins (first time only)
  const hasStartedListening = useRef(false);
  useEffect(() => {
    if (status === "active" && !hasStartedListening.current) {
      hasStartedListening.current = true;
      if (continuousMode) {
        // Delay first listen to avoid picking up initial TTS
        setTimeout(() => startListening(), 600);
      }
    }
  }, [status, startListening, continuousMode]);

  const endCall = useCallback(async () => {
    speechSynthesis.cancel();
    recognitionRef.current?.abort();
    setStatus("ended");
    if (sessionId) {
      try {
        await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/end`, { method: "POST" });
      } catch {
        /* best-effort */
      }
    }
    // Reset the session store so a new session can be created next time
    useSessionStore.getState().reset();
    setTimeout(() => router.push(`/sessions/${sessionId}/results`), 1200);
  }, [sessionId, router]);

  if (!sessionId) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "radial-gradient(ellipse at center, #1e1530 0%, #0d0a17 100%)" }}
      >
        <div role="alert" className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-border bg-card px-8 py-10 text-center shadow-2xl shadow-black/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-lg font-medium text-foreground">No active session</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a call from a scenario to begin training.
          </p>
        </div>
      </div>
    );
  }

  const isEnded = status === "ended";
  const initial = personaName.charAt(0).toUpperCase();
  const { label, dot, pulse } = statusConfig[status];

  // GSAP entrance — fades in smoothly from the dark ringing screen
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pageRef.current) return;
    gsap.fromTo(
      pageRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.5, ease: "power2.out" }
    );
  }, []);

  return (
    <div
      ref={pageRef}
      className="fixed inset-0 z-50 flex items-center justify-center gap-6 p-4"
      style={{ background: "radial-gradient(ellipse at center, #1e1530 0%, #0d0a17 100%)" }}
    >
      {/* Scenario reference — always-visible "call brief" beside the phone (desktop) */}
      {scenario && (
        <aside className="hidden h-[calc(100vh-2rem)] max-h-[760px] w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/95 shadow-2xl shadow-black/40 backdrop-blur lg:flex">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight text-foreground">Your call brief</h2>
              <p className="text-[11px] leading-tight text-muted-foreground">{scenario.name}</p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {/* Primary focus — the goal, front and center */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <Target className="h-3.5 w-3.5" aria-hidden="true" />
                Your goal
              </p>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
                {scenario.debtor_profile.conversation_goal}
              </p>
            </div>

            {/* Hard numbers — quick-glance stat chips */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <CircleDollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="mt-1.5 text-base font-semibold leading-none text-foreground">
                  {formatPHP(scenario.debtor_profile.outstanding_balance)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Outstanding</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="mt-1.5 text-base font-semibold leading-none text-foreground">
                  {scenario.debtor_profile.days_past_due} days
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Past due</p>
              </div>
            </div>

            {/* Who you're talking to — supporting context */}
            <div className="rounded-xl border border-border bg-muted/40 p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                Who you&apos;re talking to
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                {scenario.debtor_profile.personality_profile}
              </p>
            </div>
          </div>
        </aside>
      )}

      {/* Phone frame — identical dimensions to the ringing screen for a seamless hand-off */}
      <div className="relative flex h-[calc(100vh-2rem)] max-h-[760px] w-full max-w-sm flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl shadow-black/40">
        {/* Caller header — gradient uses palette purples */}
        <div className="relative bg-gradient-to-b from-secondary to-card px-5 pb-5 pt-8">
          {/* Scenario info toggle — only on smaller screens where the side panel is hidden */}
          {scenario && (
            <button
              onClick={() => setInfoOpen((v) => !v)}
              aria-label={infoOpen ? "Hide scenario details" : "Show scenario details"}
              aria-pressed={infoOpen}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-card/60 text-muted-foreground backdrop-blur transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
            >
              <Info className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <div className="flex flex-col items-center text-center">
            <div className="relative flex items-center justify-center">
              {/* Pulsing rings while the debtor speaks — shows who has the floor */}
              {status === "speaking" && (
                <>
                  <span className="absolute h-20 w-20 animate-ping rounded-full bg-primary/30 motion-reduce:hidden" />
                  <span className="absolute h-24 w-24 animate-pulse rounded-full border border-primary/30 motion-reduce:hidden" />
                </>
              )}
              <div
                className={cn(
                  "relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-2xl font-semibold text-primary transition-transform duration-300",
                  status === "speaking" && "scale-105"
                )}
              >
                {initial}
              </div>
            </div>
            <h1 className="mt-3 text-xl font-medium leading-tight text-foreground">
              {personaName}
            </h1>
            <div
              role="status"
              aria-live="polite"
              className="mt-1.5 inline-flex items-center gap-2"
            >
              <span className="relative flex h-2 w-2" aria-hidden="true">
                {pulse && (
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none",
                      dot
                    )}
                  />
                )}
                <span className={cn("relative inline-flex h-2 w-2 rounded-full", dot)} />
              </span>
              <span className="text-sm text-muted-foreground">
                {label} · {elapsed}
              </span>
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div
          aria-live="polite"
          aria-label="Call transcript"
          className="flex-1 space-y-3 overflow-y-auto border-t border-border bg-muted/30 px-4 py-4"
        >
          {transcript.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Connecting you with {personaName}…
              </p>
            </div>
          )}
          {transcript.map((item, i) => {
            if (item.system) {
              return (
                <p key={i} className="py-1 text-center text-xs font-medium text-muted-foreground">
                  {item.text}
                </p>
              );
            }
            const isAgent = item.speaker === "agent";
            return (
              <div key={i} className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
                <div className="max-w-[85%]">
                  <p
                    className={cn(
                      "mb-1 text-[11px] font-medium text-muted-foreground",
                      isAgent && "text-right"
                    )}
                  >
                    {isAgent ? "You" : personaName}
                  </p>
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                      isAgent
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm border border-border bg-card text-foreground"
                    )}
                  >
                    {item.text}
                  </div>
                </div>
              </div>
            );
          })}
          {/* Typing indicator while the debtor is forming a reply */}
          {status === "processing" && transcript.length > 0 && (
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                  {personaName}
                </p>
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                </div>
              </div>
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Inline error */}
        {error && (
          <p
            role="alert"
            className="flex items-center justify-center gap-1.5 border-t border-border bg-destructive/5 px-4 py-2 text-xs text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {error}
          </p>
        )}

        {/* Phone controls */}
        <div className="border-t border-border bg-card px-5 py-4">
          {!isEnded ? (
            <>
              {/* Live status line — always tells the user exactly what to do */}
              <p className="mb-3 flex items-center justify-center gap-1.5 text-center text-sm font-medium text-foreground">
                {status === "listening" ? (
                  <>
                    <Mic className="h-4 w-4 text-primary" aria-hidden="true" />
                    Listening — speak naturally
                  </>
                ) : status === "processing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
                    Thinking…
                  </>
                ) : status === "speaking" ? (
                  <span className="text-muted-foreground">{personaName} is speaking…</span>
                ) : continuousMode ? (
                  <span className="text-muted-foreground">Your turn — just speak</span>
                ) : (
                  <span className="text-muted-foreground">Tap the mic to speak</span>
                )}
              </p>

              <div className="flex items-end justify-center gap-10">
                {/* Mic / talk button */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={startListening}
                    disabled={status !== "active"}
                    aria-pressed={status === "listening"}
                    aria-label={status === "listening" ? "Listening" : "Tap to speak"}
                    className={cn(
                      "relative flex h-16 w-16 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40",
                      status === "listening"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-primary/15 active:scale-95"
                    )}
                  >
                    {/* Listening pulse ring */}
                    {status === "listening" && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 motion-reduce:hidden" />
                    )}
                    {status === "processing" ? (
                      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                    ) : (
                      <Mic className="relative h-6 w-6" aria-hidden="true" />
                    )}
                  </button>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {status === "listening" ? "Listening" : "Speak"}
                  </span>
                </div>

                {/* End call button */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => setConfirmOpen(true)}
                    aria-label="End call"
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white shadow-lg shadow-destructive/30 transition-transform hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                  >
                    <PhoneOff className="h-6 w-6" aria-hidden="true" />
                  </button>
                  <span className="text-[11px] font-medium text-muted-foreground">End</span>
                </div>
              </div>

              {/* Continuous listening toggle */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <label className="text-xs text-muted-foreground cursor-pointer flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={continuousMode}
                    onChange={(e) => {
                      setContinuousMode(e.target.checked);
                      if (!e.target.checked) {
                        // Stop continuous listening
                        recognitionRef.current?.stop();
                        setStatus("active");
                      } else {
                        // Start continuous listening
                        startListening();
                      }
                    }}
                    className="rounded border-border"
                  />
                  Continuous listening
                </label>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Call ended. Generating your evaluation…
            </div>
          )}
        </div>

        {/* Scenario reference — slides over the call on smaller screens (toggle) */}
        {scenario && (
          <div
            className={cn(
              "absolute inset-0 z-10 flex flex-col bg-card/95 backdrop-blur-sm transition-all duration-300 lg:hidden",
              infoOpen
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none translate-y-2 opacity-0"
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold leading-tight text-foreground">Your call brief</h2>
                  <p className="text-[11px] leading-tight text-muted-foreground">{scenario.name}</p>
                </div>
              </div>
              <button
                onClick={() => setInfoOpen(false)}
                aria-label="Close scenario details"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {/* Primary focus — the goal */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <Target className="h-3.5 w-3.5" aria-hidden="true" />
                  Your goal
                </p>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-foreground">
                  {scenario.debtor_profile.conversation_goal}
                </p>
              </div>

              {/* Hard numbers */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <CircleDollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-1.5 text-base font-semibold leading-none text-foreground">
                    {formatPHP(scenario.debtor_profile.outstanding_balance)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Outstanding</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-1.5 text-base font-semibold leading-none text-foreground">
                    {scenario.debtor_profile.days_past_due} days
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Past due</p>
                </div>
              </div>

              {/* Who you're talking to */}
              <div className="rounded-xl border border-border bg-muted/40 p-3.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  Who you&apos;re talking to
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                  {scenario.debtor_profile.personality_profile}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* End-call confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End this call?</DialogTitle>
            <DialogDescription>
              The conversation will stop and we&apos;ll generate your evaluation. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" size="sm">
                  Keep talking
                </Button>
              }
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirmOpen(false);
                endCall();
              }}
            >
              End call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CallPageFallback() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at center, #1e1530 0%, #0d0a17 100%)" }}
    >
      <div className="h-[calc(100vh-2rem)] max-h-[760px] w-full max-w-sm animate-pulse rounded-[2rem] border border-border bg-card shadow-2xl shadow-black/40" />
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense fallback={<CallPageFallback />}>
      <CallPageContent />
    </Suspense>
  );
}
