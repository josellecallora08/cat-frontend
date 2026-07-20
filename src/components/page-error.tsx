"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageErrorProps {
  /** Error title (default: "Something went wrong") */
  title?: string;
  /** Error description shown below the title */
  message?: string;
  /** Retry handler — if provided, shows a retry button */
  onRetry?: () => void;
  /** Label for the retry button */
  retryLabel?: string;
  className?: string;
}

/**
 * Consistent error state for pages and sections.
 *
 * Renders a centered alert with icon, title, message, and optional retry action.
 */
export function PageError({
  title = "Something went wrong",
  message = "We couldn't load this page. Please try again.",
  onRetry,
  retryLabel = "Try again",
  className,
}: PageErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-xl border border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-6">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
