import { PageContent } from "@/components/page-content";
import { PageSkeleton, SkeletonBlock } from "@/components/page-skeleton";

/**
 * Loading boundary for the Sessions page.
 * Shows a header skeleton + list rows matching the sessions table layout.
 */
export default function SessionsLoading() {
  return (
    <PageContent>
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-7 w-36" />
            <SkeletonBlock className="h-4 w-56" />
          </div>
          <SkeletonBlock className="h-8 w-32 rounded-lg" />
        </div>

        {/* Filter tabs skeleton */}
        <SkeletonBlock className="h-10 w-full max-w-sm rounded-xl" />

        {/* List rows */}
        <PageSkeleton variant="list" count={8} />
      </div>
    </PageContent>
  );
}
