"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type CallStatus = "idle" | "active" | "listening" | "processing" | "speaking" | "ended" | "error";

interface TranscriptItem {
  speaker: "agent" | "debtor";
  text: string;
}

function StatusIndicator({ status }: { status: CallStatus }) {
  const config: Record<CallStatus, { label: string; color: string; pulse: boolean }> = {
    idle: { label: "Ready", color: "bg-muted-foreground", pulse: false },
    active: { label: "Call Active — Tap to speak", color: "bg-green-500", pulse: false },
    listening: { label: "Listening...", color: "bg-blue-500", pulse: true },
    processing: { label: "Thinking...", color: "bg-yellow-500", pulse: true },
    speaking: { label: "Debtor Speaking...", color: "bg-purple-500", pulse: true },
    ended: { label: "Call Ended", color: "bg-muted-foreground", pulse: false },
    error: { label: "Error", color: "bg-destructive", pulse: false },
  };
  const { label, color, pulse } = config[status];
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-75`} />}
        <span className={`relative inline-flex h-3 w-3 rounded-full ${color}`} />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function CallPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<CallStatus>("active");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when transcript updates
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      try {
        // Use backend gTTS for natural Filipino/Taglish pronunciation
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
        // Fallback to browser TTS if backend TTS fails
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fil-PH";
        utterance.rate = 0.9;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        speechSynthesis.speak(utterance);
      }
    });
  }, []);

  // Debtor answers the phone when call starts
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function startCall() {
      setStatus("processing");
      
      // Small delay to ensure voices are loaded
      await new Promise((r) => setTimeout(r, 500));

      try {
        const res = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "[The phone is ringing. You pick up the call.]" }),
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);
        if (cancelled) return;

        const data = await res.json();

        // Show debtor's greeting (they answer the phone)
        setTranscript([{ speaker: "debtor", text: data.text }]);

        // Speak the debtor's answer
        setStatus("speaking");
        await speakText(data.text);
        if (!cancelled) setStatus("active");
      } catch (e) {
        console.error("Failed to initialize call:", e);
        if (!cancelled) setStatus("active");
      }
    }

    startCall();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!sessionId || !text.trim()) return;

    // Add agent message to transcript
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

      // Add debtor response to transcript
      setTranscript((prev) => [...prev, { speaker: "debtor", text: data.text }]);

      // Speak the debtor response using browser TTS
      setStatus("speaking");
      await speakText(data.text);
      setStatus("active");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get response");
      setStatus("active");
    }
  }, [sessionId, speakText]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser. Use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "fil-PH"; // Filipino for Taglish recognition

    recognition.onstart = () => setStatus("listening");

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript;
      if (text.trim()) {
        sendMessage(text);
      } else {
        setStatus("active");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech") {
        setError(`Speech recognition error: ${event.error}`);
      }
      setStatus("active");
    };

    recognition.onend = () => {
      if (status === "listening") {
        setStatus("active");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [sendMessage, status]);

  const handleEndCall = useCallback(async () => {
    // Stop any ongoing speech
    speechSynthesis.cancel();
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    setStatus("ended");

    // End the session on the backend
    if (sessionId) {
      try {
        await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/end`, {
          method: "POST",
        });
      } catch {
        // Best-effort
      }
    }

    // Navigate to results
    setTimeout(() => {
      router.push(`/sessions/${sessionId}/results`);
    }, 1500);
  }, [sessionId, router]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-destructive">No session ID provided</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto">
      <Card className="w-full">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Training Call</CardTitle>
          <StatusIndicator status={status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Transcript area */}
          <div className="h-64 overflow-y-auto rounded-lg border border-border p-4 space-y-3 bg-muted/30">
            {transcript.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                The debtor is answering the phone...
              </p>
            )}
            {transcript.map((item, i) => (
              <div
                key={i}
                className={`flex ${item.speaker === "agent" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    item.speaker === "agent"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  }`}
                >
                  <p className="text-xs font-medium opacity-70 mb-1">
                    {item.speaker === "agent" ? "You (Agent)" : "Debtor"}
                  </p>
                  {item.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Controls */}
          {status !== "ended" && (
            <div className="flex gap-3 justify-center">
              <Button
                size="lg"
                onClick={startListening}
                disabled={status !== "active"}
                className="flex-1"
              >
                🎙️ {status === "listening" ? "Listening..." : "Speak"}
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={handleEndCall}
                className="flex-1"
              >
                End Call
              </Button>
            </div>
          )}

          {status === "ended" && (
            <p className="text-sm text-muted-foreground text-center">
              Call ended. Generating evaluation...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CallPageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md animate-pulse">
        <CardHeader className="text-center">
          <div className="h-6 w-32 bg-muted rounded mx-auto" />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-64 w-full bg-muted rounded" />
          <div className="h-9 w-full bg-muted rounded" />
        </CardContent>
      </Card>
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
