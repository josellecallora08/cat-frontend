"use client";

import Link from "next/link";
import { use } from "react";

import { PageContent } from "@/components/page-content";
import { PageError } from "@/components/page-error";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { StandardEditor } from "@/components/admin/standards/standard-editor";
import { useNegotiationStandard } from "@/hooks/use-negotiation-standards";
import { StandardApiError } from "@/lib/api/negotiation-standards";
import { useAuthStore } from "@/stores/auth-store";

interface StandardsPageProps {
  params: Promise<{ id: string }>;
}

export default function NegotiationStandardsPage({ params }: StandardsPageProps) {
  const { id } = use(params);
  const user = useAuthStore((state) => state.user);
  const standardQuery = useNegotiationStandard(id);
  const isAdmin = user?.role === "admin";
  const isMissing = standardQuery.error instanceof StandardApiError && standardQuery.error.status === 404;

  if (standardQuery.isLoading) return <PageContent><PageSkeleton variant="detail" /></PageContent>;
  if (standardQuery.isError && !isMissing) return <PageContent><PageError title="Failed to load negotiation standard" message={standardQuery.error instanceof Error ? standardQuery.error.message : undefined} onRetry={standardQuery.refetch} /></PageContent>;

  return (
    <PageContent>
      <Link href={`/admin/campaigns/${id}`} className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">← Back to campaign</Link>
      <PageHeader title="Negotiation standard" subtitle="Create, validate, preview, and publish the campaign rubric." />
      <StandardEditor campaignId={id} standard={isMissing ? null : standardQuery.data ?? null} isAdmin={isAdmin} />
    </PageContent>
  );
}
