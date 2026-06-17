"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/session-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, Check } from "lucide-react";

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="px-6 py-8 text-center">{children}</CardContent>
      </Card>
    </div>
  );
}

function StepIndicator({ step }: { step: "creating" | "connecting" }) {
  const steps = [
    { key: "creating", label: "Create" },
    { key: "connecting", label: "Connect" },
  ] as const;
  const activeIndex = step === "creating" ? 0 : 1;

  return (
    <div
      aria-hidden="true"
      className="mt-6 flex items-center justify-center gap-2"
    >
      {steps.map((s, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                done && "bg-primary text-primary-foreground",
                active && "bg-primary/15 text-primary",
                !done && !active && "bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                active || done ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="mx-1 h-px w-6 bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense
      fallback={
        <CenteredCard>
          <Loader2
            className="mx-auto h-8 w-8 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="mt-4 text-lg font-medium text-foreground">Loading…</p>
        </CenteredCard>
      }
    >
      <NewSessionContent />
    </Suspense>
  );
}

function NewSessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scenarioId = searchParams.get("scenario_id");

  const { status, error, sessionId, createSession, reset } = useSessionStore();

  useEffect(() => {
    if (!scenarioId) return;
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  useEffect(() => {
    if (!scenarioId) return;
    if (status === "idle") {
      createSession(scenarioId);
    }
  }, [scenarioId, status, createSession]);

  useEffect(() => {
    if (status === "connecting" && sessionId) {
      router.push(`/sessions/call?session_id=${sessionId}`);
    }
  }, [status, sessionId, router]);

  // Missing scenario — treat as a recoverable error
  if (!scenarioId) {
    return (
      <CenteredCard>
        <div
          role="alert"
          className="flex flex-col items-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-lg font-medium text-foreground">
            No scenario selected
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a scenario first, then start a call from its page.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              reset();
              router.push("/");
            }}
          >
            Back to scenarios
          </Button>
        </div>
      </CenteredCard>
    );
  }

  if (status === "error") {
    return (
      <CenteredCard>
        <div role="alert" className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-lg font-medium text-foreground">
            Couldn&apos;t start the session
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {error ?? "An unexpected error occurred."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reset();
                router.push("/");
              }}
            >
              Back to scenarios
            </Button>
            <Button
              size="sm"
              onClick={() => {
                reset();
                createSession(scenarioId);
              }}
            >
              Try again
            </Button>
          </div>
        </div>
      </CenteredCard>
    );
  }

  // Preparing state (creating / connecting)
  const isCreating = status === "creating" || status === "idle";
  return (
    <CenteredCard>
      <div role="status" aria-live="polite" className="flex flex-col items-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-lg font-medium text-foreground">
          {isCreating ? "Preparing your session" : "Connecting"}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {isCreating
            ? "Setting things up and generating a realistic debtor persona."
            : "Establishing a secure connection to the voice channel."}
        </p>
      </div>
      <StepIndicator step={isCreating ? "creating" : "connecting"} />
    </CenteredCard>
  );
}
