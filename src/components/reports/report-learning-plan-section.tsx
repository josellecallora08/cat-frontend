import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isValidScenarioId } from "@/lib/api/sessions";
import type { SessionReport } from "@/lib/api/session-reports";
import { ReportSectionStatus } from "./report-status";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function label(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ReportLearningPlanSection({ report }: { report: SessionReport }) {
  const data = report.payload.learning_plan;
  const sessionScenarioId = report.payload.summary.scenario_id;
  const evaluationMode = report.payload.evaluation.mode;
  const terminalEvaluation = evaluationMode === "not_applicable" || evaluationMode === "too_short" || evaluationMode === "legacy_only" || report.payload.evaluation.reason_code === "no_evidence" || report.payload.transcript.entries.length === 0;
  if (terminalEvaluation) {
    const reasonCode = evaluationMode === "too_short" ? "session_too_short" : evaluationMode === "legacy_only" ? "legacy_only" : report.payload.transcript.entries.length === 0 ? "empty_transcript" : report.payload.evaluation.reason_code === "no_evidence" ? "no_evidence" : "not_applicable";
    return <section data-report-section="learning-plan" aria-labelledby="report-plan"><ReportSectionStatus title="Learning plan unavailable" reasonCode={reasonCode} message="No practice action is assigned for this evaluation state." tone="terminal" /></section>;
  }
  if (!data.available) {
    return <section data-report-section="learning-plan" aria-labelledby="report-plan"><ReportSectionStatus title="Learning plan unavailable" reasonCode={data.reason_code} message={data.reason} /></section>;
  }
  if (data.all_passing) {
    return <section data-report-section="learning-plan" aria-labelledby="report-plan" className="rounded-2xl border border-border bg-card p-5"><h2 id="report-plan" className="text-lg font-semibold">Learning plan</h2><p className="mt-2 text-sm text-emerald-600">All competencies are passing.</p></section>;
  }

  return (
    <section data-report-section="learning-plan" aria-labelledby="report-plan" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="report-plan" className="text-lg font-semibold">Learning plan</h2>
      {data.items.length === 0 ? <ReportSectionStatus title="No learning-plan items" reasonCode="no_learning_plan" message={data.reason ?? "No practice items were recorded."} /> : <ul className="mt-4 space-y-3">
        {data.items.map((item) => {
          if (!isRecord(item)) return null;
          const category = typeof item.category === "string" ? item.category : "Practice focus";
          const identity = `${String(item.rubric_block_id ?? "legacy")}-${String(item.criterion_id ?? category)}`;
          const scenarioId = typeof item.scenario_id === "string" ? item.scenario_id : null;
          const recommendedScenario = typeof item.recommended_scenario === "string" ? item.recommended_scenario : null;
          const practiceFocus = typeof item.practice_focus === "string" ? item.practice_focus : null;
          const canPractice = scenarioId !== null && scenarioId === sessionScenarioId && isValidScenarioId(scenarioId);
          return <li key={identity} className="flex min-w-0 flex-col items-stretch gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-medium">{label(category)}</p><p className="mt-1 text-sm text-muted-foreground">Score {typeof item.score === "number" ? item.score : "Unavailable"}/100</p><p className="mt-2 text-sm text-muted-foreground">{practiceFocus ?? recommendedScenario ?? "Practice this competency."}</p>{recommendedScenario && <p className="mt-1 text-xs text-muted-foreground">Scenario: {recommendedScenario}</p>}</div>{canPractice && <Link href={`/sessions/new?scenario_id=${encodeURIComponent(scenarioId)}`} data-practice-action="true" className="w-full sm:w-auto"><Button variant="outline" size="sm" className="min-h-11 w-full sm:w-auto" aria-label={`Practice ${label(category)}`}>Practice<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button></Link>}</li>;
        })}
      </ul>}
    </section>
  );
}
