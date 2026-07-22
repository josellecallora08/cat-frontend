"use client";

import { PageContent } from "@/components/page-content";
import { PageError } from "@/components/page-error";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AgentProgressError({ error, reset }: ErrorBoundaryProps) {
  return (
    <PageContent>
      <PageError
        title="Failed to load agent progress"
        message={error.message}
        onRetry={reset}
      />
    </PageContent>
  );
}
