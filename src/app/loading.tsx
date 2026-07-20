import { PageContent } from "@/components/page-content";
import { PageSkeleton } from "@/components/page-skeleton";

/**
 * Root-level loading boundary.
 * Renders the detail skeleton (header + stat cards + content area)
 * matching the dashboard layout.
 */
export default function RootLoading() {
  return (
    <PageContent>
      <PageSkeleton variant="detail" />
    </PageContent>
  );
}
