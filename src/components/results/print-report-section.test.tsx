import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrintReportSection } from "@/components/results/print-report-section";

describe("PrintReportSection", () => {
  it("marks one report section for print pagination while retaining semantic content", () => {
    render(
      <PrintReportSection sectionName="Evaluation" className="extra-class">
        <h2>Evaluation</h2>
        <table>
          <thead><tr><th scope="col">Score</th></tr></thead>
          <tbody><tr><td>85</td></tr></tbody>
        </table>
      </PrintReportSection>,
    );

    const section = screen.getByRole("region", { name: "Evaluation" });
    expect(section).toHaveClass("report-print-section", "extra-class");
    expect(section).toHaveAttribute("data-report-section", "Evaluation");
    expect(screen.getByRole("columnheader", { name: "Score" })).toBeInTheDocument();
  });

  it("retains legacy and not-applicable status content for print output", () => {
    render(
      <PrintReportSection sectionName="Session report">
        <h2>Session report</h2>
        <p>Legacy evaluation</p>
        <div role="status" aria-live="polite">
          Evaluation not applicable: fewer than four transcript utterances were available.
        </div>
        <div className="screen-only-controls">
          <button type="button">Retry complete report</button>
        </div>
      </PrintReportSection>,
    );

    expect(screen.getByText("Legacy evaluation")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("fewer than four transcript utterances");
    expect(screen.getByRole("button", { name: "Retry complete report" }).parentElement).toHaveClass("screen-only-controls");
  });
});
