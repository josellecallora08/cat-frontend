import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageEmptyProps {
  /** Icon displayed above the message */
  icon?: LucideIcon;
  /** Main empty state message */
  title: string;
  /** Descriptive text below the title */
  description?: string;
  /** CTA button label — if provided with onAction, renders a button */
  actionLabel?: string;
  /** CTA click handler */
  onAction?: () => void;
  className?: string;
}

/**
 * Consistent empty state for pages and sections.
 *
 * Use when a list or grid has no items to display.
 * Provides a clear message and optional call-to-action.
 */
export function PageEmpty({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: PageEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button variant="default" size="sm" onClick={onAction} className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
