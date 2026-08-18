import { RecommendationPanel } from "@/components/results/recommendation-panel";
import type { RubricRecommendation } from "@/lib/api/sessions";
import type { SessionReport } from "@/lib/api/session-reports";
import { ReportSectionStatus } from "./report-status";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recommendation(value: unknown): RubricRecommendation | null {
  if (!isRecord(value) || typeof value.rubric_block_id !== "string" || typeof value.criterion_id !== "string"
    || typeof value.evidence_sequence_number !== "number" || typeof value.explanation !== "string"
    || typeof value.recommended_response !== "string" || typeof value.coaching_advice !== "string") return null;
  return value as unknown as RubricRecommendation;
}

function label(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ReportCoachingSection({ report }: { report: SessionReport }) {
  const data = report.payload.coaching;
  const evaluation = report.payload.evaluation;
  if (evaluation.mode === "not_applicable" || evaluation.mode === "too_short" || evaluation.reason_code === "no_evidence" || report.payload.transcript.entries.length === 0) {
    const reasonCode = evaluation.mode === "too_short" ? "session_too_short" : evaluation.mode === "not_applicable" ? "not_applicable" : evaluation.reason_code === "no_evidence" ? "no_evidence" : "empty_transcript";
    return <section data-report-section="coaching" aria-labelledby="report-coaching"><ReportSectionStatus title="Coaching unavailable" reasonCode={reasonCode} message="No remediation is assigned for this evaluation state." tone="terminal" /></section>;
  }
  if (!data.available) {
    return <section data-report-section="coaching" aria-labelledby="report-coaching"><ReportSectionStatus title="Coaching unavailable" reasonCode={data.reason_code} message={data.reason} /></section>;
  }

  const canonicalBlocks = data.mode === "canonical" ? data.blocks : [];
  const canonicalRecommendations = canonicalBlocks.flatMap((block) => isRecord(block) && Array.isArray(block.recommendations) ? block.recommendations.map(recommendation).filter((item): item is RubricRecommendation => item !== null) : []);

  return (
    <section data-report-section="coaching" aria-labelledby="report-coaching" className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 id="report-coaching" className="text-lg font-semibold">Coaching</h2>
        {data.reason_code === "legacy_only" && <p className="mt-1 text-xs text-muted-foreground">Legacy coaching is shown below.</p>}
      </div>
      {data.mode === "canonical" && canonicalRecommendations.length > 0 && <RecommendationPanel recommendations={canonicalRecommendations} />}
      {data.mode === "canonical" && canonicalRecommendations.length === 0 && <ReportSectionStatus title="No coaching recommendations" reasonCode="no_coaching" message={data.reason ?? "No coaching recommendations were recorded."} />}
      {data.mode === "legacy" && Object.entries(data.legacy_mistakes_by_category).map(([category, mistakes]) => (
        <div key={category}>
          <h3 className="font-medium">{label(category)}</h3>
          <ul className="mt-2 space-y-2">
            {mistakes.map((mistake) => {
              if (!isRecord(mistake)) return null;
              const identity = `${category}-${String(mistake.transcript_position)}-${String(mistake.explanation)}`;
              return <li key={identity} className="rounded-xl border border-border p-3 text-sm"><p>{String(mistake.explanation ?? "")}</p><p className="mt-1 text-muted-foreground">Try: {String(mistake.recommended_alternative ?? "")}</p><p className="mt-1 text-xs text-muted-foreground">Source sequence: {String(mistake.transcript_position)}</p></li>;
            })}
          </ul>
        </div>
      ))}
      {data.mode === "legacy" && Object.keys(data.legacy_mistakes_by_category).length === 0 && <ReportSectionStatus title="No coaching recommendations" reasonCode="no_coaching" message={data.reason ?? "No coaching recommendations were recorded."} />}
    </section>
  );
}
