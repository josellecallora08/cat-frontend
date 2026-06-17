"use client";

import { use } from "react";
import Link from "next/link";
import {
  useEvaluation,
  useCoaching,
  useLearningPlan,
} from "@/hooks/use-session-results";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  ThumbsUp,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import type {
  EvaluationResult,
  CoachingReport,
  LearningPlan,
  CompetencyScore,
  MistakeItem,
  LearningPlanItem,
} from "@/lib/api/sessions";

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

const PASS_THRESHOLD = 70;

function formatCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

function formatWeight(category: string): string {
  const weight = CATEGORY_WEIGHTS[category];
  return weight ? `${Math.round(weight * 100)}%` : "";
}

// Score → semantic token class. Uses only success/warning/destructive roles.
function scoreToneText(s: number): string {
  if (s >= 80) return "text-success-foreground";
  if (s >= 60) return "text-warning-foreground";
  return "text-destructive";
}
function scoreToneBar(s: number): string {
  if (s >= 80) return "bg-success";
  if (s >= 60) return "bg-warning";
  return "bg-destructive";
}

function Breadcrumb() {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <Link
            href="/results"
            className="rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Results
          </Link>
        </li>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
        <li className="font-medium text-foreground" aria-current="page">
          Session
        </li>
      </ol>
    </nav>
  );
}

function SectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

