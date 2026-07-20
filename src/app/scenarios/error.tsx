"use client";

import { useEffect } from "react";
import { PageContent } from "@/components/page-content";
import { PageError } from "@/components/page-error";

/**
 * Error boundary for the Scenarios route.
 */
export default function ScenariosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ScenariosError]", error);
  }, [error]);

  return (
    <PageContent>
      <PageError
        title="Failed to load scenarios"
        message="We couldn't load the scenario list. Please try again."
        onRetry={reset}
      />
    </PageContent>
  );
}
