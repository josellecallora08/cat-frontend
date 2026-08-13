import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { ReportShell } from "@/components/results/report-shell";
import type { NormalizedReport, SectionEnvelope } from "@/types/report";

const SUPPORTED_WIDTHS = [320, 375, 640, 768, 1024, 1440, 1920];

function emptySection(name: SectionEnvelope["name"]): SectionEnvelope {
  return {
    name,
    state: "empty",
    data: null,
    unavailable_reason: "No data is available.",
    failure: null,
    updated_at: null,
  };
}

function createReport(): NormalizedReport {
  const sections = {
    metadata: emptySection("metadata"),
    transcript: emptySection("transcript"),
    evaluation: emptySection("evaluation"),
    coaching: emptySection("coaching"),
    learning_plan: emptySection("learning_plan"),
    summary: {
      ...emptySection("summary"),
      state: "failed" as const,
      unavailable_reason: null,
      failure: {
        class: "backend" as const,
        code: "unavailable",
        safe_message: "This report section is unavailable.",
        correlation_id: null,
      },
    },
  };

  return {
    session_id: "session-responsive",
    session: null,
    report_status: "partial",
    score_status: "unavailable",
    evaluation_version: { id: null, number: null, name: null, kind: "legacy" },
    evaluation_kind: "legacy",
    sections,
    correlation_id: null,
  };
}

describe("report responsive and print release gate", () => {
  it.each(SUPPORTED_WIDTHS)(
    "keeps report controls and state indicators reachable at %ipx",
    (width) => {
      Object.defineProperty(document.documentElement, "clientWidth", {
        configurable: true,
        value: width,
      });
      Object.defineProperty(document.documentElement, "scrollWidth", {
        configurable: true,
        value: width,
      });

      const { container } = render(
        <ReportShell
          report={createReport()}
          reportError={null}
          sessionId="session-responsive"
          onRetry={vi.fn()}
        >
          <p>Report metadata</p>
        </ReportShell>,
      );

      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth,
      );
      expect(screen.getByRole("button", { name: "Download report as CSV" })).toBeVisible();
      expect(screen.getByRole("button", { name: "Retry complete report" })).toBeVisible();
      expect(screen.getAllByRole("status").length).toBeGreaterThanOrEqual(6);
      expect(container.querySelector("main")).toHaveClass("overflow-x-hidden");
      expect(container.querySelectorAll(".report-content-boundary")).toHaveLength(6);
    },
  );

  it("keeps wide data bounded to a labeled scroll region", () => {
    const { container } = render(
      <div className="report-content-boundary">
        <div className="report-wide-content" data-wide-content="true" aria-label="Wide report data">
          <table><tbody><tr><td>Wide value</td></tr></tbody></table>
        </div>
      </div>,
    );

    const region = container.querySelector("[data-wide-content='true']");
    expect(region).toHaveAttribute("aria-label", "Wide report data");
    expect(region).toHaveClass("report-wide-content");
    expect(container.firstElementChild).toHaveClass("report-content-boundary");
  });

  it("keeps print pagination and print-only visibility rules configured", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toContain("@media print");
    expect(css).toContain(".report-print-section");
    expect(css).toContain("break-inside: avoid");
    expect(css).toContain("page-break-inside: avoid");
    expect(css).toContain(".screen-only-controls");
    expect(css).toContain("button,");
    expect(css).toContain("[role=\"status\"]");

    render(
      <div className="report-print-root">
        <section className="report-print-section" aria-label="Summary" data-report-section="summary">
          <h2>Summary</h2>
          <div role="status">Section loaded.</div>
          <div className="screen-only-controls"><button type="button">Retry</button></div>
        </section>
      </div>,
    );

    expect(screen.getByRole("region", { name: "Summary" })).toHaveClass("report-print-section");
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
