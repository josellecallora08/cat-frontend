import { render, screen } from "@testing-library/react";
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
