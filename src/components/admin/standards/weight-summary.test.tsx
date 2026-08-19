import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WeightSummary } from "./weight-summary";

describe("WeightSummary", () => {
  it("announces remaining weight and readiness accessibly", () => {
    const { rerender } = render(<WeightSummary total={80} />);
    const liveRegion = screen.getByText("80%").parentElement;
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    expect(screen.getByLabelText("Weights need attention")).toBeInTheDocument();
    expect(screen.getByText("20% remaining")).toBeInTheDocument();

    rerender(<WeightSummary total={100} />);
    expect(screen.getByText("Ready to publish")).toBeInTheDocument();
  });

  it("reports excess weight and validation errors", () => {
    render(<WeightSummary total={110} errorCount={2} />);
    expect(screen.getByText("10% over the limit")).toBeInTheDocument();
    expect(screen.getByText("2 validation errors.")).toBeInTheDocument();
  });
});

describe("WeightSummary 'Why 100%?' disclosure", () => {
  it("renders a collapsed 'Why 100%?' toggle with accessible disclosure attributes", () => {
    render(<WeightSummary total={80} />);
    const toggle = screen.getByRole("button", { name: /why 100%\?/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const controlledId = toggle.getAttribute("aria-controls");
    expect(controlledId).toBeTruthy();
  });

  it("reveals the plain-language explanation and flips aria-expanded when clicked", async () => {
    const user = userEvent.setup();
    render(<WeightSummary total={80} />);
    const toggle = screen.getByRole("button", { name: /why 100%\?/i });

    expect(
      screen.queryByText(
        "Every trainee's score is a blend of each category's weight. If the weights don't add up to 100%, the math can't produce a fair final score.",
      ),
    ).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(
        "Every trainee's score is a blend of each category's weight. If the weights don't add up to 100%, the math can't produce a fair final score.",
      ),
    ).toBeInTheDocument();
  });

  it("still renders the existing status copy alongside the new disclosure", () => {
    const { rerender } = render(<WeightSummary total={80} />);
    expect(screen.getByText("20% remaining")).toBeInTheDocument();

    rerender(<WeightSummary total={100} />);
    expect(screen.getByText("Ready to publish")).toBeInTheDocument();

    rerender(<WeightSummary total={110} />);
    expect(screen.getByText("10% over the limit")).toBeInTheDocument();
  });
});
