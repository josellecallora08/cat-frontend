import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReportShell } from "@/components/results/report-shell";
import { useAuthStore } from "@/stores/auth-store";
import type { NormalizedReport, ReportSectionName, SectionEnvelope } from "@/types/report";

const names: ReportSectionName[] = ["metadata", "transcript", "evaluation", "coaching", "learning_plan", "summary"];

function section(name: ReportSectionName, state: SectionEnvelope["state"] = "loaded"): SectionEnvelope {
  return {
    name,
    state,
    data: state === "loaded" ? { value: `${name} data` } : null,
    unavailable_reason: state === "empty" ? "No transcript was recorded." : null,
    failure: state === "failed" ? {
      class: "backend", code: "section_unavailable", safe_message: "Section unavailable.", correlation_id: "corr-42",
    } : null,
    updated_at: null,
  };
}

function report(overrides: Partial<NormalizedReport> = {}): NormalizedReport {
  return {
    session_id: "session-1", session: null, report_status: "complete", score_status: "evaluated",
    evaluation_version: { id: "version-7", number: 7, name: "Published standard", kind: "current" },
    evaluation_kind: "current", sections: Object.fromEntries(names.map((name) => [name, section(name)])) as NormalizedReport["sections"], correlation_id: null,
    ...overrides,
  };
}

describe("ReportShell report lifecycle", () => {
  beforeEach(() => {
    useAuthStore.setState({ isHydrated: true, user: { id: "admin-1", email: "admin@example.com", full_name: "Admin", role: "admin", user_type: null, is_active: true, avatar_url: null } });
  });

  it("renders loading, loaded, empty, and failed sections independently", () => {
    const current = report({
      report_status: "partial",
      sections: {
        ...report().sections,
        metadata: section("metadata", "loading"),
        transcript: section("transcript", "loaded"),
        evaluation: section("evaluation", "empty"),
        coaching: section("coaching", "failed"),
      },
    });
    render(<ReportShell report={current} reportError={null} sessionId="session-1" onRetry={vi.fn()} onRetrySection={vi.fn()}><p>Metadata content</p></ReportShell>);

    expect(screen.getByText("Loading section…")).toBeInTheDocument();
    expect(screen.getAllByText("Section loaded.")).toHaveLength(3);
    expect(screen.getByText("No transcript was recorded.")).toBeInTheDocument();
    expect(screen.getAllByText("This report section is unavailable.")).toHaveLength(1);
    expect(screen.getByText("Support reference: corr-42")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry complete report" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry section" })).toBeInTheDocument();
  });

  it("invokes full and section retry without discarding successful content", async () => {
    const onRetry = vi.fn();
    const onRetrySection = vi.fn();
    const current = report({ report_status: "partial", sections: { ...report().sections, coaching: section("coaching", "failed") } });
    render(<ReportShell report={current} reportError={null} sessionId="session-1" onRetry={onRetry} onRetrySection={onRetrySection}><p>Successful metadata</p></ReportShell>);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry complete report" }));
    await user.click(screen.getByRole("button", { name: "Retry section" }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(onRetrySection).toHaveBeenCalledWith("coaching");
    expect(screen.getByText("Successful metadata")).toBeInTheDocument();
  });

  it("distinguishes current, legacy, and too-short completion metadata", () => {
    const { rerender } = render(<ReportShell report={report()} reportError={null} sessionId="session-1" onRetry={vi.fn()}><p /></ReportShell>);
    expect(screen.getByText("Published standard")).toBeInTheDocument();
    expect(screen.getByText("7", { selector: "dd" })).toBeInTheDocument();

    const legacy = report({ evaluation_kind: "legacy", evaluation_version: { id: null, number: null, name: null, kind: "legacy" }, report_status: "partial", score_status: "unavailable" });
    rerender(<ReportShell report={legacy} reportError={null} sessionId="session-1" onRetry={vi.fn()}><p /></ReportShell>);
    expect(screen.getByText("Legacy evaluation")).toBeInTheDocument();

    const short = report({ report_status: "not_applicable", score_status: "not_applicable" });
    rerender(<ReportShell report={short} reportError={null} sessionId="session-1" onRetry={vi.fn()}><p /></ReportShell>);
    expect(screen.getByText(/fewer than four transcript utterances/i)).toBeInTheDocument();
    expect(screen.getByText(/no passing or failing score/i)).toBeInTheDocument();
  });

  it("uses a safe page-level message for authorization failures", () => {
    const error = Object.assign(new Error("SQL stack trace /internal/token"), { category: "forbidden" });
    render(<ReportShell report={null} reportError={error} sessionId="session-1" onRetry={vi.fn()}><p /></ReportShell>);
    expect(screen.getByRole("heading", { name: "Unable to access this report" })).toBeInTheDocument();
    expect(screen.queryByText(/SQL stack trace|internal\/token/i)).not.toBeInTheDocument();
  });

  it("does not move focus when a background section update changes state", () => {
    const initial = report({ report_status: "partial", sections: { ...report().sections, coaching: section("coaching", "failed") } });
    const { rerender } = render(<ReportShell report={initial} reportError={null} sessionId="session-1" onRetry={vi.fn()} onRetrySection={vi.fn()}><p /></ReportShell>);
    const exportButton = screen.getByRole("button", { name: "Download report as CSV" });
    exportButton.focus();
    const updated = report({ sections: { ...initial.sections, coaching: section("coaching", "loaded") } });
    rerender(<ReportShell report={updated} reportError={null} sessionId="session-1" onRetry={vi.fn()} onRetrySection={vi.fn()}><p /></ReportShell>);
    expect(document.activeElement).toBe(exportButton);
  });
});
