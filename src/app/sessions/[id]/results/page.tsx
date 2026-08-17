"use client";

import { CatMascotSvg } from "@/components/auth/CatMascotSvg";
import type { CatEmotion } from "@/components/results/OrangeCatMascot";
import { OrangeCatMascot } from "@/components/results/OrangeCatMascot";
import { PrintReportSection } from "@/components/results/print-report-section";
import { RecommendationPanel } from "@/components/results/recommendation-panel";
import { ReportShell } from "@/components/results/report-shell";
import { RubricScoreCard } from "@/components/results/rubric-score-card";
import { Button } from "@/components/ui/button";
import { useReport } from "@/hooks/use-report";
import {
    useCoaching,
    useEvaluation,
    useLearningPlan,
    useTranscript,
} from "@/hooks/use-session-results";
import type {
    CoachingReport,
    CompetencyScore,
    EvaluationResult,
    LearningPlan,
    LearningPlanItem,
    MistakeItem,
    RubricRecommendation,
    TranscriptEntry,
} from "@/lib/api/sessions";
import {
    isValidScenarioId,
    retryEvaluationGeneration,
    SessionArtifactError,
} from "@/lib/api/sessions";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    ThumbsUp,
    Trophy,
} from "lucide-react";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";

const CATEGORY_LABELS: Record<string, string> = {
  call_opening: "Call Opening",
  compliance: "Compliance",
  empathy_communication: "Empathy & Communication",
  negotiation_resolution: "Negotiation & Resolution",
};

const LEGACY_CATEGORY_WEIGHTS: Record<string, number> = {
  call_opening: 0.2,
  compliance: 0.3,
  empathy_communication: 0.25,
  negotiation_resolution: 0.25,
};

const LEGACY_PASS_THRESHOLD = 70;

function formatCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

