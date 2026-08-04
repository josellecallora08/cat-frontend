import { CheckCircle2, CircleAlert } from "lucide-react";

interface WeightSummaryProps {
  total: number;
  errorCount?: number;
}

export function WeightSummary({ total, errorCount = 0 }: WeightSummaryProps) {
  const difference = 100 - total;
  const valid = total === 100 && errorCount === 0;
  const message = valid
    ? "Ready to publish"
    : difference > 0
      ? `${difference}% remaining`
      : `${Math.abs(difference)}% over the limit`;

  return (
    <section
      aria-labelledby="weight-summary-heading"
      className="rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="weight-summary-heading" className="text-sm font-semibold text-foreground">
            Weight summary
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">All rubric blocks must total exactly 100%.</p>
        </div>
        {valid ? (
          <CheckCircle2 className="h-5 w-5 text-success" aria-label="Valid weights" />
        ) : (
          <CircleAlert className="h-5 w-5 text-warning" aria-label="Weights need attention" />
        )}
      </div>
      <div className="mt-4 flex items-end justify-between gap-4" aria-live="polite" aria-atomic="true">
        <p className="text-3xl font-semibold text-foreground">{total}%</p>
        <p className={valid ? "text-sm font-medium text-success" : "text-sm font-medium text-warning"}>
          {message}
        </p>
      </div>
      {errorCount > 0 && <p className="mt-2 text-xs text-destructive">{errorCount} validation error{errorCount === 1 ? "" : "s"}.</p>}
    </section>
  );
}
