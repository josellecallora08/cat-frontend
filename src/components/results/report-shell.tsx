import type { ReactNode } from "react";

import { ReportExportControl } from "@/components/results/report-export-control";
import { ReportSection } from "@/components/results/report-section";
import { Button } from "@/components/ui/button";
import { SECTION_NAMES } from "@/lib/api/report";
import { useAuthStore } from "@/stores/auth-store";
import type { NormalizedReport, ReportSectionName } from "@/types/report";

interface ReportShellProps {
  report: NormalizedReport | null;
  reportError: Error | null;
  sessionId: string;
  onRetry: () => void;
  onRetrySection?: (name: ReportSectionName) => void;
  children: ReactNode;
}

function isAccessFailure(error: Error | null): boolean {
  const candidate = error as Error & { category?: string } | null;
  return candidate?.category === "unauthorized"
    || candidate?.category === "forbidden"
    || candidate?.category === "not_found";
}

export function ReportShell({ report, reportError, sessionId, onRetry, onRetrySection, children }: ReportShellProps) {
  if (reportError && isAccessFailure(reportError)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4" aria-labelledby="report-error-heading">
        <div className="space-y-4 text-center">
          <h1 id="report-error-heading" className="text-lg font-semibold">Unable to access this report</h1>
          <p className="text-sm text-muted-foreground">Please sign in again or verify that this session is available.</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={onRetry}>Try again</Button>
        </div>
      </main>
    );
  }

  const isAdmin = useAuthStore((state) => state.isHydrated && state.user?.role === "admin");
  const sections = report?.sections;
  const hasFailures = sections && Object.values(sections).some((section) => section.state === "failed");
  const version = report?.evaluation_version;

  return (
    <main aria-labelledby="report-title" className="min-h-screen min-w-0 overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 id="report-title" className="text-2xl font-medium text-foreground">Session report</h1>
            {report && <p className="text-sm text-muted-foreground">Session {report.session_id}</p>}
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            {isAdmin && <ReportExportControl sessionId={sessionId} />}
            {hasFailures && <Button type="button" variant="outline" className="min-h-11 max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={onRetry}>Retry complete report</Button>}
          </div>
        </header>
        {report && (
          <dl className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-xs uppercase text-muted-foreground">Report status</dt><dd className="mt-1 text-sm font-medium">{report.report_status}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Score status</dt><dd className="mt-1 text-sm font-medium">{report.score_status}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Evaluation</dt><dd className="mt-1 text-sm font-medium">{version?.kind === "legacy" ? "Legacy evaluation" : version?.name ?? "Current evaluation"}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Version</dt><dd className="mt-1 text-sm font-medium">{version?.number ?? "Unavailable"}</dd></div>
          </dl>
        )}
        {report?.report_status === "not_applicable" && (
          <div role="status" aria-live="polite" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            Evaluation not applicable: fewer than four transcript utterances were available. No passing or failing score was assigned.
          </div>
        )}
        <nav aria-label="Report sections" className="min-w-0">
          {SECTION_NAMES.map((name) => (
            <ReportSection key={name} section={sections?.[name] ?? { name, state: "loading", data: null, unavailable_reason: null, failure: null, updated_at: null }} title={name.replace("_", " ")} onRetry={onRetrySection ? () => onRetrySection(name) : undefined}>
              {name === "metadata" ? children : null}
            </ReportSection>
          ))}
        </nav>
      </div>
    </main>
  );
}
