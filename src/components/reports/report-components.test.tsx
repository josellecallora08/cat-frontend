import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReportCoachingSection } from "@/components/reports/report-coaching-section";
import { ReportLearningPlanSection } from "@/components/reports/report-learning-plan-section";
import { ReportScoreBreakdown } from "@/components/reports/report-score-breakdown";
import { ReportStatus } from "@/components/reports/report-status";
import { ReportSummary } from "@/components/reports/report-summary";
import { ReportTranscriptSection } from "@/components/reports/report-transcript-section";
import { canonicalReport, cloneReport, legacyReport } from "@/lib/api/session-report-fixtures";

function reportWithTerminalEvaluation() {
  const report = cloneReport(canonicalReport());
  report.payload.evaluation.mode = "not_applicable";
  report.payload.evaluation.reason_code = "not_applicable";
  report.payload.evaluation.reason = "Evaluation is not applicable.";
  return report;
}

describe("reusable session report sections", () => {
  it("renders canonical evaluation, coaching evidence metadata, summary, transcript, and authorized practice", () => {
    const report = canonicalReport();
    render(<><ReportSummary report={report} /><ReportScoreBreakdown report={report} /><ReportCoachingSection report={report} /><ReportLearningPlanSection report={report} /><ReportTranscriptSection report={report} /></>);

    expect(screen.getByText("Session summary")).toBeInTheDocument();
    expect(screen.getAllByText("Opening").length).toBeGreaterThan(0);
    expect(screen.getByText(/Source speaker: agent/)).toBeInTheDocument();
    expect(screen.getByText("Practice")).toBeInTheDocument();
    expect(screen.getByText("I can help with that.")).toBeInTheDocument();
  });

  it("preserves legacy scores without rendering canonical rubric markup", () => {
    const report = legacyReport();
    render(<ReportScoreBreakdown report={report} />);

    expect(screen.getByText(/Legacy evaluation/)).toBeInTheDocument();
    expect(screen.getByText("65/100")).toBeInTheDocument();
    expect(screen.queryByText("Raw score")).not.toBeInTheDocument();
  });

  it("renders typed terminal status and suppresses score, remediation, and Practice actions", () => {
    const report = reportWithTerminalEvaluation();
    render(<><ReportStatus status="not_applicable" reasonCode="not_applicable" /><ReportScoreBreakdown report={report} /><ReportCoachingSection report={report} /><ReportLearningPlanSection report={report} /></>);

    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Evaluation is not applicable/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
    expect(screen.queryByText("Practice")).not.toBeInTheDocument();
  });

  it("keeps valid sections visible when other artifacts are absent", () => {
    const report = cloneReport(canonicalReport());
    report.payload.evaluation = { available: false, reason: "Evaluation artifact is missing.", reason_code: "artifact_missing", mode: null, canonical: null, legacy: null };
    report.payload.coaching = { available: false, reason: "No coaching artifact.", reason_code: "no_coaching", mode: null, blocks: [], legacy_mistakes_by_category: {} };
    report.payload.learning_plan = { available: false, reason: "No learning plan artifact.", reason_code: "no_learning_plan", items: [], all_passing: null };
    render(<><ReportScoreBreakdown report={report} /><ReportCoachingSection report={report} /><ReportLearningPlanSection report={report} /><ReportTranscriptSection report={report} /></>);

    expect(screen.getByText("Transcript")).toBeInTheDocument();
    expect(screen.getByText("Evaluation artifact is missing.")).toBeInTheDocument();
    expect(screen.getByText("No coaching artifact.")).toBeInTheDocument();
    expect(screen.getByText("No learning plan artifact.")).toBeInTheDocument();
  });

  it("suppresses legacy coaching when canonical coaching is present", () => {
    const report = cloneReport(canonicalReport());
    report.payload.coaching.legacy_mistakes_by_category = { compliance: [{ transcript_position: 1, explanation: "Duplicate legacy coaching", recommended_alternative: "Do not show this", transcript_excerpt: "Thank you.", category: "compliance" }] };
    render(<ReportCoachingSection report={report} />);

    expect(screen.getByText(/Continue this approach/)).toBeInTheDocument();
    expect(screen.queryByText("Duplicate legacy coaching")).not.toBeInTheDocument();
  });

  it("gates Practice to a valid authorized session scenario", () => {
    const report = cloneReport(canonicalReport());
    report.payload.learning_plan.items[0].scenario_id = "scenario-other";
    render(<ReportLearningPlanSection report={report} />);
    expect(screen.queryByText("Practice")).not.toBeInTheDocument();
  });
});
