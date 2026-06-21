"use client";

import { use, useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  useEvaluation,
  useCoaching,
  useLearningPlan,
} from "@/hooks/use-session-results";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  Trophy,
  ThumbsUp,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { CatMascotSvg } from "@/components/auth/CatMascotSvg";
import confetti from "canvas-confetti";
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

function scoreToneText(s: number): string {
  if (s >= 80) return "text-[#22C55E]";
  if (s >= 60) return "text-[#F59E0B]";
  return "text-[#EF4444]";
}

function scoreToneBar(s: number): string {
  if (s >= 80) return "bg-[#22C55E]";
  if (s >= 60) return "bg-[#F59E0B]";
  return "bg-[#EF4444]";
}

// --- Loading screen with cat ---
function CatLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 animate-pulse">
          <CatMascotSvg className="w-full h-full" id="results-loader" />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">Analyzing your performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">Generating your evaluation results...</p>
        </div>
      </div>
    </div>
  );
}

// --- Step navigation bar ---
function StepNav({
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  nextLabel,
}: {
  currentStep: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between pt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrev}
        disabled={currentStep === 0}
        className="gap-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>
      <span className="text-xs text-muted-foreground">
        {currentStep + 1} / {totalSteps}
      </span>
      <Button size="sm" onClick={onNext} className="gap-1.5">
        {nextLabel ?? "Next"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// --- Step 1: Evaluation scores ---
function EvaluationStep({ data }: { data: EvaluationResult }) {
  if (data.is_too_short) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Evaluation</h2>
        <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-[#F59E0B]" />
          <p className="mt-2 text-sm font-medium text-foreground">Session too short</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete a longer conversation (4+ turns) for a full evaluation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Evaluation</h2>
        <p className="text-sm text-muted-foreground">Performance across key competencies</p>
      </div>
      <div className="space-y-4">
        {data.category_scores.map((item: CompetencyScore) => (
          <div key={item.category} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground">
                {formatCategoryLabel(item.category)}
              </span>
              <span className="text-muted-foreground">
                {item.score}/100{formatWeight(item.category) && ` · ${formatWeight(item.category)}`}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", scoreToneBar(item.score))}
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Step 2: Strengths ---
function StrengthsStep({ data }: { data: EvaluationResult }) {
  if (!data.strengths || data.strengths.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Strengths</h2>
        <p className="text-sm text-muted-foreground">No specific strengths identified in this session.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ThumbsUp className="h-5 w-5 text-[#22C55E]" />
        <h2 className="text-xl font-bold text-foreground">Strengths</h2>
      </div>
      <ul className="space-y-3">
        {data.strengths.map((s, i) => (
          <li key={i} className="rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/5 p-4">
            <p className="text-sm font-medium text-foreground">{s.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCategoryLabel(s.category)}
            </p>
            {s.transcript_excerpt && (
              <blockquote className="mt-2 border-l-2 border-[#22C55E]/40 pl-2 text-xs italic text-muted-foreground">
                &ldquo;{s.transcript_excerpt}&rdquo;
              </blockquote>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Step 3: Areas for improvement ---
function WeaknessesStep({ data }: { data: EvaluationResult }) {
  if (!data.weaknesses || data.weaknesses.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
          <h2 className="text-xl font-bold text-foreground">Areas for Improvement</h2>
        </div>
        <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/5 p-5 text-center">
          <p className="text-sm font-medium text-foreground">Excellent work!</p>
          <p className="mt-1 text-xs text-muted-foreground">No major areas for improvement identified.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
        <h2 className="text-xl font-bold text-foreground">Areas for Improvement</h2>
      </div>
      <ul className="space-y-3">
        {data.weaknesses.map((w, i) => (
          <li key={i} className="rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/5 p-4">
            <p className="text-sm font-medium text-foreground">{w.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCategoryLabel(w.category)}
            </p>
            {w.transcript_excerpt && (
              <blockquote className="mt-2 border-l-2 border-[#EF4444]/40 pl-2 text-xs italic text-muted-foreground">
                &ldquo;{w.transcript_excerpt}&rdquo;
              </blockquote>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Step 4: Coaching report ---
function CoachingStep({ data }: { data: CoachingReport }) {
  if (data.no_mistakes) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Coaching Report</h2>
        <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/5 p-5 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-[#22C55E]" />
          <p className="mt-2 text-sm font-medium text-foreground">Excellent work</p>
          <p className="mt-1 text-xs text-muted-foreground">
            No mistakes identified. Strong performance across all categories.
          </p>
        </div>
      </div>
    );
  }

  const categories = Object.keys(data.mistakes_by_category);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Coaching Report</h2>
        <p className="text-sm text-muted-foreground">
          {data.total_mistakes} improvement {data.total_mistakes === 1 ? "opportunity" : "opportunities"} identified
        </p>
      </div>
      <div className="space-y-4">
        {categories.map((category) => {
          const mistakes = data.mistakes_by_category[category];
          if (!mistakes || mistakes.length === 0) return null;
          return (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                {formatCategoryLabel(category)}
              </h3>
              <ul className="space-y-2">
                {mistakes.map((mistake: MistakeItem, i: number) => (
                  <li key={i} className="rounded-xl border border-border p-4 space-y-2">
                    {mistake.transcript_excerpt && (
                      <blockquote className="border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
                        &ldquo;{mistake.transcript_excerpt}&rdquo;
                      </blockquote>
                    )}
                    <p className="text-sm text-foreground">
                      <span className="font-medium text-[#EF4444]">Issue: </span>
                      {mistake.explanation}
                    </p>
                    <p className="text-sm text-foreground">
                      <span className="font-medium text-[#22C55E]">Try instead: </span>
                      {mistake.recommended_alternative}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Step 5: Learning plan ---
function LearningPlanStep({ data }: { data: LearningPlan }) {
  if (data.all_passing) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Learning Plan</h2>
        <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/5 p-5 text-center">
          <Trophy className="mx-auto h-6 w-6 text-[#22C55E]" />
          <p className="mt-2 text-sm font-medium text-foreground">All competencies passing</p>
          <p className="mt-1 text-xs text-muted-foreground">
            No extra practice scenarios recommended.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Learning Plan</h2>
        <p className="text-sm text-muted-foreground">Recommended scenarios to strengthen weak areas</p>
      </div>
      <ul className="space-y-3">
        {data.weak_competencies.map((item: LearningPlanItem) => (
          <li
            key={item.category}
            className="flex items-center justify-between gap-3 rounded-xl border border-border p-4"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">
                {formatCategoryLabel(item.category)}
              </p>
              <p className="text-xs text-muted-foreground">
                Scored {item.score}/100 · below passing ({PASS_THRESHOLD})
              </p>
            </div>
            <Link href={`/?recommended=${encodeURIComponent(item.recommended_scenario)}`}>
              <Button variant="outline" size="sm">
                Practice
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Step 6: Overall score ---
function OverallScoreStep({ data }: { data: EvaluationResult }) {
  const overall = data.overall_score;
  const passing = data.category_scores.filter((c) => c.score >= PASS_THRESHOLD).length;
  const total = data.category_scores.length;
  const hasFired = useRef(false);

  useEffect(() => {
    if ((overall ?? 0) >= 70 && !hasFired.current) {
      hasFired.current = true;
      // Fire confetti from both sides
      const end = Date.now() + 1500;
      const colors = ["#8F6AE0", "#22C55E", "#F59E0B", "#fff200"];
      (function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
  }, [overall]);

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-xl font-bold text-foreground">Overall Score</h2>
      <div>
        <p className={cn("text-6xl font-bold leading-none", scoreToneText(overall ?? 0))}>
          {Math.round(overall ?? 0)}
          <span className="text-xl font-medium text-muted-foreground">/100</span>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Competencies passing: {passing} of {total}
        </p>
      </div>
      {(overall ?? 0) >= 70 ? (
        <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/5 p-4">
          <Trophy className="mx-auto h-6 w-6 text-[#22C55E]" />
          <p className="mt-2 text-sm font-medium text-[#22C55E]">Great job!</p>
          <p className="mt-1 text-xs text-muted-foreground">You passed this session.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4">
          <AlertTriangle className="mx-auto h-6 w-6 text-[#F59E0B]" />
          <p className="mt-2 text-sm font-medium text-[#F59E0B]">Keep practicing</p>
          <p className="mt-1 text-xs text-muted-foreground">Review coaching recommendations and try again.</p>
        </div>
      )}
    </div>
  );
}

// --- Step 7: Full summary — bento grid layout ---
function SummaryStep({ sessionId, data, coaching, learningPlan }: { sessionId: string; data: EvaluationResult; coaching: CoachingReport | null; learningPlan: LearningPlan | null }) {
  const overall = data.overall_score;
  const passing = data.category_scores.filter((c) => c.score >= PASS_THRESHOLD).length;
  const total = data.category_scores.length;

  return (
    <div className="space-y-6 -mx-6 -mt-6 -mb-6">
      {/* Header */}
      <div className="px-6 pt-6 text-center">
        <h2 className="text-xl font-bold text-foreground">Session Complete</h2>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s your full performance breakdown</p>
      </div>

      {/* Bento grid */}
      <div className="px-4 pb-6 grid grid-cols-2 gap-3">
        {/* Overall score — spans full width, no bg/border */}
        <div className="col-span-2 p-5 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall Score</p>
          <p className={cn("mt-1 text-5xl font-bold leading-none", scoreToneText(overall ?? 0))}>
            {Math.round(overall ?? 0)}<span className="text-lg font-medium text-muted-foreground">/100</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{passing} of {total} competencies passing</p>
        </div>

        {/* Category scores — each in its own cell, no bg/border */}
        {data.category_scores.map((item: CompetencyScore) => (
          <div key={item.category} className="p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{formatCategoryLabel(item.category)}</p>
            <p className={cn("text-2xl font-bold", scoreToneText(item.score))}>{item.score}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", scoreToneBar(item.score))} style={{ width: `${item.score}%` }} />
            </div>
          </div>
        ))}

        {/* Strengths — spans full width */}
        {data.strengths && data.strengths.length > 0 && (
          <div className="col-span-2 rounded-2xl bg-[#22C55E]/5 border border-[#22C55E]/20 p-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="h-4 w-4 text-[#22C55E]" />
              <p className="text-sm font-bold text-foreground">Strengths</p>
            </div>
            <ul className="space-y-1.5">
              {data.strengths.map((s, i) => (
                <li key={i} className="text-sm text-foreground">
                  <span className="text-[#22C55E] mr-1">✓</span> {s.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas for improvement — spans full width */}
        {data.weaknesses && data.weaknesses.length > 0 && (
          <div className="col-span-2 rounded-2xl bg-[#EF4444]/5 border border-[#EF4444]/20 p-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-[#EF4444]" />
              <p className="text-sm font-bold text-foreground">Needs Work</p>
            </div>
            <ul className="space-y-1.5">
              {data.weaknesses.map((w, i) => (
                <li key={i} className="text-sm text-foreground">
                  <span className="text-[#EF4444] mr-1">!</span> {w.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Coaching highlights — left column */}
        {coaching && !coaching.no_mistakes && (
          <div className="col-span-1 rounded-2xl bg-card border border-border p-4 space-y-2">
            <p className="text-sm font-bold text-foreground">Coaching</p>
            <p className="text-xs text-muted-foreground">
              {coaching.total_mistakes} {coaching.total_mistakes === 1 ? "opportunity" : "opportunities"} found
            </p>
            <ul className="space-y-1 mt-1">
              {Object.keys(coaching.mistakes_by_category).slice(0, 3).map((cat) => (
                <li key={cat} className="text-xs text-muted-foreground truncate">
                  • {formatCategoryLabel(cat)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Learning plan — right column */}
        {learningPlan && !learningPlan.all_passing && (
          <div className="col-span-1 rounded-2xl bg-card border border-border p-4 space-y-2">
            <p className="text-sm font-bold text-foreground">Practice</p>
            <p className="text-xs text-muted-foreground">Recommended scenarios</p>
            <ul className="space-y-1 mt-1">
              {learningPlan.weak_competencies.slice(0, 3).map((item: LearningPlanItem) => (
                <li key={item.category} className="text-xs text-muted-foreground truncate">
                  • {formatCategoryLabel(item.category)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* All passing state */}
        {coaching?.no_mistakes && learningPlan?.all_passing && (
          <div className="col-span-2 rounded-2xl bg-[#22C55E]/5 border border-[#22C55E]/20 p-4 text-center">
            <Trophy className="mx-auto h-5 w-5 text-[#22C55E]" />
            <p className="mt-1 text-sm font-medium text-[#22C55E]">Perfect session — no issues found!</p>
          </div>
        )}

        {/* Actions — 2 col */}
        <div className="col-span-2 grid grid-cols-2 gap-3 pt-1">
          <Link href="/results" className="block">
            <Button variant="outline" className="w-full" size="lg">All results</Button>
          </Link>
          <Link href="/scenarios" className="block">
            <Button className="w-full" size="lg">Train another scenario</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// --- Error state ---
function ErrorState({ title, error, onRetry }: { title: string; error: Error | null; onRetry: () => void }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center space-y-4">
        <AlertCircle className="mx-auto h-8 w-8 text-[#EF4444]" />
        <h2 className="text-lg font-medium text-foreground">Couldn&apos;t load {title}</h2>
        <p className="text-sm text-muted-foreground">{error?.message ?? "An unexpected error occurred."}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
      </div>
    </div>
  );
}

// --- Main page ---
export default function SessionResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const evaluation = useEvaluation(id);
  const coaching = useCoaching(id);
  const learningPlan = useLearningPlan(id);
  const [step, setStep] = useState(0);

  const TOTAL_STEPS = 7;

  // Show cat loading while any data is still loading
  const isLoading = evaluation.isLoading || coaching.isLoading || learningPlan.isLoading;

  if (isLoading) {
    return <CatLoading />;
  }

  // Show error if evaluation failed (primary data)
  if (evaluation.isError) {
    return <ErrorState title="evaluation" error={evaluation.error} onRetry={() => evaluation.refetch()} />;
  }

  if (!evaluation.data) {
    return <CatLoading />;
  }

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="mx-auto max-w-full py-6">
      {/* Step progress dots */}
      <div className="flex justify-center gap-1.5 mb-6">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === step ? "w-6 bg-[#8F6AE0]" : "w-2 bg-[#8F6AE0]/20"
            )}
            aria-label={`Step ${i + 1}`}
          />
        ))}
      </div>

      {/* Step content with transition */}
      <div
        key={step}
        className={cn(
          "animate-in fade-in-0 slide-in-from-right-4 duration-300",
          step < 6 && "max-w-lg mx-auto"
        )}
      >
        <Card>
          <CardContent className="p-6">
            {step === 0 && <EvaluationStep data={evaluation.data} />}
            {step === 1 && <StrengthsStep data={evaluation.data} />}
            {step === 2 && <WeaknessesStep data={evaluation.data} />}
            {step === 3 && (
              coaching.isError ? (
                <ErrorState title="coaching report" error={coaching.error} onRetry={() => coaching.refetch()} />
              ) : coaching.data ? (
                <CoachingStep data={coaching.data} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Coaching data not available yet.</p>
              )
            )}
            {step === 4 && (
              learningPlan.isError ? (
                <ErrorState title="learning plan" error={learningPlan.error} onRetry={() => learningPlan.refetch()} />
              ) : learningPlan.data ? (
                <LearningPlanStep data={learningPlan.data} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Learning plan not available yet.</p>
              )
            )}
            {step === 5 && <OverallScoreStep data={evaluation.data} />}
            {step === 6 && <SummaryStep sessionId={id} data={evaluation.data} coaching={coaching.data ?? null} learningPlan={learningPlan.data ?? null} />}

            {/* Navigation */}
            {step < TOTAL_STEPS - 1 && (
              <StepNav
                currentStep={step}
                totalSteps={TOTAL_STEPS}
                onPrev={goPrev}
                onNext={goNext}
                nextLabel={step === TOTAL_STEPS - 2 ? "View Summary" : "Next"}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
