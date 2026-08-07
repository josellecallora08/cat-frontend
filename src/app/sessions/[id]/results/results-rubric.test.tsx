import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { RubricCategoryScore, RubricRecommendation } from "@/lib/api/sessions";
import { RecommendationPanel } from "@/components/results/recommendation-panel";
import { RubricScoreCard } from "@/components/results/rubric-score-card";

const category: RubricCategoryScore = {
  rubric_block_id: "compliance",
  category: "Compliance",
  raw_score: 80,
  penalty_total: 5,
  penalized_score: 75,
  weight: 40,
  weighted_contribution: 30,
  passing_score: 70,
  passed: true,
  evidence: [{ sequence_number: 4, speaker: "agent", excerpt: "I can offer an arrangement.", explanation: "The agent offered a compliant option." }],
  strengths: [{ criterion_id: "options", explanation: "Offered a clear option.", evidence_sequence_numbers: [4] }],
  violations: [],
  failed_criteria: [],
  recommendation_inputs: [],
};

const recommendation: RubricRecommendation = {
  rubric_block_id: "compliance",
  criterion_id: "options",
  evidence_sequence_number: 4,
  source_speaker: "agent",
  source_excerpt: "I can offer an arrangement.",
  explanation: "The response could acknowledge the concern first.",
  recommended_response: "I understand the concern; let us review the available options.",
  coaching_advice: "Pair the option with an empathy statement.",
};

describe("rubric result components", () => {
  it("shows deterministic category calculations and accessible evidence disclosure", async () => {
    const user = userEvent.setup();
    render(<RubricScoreCard category={category} transcript={[{ sequence_number: 4, speaker: "agent", text: "I can offer an arrangement.", timestamp: "2026-01-01T00:00:00Z" }]} />);

    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent?.includes("75 × 40% ÷ 100 = 30.00") === true)).toBeInTheDocument();
    expect(screen.getByText("Passing")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /show transcript evidence/i });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/sequence 4 · agent/i)).toBeInTheDocument();
    expect(screen.getByText(/i can offer an arrangement/i)).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveClass("min-w-0");
  });

  it("renders grounded recommendations as text with source references", () => {
    render(<RecommendationPanel recommendations={[recommendation]} />);

    expect(screen.getByText(recommendation.recommended_response)).toBeInTheDocument();
    expect(screen.getByText(/transcript sequence 4/i)).toBeInTheDocument();
    expect(screen.getByText(/source speaker: agent/i)).toBeInTheDocument();
    expect(screen.getByText(/“i can offer an arrangement\.”/i)).toBeInTheDocument();
    expect(document.querySelector("[dangerouslySetInnerHTML]")).not.toBeInTheDocument();
  });

  it("handles empty recommendations and no-evidence states", () => {
    render(<div><RecommendationPanel recommendations={[]} /><RubricScoreCard category={{ ...category, evidence: [], passed: false, penalized_score: null, raw_score: null }} /></div>);

    expect(screen.getByText(/no additional recommendations/i)).toBeInTheDocument();
    expect(screen.getByText(/no transcript evidence/i)).toBeInTheDocument();
    expect(screen.getAllByText("Not applicable").length).toBeGreaterThan(0);
  });

  it("groups recommendations by rubric category and keeps short lists reachable", () => {
    const recommendations = Array.from({ length: 4 }, (_, index) => ({
      ...recommendation,
      rubric_block_id: index < 2 ? "compliance" : "resolution",
      block_name: index < 2 ? "Compliance" : "Resolution",
      criterion_id: `criterion-${index}`,
      evidence_sequence_number: index + 1,
    }));

    render(<RecommendationPanel recommendations={recommendations} />);

    expect(screen.getByRole("heading", { name: "Compliance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Resolution" })).toBeInTheDocument();
    expect(screen.getAllByText(/try instead:/i)).toHaveLength(4);
    expect(screen.queryByRole("button", { name: /show all recommendations/i })).not.toBeInTheDocument();
  });

});


describe("recommendation and action boundary exploration", () => {
  const makeRecommendation = (index: number): RubricRecommendation => ({
    ...recommendation,
    criterion_id: `criterion-${index}`,
    evidence_sequence_number: index,
  });

  it("does not require disclosure for ten recommendations and keeps them reachable", () => {
    render(<RecommendationPanel recommendations={Array.from({ length: 10 }, (_, index) => makeRecommendation(index))} />);

    expect(screen.queryByRole("button", { name: /show all recommendations/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/try instead:/i)).toHaveLength(10);
  });

  it("requires explicit disclosure and keeps all eleven recommendations reachable", async () => {
    const user = userEvent.setup();
    render(<RecommendationPanel recommendations={Array.from({ length: 11 }, (_, index) => makeRecommendation(index))} />);

    const toggle = screen.getByRole("button", { name: /show all recommendations/i });
    expect(toggle).toHaveAttribute("aria-controls");
    expect(screen.getAllByText(/try instead:/i)).toHaveLength(3);
    await user.click(toggle);
    expect(screen.getAllByText(/try instead:/i)).toHaveLength(11);
  });
});
