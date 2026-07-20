"use client";

import { useEffect } from "react";
import { PageContent } from "@/components/page-content";
import { PageError } from "@/components/page-error";

/**
 * Root-level error boundary.
 * Catches unhandled errors in any page and shows a consistent error UI.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[RootError]", error);
  }, [error]);

  return (
    <PageContent>
      <PageError
        title="Something went wrong"
        message="An unexpected error occurred. Please try again or contact support if the issue persists."
        onRetry={reset}
        retryLabel="Try again"
      />
    </PageContent>
  );
}
