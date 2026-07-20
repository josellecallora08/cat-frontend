"use client";

import { useEffect } from "react";
import { PageContent } from "@/components/page-content";
import { PageError } from "@/components/page-error";

/**
 * Error boundary for the Sessions route.
 */
export default function SessionsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SessionsError]", error);
  }, [error]);

  return (
    <PageContent>
      <PageError
        title="Failed to load sessions"
        message="We couldn't load your session history. Please try again."
        onRetry={reset}
      />
    </PageContent>
  );
}
