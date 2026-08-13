import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { RubricCategoryScore, TranscriptEntry } from "@/lib/api/sessions";
import { TranscriptEvidence } from "./transcript-evidence";

interface RubricScoreCardProps {
  category: RubricCategoryScore;
  transcript?: TranscriptEntry[];
}

export function RubricScoreCard({ category, transcript = [] }: RubricScoreCardProps) {
  const score = category.penalized_score;
  const scoreLabel = score === null ? "Not applicable" : `${score}/100`;

  return (
    <article className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4" aria-labelledby={`rubric-${category.rubric_block_id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`rubric-${category.rubric_block_id}`} className="text-base font-semibold text-foreground">{category.category}</h3>
          <p className="mt-1 text-xs text-muted-foreground">Block weight {category.weight}% · passing score {category.passing_score}%</p>
        </div>
        <Badge variant={category.passed ? "success" : "destructive"}>
          {category.passed ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
          {category.passed ? "Passing" : "Needs practice"}
        </Badge>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
      <div
        role="img"
        aria-label={`${category.category} score visualization: ${scoreLabel}`}
        className="rounded-lg bg-muted/40 p-3"
      >
        <p className="text-xs text-muted-foreground">Raw score</p>
        <p className="mt-1 font-semibold text-foreground">{category.raw_score === null ? "Not applicable" : `${category.raw_score}/100`}</p>
        <p className="sr-only">Final category score: {scoreLabel}. Passing status: {category.passed ? "passing" : "needs practice"}.</p>
      </div>
        <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Penalty applied</p><p className="mt-1 font-semibold text-foreground">-{category.penalty_total} points</p></div>
      </div>

      <p className="rounded-lg border border-border px-3 py-2 text-sm text-foreground">
        Calculation: {category.raw_score === null ? "not applicable" : `${category.penalized_score} × ${category.weight}% ÷ 100 = ${category.weighted_contribution.toFixed(2)}`} · Final category score: <strong>{scoreLabel}</strong>
      </p>

      {category.failed_criteria.length > 0 && <div><h4 className="text-sm font-semibold text-foreground">Failed criteria</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{category.failed_criteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></div>}
      {category.strengths.length > 0 && <div><h4 className="text-sm font-semibold text-foreground">Strengths</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{category.strengths.map((strength) => <li key={`${strength.criterion_id}-${strength.explanation}`}>{strength.explanation}</li>)}</ul></div>}
      {category.violations.length > 0 && <div><h4 className="text-sm font-semibold text-foreground">Violations</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{category.violations.map((violation) => <li key={`${violation.violation_id}-${violation.explanation}`}>{violation.explanation}</li>)}</ul></div>}
      <TranscriptEvidence evidence={category.evidence} transcript={transcript} />
    </article>
  );
}
