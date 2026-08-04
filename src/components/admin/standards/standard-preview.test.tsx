import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StandardPreview } from "./standard-preview";

describe("StandardPreview", () => {
  it("renders the trainee-facing rubric without an evaluation request", () => {
    render(<StandardPreview name="Practice rubric" versionNumber={3} content={{
      schema_version: 1,
      overall_passing_score: 70,
      blocks: [{
        id: "opening",
        category: "Opening",
        weight: 100,
        passing_score: 70,
        scoring_instructions: "Use evidence.",
        positive_behaviors: [{ id: "greeting", name: "Clear greeting", description: "Greets clearly.", evidence_instructions: "Quote the greeting." }],
        violations: [],
        penalties: [],
        recommendation_guidance: "Practice greetings.",
        display_order: 0,
      }],
    }} />);

    expect(screen.getByText("Practice rubric")).toBeInTheDocument();
    expect(screen.getByText("Version 3")).toBeInTheDocument();
    expect(screen.getByText("Clear greeting: Greets clearly.")).toBeInTheDocument();
  });
});
