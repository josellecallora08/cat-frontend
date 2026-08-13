import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReportSection } from "@/components/results/report-section";
import { ReportShell } from "@/components/results/report-shell";
import type { NormalizedReport, SectionEnvelope } from "@/types/report";

const emptySection = (name: SectionEnvelope["name"]): SectionEnvelope => ({
  name,
  state: "empty",
  data: null,
  unavailable_reason: "No data is available.",
  failure: null,
  updated_at: null,
});

const report: NormalizedReport = {
  session_id: "session-1",
  session: null,
  report_status: "partial",
  score_status: "unavailable",
  evaluation_version: { id: null, number: null, name: null, kind: "legacy" },
  evaluation_kind: "legacy",
  sections: {
    metadata: emptySection("metadata"),
    transcript: emptySection("transcript"),
    evaluation: emptySection("evaluation"),
    coaching: emptySection("coaching"),
    learning_plan: emptySection("learning_plan"),
    summary: {
      ...emptySection("summary"),
      state: "failed",
      unavailable_reason: null,
      failure: {
        class: "backend",
        code: "unavailable",
        safe_message: "This report section is unavailable.",
        correlation_id: "corr-123",
      },
    },
  },
  correlation_id: null,
};

describe("report accessibility semantics", () => {
  it("announces each section state and names its retry control", () => {
    const onRetry = vi.fn();
    render(
      <ReportSection section={report.sections.summary} title="Summary" onRetry={onRetry}>
        <p>Summary content</p>
      </ReportSection>,
    );

    expect(screen.getByRole("heading", { name: "Summary", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
    expect(screen.getByRole("button", { name: "Retry section" })).toBeVisible();
    expect(screen.getByText("Support reference: corr-123")).toBeInTheDocument();
  });

  it("provides report landmarks and keyboard-visible control styles", () => {
    render(
      <ReportShell
        report={report}
        reportError={null}
        sessionId="session-1"
        onRetry={vi.fn()}
      >
        <p>Metadata</p>
      </ReportShell>,
    );

    expect(screen.getByRole("main", { name: "Session report" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Report sections" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download report as CSV" })).toHaveClass("min-h-11");
    expect(screen.getByRole("button", { name: "Retry complete report" })).toHaveClass("focus-visible:ring-2");
  });

  it("supports an accessible text alternative alongside non-text score content", () => {
    render(
      <ReportSection section={report.sections.evaluation} title="Evaluation">
        <div role="img" aria-label="Overall score: 85 out of 100" />
        <table aria-label="Evaluation scores">
          <thead><tr><th scope="col">Score</th></tr></thead>
          <tbody><tr><td>85</td></tr></tbody>
        </table>
      </ReportSection>,
    );

    expect(screen.getByRole("img", { name: "Overall score: 85 out of 100" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Evaluation scores" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Score" })).toBeInTheDocument();
  });
});
