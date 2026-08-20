import type { ReactNode } from "react";

import { ReportExportControl } from "@/components/results/report-export-control";
import { ReportSection } from "@/components/results/report-section";
import { Button } from "@/components/ui/button";
import { SECTION_NAMES } from "@/lib/api/report";
import { useAuthStore } from "@/stores/auth-store";
import type { NormalizedReport, ReportSectionName } from "@/types/report";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface ReportShellProps {
  report: NormalizedReport | null;
  reportError: Error | null;
  sessionId: string;
  onRetry: () => void;
  onRetrySection?: (name: ReportSectionName) => void;
  activeSection?: ReportSectionName;
  onSectionSelect?: (name: ReportSectionName) => void;
  headerTitle?: string;
  headerDescription?: string;
  children: ReactNode;
}

const NAV_SECTION_NAMES = SECTION_NAMES.filter((name) => name !== "metadata");

function overallEvaluation(score: number | null): string {
  if (score === null) return "Unavailable";
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very good";
  if (score >= 70) return "Meets expectations";
  if (score >= 60) return "Needs improvement";
  return "Significant improvement needed";
}

function isAccessFailure(error: Error | null): boolean {
  const candidate = error as Error & { category?: string } | null;
  return candidate?.category === "unauthorized"
    || candidate?.category === "forbidden"
    || candidate?.category === "not_found";
}

export function ReportShell({ report, reportError, sessionId, onRetry, onRetrySection, activeSection, onSectionSelect, headerTitle = "Session report", headerDescription, children }: ReportShellProps) {
  const isAdmin = useAuthStore((state) => state.isHydrated && state.user?.role === "admin");

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

  const sections = report?.sections;
  const hasFailures = sections && Object.values(sections).some((section) => section.state === "failed");
  const session = report?.session ?? {};
  const scenario = typeof session.scenario_name === "string" ? session.scenario_name : typeof session.scenario === "string" ? session.scenario : "Scenario unavailable";
  const participant = typeof session.participant_name === "string" ? session.participant_name : typeof session.user_name === "string" ? session.user_name : typeof session.agent_name === "string" ? session.agent_name : typeof session.user === "object" && session.user && "full_name" in session.user && typeof session.user.full_name === "string" ? session.user.full_name : "Participant";
  const campaign = typeof session.campaign_name === "string" ? session.campaign_name : "No campaign";
  const evaluation = sections?.evaluation.data;
  const overallScore = evaluation && typeof evaluation === "object" && "overall_score" in evaluation && typeof evaluation.overall_score === "number"
    ? evaluation.overall_score
    : evaluation && typeof evaluation === "object" && "weighted_total" in evaluation && typeof evaluation.weighted_total === "number"
      ? evaluation.weighted_total
      : null;

  return (
    <main aria-labelledby="report-title" className="min-h-screen min-w-0 overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="relative flex min-w-0 flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <Link href="/sessions" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to sessions
          </Link>
          <div aria-live="polite" className="sm:absolute sm:left-1/2 sm:top-0 sm:-translate-x-1/2 sm:text-center">
            <h1 id="report-title" className="text-2xl font-semibold text-foreground">{headerTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{headerDescription ?? `${scenario} · ${participant}`}</p>
            {headerDescription && report && <p className="mt-0.5 text-xs text-muted-foreground">{scenario} · {participant}</p>}
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            {isAdmin && <ReportExportControl sessionId={sessionId} />}
            {hasFailures && <Button type="button" variant="outline" className="min-h-11 max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={onRetry}>Retry complete report</Button>}
          </div>
        </header>
        {report && (
          <dl className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-xs uppercase text-muted-foreground">Name</dt><dd className="mt-1 text-sm font-medium">{participant}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Campaign</dt><dd className="mt-1 text-sm font-medium">{campaign}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Overall score</dt><dd className="mt-1 text-sm font-medium">{overallScore === null ? "Unavailable" : `${overallScore} / 100`}</dd></div>
            <div><dt className="text-xs uppercase text-muted-foreground">Overall evaluation</dt><dd className="mt-1 text-sm font-medium">{overallEvaluation(overallScore)}</dd></div>
          </dl>
        )}
        {report?.report_status === "not_applicable" && (
          <div role="status" aria-live="polite" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
            Evaluation not applicable: fewer than four transcript utterances were available. No passing or failing score was assigned.
          </div>
        )}
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:items-start">
          <aside className="hidden rounded-2xl border border-border bg-card p-3 lg:sticky lg:top-6 lg:block" aria-label="Report sections">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Report sections</p>
            <nav aria-label="Report sections">
              <ul className="space-y-1">
                {NAV_SECTION_NAMES.map((name) => {
                  const section = sections?.[name];
                  const label = name.replace(/_/g, " ");
                  const state = section?.state;
                  return (
                    <li key={name}>
                      <button type="button" aria-current={activeSection === name ? "page" : undefined} onClick={() => onSectionSelect?.(name)} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-sm capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeSection === name ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                        <span>{label}</span>
                        {state === "loaded" && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Completed" />}
                        {state === "failed" && <span className="text-xs text-destructive">Retry</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
          <div className="min-w-0">
            <div className="mb-4 flex gap-2 overflow-x-auto rounded-xl border border-border bg-card p-2 lg:hidden" aria-label="Report sections">
              {NAV_SECTION_NAMES.map((name) => (
                <button type="button" key={name} aria-current={activeSection === name ? "page" : undefined} onClick={() => onSectionSelect?.(name)} className={`min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeSection === name ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <span className="inline-flex items-center gap-2">{name.replace(/_/g, " ")}{sections?.[name]?.state === "loaded" && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Completed" />}</span>
                </button>
              ))}
            </div>
            <section id="metadata-heading" aria-labelledby="report-title" className="min-w-0">
              {children}
            </section>
            <div className="sr-only">
              {SECTION_NAMES.map((name) => (
                <ReportSection key={name} section={sections?.[name] ?? { name, state: "loading", data: null, unavailable_reason: null, failure: null, updated_at: null }} title={name.replace(/_/g, " ")} onRetry={onRetrySection ? () => onRetrySection(name) : undefined}>
                  {null}
                </ReportSection>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
