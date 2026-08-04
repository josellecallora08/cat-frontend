import { MessageCircle, Sparkles } from "lucide-react";

import type { RubricRecommendation } from "@/lib/api/sessions";

interface RecommendationPanelProps {
  recommendations: RubricRecommendation[];
}

export function RecommendationPanel({ recommendations }: RecommendationPanelProps) {
  if (recommendations.length === 0) {
    return <p className="text-sm text-muted-foreground">No additional recommendations were generated.</p>;
  }

  return (
    <section aria-labelledby="rubric-recommendations-heading" className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /><h3 id="rubric-recommendations-heading" className="text-base font-semibold text-foreground">Recommended responses</h3></div>
      <ul className="space-y-3">
        {recommendations.map((recommendation) => (
          <li key={`${recommendation.rubric_block_id}-${recommendation.criterion_id}-${recommendation.evidence_sequence_number}`} className="rounded-lg border border-border p-3">
            <p className="text-sm text-foreground">{recommendation.explanation}</p>
            <p className="mt-2 flex gap-2 text-sm text-foreground"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span><strong>Try instead:</strong> {recommendation.recommended_response}</span></p>
            <p className="mt-2 text-xs text-muted-foreground">Coaching: {recommendation.coaching_advice}</p>
            <p className="mt-2 text-xs font-medium text-muted-foreground">Source: transcript sequence {recommendation.evidence_sequence_number} · criterion {recommendation.criterion_id}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
