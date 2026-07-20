import { PageContent } from "@/components/page-content";
import { PageSkeleton, SkeletonBlock } from "@/components/page-skeleton";

/**
 * Loading boundary for the Scenarios page.
 * Shows a header skeleton + card grid matching the scenario cards layout.
 */
export default function ScenariosLoading() {
  return (
    <PageContent>
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-7 w-40" />
            <SkeletonBlock className="h-4 w-64" />
          </div>
          <SkeletonBlock className="h-8 w-28 rounded-lg" />
        </div>

        {/* Filter tabs skeleton */}
        <SkeletonBlock className="h-10 w-full max-w-md rounded-xl" />

        {/* Cards grid */}
        <PageSkeleton variant="cards" count={6} />
      </div>
    </PageContent>
  );
}
