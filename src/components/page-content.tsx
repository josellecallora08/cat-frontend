import { cn } from "@/lib/utils";

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  /** Remove max-width constraint for full-bleed layouts */
  fullWidth?: boolean;
}

/**
 * Consistent page content wrapper providing uniform max-width,
 * padding, and vertical spacing for all page bodies.
 */
export function PageContent({ children, className, fullWidth = false }: PageContentProps) {
  return (
    <div
      className={cn(
        "flex-1 space-y-6 px-6 py-6 lg:px-8",
        !fullWidth && "mx-auto w-full max-w-7xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
