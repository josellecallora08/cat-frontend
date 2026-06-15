"use client";

import { use } from "react";
import Link from "next/link";
import {
  useEvaluation,
  useCoaching,
  useLearningPlan,
} from "@/hooks/use-session-results";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  EvaluationResult,
  CoachingReport,
  LearningPlan,
  CompetencyScore,
  MistakeItem,
  LearningPlanItem,
} from "@/lib/api/sessions";

// --- Constants ---

const CATEGORY_LABELS: Record<string, string> = {
  call_opening: "Call Opening",
  compliance: "Compliance",
  empathy_communication: "Empathy & Communication",
  negotiation_resolution: "Negotiation & Resolution",
};

const CATEGORY_WEIGHTS: Record<string, number> = {
  call_opening: 0.2,
  compliance: 0.3,
  empathy_communication: 0.25,
  negotiation_resolution: 0.25,
};

function formatCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

function formatWeight(category: string): string {
  const weight = CATEGORY_WEIGHTS[category];
  return weight ? `${Math.round(weight * 100)}%` : "";
}

// --- Skeleton Components ---

function SectionSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 w-1/3 bg-muted rounded" />
        <div className="h-4 w-1/2 bg-muted rounded" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-4 w-2/3 bg-muted rounded" />
      </CardContent>
    </Card>
  );
}

// --- Error Components ---

