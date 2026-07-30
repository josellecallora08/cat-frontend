"use client";

import { PageContent } from "@/components/page-content";
import { PageError } from "@/components/page-error";

export default function ProfileError({ reset }: { reset: () => void }) {
  return (
    <PageContent>
      <PageError
        title="Failed to load profile"
        message="Something went wrong loading this page."
        onRetry={reset}
      />
    </PageContent>
  );
}