function SectionError({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: Error | null;
  onRetry: () => void;
}) {
  const is404 = error instanceof Error && error.message.includes("404");
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium leading-tight text-foreground">{title}</h2>
      </CardHeader>
      <CardContent>
        {is404 ? (
          <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Results aren&apos;t ready yet. Check back in a moment.
            </p>
          </div>
        ) : (
          <div role="alert" className="rounded-lg border border-border bg-card p-4 text-center">
            <AlertCircle
              className="mx-auto h-5 w-5 text-destructive"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm font-medium text-foreground">
              Couldn&apos;t load {title.toLowerCase()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error?.message ?? "An unexpected error occurred."}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusCallout({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: "success" | "warning";
  icon: typeof CheckCircle2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 text-center",
        tone === "success"
          ? "border-success/30 bg-success-muted"
          : "border-warning/30 bg-warning-muted"
      )}
    >
      <Icon
        className={cn(
          "mx-auto h-5 w-5",
          tone === "success" ? "text-success-foreground" : "text-warning-foreground"
        )}
        aria-hidden="true"
      />
      <p
        className={cn(
          "mt-2 text-sm font-medium",
          tone === "success" ? "text-success-foreground" : "text-warning-foreground"
        )}
      >
        {title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

function CategoryScoreBar({ item }: { item: CompetencyScore }) {
  const weight = formatWeight(item.category);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-foreground">
          {formatCategoryLabel(item.category)}
        </span>
        <span className="text-muted-foreground">
          {item.score}/100{weight && ` · ${weight}`}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={item.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={formatCategoryLabel(item.category)}
      >
        <div
          className={cn("h-full rounded-full transition-all motion-reduce:transition-none", scoreToneBar(item.score))}
          style={{ width: `${item.score}%` }}
        />
      </div>
    </div>
  );
}

function EvaluationSection({ data }: { data: EvaluationResult }) {
  if (data.is_too_short) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium leading-tight text-foreground">
            Evaluation
          </h2>
        </CardHeader>
        <CardContent>
          <StatusCallout tone="warning" icon={AlertTriangle} title="Session too short">
            This session didn&apos;t reach the minimum of 4 agent turns. Complete a
            longer conversation to receive a full evaluation.
          </StatusCallout>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium leading-tight text-foreground">
          Evaluation
        </h2>
        <p className="text-sm text-muted-foreground">
          Performance across key competencies
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {data.category_scores.map((item) => (
            <CategoryScoreBar key={item.category} item={item} />
          ))}
        </div>

        {data.strengths.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <ThumbsUp className="h-4 w-4 text-success-foreground" aria-hidden="true" />
              Strengths
            </h3>
            <ul className="space-y-2">
              {data.strengths.map((s, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-success/20 bg-success-muted/50 p-3"
                >
                  <p className="text-sm font-medium text-foreground">{s.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCategoryLabel(s.category)}
                  </p>
                  {s.transcript_excerpt && (
                    <blockquote className="mt-2 border-l-2 border-success/40 pl-2 text-xs italic text-muted-foreground">
                      &ldquo;{s.transcript_excerpt}&rdquo;
                    </blockquote>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.weaknesses.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
              Areas for improvement
            </h3>
            <ul className="space-y-2">
              {data.weaknesses.map((w, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                >
                  <p className="text-sm font-medium text-foreground">{w.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCategoryLabel(w.category)}
                  </p>
                  {w.transcript_excerpt && (
                    <blockquote className="mt-2 border-l-2 border-destructive/40 pl-2 text-xs italic text-muted-foreground">
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

function CoachingSection({ data }: { data: CoachingReport }) {
  if (data.no_mistakes) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium leading-tight text-foreground">
            Coaching report
          </h2>
        </CardHeader>
        <CardContent>
          <StatusCallout tone="success" icon={CheckCircle2} title="Excellent work">
            No mistakes identified in this session. You showed strong performance
            across all categories.
          </StatusCallout>
        </CardContent>
      </Card>
    );
  }

  const categories = Object.keys(data.mistakes_by_category);
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium leading-tight text-foreground">
          Coaching report
        </h2>
        <p className="text-sm text-muted-foreground">
          {data.total_mistakes} improvement{" "}
          {data.total_mistakes === 1 ? "opportunity" : "opportunities"} identified
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category) => {
          const mistakes = data.mistakes_by_category[category];
          if (!mistakes || mistakes.length === 0) return null;
          return (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">
                {formatCategoryLabel(category)}
              </h3>
              <ul className="space-y-2">
                {mistakes.map((mistake: MistakeItem, i: number) => (
                  <li key={i} className="space-y-2 rounded-lg border border-border p-3">
                    {mistake.transcript_excerpt && (
                      <blockquote className="border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
                        &ldquo;{mistake.transcript_excerpt}&rdquo;
                      </blockquote>
                    )}
                    <p className="text-sm text-foreground">
                      <span className="font-medium text-destructive">Issue: </span>
                      {mistake.explanation}
                    </p>
                    <p className="text-sm text-foreground">
                      <span className="font-medium text-success-foreground">
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

function LearningPlanSection({ data }: { data: LearningPlan }) {
  if (data.all_passing) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium leading-tight text-foreground">
            Learning plan
          </h2>
        </CardHeader>
        <CardContent>
          <StatusCallout tone="success" icon={Trophy} title="All competencies passing">
            Every competency scored above the passing threshold. No extra practice
            scenarios are recommended right now.
          </StatusCallout>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-medium leading-tight text-foreground">
          Learning plan
        </h2>
        <p className="text-sm text-muted-foreground">
          Recommended scenarios to strengthen weak areas
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {data.weak_competencies.map((item: LearningPlanItem) => (
            <li
              key={item.category}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {formatCategoryLabel(item.category)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Scored {item.score}/100 · below passing ({PASS_THRESHOLD})
                </p>
              </div>
              <Link
                href={`/?recommended=${encodeURIComponent(item.recommended_scenario)}`}
                className="shrink-0"
              >
                <Button variant="outline" size="sm">
                  Practice
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function SessionResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const evaluation = useEvaluation(id);
  const coaching = useCoaching(id);
  const learningPlan = useLearningPlan(id);

  const overall = evaluation.data?.overall_score;
  const passing =
    evaluation.data?.category_scores.filter((c) => c.score >= PASS_THRESHOLD)
      .length ?? 0;
  const total = evaluation.data?.category_scores.length ?? 0;

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium leading-tight text-foreground">
            Session results
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your performance and improvement areas.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Main column */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          {evaluation.isLoading && <SectionSkeleton />}
          {evaluation.isError && (
            <SectionError
              title="Evaluation"
              error={evaluation.error}
              onRetry={() => evaluation.refetch()}
            />
          )}
          {evaluation.data && <EvaluationSection data={evaluation.data} />}

          {coaching.isLoading && <SectionSkeleton />}
          {coaching.isError && (
            <SectionError
              title="Coaching report"
              error={coaching.error}
              onRetry={() => coaching.refetch()}
            />
          )}
          {coaching.data && <CoachingSection data={coaching.data} />}

          {learningPlan.isLoading && <SectionSkeleton />}
          {learningPlan.isError && (
            <SectionError
              title="Learning plan"
              error={learningPlan.error}
              onRetry={() => learningPlan.refetch()}
            />
          )}
          {learningPlan.data && <LearningPlanSection data={learningPlan.data} />}
        </div>

        {/* Sticky summary rail */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="lg:sticky lg:top-20">
            <CardContent className="space-y-5 pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Overall score</p>
                {overall != null ? (
                  <p
                    className={cn(
                      "mt-1 text-5xl font-semibold leading-none",
                      scoreToneText(overall)
                    )}
                  >
                    {Math.round(overall)}
                    <span className="text-lg font-medium text-muted-foreground">
                      /100
                    </span>
                  </p>
                ) : (
                  <div className="mx-auto mt-2 h-12 w-20 animate-pulse rounded bg-muted" />
                )}
              </div>

              {total > 0 && (
                <div className="border-t border-border pt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Competencies passing
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {passing} of {total}
                  </p>
                </div>
              )}

              <div className="border-t border-border pt-4">
                <Link href="/" className="block">
                  <Button className="w-full">Train another scenario</Button>
                </Link>
                <Link href="/results" className="mt-2 block">
                  <Button variant="outline" className="w-full">
                    All results
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