function SectionError({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: Error | null;
  onRetry: () => void;
}) {
  const is404 =
    error instanceof Error && error.message.includes("404");

  if (is404) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Results are not ready yet. Please check back in a moment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive font-medium">
            Failed to load {title.toLowerCase()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {error?.message ?? "An unexpected error occurred"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onRetry}
          >
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Score Display ---

function ScoreCircle({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return "text-green-600 dark:text-green-400";
    if (s >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-4xl font-bold ${getColor(score)}`}>
        {Math.round(score)}
      </span>
      <span className="text-xs text-muted-foreground">Overall Score</span>
    </div>
  );
}

function CategoryScoreBar({ item }: { item: CompetencyScore }) {
  const weight = formatWeight(item.category);
  const getBarColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">
          {formatCategoryLabel(item.category)}
        </span>
        <span className="text-muted-foreground">
          {item.score}/100{weight && ` (${weight})`}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${getBarColor(item.score)}`}
          style={{ width: `${item.score}%` }}
        />
      </div>
    </div>
  );
}

// --- Evaluation Section ---

function EvaluationSection({ data }: { data: EvaluationResult }) {
  if (data.is_too_short) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evaluation</CardTitle>
          <CardDescription>Performance assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-center">
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              Session Too Short
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your session did not meet the minimum requirement of 4 agent
              utterances. Please complete a longer conversation to receive a full
              evaluation.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Evaluation</CardTitle>
        <CardDescription>Performance assessment across key competencies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="flex justify-center py-2">
          <ScoreCircle score={data.overall_score} />
        </div>

        {/* Category Scores */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Category Scores</h4>
          {data.category_scores.map((item) => (
            <CategoryScoreBar key={item.category} item={item} />
          ))}
        </div>

        {/* Strengths */}
        {data.strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-green-700 dark:text-green-400">
              Strengths
            </h4>
            <ul className="space-y-2">
              {data.strengths.map((s, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-green-500/20 bg-green-500/5 p-3"
                >
                  <p className="text-sm font-medium">{s.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCategoryLabel(s.category)}
                  </p>
                  {s.transcript_excerpt && (
                    <blockquote className="mt-2 border-l-2 border-green-500/40 pl-2 text-xs text-muted-foreground italic">
                      &ldquo;{s.transcript_excerpt}&rdquo;
                    </blockquote>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {data.weaknesses.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">
              Areas for Improvement
            </h4>
            <ul className="space-y-2">
              {data.weaknesses.map((w, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"
                >
                  <p className="text-sm font-medium">{w.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCategoryLabel(w.category)}
                  </p>
                  {w.transcript_excerpt && (
                    <blockquote className="mt-2 border-l-2 border-red-500/40 pl-2 text-xs text-muted-foreground italic">
                      &ldquo;{w.transcript_excerpt}&rdquo;
                    </blockquote>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Coaching Section ---

function CoachingSection({ data }: { data: CoachingReport }) {
  if (data.no_mistakes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Coaching Report</CardTitle>
          <CardDescription>Detailed feedback on your conversation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Excellent Work! 🎉
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              No mistakes identified in this session. You demonstrated strong
              performance across all categories. Keep up the great work!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categories = Object.keys(data.mistakes_by_category);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Coaching Report</CardTitle>
        <CardDescription>
          {data.total_mistakes} improvement{" "}
          {data.total_mistakes === 1 ? "opportunity" : "opportunities"}{" "}
          identified
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category) => {
          const mistakes = data.mistakes_by_category[category];
          if (!mistakes || mistakes.length === 0) return null;

          return (
            <div key={category} className="space-y-2">
              <h4 className="text-sm font-semibold">
                {formatCategoryLabel(category)}
              </h4>
              <ul className="space-y-2">
                {mistakes.map((mistake: MistakeItem, i: number) => (
                  <li
                    key={i}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    {mistake.transcript_excerpt && (
                      <blockquote className="border-l-2 border-muted-foreground/40 pl-2 text-xs text-muted-foreground italic">
                        &ldquo;{mistake.transcript_excerpt}&rdquo;
                      </blockquote>
                    )}
                    <p className="text-sm">
                      <span className="font-medium text-destructive">
                        Issue:{" "}
                      </span>
                      {mistake.explanation}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-green-700 dark:text-green-400">
                        Try instead:{" "}
                      </span>
                      {mistake.recommended_alternative}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// --- Learning Plan Section ---

function LearningPlanSection({ data }: { data: LearningPlan }) {
  if (data.all_passing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Learning Plan</CardTitle>
          <CardDescription>Recommended next steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              All Competencies Passing! 🏆
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Congratulations! All your competency scores are above the passing
              threshold. No additional training scenarios are recommended at this
              time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Learning Plan</CardTitle>
        <CardDescription>
          Recommended scenarios to strengthen weak areas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {data.weak_competencies.map((item: LearningPlanItem) => (
            <li
              key={item.category}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {formatCategoryLabel(item.category)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Score: {item.score}/100 — below passing threshold (70)
                </p>
              </div>
              <Link
                href={`/scenarios?recommended=${encodeURIComponent(item.recommended_scenario)}`}
              >
                <Button variant="outline" size="sm">
                  {item.recommended_scenario}
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---

export default function SessionResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const evaluation = useEvaluation(id);
  const coaching = useCoaching(id);
  const learningPlan = useLearningPlan(id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Session Results</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review your performance and improvement areas
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm">
            Back to Scenarios
          </Button>
        </Link>
      </div>

      {/* Evaluation Section */}
      {evaluation.isLoading && <SectionSkeleton />}
      {evaluation.isError && (
        <SectionError
          title="Evaluation"
          error={evaluation.error}
          onRetry={() => evaluation.refetch()}
        />
      )}
      {evaluation.data && <EvaluationSection data={evaluation.data} />}

      {/* Coaching Section */}
      {coaching.isLoading && <SectionSkeleton />}
      {coaching.isError && (
        <SectionError
          title="Coaching Report"
          error={coaching.error}
          onRetry={() => coaching.refetch()}
        />
      )}
      {coaching.data && <CoachingSection data={coaching.data} />}

      {/* Learning Plan Section */}
      {learningPlan.isLoading && <SectionSkeleton />}
      {learningPlan.isError && (
        <SectionError
          title="Learning Plan"
          error={learningPlan.error}
          onRetry={() => learningPlan.refetch()}
        />
      )}
      {learningPlan.data && <LearningPlanSection data={learningPlan.data} />}
    </div>
  );
}
