import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  downloadSessionReport,
  downloadSessionReportArtifact,
  fetchSessionReport,
  fetchSessionReportStatus,
  parseReportFilename,
  parseReportPayload,
  parseReportStatus,
  SessionArtifactError,
} from "@/lib/api/session-reports";
import {
  canonicalReport,
  cloneReport,
  legacyReport,
  readyStatusWithFailedAttempt,
} from "@/lib/api/session-report-fixtures";

function validReport() {
  return {
    session_id: "session-1",
    report_version: 1,
    status: "ready",
    content_hash: "a".repeat(64),
    created_at: "2026-08-10T10:00:00Z",
    payload: {
      summary: {
        session_id: "session-1", scenario_id: "scenario-1", agent_id: "agent-1",
        campaign_id: null, campaign_name: null, persona: null, status: "completed",
        created_at: "2026-08-10T09:00:00Z", ended_at: "2026-08-10T10:00:00Z",
        duration_seconds: 3600, standard_id: null, standard_version_id: null,
        standard_version_number: null, standard_name: null,
      },
      transcript: { available: true, entries: [] },
      evaluation: { available: false, reason: "No evaluation", mode: null, canonical: null, legacy: null },
      coaching: { available: false, reason: "No coaching", mode: null, blocks: [], legacy_mistakes_by_category: {} },
      learning_plan: { available: false, reason: "No plan", items: [], all_passing: null },
    },
  };
}

describe("session report API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("loads an authenticated report and validates its envelope", async () => {
    window.localStorage.setItem("cat_token", "token-1");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(validReport()), { status: 200 }));

    const report = await fetchSessionReport("session-1");

    expect(report.report_version).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-1/report", expect.objectContaining({
      headers: { "Content-Type": "application/json", Authorization: "Bearer token-1" },
    }));
  });

  it("maps 403 without exposing the response body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("private database details", { status: 403 }));
    await expect(fetchSessionReport("session-1")).rejects.toMatchObject({
      category: "forbidden", retryable: false,
    });
    await expect(fetchSessionReport("session-1")).rejects.toThrow("You do not have access to this session");
  });

  it("rejects malformed payloads before rendering", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ...validReport(), payload: { transcript: [] } }), { status: 200 }));
    await expect(fetchSessionReport("session-1")).rejects.toMatchObject({ category: "validation", retryable: false });
  });

  it("returns export blobs and authenticates the request", async () => {
    window.localStorage.setItem("cat_token", "token-2");
    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(blob, { status: 200 }));

    const result = await downloadSessionReport("session-1", "pdf");

    expect(result).toBeInstanceOf(Blob);
    expect(result.size).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-1/report/export?format=pdf", expect.objectContaining({
      headers: { Authorization: "Bearer token-2" },
    }));
  });

  it("uses the shared SSR-safe request headers for report retrieval", async () => {
    vi.stubGlobal("window", undefined);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(validReport()), { status: 200 }));

    await expect(fetchSessionReport("session-1")).resolves.toMatchObject({ report_version: 1 });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(request?.method).toBe("GET");
    expect(new Headers(request?.headers).get("Content-Type")).toBe("application/json");
    expect(new Headers(request?.headers).get("Authorization")).toBeNull();
  });

  it("does not consume a failed download response body", async () => {
    const blob = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 500, blob } as unknown as Response);

    const error = await downloadSessionReport("session-1", "json").catch((caught: unknown) => caught);

    expect(error).toMatchObject({ category: "server", retryable: true });
    expect(error).toBeInstanceOf(SessionArtifactError);
    expect(blob).not.toHaveBeenCalled();
    expect((error as Error).message).not.toContain("database");
  });
});