function formatWeight(category: string): string {
  const weight = LEGACY_CATEGORY_WEIGHTS[category];
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

function getOverallScore(data: EvaluationResult): number {
  return data.weighted_total ?? data.overall_score;
}

function getPassingThreshold(data: EvaluationResult): number {
  return data.passing_score ?? LEGACY_PASS_THRESHOLD;
}

function isEvaluationNotApplicable(data: EvaluationResult): boolean {
  return data.rubric_result?.status === "not_applicable";
}

function getCoachingRecommendations(data: CoachingReport, evaluation: EvaluationResult): RubricRecommendation[] {
  if (evaluation.rubric_result?.recommendations.length) return evaluation.rubric_result.recommendations;
  if (data.rubric_coaching?.blocks.length) {
    return [...data.rubric_coaching.blocks]
      .sort((left, right) => left.display_order - right.display_order)
      .flatMap((block) => block.recommendations);
  }
  return data.rubric_recommendations ?? [];
}

function safeArtifactErrorMessage(title: string, error: Error | null): string {
  if (error instanceof SessionArtifactError) return error.message;
  if (error?.message && /response has an invalid shape$/i.test(error.message)) return error.message;
  return `Unable to load the ${title.toLowerCase()}. Please try again.`;
}

function isEvaluationPassing(data: EvaluationResult): boolean {
  if (isEvaluationNotApplicable(data)) return false;
  return data.passed ?? getOverallScore(data) >= getPassingThreshold(data);
}

function StandardContext({ data }: { data: EvaluationResult }) {
  if (!data.standard_name && !data.standard_version_number) {
    return <p className="text-xs text-muted-foreground">Legacy session · rubric version unavailable</p>;
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground" aria-label="Pinned negotiation standard">
      <span className="font-medium text-foreground">{data.standard_name ?? "Negotiation standard"}</span>
      {data.standard_version_number !== null && data.standard_version_number !== undefined && <span>Version {data.standard_version_number}</span>}
    </div>
  );
}

// --- Loading screen with cat ---
function CatLoading() {
  return (
    <div className="flex h-screen items-center justify-center">
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
  onStepClick,
  nextLabel,
}: {
  currentStep: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  onStepClick: (step: number) => void;
  nextLabel?: string;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
      {currentStep === 0 ? (
        <Link href="/sessions" className="max-w-[42%] shrink-0">
          <Button variant="outline" size="sm" className="min-h-11 max-w-full gap-1.5 px-2 sm:px-3">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">All Sessions</span>
          </Button>
        </Link>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          className="min-h-11 shrink-0 gap-1.5 px-2 sm:px-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}
      <div className="order-3 flex min-w-0 max-w-full flex-1 items-center justify-center gap-0 overflow-x-auto px-1 sm:order-none sm:gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onStepClick(i)}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Go to step ${i + 1}`}
            aria-current={i === currentStep ? "step" : undefined}
          >
            <span className={cn(
              "block rounded-full transition-all duration-300 motion-reduce:transition-none",
              i === currentStep ? "h-2 w-6 bg-[#8F6AE0]" : "h-2 w-2 bg-[#8F6AE0]/20 hover:bg-[#8F6AE0]/40"
            )} />
          </button>
        ))}
      </div>
      <Button size="sm" onClick={onNext} className="min-h-11 max-w-[42%] shrink-0 gap-1.5 px-2 sm:px-3">
        <span className="truncate">{nextLabel ?? "Next"}</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// --- Step 1: Evaluation scores ---
function EvaluationStep({ data, transcript }: { data: EvaluationResult; transcript: TranscriptEntry[] }) {
  const canonical = data.rubric_result;
  if (canonical?.status === "not_applicable") {
    return <div role="status" className="space-y-3 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5 text-sm text-muted-foreground"><StandardContext data={data} /><p>Evaluation not applicable: {canonical.summary}</p></div>;
  }
  if (canonical?.categories.length) {
    return <div className="space-y-4"><StandardContext data={data} />{canonical.categories.map((category) => <RubricScoreCard key={category.rubric_block_id} category={category} transcript={transcript} />)}</div>;
  }

  return (
    <div className="space-y-5">
      <StandardContext data={data} />
      {data.is_too_short && <div className="flex items-center gap-3 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-4 py-3"><AlertTriangle className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" /><p className="text-xs text-muted-foreground text-left">Short session — scores may be less accurate with fewer turns.</p></div>}
      <div className="space-y-4">
        {data.category_scores.map((item: CompetencyScore) => <div key={item.category} className="space-y-1.5"><div className="flex justify-between text-sm"><span className="font-medium text-foreground">{formatCategoryLabel(item.category)}</span><span className="text-muted-foreground">{item.score}/100{formatWeight(item.category) && ` · ${formatWeight(item.category)}`}</span></div><div className="h-2.5 w-full overflow-hidden rounded-full bg-muted"><div role="img" aria-label={`${formatCategoryLabel(item.category)} score: ${item.score} out of 100`} className={cn("h-full rounded-full transition-all motion-reduce:transition-none", scoreToneBar(item.score))} style={{ width: `${item.score}%` }}><span className="sr-only">{item.score} out of 100</span></div></div></div>)}
      </div>
    </div>
  );
}

// --- Step 2: Strengths ---
function StrengthsStep({ data }: { data: EvaluationResult }) {
  if (!data.strengths || data.strengths.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">No specific strengths identified in this session.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/5 p-5 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-[#22C55E]" />
          <p className="mt-2 text-sm font-medium text-foreground">Excellent work!</p>
          <p className="mt-1 text-xs text-muted-foreground">No major areas for improvement identified.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
function CoachingStep({ data, evaluation, notApplicable }: { data: CoachingReport; evaluation: EvaluationResult; notApplicable: boolean }) {
  if (notApplicable) {
    return <div role="status" className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5 text-sm text-muted-foreground">Coaching is not applicable because the transcript was insufficient for a reliable evaluation.</div>;
  }
  const recommendations = getCoachingRecommendations(data, evaluation);
  const hasCanonicalCoaching = Boolean(
    evaluation.rubric_result?.recommendations.length
      || data.rubric_coaching
      || (data.rubric_recommendations && data.rubric_recommendations.length > 0)
      || (data.rubric_recommendations_by_block && Object.keys(data.rubric_recommendations_by_block).length > 0),
  );
  if (hasCanonicalCoaching) {
    return <div className="space-y-4"><RecommendationPanel recommendations={recommendations} /></div>;
  }
  if (data.no_mistakes && recommendations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/5 p-5 text-center"><CheckCircle2 className="mx-auto h-6 w-6 text-[#22C55E]" /><p className="mt-2 text-sm font-medium text-foreground">Excellent work</p><p className="mt-1 text-xs text-muted-foreground">No mistakes identified. Strong performance across all categories.</p></div>
      </div>
    );
  }

  const categories = Object.keys(data.mistakes_by_category);
  return (
    <div className="space-y-4">
      {recommendations.length > 0 && <RecommendationPanel recommendations={recommendations} />}
      {data.no_mistakes ? <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/5 p-5 text-center"><CheckCircle2 className="mx-auto h-6 w-6 text-[#22C55E]" /><p className="mt-2 text-sm font-medium text-foreground">No mistakes identified</p></div> : <><p className="text-sm text-muted-foreground">{data.total_mistakes} improvement {data.total_mistakes === 1 ? "opportunity" : "opportunities"} identified</p><div className="space-y-4">{categories.map((category) => { const mistakes = data.mistakes_by_category[category]; if (!mistakes || mistakes.length === 0) return null; return <div key={category} className="space-y-2"><h3 className="text-sm font-semibold text-foreground">{formatCategoryLabel(category)}</h3><ul className="space-y-2">{mistakes.map((mistake: MistakeItem) => <li key={`${mistake.transcript_position}-${mistake.explanation}`} className="space-y-2 rounded-xl border border-border p-4"><blockquote className="border-l-2 border-border pl-2 text-xs italic text-muted-foreground">“{mistake.transcript_excerpt}”</blockquote><p className="text-sm text-foreground"><span className="font-medium text-[#EF4444]">Issue: </span>{mistake.explanation}</p><p className="text-sm text-foreground"><span className="font-medium text-[#22C55E]">Try instead: </span>{mistake.recommended_alternative}</p></li>)}</ul></div>;})}</div></>}
    </div>
  );
}

// --- Step 5: Learning plan ---
function LearningPlanStep({ data, passingScore, notApplicable }: { data: LearningPlan; passingScore: number; notApplicable: boolean }) {
  if (notApplicable) {
    return <div role="status" className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5 text-sm text-muted-foreground">No practice plan was generated because this evaluation was not applicable.</div>;
  }
  if (data.all_passing) {
    return (
      <div className="space-y-4">
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
      <ul className="space-y-3">
        {data.weak_competencies.map((item: LearningPlanItem) => (
          <li
            key={`${item.rubric_block_id ?? item.category}-${item.criterion_id ?? "category"}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border p-4"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">
                {formatCategoryLabel(item.category)}
              </p>
              <p className="text-xs text-muted-foreground">
                Scored {item.score}/100 · passing threshold ({passingScore})
              </p>
              <p className="text-xs text-foreground">
                {item.practice_focus ?? item.recommended_scenario ?? "Practice this competency."}
              </p>
              {item.recommended_scenario && (
                <p className="text-xs text-muted-foreground">
                  Scenario: {item.recommended_scenario}
                </p>
              )}
            </div>
            {item.scenario_id && isValidScenarioId(item.scenario_id) && (
              <Link href={`/sessions/new?scenario_id=${encodeURIComponent(item.scenario_id)}`}>
                <Button variant="outline" size="sm">
                  Practice
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- Step 6: Overall score ---
function OverallScoreStep({ data }: { data: EvaluationResult }) {
  const notApplicable = isEvaluationNotApplicable(data);
  const overall = getOverallScore(data);
  const threshold = getPassingThreshold(data);
  const passing = data.rubric_result?.categories.filter((category) => category.passed).length ?? data.category_scores.filter((c) => c.score >= threshold).length;
  const total = data.rubric_result?.categories.length ?? data.category_scores.length;
  const passed = isEvaluationPassing(data);
  const hasFired = useRef(false);

  useEffect(() => {
    if (notApplicable || !passed || hasFired.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    hasFired.current = true;
    const end = Date.now() + 1500;
    const colors = ["#8F6AE0", "#22C55E", "#F59E0B", "#fff200"];
    (function frame() {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [notApplicable, passed]);

  if (notApplicable) {
    return <div role="status" className="space-y-3 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5 text-sm text-muted-foreground"><p className="text-base font-semibold text-foreground">Evaluation not applicable</p><p>The transcript did not contain enough reliable evidence to calculate a score. No pass/fail result or remediation is assigned.</p></div>;
  }

  return (
    <div className="space-y-6 text-center">
      <div>
        <p className={cn("text-6xl font-bold leading-none", scoreToneText(overall ?? 0))}>
          {Math.round(overall ?? 0)}
          <span className="text-xl font-medium text-muted-foreground">/100</span>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Competencies passing: {passing} of {total} · passing threshold: {threshold}
        </p>
      </div>
      {passed ? (
        <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/5 p-4">
          <Trophy className="mx-auto h-6 w-6 text-[#22C55E]" />
          <p className="mt-2 text-sm font-medium text-[#22C55E]">Great job!</p>
          <p className="mt-1 text-xs text-muted-foreground">You passed this session.</p>
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="flex items-center gap-4 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-5 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#F59E0B]">Keep practicing</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Review coaching recommendations and try again.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Step 7: Full summary — bento grid layout ---
function SummaryStep({ data, coaching, learningPlan }: { data: EvaluationResult; coaching: CoachingReport | null; learningPlan: LearningPlan | null }) {
  if (isEvaluationNotApplicable(data)) {
    return <div role="status" className="mx-auto max-w-lg rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-5 text-sm text-muted-foreground"><p className="text-base font-semibold text-foreground">Evaluation not applicable</p><p className="mt-2">This session did not produce enough reliable evidence for a score, coaching remediation, or practice plan.</p></div>;
  }
  const overall = getOverallScore(data);
  const threshold = getPassingThreshold(data);
  const passing = data.rubric_result?.categories.filter((category) => category.passed).length ?? data.category_scores.filter((c) => c.score >= threshold).length;
  const total = data.rubric_result?.categories.length ?? data.category_scores.length;
  const passed = isEvaluationPassing(data);

  return (
    <div className="space-y-4 w-full max-w-2xl mx-auto">
      <StandardContext data={data} />
      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Overall score — spans full width */}
        <div className="col-span-2 sm:col-span-2 p-3 text-center">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall Score</p>
          <p className={cn("mt-1 text-4xl font-bold leading-none", scoreToneText(overall ?? 0))}>
            {Math.round(overall ?? 0)}<span className="text-base font-medium text-muted-foreground">/100</span>
          </p>
          <p className="mt-1 text-xs font-medium text-foreground">{passed ? "Passed" : "Needs practice"} · {passing} of {total} competencies passing · threshold {threshold}</p>
        </div>

        {/* Category scores — each in its own cell, no bg/border */}
        {data.rubric_result?.categories ? data.rubric_result.categories.map((item) => <div key={item.rubric_block_id} className="p-4 space-y-2"><p className="text-xs font-medium text-muted-foreground">{item.category}</p><p className={cn("text-2xl font-bold", scoreToneText(item.penalized_score ?? 0))}>{item.penalized_score ?? "N/A"}</p><p className="text-xs text-muted-foreground">{item.weighted_contribution.toFixed(2)} weighted points · {item.passed ? "Passing" : "Needs practice"}</p></div>) : data.category_scores.map((item: CompetencyScore) => <div key={item.category} className="p-4 space-y-2"><p className="text-xs font-medium text-muted-foreground">{formatCategoryLabel(item.category)}</p><p className={cn("text-2xl font-bold", scoreToneText(item.score))}>{item.score}</p><div className="h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", scoreToneBar(item.score))} style={{ width: `${item.score}%` }} /></div></div>)}

        {/* Strengths — spans full width */}
        {data.strengths && data.strengths.length > 0 && (
          <div className="col-span-2 sm:col-span-2 rounded-2xl bg-[#22C55E]/5 border border-[#22C55E]/20 p-4 space-y-2">
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
          <div className="col-span-2 sm:col-span-2 rounded-2xl bg-[#EF4444]/5 border border-[#EF4444]/20 p-4 space-y-2">
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
            <p className="text-xs text-muted-foreground">Practice focus</p>
            <ul className="space-y-1 mt-1">
              {learningPlan.weak_competencies.slice(0, 3).map((item: LearningPlanItem) => (
                <li key={`${item.rubric_block_id ?? item.category}-${item.criterion_id ?? "category"}`} className="text-xs text-muted-foreground truncate">
                  • {formatCategoryLabel(item.category)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* All passing state */}
        {coaching?.no_mistakes && learningPlan?.all_passing && (
          <div className="col-span-2 sm:col-span-2 rounded-2xl bg-[#22C55E]/5 border border-[#22C55E]/20 p-4 text-center">
            <Trophy className="mx-auto h-5 w-5 text-[#22C55E]" />
            <p className="mt-1 text-sm font-medium text-[#22C55E]">Perfect session — no issues found!</p>
          </div>
        )}

        {/* Actions — 2 col */}
        <div className="col-span-2 sm:col-span-2 grid grid-cols-2 gap-3 pt-1">
          <Link href="/sessions" className="block">
            <Button variant="outline" className="w-full" size="lg">All Sessions</Button>
          </Link>
          <Link href="/scenarios" className="block">
            <Button className="w-full" size="lg">Train another scenario</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ArtifactLoading({ label }: { label: string }) {
  return <div role="status" className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">Loading {label}…</div>;
}

// --- Error state ---
function ErrorState({ title, error, onRetry }: { title: string; error: Error | null; onRetry: () => void }) {
  const canRetry = !(error instanceof SessionArtifactError) || error.retryable;
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center space-y-4">
        <AlertCircle className="mx-auto h-8 w-8 text-[#EF4444]" />
        <h2 className="text-lg font-medium text-foreground">Couldn&apos;t load {title}</h2>
        <p className="text-sm text-muted-foreground">{safeArtifactErrorMessage(title, error)}</p>
        {canRetry && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
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
  const reportState = useReport(id);
  const useLegacyArtifacts = reportState.isError;
  const evaluation = useEvaluation(id, useLegacyArtifacts);
  const transcript = useTranscript(id, useLegacyArtifacts);
  const coaching = useCoaching(id, useLegacyArtifacts);
  const learningPlan = useLearningPlan(id, useLegacyArtifacts);
  const reportSections = reportState.report?.sections;
  const reportEvaluation = reportSections?.evaluation.state === "loaded"
    ? reportSections.evaluation.data as EvaluationResult
    : null;
  const reportTranscript = reportSections?.transcript.state === "loaded"
    ? reportSections.transcript.data as TranscriptEntry[]
    : null;
  const reportCoaching = reportSections?.coaching.state === "loaded"
    ? reportSections.coaching.data as CoachingReport
    : null;
  const reportLearningPlan = reportSections?.learning_plan.state === "loaded"
    ? reportSections.learning_plan.data as LearningPlan
    : null;
  const evaluationData = reportEvaluation ?? evaluation.data;
  const transcriptData = reportTranscript ?? transcript.data ?? [];
  const coachingData = reportCoaching ?? coaching.data ?? null;
  const learningPlanData = reportLearningPlan ?? learningPlan.data ?? null;
  const [step, setStep] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationError, setRegenerationError] = useState<string | null>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);

  const regenerateResults = async () => {
    if (isRegenerating) return;
    setIsRegenerating(true);
    setRegenerationError(null);
    try {
      await retryEvaluationGeneration(id);
      await reportState.retryAll();
    } catch {
      setRegenerationError("Evaluation generation failed. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  useEffect(() => {
    stepContentRef.current?.focus();
  }, [step]);

  const TOTAL_STEPS = 7;

  // Evaluation is the primary artifact; other panels render independently as they arrive.
  if (reportState.isLoading || (!reportState.report && evaluation.isLoading)) {
    return <CatLoading />;
  }

  // The aggregate report is authoritative; only fall back to the legacy query when it is unavailable.
  if (useLegacyArtifacts && evaluation.isError) {
    return <ErrorState title="evaluation" error={evaluation.error} onRetry={() => evaluation.refetch()} />;
  }

  if (!evaluationData) {
    const sectionFailure = reportSections?.evaluation.failure;
    if (sectionFailure) {
      return <ErrorState title="evaluation" error={new Error(sectionFailure.safe_message)} onRetry={() => { void reportState.retrySection("evaluation"); }} />;
    }
    if (reportSections?.evaluation.state === "empty") {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md space-y-4 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-[#F59E0B]" />
            <h1 className="text-lg font-medium text-foreground">Results were not generated</h1>
            <p className="text-sm text-muted-foreground">
              The session and transcript were saved, but evaluation processing did not finish.
            </p>
            {regenerationError && <p role="alert" className="text-sm text-destructive">{regenerationError}</p>}
            <Button onClick={() => { void regenerateResults(); }} disabled={isRegenerating}>
              {isRegenerating ? "Generating results…" : "Generate results again"}
            </Button>
          </div>
        </div>
      );
    }
    return <CatLoading />;
  }

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  // Map step index to cat emotion
  const stepEmotions: CatEmotion[] = [
    "neutral",      // 0: Evaluation scores
    "happy",        // 1: Strengths
    "worried",      // 2: Weaknesses
    "thinking",     // 3: Coaching
    "encouraging",  // 4: Learning plan
    isEvaluationNotApplicable(evaluationData) ? "neutral" : getOverallScore(evaluationData) >= getPassingThreshold(evaluationData) ? "celebrating" : "encouraging", // 5: Overall score
    "proud",        // 6: Summary
  ];

  // Step titles and descriptions
  const stepMeta: { title: string; description: string }[] = [
    { title: "Evaluation", description: "Performance across key competencies" },
    { title: "Strengths", description: "What you did well in this session" },
    { title: "Areas for Improvement", description: "Opportunities to grow" },
    { title: "Coaching Report", description: "Detailed feedback on mistakes" },
    { title: "Learning Plan", description: "Criterion-specific practice focus" },
    { title: "Overall Score", description: "Your final performance rating" },
    { title: "Session Complete", description: "Full performance breakdown" },
  ];

  // Steps that have short content and can fit in 1 centered div
  const isCompactStep = step === 0 || step === 1 || step === 4 || step === 5;

  return (
    <ReportShell report={reportState.report} reportError={reportState.metadata.error ?? null} sessionId={id} onRetry={() => { void reportState.retryAll(); }} onRetrySection={(name) => { void reportState.retrySection(name); }}>
      <div className="report-print-root flex min-h-screen flex-col overflow-x-hidden px-4 py-6">
      <PrintReportSection
        className="flex min-h-0 flex-1 flex-col"
        sectionName={stepMeta[step].title}
      >
      {isCompactStep ? (
        /* Compact steps: everything in one vertically-centered div */
        <div
          key={step}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto flex flex-col justify-start py-2 items-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 motion-safe:duration-300 w-full",
            step < 6 && "max-w-lg mx-auto"
          )}
          ref={stepContentRef}
          tabIndex={-1}
          aria-live="polite"
        >
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center">
            {stepMeta[step].title}
          </h2>
          <p className="text-sm text-muted-foreground text-center mt-1 mb-3">
            {stepMeta[step].description}
          </p>
          <div className="screen-only-decoration flex justify-center mb-3">
            <OrangeCatMascot emotion={stepEmotions[step]} className="w-16 h-16 md:w-20 md:h-20" />
          </div>
          <div className="w-full">
            {step === 0 && (
              useLegacyArtifacts && transcript.isLoading ? <ArtifactLoading label="transcript" />
                : transcript.isError ? <ErrorState title="transcript" error={transcript.error} onRetry={() => transcript.refetch()} />
                  : <EvaluationStep data={evaluationData} transcript={transcriptData} />
            )}
            {step === 1 && <StrengthsStep data={evaluationData} />}
            {step === 4 && (
              isEvaluationNotApplicable(evaluationData) ? <LearningPlanStep data={learningPlanData ?? { session_id: id, weak_competencies: [], all_passing: true }} passingScore={getPassingThreshold(evaluationData)} notApplicable />
                : useLegacyArtifacts && learningPlan.isLoading ? <ArtifactLoading label="learning plan" />
                  : learningPlan.isError ? (
                    <ErrorState title="learning plan" error={learningPlan.error} onRetry={() => learningPlan.refetch()} />
                  ) : learningPlanData ? (
                    <LearningPlanStep data={learningPlanData} passingScore={getPassingThreshold(evaluationData)} notApplicable={false} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Learning plan not available yet.</p>
                  )
            )}
            {step === 5 && <OverallScoreStep data={evaluationData} />}
          </div>
        </div>
      ) : (
        /* Content-heavy steps: fixed header + scrollable content */
        <>
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center shrink-0">
            {stepMeta[step].title}
          </h2>
          <p className="text-sm text-muted-foreground text-center mt-1 mb-3 shrink-0">
            {stepMeta[step].description}
          </p>
          <div className="screen-only-decoration flex justify-center mb-3 shrink-0">
            <OrangeCatMascot emotion={stepEmotions[step]} className="w-16 h-16 md:w-20 md:h-20" />
          </div>
          <div
            key={step}
            ref={stepContentRef}
            tabIndex={-1}
            aria-live="polite"
            className="min-h-0 flex-1 overflow-y-auto motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-4 motion-safe:duration-300 w-full max-w-lg mx-auto focus-visible:outline-none"
          >
            {step === 2 && <WeaknessesStep data={evaluationData} />}
            {step === 3 && (
              isEvaluationNotApplicable(evaluationData) ? <CoachingStep data={coachingData ?? { session_id: id, mistakes_by_category: {}, total_mistakes: 0, no_mistakes: true }} evaluation={evaluationData} notApplicable />
                : useLegacyArtifacts && coaching.isLoading ? <ArtifactLoading label="coaching report" />
                  : coaching.isError ? (
                    <ErrorState title="coaching report" error={coaching.error} onRetry={() => coaching.refetch()} />
                  ) : coachingData ? (
                    <CoachingStep data={coachingData} evaluation={evaluationData} notApplicable={false} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Coaching data not available yet.</p>
                  )
            )}
            {step === 6 && <SummaryStep data={evaluationData} coaching={coachingData} learningPlan={learningPlanData} />}
          </div>
        </>
      )}

      {/* Navigation — pinned at bottom */}
      <div className="screen-only-controls">
      {step < TOTAL_STEPS - 1 && (
        <div className="max-w-lg mx-auto w-full pt-4 shrink-0">
          <StepNav
            currentStep={step}
            totalSteps={TOTAL_STEPS}
            onPrev={goPrev}
            onNext={goNext}
            onStepClick={setStep}
            nextLabel={step === TOTAL_STEPS - 2 ? "View Summary" : "Next"}
          />
        </div>
      )}
      </div>
      </PrintReportSection>
    </div>
    </ReportShell>
  );
}
