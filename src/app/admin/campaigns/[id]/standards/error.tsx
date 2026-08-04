"use client";

import { PageContent } from "@/components/page-content";
import { PageError } from "@/components/page-error";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PageContent><PageError title="Negotiation standard unavailable" message="The standard manager could not be loaded." onRetry={reset} /></PageContent>;
}
