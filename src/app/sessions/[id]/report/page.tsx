"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { PageContent } from "@/components/page-content";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ReportCoachingSection } from "@/components/reports/report-coaching-section";
import { ReportDownloadMenu } from "@/components/reports/report-download-menu";
import { ReportLearningPlanSection } from "@/components/reports/report-learning-plan-section";
import { ReportScoreBreakdown } from "@/components/reports/report-score-breakdown";
import { ReportStatus } from "@/components/reports/report-status";
import { ReportSummary } from "@/components/reports/report-summary";
import { ReportTranscriptSection } from "@/components/reports/report-transcript-section";
import { useSessionReport } from "@/hooks/use-session-report";

export default function SessionReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const report = useSessionReport(id);

  if (report.status === "loading" || report.status === "generating") {
    return <PageContent><ReportStatus status={report.status} reasonCode={report.status === "generating" ? "generation_pending" : undefined} /></PageContent>;
  }

  if (!report.data) {
    return <PageContent><ReportStatus status={report.status} message={report.error?.message} onRetry={report.status === "retryable_error" ? report.refetch : undefined} /></PageContent>;
  }

  const terminal = report.status === "not_applicable" || report.status === "too_short" || report.status === "legacy_only";
  return (
    <PageContent className="print:space-y-4 print:px-0 print:py-0">
      <div data-report-page className="min-w-0 space-y-6">
        <PageHeader
          title="Session report"
          subtitle={`Version ${report.data.report_version} · ${report.data.content_hash.slice(0, 12)}`}
          actions={<div data-report-chrome className="flex flex-wrap gap-2"><Link data-report-navigation href={`/sessions/${id}/results`}><Button variant="outline" className="min-h-11"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Results</Button></Link><Button data-report-chrome variant="outline" className="min-h-11" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" />Print</Button><ReportDownloadMenu sessionId={id} /></div>}
        />
        {terminal && <ReportStatus status={report.status} reasonCode={report.status === "too_short" ? "session_too_short" : report.status === "legacy_only" ? "legacy_only" : "not_applicable"} />}
        {report.latest_attempt?.status === "failed" && <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">This report is showing the last successful snapshot. The latest generation attempt was not completed.</p>}
        <div className="space-y-5">
          <ReportSummary report={report.data} />
          <ReportScoreBreakdown report={report.data} />
          <ReportCoachingSection report={report.data} />
          <ReportLearningPlanSection report={report.data} />
          <ReportTranscriptSection report={report.data} />
        </div>
        <p className="sr-only" role="status">Session report loaded</p>
      </div>
    </PageContent>
  );
}
