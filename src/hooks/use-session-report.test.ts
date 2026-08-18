import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useReportDownload, DOWNLOAD_STARTED } from "@/hooks/use-report-download";
import { useSessionReport } from "@/hooks/use-session-report";
import {
  canonicalReport,
  cloneReport,
  readyStatusWithFailedAttempt,
} from "@/lib/api/session-report-fixtures";
import {
  fetchSessionReport,
  fetchSessionReportStatus,
  downloadSessionReportArtifact,
  SessionArtifactError,
  type ReportStatus,
} from "@/lib/api/session-reports";

vi.mock("@/lib/api/session-reports", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/session-reports")>("@/lib/api/session-reports");
  return {
    ...actual,
    fetchSessionReport: vi.fn(),
    fetchSessionReportStatus: vi.fn(),
    downloadSessionReportArtifact: vi.fn(),
  };
});

const getReport = vi.mocked(fetchSessionReport);
const getStatus = vi.mocked(fetchSessionReportStatus);
const getDownload = vi.mocked(downloadSessionReportArtifact);

function missingStatus(sessionId = "session-1"): ReportStatus {
  return { status: "missing", session_id: sessionId, reason: { code: "artifact_missing" }, latest_attempt: null, report: null };
}

function generatingStatus(sessionId = "session-1"): ReportStatus {
  return {
    status: "generating", session_id: sessionId, reason: { code: "generation_pending" },
    latest_attempt: {
      status: "pending", report_version: 1, reason: { code: "generation_pending" },
      created_at: "2026-08-10T10:00:00Z", updated_at: "2026-08-10T10:00:00Z",
    }, report: null,
  };
}

