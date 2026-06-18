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
  const [continuousMode, setContinuousMode] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const elapsed = useElapsed(status !== "ended");

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

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
  useEffect(() => {
    if (status === "active" && recognitionRef.current && continuousMode) {
      try {
        recognitionRef.current.start();
        setStatus("listening");
      } catch { /* already running */ }
    }
  }, [status, continuousMode]);

  // Auto-start listening when call begins
  const hasStartedListening = useRef(false);
  useEffect(() => {
    if (status === "active" && !hasStartedListening.current) {
      hasStartedListening.current = true;
      if (continuousMode) {
        startListening();
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
    setTimeout(() => router.push(`/sessions/${sessionId}/results`), 1200);
  }, [sessionId, router]);

  if (!sessionId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div role="alert" className="flex flex-col items-center text-center">
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-start justify-center gap-6 lg:flex-row">
      {/* Scenario reference — outside the phone */}
      {scenario && (
        <aside className="w-full lg:w-72 lg:shrink-0">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-sm font-medium text-foreground">
                Scenario reference
              </h2>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm font-medium leading-tight text-foreground">
                {scenario.name}
              </p>
              <dl className="mt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <CircleDollarSign
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <dt className="sr-only">Outstanding balance</dt>
                  <dd className="text-sm text-foreground">
                    <span className="font-medium">
                      {formatPHP(scenario.debtor_profile.outstanding_balance)}
                    </span>{" "}
                    <span className="text-muted-foreground">outstanding</span>
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarClock
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <dt className="sr-only">Days past due</dt>
                  <dd className="text-sm text-muted-foreground">
                    {scenario.debtor_profile.days_past_due} days past due
                  </dd>
                </div>
                <div className="border-t border-border pt-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Target className="h-3.5 w-3.5" aria-hidden="true" />
                    Conversation goal
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-foreground">
                    {scenario.debtor_profile.conversation_goal}
                  </dd>
                </div>
                <div className="border-t border-border pt-3">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <User className="h-3.5 w-3.5" aria-hidden="true" />
                    Personality
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {scenario.debtor_profile.personality_profile}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>
      )}

      {/* Phone frame */}
      <div className="mx-auto w-full max-w-sm lg:mx-0">
        <div className="flex h-[calc(100vh-3.5rem-3rem)] flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-lg">
          {/* Caller header — gradient uses palette purples */}
          <div className="relative bg-gradient-to-b from-secondary to-card px-5 pb-5 pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-2xl font-semibold text-primary">
                {initial}
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
              <p className="py-8 text-center text-sm text-muted-foreground">
                {personaName} is answering the phone…
              </p>
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
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={startListening}
                  disabled={status !== "active"}
                  aria-pressed={status === "listening"}
                  aria-label={status === "listening" ? "Listening" : "Tap to speak"}
                  className={cn(
                    "flex h-16 w-16 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
                    status === "listening"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-primary/15"
                  )}
                >
                  {status === "processing" ? (
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                  ) : (
                    <Mic className="h-6 w-6" aria-hidden="true" />
                  )}
                </button>

                <button
                  onClick={() => setConfirmOpen(true)}
                  aria-label="End call"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                >
                  <PhoneOff className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Call ended. Generating your evaluation…
              </div>
            )}
            {!isEnded && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {status === "listening"
                  ? "Listening — speak naturally"
                  : status === "active"
                  ? continuousMode ? "Ready — speak anytime" : "Tap mic to speak"
                  : status === "processing"
                  ? "Thinking…"
                  : status === "speaking"
                  ? `${personaName} is speaking…`
                  : ""}
              </p>
            )}
            {!isEnded && (
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
            )}
          </div>
        </div>
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
    <div className="mx-auto w-full max-w-sm">
      <div className="h-[calc(100vh-3.5rem-3rem)] animate-pulse rounded-[2rem] border border-border bg-muted" />
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
