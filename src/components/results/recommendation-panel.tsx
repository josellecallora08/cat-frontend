import { MessageCircle, Sparkles } from "lucide-react";
import { useId, useMemo, useState } from "react";

import type { RubricRecommendation } from "@/lib/api/sessions";

interface RecommendationPanelProps {
  recommendations: RubricRecommendation[];
}

const MAX_VISIBLE_RECOMMENDATIONS = 3;
const DISCLOSURE_THRESHOLD = 11;

function domId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function RecommendationPanel({ recommendations }: RecommendationPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const instanceId = useId().replaceAll(":", "");
  const recommendationsRegionId = `recommendations-${instanceId}`;
  const orderedRecommendations = useMemo(
    () => recommendations
      .map((recommendation, originalIndex) => ({ recommendation, originalIndex }))
      .sort((left, right) =>
        (left.recommendation.display_order ?? Number.MAX_SAFE_INTEGER)
          - (right.recommendation.display_order ?? Number.MAX_SAFE_INTEGER)
        || left.originalIndex - right.originalIndex,
      )
      .map(({ recommendation }) => recommendation),
    [recommendations],
  );
  const visibleRecommendations = expanded || recommendations.length < DISCLOSURE_THRESHOLD
    ? orderedRecommendations
    : orderedRecommendations.slice(0, MAX_VISIBLE_RECOMMENDATIONS);
  const grouped = useMemo(() => {
    const groups = new Map<string, RubricRecommendation[]>();
    visibleRecommendations.forEach((recommendation) => {
      const key = recommendation.rubric_block_id;
      groups.set(key, [...(groups.get(key) ?? []), recommendation]);
    });
    return [...groups.entries()];
  }, [visibleRecommendations]);

  if (recommendations.length === 0) {
    return <p className="text-sm text-muted-foreground">No additional recommendations were generated.</p>;
  }

  return (
    <section aria-labelledby={`rubric-recommendations-heading-${instanceId}`} className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4 [overflow-wrap:anywhere]">
      <div className="flex min-w-0 items-center gap-2"><Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><h3 id={`rubric-recommendations-heading-${instanceId}`} className="text-base font-semibold text-foreground">What to try next time</h3></div>
      <div id={recommendationsRegionId} className="min-w-0 space-y-3" aria-live="polite">
        {grouped.map(([blockId, items]) => {
          const groupId = `recommendation-group-${instanceId}-${domId(blockId)}`;
          const first = items[0];
          return (
            <section key={blockId} aria-labelledby={groupId} className="min-w-0 space-y-2">
              <h4 id={groupId} className="break-words text-sm font-semibold text-foreground">{first.block_name ?? blockId}</h4>
              <p className="break-words text-xs text-muted-foreground">Rubric block ID: {blockId}</p>
              <ul className="min-w-0 space-y-3">
                {items.map((recommendation) => (
                  <li key={`${recommendation.rubric_block_id}-${recommendation.criterion_id}-${recommendation.evidence_sequence_number}`} className="min-w-0 break-words rounded-lg border border-border p-3 [overflow-wrap:anywhere]">
                    <p className="text-xs font-medium text-muted-foreground">Criterion: {recommendation.criterion_name ?? recommendation.criterion_id} <span className="font-normal">(ID: {recommendation.criterion_id})</span></p>
                    {recommendation.source_excerpt && <blockquote className="mt-2 break-words border-l-2 border-primary/50 pl-2 text-xs italic text-muted-foreground [overflow-wrap:anywhere]">“{recommendation.source_excerpt}”</blockquote>}
                    <p className="mt-2 text-sm text-foreground">{recommendation.explanation}</p>
                    <p className="mt-2 flex min-w-0 gap-2 text-sm text-foreground"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span className="min-w-0 break-words"><strong>Try instead:</strong> {recommendation.recommended_response}</span></p>
                    <p className="mt-2 text-xs text-muted-foreground">Coaching: {recommendation.coaching_advice}</p>
                    <p className="mt-2 text-xs font-medium text-muted-foreground">Source speaker: {recommendation.source_speaker ?? "unknown"} · transcript sequence {recommendation.evidence_sequence_number}</p>
                    {(recommendation.standard_version_id || recommendation.standard_version_number !== undefined && recommendation.standard_version_number !== null) && (
                      <p className="mt-2 text-xs text-muted-foreground">Pinned standard: {recommendation.standard_version_id ?? "current version"}{recommendation.standard_version_number !== undefined && recommendation.standard_version_number !== null ? ` · version ${recommendation.standard_version_number}` : ""}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {recommendations.length >= DISCLOSURE_THRESHOLD && (
        <button type="button" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded} aria-controls={recommendationsRegionId} className="min-h-11 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          {expanded ? "Show fewer recommendations" : `Show all recommendations (${recommendations.length})`}
        </button>
      )}
    </section>
  );
}
