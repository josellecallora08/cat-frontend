import { Suspense } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  evaluation: { isLoading: false, isError: false, error: null as Error | null, data: null as unknown, refetch: vi.fn() },
  transcript: { isLoading: false, isError: false, error: null as Error | null, data: [] as unknown, refetch: vi.fn() },
  coaching: { isLoading: false, isError: false, error: null as Error | null, data: null as unknown, refetch: vi.fn() },
  learningPlan: { isLoading: false, isError: false, error: null as Error | null, data: null as unknown, refetch: vi.fn() },
  confetti: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, use: () => ({ id: "session-1" }) };
});

vi.mock("@/hooks/use-session-results", () => ({
  useEvaluation: () => mocks.evaluation,
  useTranscript: () => mocks.transcript,
  useCoaching: () => mocks.coaching,
  useLearningPlan: () => mocks.learningPlan,
}));

vi.mock("canvas-confetti", () => ({ default: mocks.confetti }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/auth/CatMascotSvg", () => ({
  CatMascotSvg: () => <div data-testid="cat-loader" />,
}));
vi.mock("@/components/results/OrangeCatMascot", () => ({
  OrangeCatMascot: ({ emotion, className }: { emotion: string; className?: string }) => <div data-testid={`mascot-${emotion}`} className={className} />,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

import SessionResultsPage from "./page";

const legacyEvaluation = {
  session_id: "session-1",
  category_scores: [{ category: "compliance", score: 65, strengths: [], weaknesses: [] }],
  overall_score: 65,
  strengths: [],
  weaknesses: [],
  is_too_short: false,
  rubric_result: null,
};

const canonicalEvaluation = {
  ...legacyEvaluation,
  standard_name: "Custom Standard",
  standard_version_number: 4,
  weighted_total: 62,
  passing_score: 70,
  passed: false,
  rubric_result: {
    status: "evaluated" as const,
    summary: "Needs improvement.",
    categories: [{
      rubric_block_id: "custom-block",
      category: "Custom Category",
      raw_score: 62,
      penalty_total: 8,
      penalized_score: 54,
      weight: 100,
      weighted_contribution: 54,
      passing_score: 70,
      passed: false,
      evidence: [{ sequence_number: 2, speaker: "agent" as const, excerpt: "The balance is due.", explanation: "No plan." }],
      strengths: [],
      violations: [],
      failed_criteria: ["offer-plan"],
      recommendation_inputs: [],
    }],
    weighted_total: 54,
    passing_score: 70,
    passed: false,
    applied_techniques: { techniques_used: [], reason_if_empty: "None." },
    missed_opportunities: { missed_techniques: [], reason_if_empty: "None." },
    recommendations: [],
  },
};

const notApplicableEvaluation = {
  ...canonicalEvaluation,
  weighted_total: 0,
  rubric_result: {
    ...canonicalEvaluation.rubric_result,
    status: "not_applicable" as const,
    summary: "The transcript was too short.",
    categories: [],
    weighted_total: 0,
    passed: false,
    recommendations: [],
  },
};

const transcript = [{ sequence_number: 2, speaker: "agent" as const, text: "The balance is due.", timestamp: "2026-01-01T00:00:00Z" }];
const coaching = { session_id: "session-1", mistakes_by_category: {}, total_mistakes: 0, no_mistakes: true };
const learningPlan = { session_id: "session-1", weak_competencies: [], all_passing: true };

function resetMocks() {
  Object.assign(mocks.evaluation, { isLoading: false, isError: false, error: null, data: legacyEvaluation });
  Object.assign(mocks.transcript, { isLoading: false, isError: false, error: null, data: transcript });
  Object.assign(mocks.coaching, { isLoading: false, isError: false, error: null, data: coaching });
  Object.assign(mocks.learningPlan, { isLoading: false, isError: false, error: null, data: learningPlan });
  mocks.confetti.mockReset();
}

function renderPage() {
  return render(<Suspense fallback={<div>Resolving route</div>}><SessionResultsPage params={Promise.resolve({ id: "session-1" })} /></Suspense>);
}

async function waitForResultsHeading(name = "Evaluation") {
  await waitFor(() => expect(screen.getByRole("heading", { name })).toBeInTheDocument());
}

beforeEach(() => {
  resetMocks();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, media: "", onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() });
});

describe("TASK-070 results page states and accessibility", () => {
  it("renders the primary loading state before evaluation is available", async () => {
    mocks.evaluation.isLoading = true;
    renderPage();
    await waitFor(() => expect(screen.getByText(/analyzing your performance/i)).toBeInTheDocument());
  });

  it("renders independent artifact failures without blocking the evaluation", async () => {
    mocks.evaluation.data = canonicalEvaluation;
    mocks.transcript.isError = true;
    mocks.transcript.error = new Error("Transcript unavailable");
    mocks.coaching.isError = true;
    mocks.coaching.error = new Error("Coaching unavailable");
    renderPage();
    await waitForResultsHeading();
    expect(screen.getByText(/couldn't load transcript/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Go to step 4" }));
    await waitForResultsHeading("Coaching Report");
    expect(screen.getByText(/couldn't load coaching report/i)).toBeInTheDocument();
  });

  it("surfaces malformed payload errors through the artifact retry state", async () => {
    mocks.evaluation.data = canonicalEvaluation;
    mocks.coaching.isError = true;
    mocks.coaching.error = new Error("Coaching response has an invalid shape");
    renderPage();
    await waitForResultsHeading();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Go to step 4" }));
    await waitForResultsHeading("Coaching Report");
    expect(screen.getByText(/coaching response has an invalid shape/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("preserves the legacy results presentation", async () => {
    renderPage();
    await waitForResultsHeading();
    expect(screen.getByText(/legacy session/i)).toBeInTheDocument();
    expect(screen.getByText(/compliance/i)).toBeInTheDocument();
  });

  it("shows no-evidence and empty-recommendation states", async () => {
    mocks.evaluation.data = { ...canonicalEvaluation, rubric_result: { ...canonicalEvaluation.rubric_result, categories: [{ ...canonicalEvaluation.rubric_result.categories[0], evidence: [], raw_score: null, penalized_score: null, passed: false }], recommendations: [] } };
    renderPage();
    await waitForResultsHeading();
    expect(screen.getByText(/no transcript evidence/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Go to step 4" }));
    await waitForResultsHeading("Coaching Report");
    expect(screen.getByText(/no mistakes identified/i)).toBeInTheDocument();
  });

  it("treats not_applicable as terminal across the overall result", async () => {
    mocks.evaluation.data = notApplicableEvaluation;
    renderPage();
    await waitForResultsHeading();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Go to step 6" }));
    await waitForResultsHeading("Overall Score");
    expect(screen.getByText(/evaluation not applicable/i)).toBeInTheDocument();
    expect(screen.getByText(/no pass\/fail result/i)).toBeInTheDocument();
  });

  it("supports keyboard step navigation, focus semantics, and current-step state", async () => {
    renderPage();
    await waitForResultsHeading();
    const user = userEvent.setup();
    const next = screen.getByRole("button", { name: /^next$/i });
    next.focus();
    await user.keyboard("{Enter}");
    await waitForResultsHeading("Strengths");
    expect(screen.getByRole("button", { name: "Go to step 2" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("heading", { name: "Strengths" }).parentElement).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("heading", { name: "Strengths" }).parentElement).toHaveAttribute("role", "region");
    expect(screen.getByRole("button", { name: "Go to step 2" })).toHaveClass("min-h-11", "min-w-11");
  });

  it("keeps reduced motion and verifies rendered overflow metrics at required widths", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, media: "(prefers-reduced-motion: reduce)", onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() });
    const { container } = renderPage();
    await waitForResultsHeading();
    const resultsPage = container.querySelector("[data-results-page]") as HTMLElement;
    const navigation = container.querySelector("[data-results-navigation]") as HTMLElement;
    expect(resultsPage).toBeInTheDocument();
    expect(navigation).toBeInTheDocument();

    for (const width of [320, 640, 768, 1024, 1440]) {
      window.innerWidth = width;
      Object.defineProperties(resultsPage, {
        clientWidth: { configurable: true, value: width },
        scrollWidth: { configurable: true, value: width },
      });
      Object.defineProperties(navigation, {
        clientWidth: { configurable: true, value: Math.max(width - 32, 0) },
        scrollWidth: { configurable: true, value: Math.max(width - 32, 0) },
      });
      expect(resultsPage.scrollWidth).toBeLessThanOrEqual(resultsPage.clientWidth);
      expect(navigation.scrollWidth).toBeLessThanOrEqual(navigation.clientWidth);
      expect(navigation.querySelectorAll("button").length).toBe(9);
      Array.from(navigation.querySelectorAll("button")).forEach((button) => {
        expect(button).toHaveClass("min-h-11");
      });
    }
    expect(screen.getByRole("button", { name: "Go to step 1" })).toHaveClass("focus-visible:ring-2");
    expect(container.querySelector("[class*='motion-safe:animate-in']")).toBeInTheDocument();
    expect(container.querySelector("[class*='motion-reduce:transition-none']")).toBeInTheDocument();
    expect(mocks.confetti).not.toHaveBeenCalled();
  });
});


describe("unsafe and partial result-state exploration", () => {
  it("does not expose raw artifact error details", async () => {
    mocks.evaluation.data = canonicalEvaluation;
    mocks.coaching.isError = true;
    mocks.coaching.error = new Error("database stack trace and campaign owner secret");
    renderPage();
    await waitForResultsHeading();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Go to step 4" }));
    await waitForResultsHeading("Coaching Report");

    expect(screen.queryByText(/database stack trace|campaign owner secret/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("suppresses legacy coaching when canonical recommendations are present", async () => {
    mocks.evaluation.data = {
      ...canonicalEvaluation,
      rubric_result: {
        ...canonicalEvaluation.rubric_result,
        recommendations: [{
          rubric_block_id: "custom-block", criterion_id: "criterion", evidence_sequence_number: 2,
          explanation: "Canonical explanation", recommended_response: "Canonical response", coaching_advice: "Canonical advice",
        }],
      },
    };
    mocks.coaching.data = {
      session_id: "session-1",
      mistakes_by_category: { compliance: [{
        transcript_position: 2, transcript_excerpt: "legacy", category: "compliance",
        explanation: "Legacy duplicate", recommended_alternative: "Legacy alternative",
      }] },
      total_mistakes: 1,
      no_mistakes: false,
    };
    renderPage();
    await waitForResultsHeading();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Go to step 4" }));
    await waitForResultsHeading("Coaching Report");

    expect(screen.getByText("Canonical response")).toBeInTheDocument();
    expect(screen.queryByText("Legacy duplicate")).not.toBeInTheDocument();
    expect(screen.queryByText("Legacy alternative")).not.toBeInTheDocument();
  });

  it("does not show Practice for an invalid scenario reference", async () => {
    mocks.evaluation.data = canonicalEvaluation;
    mocks.learningPlan.data = {
      session_id: "session-1", all_passing: false,
      weak_competencies: [{ category: "Custom", score: 40, scenario_id: "unresolved-scenario", practice_focus: "Review criterion" }],
    };
    renderPage();
    await waitForResultsHeading();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Go to step 5" }));
    await waitForResultsHeading("Learning Plan");

    expect(screen.getByText("Review criterion")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /practice/i })).not.toBeInTheDocument();
  });

  it("preserves an authorized scenario action and existing session navigation", async () => {
    mocks.evaluation.data = canonicalEvaluation;
    mocks.learningPlan.data = {
      session_id: "session-1", all_passing: false,
      weak_competencies: [{
        category: "Custom Category", score: 40, rubric_block_id: "custom-block", criterion_id: "offer-plan",
        scenario_id: "scenario-123", practice_focus: "Practice offering a plan.",
      }],
    };
    renderPage();
    await waitForResultsHeading();

    expect(screen.getByRole("link", { name: "All Sessions" })).toHaveAttribute("href", "/sessions");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Go to step 5" }));
    await waitForResultsHeading("Learning Plan");

    expect(screen.getByText("Practice offering a plan.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /practice/i })).toHaveAttribute("href", "/sessions/new?scenario_id=scenario-123");
  });
});
