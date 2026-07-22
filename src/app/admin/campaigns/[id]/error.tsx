"use client";

import { PageContent } from "@/components/page-content";
import { PageError } from "@/components/page-error";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CampaignDetailError({ error, reset }: ErrorBoundaryProps) {
  return (
    <PageContent>
      <PageError
        title="Failed to load campaign"
        message={error.message}
        onRetry={reset}
      />
    </PageContent>
  );
}
