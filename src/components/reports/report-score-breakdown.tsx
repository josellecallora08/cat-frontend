import { RecommendationPanel } from "@/components/results/recommendation-panel";
import { RubricScoreCard } from "@/components/results/rubric-score-card";
import type { RubricCategoryScore, RubricRecommendation, TranscriptEntry } from "@/lib/api/sessions";
import type { SessionReport } from "@/lib/api/session-reports";
import { ReportSectionStatus } from "./report-status";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toRubricCategory(value: unknown): RubricCategoryScore | null {
  if (!isRecord(value) || typeof value.rubric_block_id !== "string" || typeof value.category !== "string"
    || (value.raw_score !== null && typeof value.raw_score !== "number")
    || (value.penalized_score !== null && typeof value.penalized_score !== "number")
    || typeof value.penalty_total !== "number" || typeof value.weight !== "number"
    || typeof value.weighted_contribution !== "number" || typeof value.passing_score !== "number"
    || typeof value.passed !== "boolean" || !Array.isArray(value.evidence)
    || !Array.isArray(value.strengths) || !Array.isArray(value.violations)
    || !Array.isArray(value.failed_criteria) || !Array.isArray(value.recommendation_inputs)) return null;
  return value as unknown as RubricCategoryScore;
}

function toRecommendation(value: unknown): RubricRecommendation | null {
  if (!isRecord(value) || typeof value.rubric_block_id !== "string" || typeof value.criterion_id !== "string"
    || typeof value.evidence_sequence_number !== "number" || typeof value.explanation !== "string"
    || typeof value.recommended_response !== "string" || typeof value.coaching_advice !== "string") return null;
  return value as unknown as RubricRecommendation;
}

function title(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ReportScoreBreakdown({ report }: { report: SessionReport }) {
  const data = report.payload.evaluation;
  const transcript = report.payload.transcript.entries as TranscriptEntry[];

  if (!data.available) {
    return <section data-report-section="evaluation" aria-labelledby="report-evaluation"><ReportSectionStatus title="Evaluation unavailable" reasonCode={data.reason_code} message={data.reason} /></section>;
  }
  if (data.mode === "not_applicable" || data.mode === "too_short" || data.reason_code === "no_evidence" || report.payload.transcript.entries.length === 0) {
    return <section data-report-section="evaluation" aria-labelledby="report-evaluation"><ReportSectionStatus title="Evaluation status" reasonCode={data.reason_code ?? (report.payload.transcript.entries.length === 0 ? "empty_transcript" : data.mode === "too_short" ? "session_too_short" : "not_applicable")} message={data.reason ?? (report.payload.transcript.entries.length === 0 ? "No scored outcome is assigned because the transcript is empty." : "No scored outcome is assigned for this session.")} tone="terminal" /></section>;
  }

  const categories = data.mode === "canonical"
    ? (isRecord(data.canonical) && Array.isArray(data.canonical.categories) ? data.canonical.categories.map(toRubricCategory).filter((item): item is RubricCategoryScore => item !== null) : [])
    : (isRecord(data.legacy) && Array.isArray(data.legacy.category_scores) ? data.legacy.category_scores : []);
  const recommendations = data.mode === "canonical" && isRecord(data.canonical) && Array.isArray(data.canonical.recommendations)
    ? data.canonical.recommendations.map(toRecommendation).filter((item): item is RubricRecommendation => item !== null)
    : [];

  return (
    <section data-report-section="evaluation" aria-labelledby="report-evaluation" className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 id="report-evaluation" className="text-lg font-semibold">Evaluation</h2>
        {data.mode === "legacy" && <p className="mt-1 text-xs text-muted-foreground">Legacy evaluation · scores are preserved from the original result.</p>}
      </div>
      {data.mode === "canonical" && categories.map((category) => <RubricScoreCard key={category.rubric_block_id} category={category} transcript={transcript} />)}
      {data.mode === "canonical" && categories.length === 0 && <p className="text-sm text-muted-foreground">No category scores are available.</p>}
      {data.mode === "canonical" && recommendations.length > 0 && <RecommendationPanel recommendations={recommendations} />}
      {data.mode === "legacy" && categories.map((category) => {
        if (!isRecord(category) || typeof category.category !== "string" || typeof category.score !== "number") return null;
        const score = Math.max(0, Math.min(100, category.score));
        return <article key={category.category} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{title(category.category)}</span><span className="text-sm text-muted-foreground">{score}/100</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${score}%` }} /></div></article>;
      })}
      {categories.length === 0 && data.mode === "legacy" && <p className="text-sm text-muted-foreground">No legacy category scores are available.</p>}
    </section>
  );
}
