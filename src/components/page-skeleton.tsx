import { cn } from "@/lib/utils";

type SkeletonVariant = "cards" | "list" | "detail" | "custom";

interface PageSkeletonProps {
  /** Layout variant for the skeleton pattern */
  variant?: SkeletonVariant;
  /** Number of skeleton items to render (for cards/list variants) */
  count?: number;
  /** Custom skeleton content (used with variant="custom") */
  children?: React.ReactNode;
  className?: string;
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <SkeletonBlock className="h-10 w-10 rounded-lg" />
      <SkeletonBlock className="mt-4 h-4 w-20" />
      <SkeletonBlock className="mt-3 h-5 w-3/4" />
      <SkeletonBlock className="mt-3 h-4 w-full" />
      <SkeletonBlock className="mt-1.5 h-4 w-2/3" />
    </div>
  );
}

function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <SkeletonBlock className="h-8 w-8 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-1/3" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
      <SkeletonBlock className="h-6 w-16 rounded-full" />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-1/3" />
        <SkeletonBlock className="h-4 w-1/2" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <SkeletonBlock className="h-64 rounded-xl" />
    </div>
  );
}

/**
 * Standardized loading skeleton for pages.
 *
 * Use `variant` to select a pre-built pattern:
 * - "cards": grid of card skeletons (default)
 * - "list": vertical list of row skeletons
 * - "detail": header + stat cards + content area
 * - "custom": render your own children
 */
export function PageSkeleton({
  variant = "cards",
  count = 6,
  children,
  className,
}: PageSkeletonProps) {
  if (variant === "custom" && children) {
    return <div className={className}>{children}</div>;
  }

  if (variant === "detail") {
    return (
      <div className={cn("space-y-6", className)}>
        <DetailSkeleton />
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Default: cards
  return (
    <div className={cn("grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export { SkeletonBlock };
