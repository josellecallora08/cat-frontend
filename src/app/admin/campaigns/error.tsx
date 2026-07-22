"use client";

import { PageContent } from "@/components/page-content";
import { PageError } from "@/components/page-error";

export default function Error() {
  return (
    <PageContent>
      <PageError title="Failed to load campaigns" />
    </PageContent>
  );
}