function reportNotFound(): SessionArtifactError {
  return new SessionArtifactError("not_found", "This report is not available", { status: 404 });
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useSessionReport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses successful GET retrieval without polling", async () => {
    getReport.mockResolvedValue(canonicalReport());
    const { result } = renderHook(() => useSessionReport("session-1"));
    await flushPromises();
    expect(result.current.status).toBe("ready");
    expect(result.current.data?.report_version).toBe(1);
    expect(getStatus).not.toHaveBeenCalled();
  });

  it("falls back from the documented GET 404 and polls at the exported interval", async () => {
    getReport.mockRejectedValue(reportNotFound());
    getStatus
      .mockResolvedValueOnce(generatingStatus())
      .mockResolvedValueOnce({ status: "ready", session_id: "session-1", report: canonicalReport(), latest_attempt: null });

    const { result } = renderHook(() => useSessionReport("session-1"));
    await flushPromises();
    expect(result.current.status).toBe("generating");
    expect(getStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(getStatus).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await flushPromises();
    expect(result.current.status).toBe("ready");
    expect(getStatus).toHaveBeenCalledTimes(2);
  });

  it("preserves a valid ready report when the latest regeneration failed", async () => {
    getReport.mockRejectedValue(reportNotFound());
    getStatus.mockResolvedValue(readyStatusWithFailedAttempt());

    const { result } = renderHook(() => useSessionReport("session-1"));
    await flushPromises();
    expect(result.current.status).toBe("ready");
    expect(result.current.data?.report_version).toBe(1);
    expect(result.current.latest_attempt?.status).toBe("failed");
  });

  it("stops at 30 generating polls and leaves loading", async () => {
    getReport.mockRejectedValue(reportNotFound());
    getStatus.mockResolvedValue(generatingStatus());

    const { result } = renderHook(() => useSessionReport("session-1"));
    await flushPromises();
    expect(result.current.status).toBe("generating");
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    await flushPromises();
    expect(getStatus).toHaveBeenCalledTimes(30);
    expect(result.current.status).toBe("retryable_error");
  });

  it("aborts the active request and clears polling on unmount", async () => {
    getReport.mockRejectedValue(reportNotFound());
    let signal: AbortSignal | undefined;
    getStatus.mockImplementation((_sessionId, { signal: requestSignal } = {}) => {
      signal = requestSignal;
      return new Promise<ReportStatus>(() => undefined);
    });

    const { unmount } = renderHook(() => useSessionReport("session-1"));
    await flushPromises();
    unmount();
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retries network/server failures three times but does not retry validation", async () => {
    const serverFailure = new SessionArtifactError("server", "try again", { status: 503, retryable: true });
    getReport
      .mockRejectedValueOnce(serverFailure)
      .mockRejectedValueOnce(serverFailure)
      .mockRejectedValueOnce(serverFailure)
      .mockResolvedValueOnce(canonicalReport());
    const success = renderHook(() => useSessionReport("session-1"));
    await flushPromises();
    expect(success.result.current.status).toBe("ready");
    expect(getReport).toHaveBeenCalledTimes(4);
    success.unmount();

    const validation = new SessionArtifactError("validation", "invalid");
    getReport.mockReset().mockRejectedValue(validation);
    const invalid = renderHook(() => useSessionReport("session-1"));
    await flushPromises();
    expect(invalid.result.current.status).toBe("validation_error");
    expect(getReport).toHaveBeenCalledTimes(1);
  });

  it.each(["not_applicable", "too_short", "legacy_only"] as const)("stops on %s terminal content", async (mode) => {
    const report = cloneReport(canonicalReport());
    report.payload.evaluation.mode = mode;
    getReport.mockResolvedValue(report);

    const { result } = renderHook(() => useSessionReport("session-1"));
    await flushPromises();
    expect(result.current.status).toBe(mode);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, -1])("rejects a non-positive polling interval (%s) without a busy loop", async (pollIntervalMs) => {
    getReport.mockResolvedValue(canonicalReport());
    const { result } = renderHook(() => useSessionReport("session-1", { pollIntervalMs }));

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe("validation_error");
    expect(getReport).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("maps a status no-report response to the missing state", async () => {
    getReport.mockRejectedValue(reportNotFound());
    getStatus.mockResolvedValue(missingStatus());

    const { result } = renderHook(() => useSessionReport("session-1"));
    await flushPromises();
    expect(result.current.status).toBe("missing");
    expect(result.current.isError).toBe(true);
  });
});


describe("useReportDownload", () => {
  function successfulDownload() {
    return { blob: new Blob(["report"], { type: "application/json" }), filename: "safe-report.json" };
  }

  beforeEach(() => {
    getDownload.mockReset();
  });

  it("exposes started, determinate progress, and success while triggering one validated anchor", async () => {
    let progress: ((value: { loaded: number; total: number | null }) => void) | undefined;
    getDownload.mockImplementation(async (_sessionId, _format, options) => {
      progress = options?.onProgress;
      await Promise.resolve();
      progress?.({ loaded: 0, total: null });
      progress?.({ loaded: 5, total: 10 });
      return successfulDownload();
    });
    const createObjectURL = vi.fn(() => "blob:report");
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const { result } = renderHook(() => useReportDownload("session-1"));

    let accepted = false;
    act(() => { accepted = result.current.startDownload("json"); });
    expect(accepted).toBe(true);
    expect(result.current.downloads.json.status).toBe(DOWNLOAD_STARTED);
    await flushPromises();

    expect(progress).toBeDefined();
    expect(result.current.downloads.json.status).toBe("success");
    expect(result.current.downloads.json.progress).toBe(100);
    expect(result.current.downloads.json.filename).toBe("safe-report.json");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("reports indeterminate progress and rejects a duplicate click until cancellation", async () => {
    let resolveDownload: ((value: ReturnType<typeof successfulDownload>) => void) | undefined;
    let signal: AbortSignal | undefined;
    getDownload.mockImplementation(async (_sessionId, _format, options) => {
      signal = options?.signal;
      await Promise.resolve();
      options?.onProgress?.({ loaded: 0, total: null });
      return new Promise((resolve) => { resolveDownload = resolve; });
    });
    const { result } = renderHook(() => useReportDownload("session-1"));
    act(() => { result.current.startDownload("csv"); });
    expect(result.current.downloads.csv.status).toBe(DOWNLOAD_STARTED);
    await flushPromises();
    expect(result.current.downloads.csv.status).toBe("indeterminate");
    expect(result.current.startDownload("csv")).toBe(false);

    act(() => { result.current.cancelDownload("csv"); });
    expect(signal?.aborted).toBe(true);
    expect(result.current.downloads.csv.status).toBe("cancelled");
    resolveDownload?.(successfulDownload());
    await flushPromises();
    expect(result.current.downloads.csv.status).toBe("cancelled");
  });

  it.each([
    [401, "unauthorized"], [403, "forbidden"], [404, "not_found"], [500, "server"],
  ] as const)("exposes a safe failure for HTTP %s", async (status, category) => {
    getDownload.mockRejectedValue(new SessionArtifactError(category, "Safe download error", { status }));
    const { result } = renderHook(() => useReportDownload("session-1"));
    act(() => { result.current.startDownload("pdf"); });
    await flushPromises();
    expect(result.current.downloads.pdf.status).toBe("failure");
    expect(result.current.downloads.pdf.error).toMatchObject({ category, status });
  });
});
