import { MessageCircle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import type { RubricRecommendation } from "@/lib/api/sessions";

interface RecommendationPanelProps {
  recommendations: RubricRecommendation[];
}

const MAX_VISIBLE_RECOMMENDATIONS = 3;

export function RecommendationPanel({ recommendations }: RecommendationPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const grouped = useMemo(() => {
    const groups = new Map<string, RubricRecommendation[]>();
    const visible = expanded ? recommendations : recommendations.slice(0, MAX_VISIBLE_RECOMMENDATIONS);
    visible.forEach((recommendation) => {
      const key = recommendation.rubric_block_id;
      groups.set(key, [...(groups.get(key) ?? []), recommendation]);
    });
    return [...groups.entries()];
  }, [expanded, recommendations]);

  if (recommendations.length === 0) {
    return <p className="text-sm text-muted-foreground">No additional recommendations were generated.</p>;
  }

  return (
    <section aria-labelledby="rubric-recommendations-heading" className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /><h3 id="rubric-recommendations-heading" className="text-base font-semibold text-foreground">Recommended responses</h3></div>
      {grouped.map(([blockId, items]) => (
        <section key={blockId} aria-labelledby={`recommendation-group-${blockId}`} className="space-y-2">
          <h4 id={`recommendation-group-${blockId}`} className="text-sm font-semibold text-foreground">{items[0].block_name ?? blockId}</h4>
          <ul className="space-y-3">
            {items.map((recommendation) => (
              <li key={`${recommendation.rubric_block_id}-${recommendation.criterion_id}-${recommendation.evidence_sequence_number}`} className="rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground">Criterion: {recommendation.criterion_name ?? recommendation.criterion_id}</p>
                {recommendation.source_excerpt && <blockquote className="mt-2 border-l-2 border-primary/50 pl-2 text-xs italic text-muted-foreground">“{recommendation.source_excerpt}”</blockquote>}
                <p className="mt-2 text-sm text-foreground">{recommendation.explanation}</p>
                <p className="mt-2 flex gap-2 text-sm text-foreground"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span><strong>Try instead:</strong> {recommendation.recommended_response}</span></p>
                <p className="mt-2 text-xs text-muted-foreground">Coaching: {recommendation.coaching_advice}</p>
                <p className="mt-2 text-xs font-medium text-muted-foreground">Source speaker: {recommendation.source_speaker ?? "unknown"} · transcript sequence {recommendation.evidence_sequence_number}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {recommendations.length > MAX_VISIBLE_RECOMMENDATIONS && (
        <button type="button" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded} className="min-h-11 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {expanded ? "Show fewer recommendations" : `Show all recommendations (${recommendations.length})`}
        </button>
      )}
    </section>
  );
}
