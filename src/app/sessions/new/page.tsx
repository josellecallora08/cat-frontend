"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/session-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NewSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="font-medium">Loading...</p>
            </CardContent>
          </Card>
        </div>
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

    // Only create session if we're in idle state
    if (status === "idle") {
      createSession(scenarioId);
    }
  }, [scenarioId, status, createSession]);

  useEffect(() => {
    // Once status becomes "connecting", navigate to the call page
    if (status === "connecting" && sessionId) {
      router.push(`/sessions/call?session_id=${sessionId}`);
    }
  }, [status, sessionId, router]);

  useEffect(() => {
    // Clean up on unmount
    return () => {
      // Only reset if we've navigated away successfully (completed or error)
      // Don't reset during transition to call page
    };
  }, []);

  if (!scenarioId) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">Missing scenario</p>
            <p className="text-sm text-muted-foreground mt-1">
              No scenario ID was provided. Please select a scenario first.
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
              Back to Scenarios
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">
              Failed to start session
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {error ?? "An unexpected error occurred"}
            </p>
            <div className="flex gap-2 justify-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  reset();
                  router.push("/");
                }}
              >
                Back to Scenarios
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  reset();
                  // Re-trigger creation by going back to idle
                  createSession(scenarioId);
                }}
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show creating/connecting state
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="font-medium">
            {status === "creating"
              ? "Creating session..."
              : "Connecting..."}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {status === "creating"
              ? "Setting up your training session and generating a debtor persona."
              : "Establishing connection to the voice channel."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
