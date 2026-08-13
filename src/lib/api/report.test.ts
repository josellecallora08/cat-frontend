import { describe, expect, it } from "vitest";

import { parseReportPayload } from "@/lib/api/report";

const envelope = (name: string, state: string, data?: unknown) => ({ name, state, data });

function payload(overrides: Record<string, unknown> = {}) {
  return {
    session_id: "session-1",
    sections: {
      metadata: envelope("metadata", "loaded", { status: "completed" }),
      transcript: envelope("transcript", "empty"),
      evaluation: envelope("evaluation", "loaded", {
        session_id: "session-1", is_too_short: false, rubric_result: null,
      }),
    },
    ...overrides,
  };
}

describe("report contract normalization", () => {
  it("normalizes omitted optional fields and legacy evaluation", () => {
    const report = parseReportPayload(payload());
    expect(report.evaluation_kind).toBe("legacy");
    expect(report.evaluation_version).toEqual({ id: null, number: null, name: null, kind: "legacy" });
    expect(report.sections.transcript).toMatchObject({ state: "empty", unavailable_reason: "No data is available." });
    expect(report.sections.coaching.state).toBe("failed");
  });

  it("preserves canonical version metadata and too-short semantics", () => {
    const report = parseReportPayload(payload({
      report_status: "not_applicable",
      score_status: "not_applicable",
      evaluation_version: { id: "v1", number: 1, name: "Published", kind: "current" },
      sections: { evaluation: envelope("evaluation", "loaded", { is_too_short: true, rubric_result: { status: "not_applicable" } }) },
    }));
    expect(report.evaluation_kind).toBe("current");
    expect(report.report_status).toBe("not_applicable");
    expect(report.score_status).toBe("not_applicable");
  });

  it("turns unknown states and malformed loaded sections into local contract failures", () => {
    const report = parseReportPayload(payload({
      sections: {
        metadata: envelope("metadata", "unknown"),
        transcript: envelope("transcript", "loaded"),
        evaluation: envelope("evaluation", "loaded", { rubric_result: { status: "evaluated" } }),
      },
    }));
    expect(report.sections.metadata.failure?.class).toBe("data_contract");
    expect(report.sections.transcript.failure?.class).toBe("data_contract");
    expect(report.sections.evaluation.state).toBe("loaded");
  });

  it("normalizes malformed failed envelopes as data-contract failures", () => {
    const report = parseReportPayload(payload({
      sections: {
        metadata: { name: "metadata", state: "failed", failure: { safe_message: "" } },
        transcript: { name: "transcript", state: "failed", failure: { safe_message: "section unavailable" } },
        evaluation: envelope("evaluation", "loaded", { rubric_result: { status: "evaluated" } }),
      },
    }));

    expect(report.sections.metadata.state).toBe("failed");
    expect(report.sections.metadata.failure).toMatchObject({
      class: "data_contract",
      code: "malformed_section",
    });
    expect(report.sections.transcript.failure?.safe_message).toBe("section unavailable");
    expect(report.sections.evaluation.state).toBe("loaded");
  });

  it("preserves explicit unavailable reasons for empty sections", () => {
    const report = parseReportPayload(payload({
      sections: {
        metadata: envelope("metadata", "loaded", { status: "completed" }),
        transcript: { name: "transcript", state: "empty", unavailable_reason: "Transcript omitted." },
        evaluation: envelope("evaluation", "loaded", { rubric_result: { status: "evaluated" } }),
      },
    }));

    expect(report.sections.transcript).toMatchObject({
      state: "empty",
      data: null,
      unavailable_reason: "Transcript omitted.",
      failure: null,
    });
  });

  it("does not infer a score from malformed or omitted evaluation status", () => {
    const report = parseReportPayload(payload({
      score_status: "unexpected",
      sections: {
        evaluation: envelope("evaluation", "loaded", { rubric_result: {} }),
      },
    }));

    expect(report.score_status).toBe("unavailable");
    expect(report.report_status).toBe("partial");
  });

  it("rejects a payload without a session identifier", () => {
    expect(() => parseReportPayload({ sections: {} })).toThrow(/report response is invalid/i);
  });
});
