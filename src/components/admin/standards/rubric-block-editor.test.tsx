import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RubricBlockEditor } from "./rubric-block-editor";
import type { RubricBlock } from "@/lib/negotiation-standard-types";

function makeBlock(): RubricBlock {
  return {
    id: "opening-block",
    category: "Opening",
    weight: 40,
    passing_score: 70,
    scoring_instructions: "Score based on rapport building.",
    positive_behaviors: [
      {
        id: "greets-debtor",
        name: "Greets the debtor",
        description: "Agent opens with a courteous greeting.",
        evidence_instructions: "Quote the greeting line.",
      },
    ],
    violations: [
      {
        id: "skips-mini-miranda",
        name: "Skips mini-Miranda",
        description: "Agent fails to disclose required notice.",
        evidence_instructions: "Quote the missing disclosure.",
      },
    ],
    penalties: [],
    recommendation_guidance: "Coach on greeting warmth and disclosure timing.",
    display_order: 0,
  };
}

function renderEditor(block: RubricBlock = makeBlock()) {
  return render(
    <RubricBlockEditor
      block={block}
      onChange={vi.fn()}
      onRemove={vi.fn()}
      onMove={vi.fn()}
    />,
  );
}

describe("RubricBlockEditor field visibility (no Advanced settings, no numbered steps)", () => {
  it("shows the block-level Stable ID field inline, without any disclosure to expand", () => {
    const block = makeBlock();
    renderEditor(block);

    expect(screen.getByDisplayValue(block.id)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /advanced settings/i })).not.toBeInTheDocument();
  });

  it("shows each per-criterion Stable ID field inline, without any disclosure to expand", () => {
    const block = makeBlock();
    renderEditor(block);

    expect(screen.getByDisplayValue(block.positive_behaviors[0]!.id)).toBeInTheDocument();
    expect(screen.getByDisplayValue(block.violations[0]!.id)).toBeInTheDocument();
  });

  it("does not render numbered step badges or step titles", () => {
    renderEditor();

    expect(screen.queryByText("1. Basics")).not.toBeInTheDocument();
    expect(screen.queryByText("2. What to look for")).not.toBeInTheDocument();
    expect(screen.queryByText("3. Scoring & guidance")).not.toBeInTheDocument();
  });

  it("keeps every section visible on a single page (Block details, Positive behaviors, Violations, Penalties, Recommendation guidance)", () => {
    renderEditor();

    expect(screen.getByText("Block details")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Positive behaviors" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Violations" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Penalties" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recommendation guidance" })).toBeInTheDocument();
  });
});

function matchesLabelWithRequiredMark(label: string) {
  return (_content: string, element: Element | null) => {
    if (element?.tagName !== "LABEL") return false;
    const ownText = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE || (node as Element).tagName === "SPAN")
      .map((node) => node.textContent ?? "")
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    return ownText === `${label} *`;
  };
}

describe("RubricBlockEditor required-field indicators", () => {
  it("marks Category, Weight, Passing score, Stable ID, and Scoring instructions as required", () => {
    renderEditor();

    expect(screen.getByText(matchesLabelWithRequiredMark("Category"))).toBeInTheDocument();
    expect(screen.getByText(matchesLabelWithRequiredMark("Weight (%)"))).toBeInTheDocument();
    expect(screen.getByText(matchesLabelWithRequiredMark("Passing score"))).toBeInTheDocument();
    expect(screen.getAllByText(matchesLabelWithRequiredMark("Stable ID")).length).toBeGreaterThan(0);
    expect(screen.getByText(matchesLabelWithRequiredMark("Scoring instructions"))).toBeInTheDocument();
  });

  it("marks per-criterion Name, Description, and Evidence instructions as required", () => {
    renderEditor();

    expect(screen.getAllByText(matchesLabelWithRequiredMark("Name")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(matchesLabelWithRequiredMark("Description")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(matchesLabelWithRequiredMark("Evidence instructions")).length).toBeGreaterThan(0);
  });
});

describe("RubricBlockEditor plain-language helper text", () => {
  it("shows the exact helper sentence beneath Weight (%)", () => {
    renderEditor();
    expect(
      screen.getByText("Share of the total score this category is worth. All blocks must add up to 100%."),
    ).toBeInTheDocument();
  });

  it("shows the exact helper sentence beneath Passing score", () => {
    renderEditor();
    expect(
      screen.getByText("Minimum score a trainee needs in just this category."),
    ).toBeInTheDocument();
  });
});

describe("RubricBlockEditor scoring instructions field size", () => {
  it("renders a larger scoring-instructions textarea (8 rows) now that Advanced settings no longer takes up space", () => {
    renderEditor();
    const textarea = screen.getByLabelText(/scoring instructions/i);
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveAttribute("rows", "8");
  });
});
