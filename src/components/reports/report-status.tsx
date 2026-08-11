import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SessionReportStateStatus } from "@/hooks/use-session-report";
import type { ReportReasonCode } from "@/lib/api/session-reports";

interface ReportStatusProps {
  status: SessionReportStateStatus;
  message?: string | null;
  reasonCode?: ReportReasonCode | null;
  onRetry?: () => void;
}

const STATUS_COPY: Partial<Record<SessionReportStateStatus, string>> = {
  loading: "Loading session report…",
  generating: "Your session report is being generated…",
  missing: "This session report is not available yet.",
  failed: "The session report could not be generated.",
  unauthorized: "You must sign in to view this session report.",
  forbidden: "You do not have access to this session report.",
  not_applicable: "Evaluation is not applicable for this session.",
  too_short: "This session was too short for a scored evaluation.",
  legacy_only: "This report uses a legacy evaluation format.",
  validation_error: "The session report could not be validated.",
  retryable_error: "The session report could not be loaded.",
};

export function ReportStatus({ status, message, reasonCode, onRetry }: ReportStatusProps) {
  const isLoading = status === "loading" || status === "generating";
  const copy = message || STATUS_COPY[status] || "The session report is unavailable.";
  const canRetry = status === "retryable_error" && onRetry;

  return (
    <div
      data-report-status={status}
      role={isLoading ? "status" : "alert"}
      aria-live={isLoading ? "polite" : "assertive"}
      className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-12 text-center"
    >
      {isLoading ? <Loader2 className="h-7 w-7 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" /> : <AlertCircle className="h-7 w-7 text-destructive" aria-hidden="true" />}
      <h2 className="mt-3 text-lg font-semibold">{copy}</h2>
      {reasonCode && <p className="mt-2 text-xs text-muted-foreground">Status: {reasonCode.replaceAll("_", " ")}</p>}
      {canRetry && <Button className="mt-5 min-h-11" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function ReportSectionStatus({
  title,
  reasonCode,
  message,
  tone = "neutral",
}: {
  title: string;
  reasonCode?: ReportReasonCode | null;
  message?: string | null;
  tone?: "neutral" | "terminal";
}) {
  return (
    <div data-report-section-status={title.toLowerCase().replaceAll(" ", "-")} role="status" className={`rounded-xl border p-4 text-sm ${tone === "terminal" ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/20"}`}>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-muted-foreground">{message || "This section is not available."}</p>
      {reasonCode && <p className="mt-2 text-xs text-muted-foreground">Status: {reasonCode.replaceAll("_", " ")}</p>}
    </div>
  );
}