describe("complete report and status runtime validation", () => {
  it.each([
    ["null", null],
    ["missing envelope identity", { ...canonicalReport(), session_id: undefined }],
    ["wrong version type", { ...canonicalReport(), report_version: "1" }],
    ["non-finite version", { ...canonicalReport(), report_version: Number.NaN }],
    ["negative version", { ...canonicalReport(), report_version: -1 }],
    ["wrong hash", { ...canonicalReport(), content_hash: "not-a-hash" }],
    ["missing timestamp", { ...canonicalReport(), created_at: null }],
  ])("rejects %s before rendering", (_, payload) => {
    expect(() => parseReportPayload(payload, "session-1")).toThrow(/invalid shape/);
  });

  it.each([
    ["summary identity mismatch", (report: ReturnType<typeof canonicalReport>) => { report.payload.summary.session_id = "other"; }],
    ["non-finite duration", (report: ReturnType<typeof canonicalReport>) => { report.payload.summary.duration_seconds = Number.POSITIVE_INFINITY; }],
    ["negative score", (report: ReturnType<typeof canonicalReport>) => {
      const canonical = report.payload.evaluation.canonical as Record<string, unknown>;
      const category = (canonical.categories as Array<Record<string, unknown>>)[0];
      category.raw_score = -1;
    }],
    ["out-of-range weight", (report: ReturnType<typeof canonicalReport>) => { const category = ((report.payload.evaluation.canonical as Record<string, unknown>).categories as Array<Record<string, unknown>>)[0]; category.weight = 101; }],
    ["duplicate transcript sequence", (report: ReturnType<typeof canonicalReport>) => { report.payload.transcript.entries[1].sequence_number = 0; }],
    ["unknown evidence reference", (report: ReturnType<typeof canonicalReport>) => { const category = ((report.payload.evaluation.canonical as Record<string, unknown>).categories as Array<Record<string, unknown>>)[0]; (category.evidence as Array<Record<string, unknown>>)[0].sequence_number = 99; }],
    ["both evaluation branches", (report: ReturnType<typeof canonicalReport>) => { report.payload.evaluation.legacy = {}; }],
    ["unpaired learning-plan identity", (report: ReturnType<typeof canonicalReport>) => { delete report.payload.learning_plan.items[0].criterion_id; }],
    ["mismatched learning-plan scenario", (report: ReturnType<typeof canonicalReport>) => { report.payload.learning_plan.items[0].scenario_id = "scenario-other"; }],
    ["duplicate coaching criterion", (report: ReturnType<typeof canonicalReport>) => {
      const block = report.payload.coaching.blocks[0] as Record<string, unknown>;
      const recommendations = block.recommendations as Array<Record<string, unknown>>;
      block.recommendations = [recommendations[0], { ...recommendations[0] }];
    }],
    ["out-of-order coaching blocks", (report: ReturnType<typeof canonicalReport>) => { report.payload.coaching.blocks = [{ ...report.payload.coaching.blocks[0], display_order: 2 }, { ...report.payload.coaching.blocks[0], rubric_block_id: "other", display_order: 1 }]; }],
  ])("rejects %s in nested report objects", (_, mutate) => {
    const report = cloneReport(canonicalReport());
    mutate(report);
    expect(() => parseReportPayload(report, "session-1")).toThrow(/invalid shape/);
  });

  it("accepts complete canonical and legacy branches without coercing either", () => {
    const canonical = parseReportPayload(canonicalReport(), "session-1");
    const legacy = parseReportPayload(legacyReport(), "session-1");
    expect(canonical.payload.evaluation.mode).toBe("canonical");
    expect(legacy.payload.evaluation.mode).toBe("legacy");
    expect(legacy.payload.evaluation.canonical).toBeNull();
  });

  it("accepts terminal content and rejects scored terminal outcomes", () => {
    const terminal = cloneReport(canonicalReport());
    terminal.payload.evaluation.mode = "not_applicable";
    terminal.payload.evaluation.reason_code = "not_applicable";
    terminal.payload.evaluation.weighted_total = null;
    terminal.payload.evaluation.passing_score = null;
    terminal.payload.evaluation.passed = null;
    const canonical = terminal.payload.evaluation.canonical as Record<string, unknown>;
    canonical.status = "not_applicable";
    canonical.weighted_total = 0;
    canonical.passed = false;
    (canonical.categories as Array<Record<string, unknown>>).forEach((category) => {
      category.raw_score = null;
      category.penalized_score = null;
    });
    const status = parseReportStatus({
      status: "not_applicable", session_id: "session-1",
      reason: { code: "not_applicable" }, report: terminal,
    }, "session-1");
    expect(status.status).toBe("not_applicable");
    const invalidTerminal = cloneReport(terminal);
    invalidTerminal.payload.evaluation.passed = true;
    expect(() => parseReportStatus({
      status: "not_applicable", session_id: "session-1",
      reason: { code: "not_applicable" }, report: invalidTerminal,
    }, "session-1")).toThrow(/invalid shape/);
  });

  it("validates every no-payload status variant and typed attempt reason", () => {
    const statuses = [
      { status: "missing", session_id: "session-1", reason: { code: "artifact_missing" }, latest_attempt: null, report: null },
      { status: "incomplete", session_id: "session-1", reason: { code: "artifact_missing" }, missing_sections: ["artifact_missing"], latest_attempt: null, report: null },
      { status: "generating", session_id: "session-1", reason: { code: "generation_pending" }, latest_attempt: { status: "pending", report_version: 1, reason: { code: "generation_pending" }, created_at: "2026-08-10T10:00:00Z", updated_at: "2026-08-10T10:00:00Z" }, report: null },
      { status: "failed", session_id: "session-1", reason: { code: "generation_failed" }, latest_attempt: { status: "failed", report_version: 1, reason: { code: "generation_failed" }, created_at: "2026-08-10T10:00:00Z", updated_at: "2026-08-10T10:00:01Z" }, report: null },
    ] as const;
    for (const status of statuses) expect(parseReportStatus(status, "session-1").status).toBe(status.status);
    expect(() => parseReportStatus({ ...statuses[2], report: canonicalReport() }, "session-1")).toThrow(/invalid shape/);
    expect(() => parseReportStatus({ ...statuses[3], reason: { code: "artifact_missing" } }, "session-1")).toThrow(/invalid shape/);
    expect(() => parseReportStatus({ ...statuses[2], payload: null }, "session-1")).toThrow(/invalid shape/);
  });

  it("preserves an older ready report when the latest regeneration failed", () => {
    const status = parseReportStatus(readyStatusWithFailedAttempt(), "session-1");
    expect(status.status).toBe("ready");
    if (status.status !== "ready") throw new Error("Expected ready status");
    expect(status.report.report_version).toBe(1);
    expect(status.latest_attempt?.status).toBe("failed");
  });

  it("fetches and validates the separate status endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      status: "missing", session_id: "session-1", reason: { code: "artifact_missing" }, latest_attempt: null, report: null,
    }), { status: 200 }));
    await expect(fetchSessionReportStatus("session-1")).resolves.toMatchObject({ status: "missing" });
    expect(fetchMock).toHaveBeenCalledWith("/api/sessions/session-1/report/status", expect.objectContaining({ method: "GET" }));
  });
});


describe("report download safety", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("parses a safe Content-Disposition filename and falls back for unsafe input", () => {
    expect(parseReportFilename("attachment; filename*=UTF-8''review%20final.csv", "session-1", "csv"))
      .toBe("review final.csv");
    expect(parseReportFilename('attachment; filename="..\\private\\report.csv"', "session/unsafe", "csv"))
      .toBe("session-report_session_unsafe.csv");
  });

  it("returns response metadata for a non-empty export and never creates it for an empty body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([123, 125])));
    await expect(downloadSessionReportArtifact("session-1", "json")).resolves.toMatchObject({ filename: "session-report_session-1.json" });

    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array(), { status: 200 }));
    await expect(downloadSessionReportArtifact("session-1", "json")).rejects.toMatchObject({ category: "decode" });
  });

  it.each([401, 403, 404, 500])("maps failed export status %s without consuming its body", async (status) => {
    const blob = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status, blob } as unknown as Response);
    await expect(downloadSessionReportArtifact("session-1", "pdf")).rejects.toBeInstanceOf(SessionArtifactError);
    expect(blob).not.toHaveBeenCalled();
  });
});
