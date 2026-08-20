import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StandardPreview } from "./standard-preview";
import type { NegotiationStandardContent } from "@/lib/negotiation-standard-types";

const content: NegotiationStandardContent = {
  schema_version: 1,
  overall_passing_score: 70,
  blocks: [
    {
      id: "opening",
      category: "Opening",
      weight: 100,
      passing_score: 70,
      scoring_instructions: "Score the opening.",
      positive_behaviors: [],
      violations: [],
      penalties: [],
      recommendation_guidance: "Reinforce a strong opening.",
      display_order: 0,
    },
  ],
};

describe("StandardPreview 'no AI used' badge", () => {
  it("renders a badge clarifying this preview does not call an LLM", () => {
    render(<StandardPreview content={content} name="Collections standard" />);
    expect(screen.getByText("Preview — no AI used")).toBeInTheDocument();
  });

  it("never issues a network request while rendering the preview", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<StandardPreview content={content} name="Collections standard" versionNumber={2} />);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
