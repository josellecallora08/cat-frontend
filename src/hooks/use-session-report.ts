import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import {
  fetchSessionReport,
  fetchSessionReportStatus,
  isRetryableReportError,
  type ReportAttemptMetadata,
  type ReportStatus,
  type SessionReport,
  type ReportRequestOptions,
  SessionArtifactError,
} from "@/lib/api/session-reports";

export const REPORT_POLL_INTERVAL_MS = 1000;
export const REPORT_POLL_MAX_ATTEMPTS = 30;
const REPORT_RETRY_LIMIT = 3;

type TerminalState = "not_applicable" | "too_short" | "legacy_only";
export type SessionReportStateStatus =
  | "loading"
  | "ready"
  | "generating"
  | "failed"
  | "missing"
  | "unauthorized"
  | "forbidden"
  | TerminalState
  | "validation_error"
  | "retryable_error";

type StateError = SessionArtifactError | null;

export type SessionReportState =
  | { status: "loading"; data: undefined; error: null; latest_attempt?: undefined }
  | { status: "ready"; data: SessionReport; error: null; latest_attempt?: ReportAttemptMetadata | null }
  | { status: "generating"; data: undefined; error: null; latest_attempt?: ReportAttemptMetadata }
  | { status: "failed" | "missing" | "unauthorized" | "forbidden" | "validation_error" | "retryable_error"; data: undefined; error: SessionArtifactError; latest_attempt?: undefined }
  | { status: TerminalState; data: SessionReport; error: null; latest_attempt?: undefined };

export interface UseSessionReportOptions {
  pollIntervalMs?: number;
  pollMaxAttempts?: number;
  retryLimit?: number;
}

export type UseSessionReportResult = SessionReportState & {
  state: SessionReportState;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  data: SessionReport | undefined;
  error: StateError;
  refetch: () => void;
  cancel: () => void;
};

interface ActiveRun {
  controller: AbortController;
  timer: ReturnType<typeof setTimeout> | null;
  cancelled: boolean;
}

function reportError(
  category: ConstructorParameters<typeof SessionArtifactError>[0],
  message: string,
  retryable = false,
): SessionArtifactError {
  return new SessionArtifactError(category, message, { retryable });
}

function errorForStatus(error: unknown): SessionArtifactError {
  if (error instanceof SessionArtifactError) return error;
  return reportError("network", "Unable to load the report right now. Please try again.", true);
}

function isCancelled(run: ActiveRun): boolean {
  return run.cancelled || run.controller.signal.aborted;
}

async function retryRequest<T>(
  request: (options: ReportRequestOptions) => Promise<T>,
  signal: AbortSignal,
  retryLimit: number,
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await request({ signal });
    } catch (error) {
      if (signal.aborted) throw error;
      if (!isRetryableReportError(error) || retries >= retryLimit) throw error;
      retries += 1;
      await Promise.resolve();
    }
  }
}

function readyState(report: SessionReport, latestAttempt?: ReportAttemptMetadata | null): SessionReportState {
  const mode = report.payload.evaluation.mode;
  if (mode === "not_applicable") return { status: "not_applicable", data: report, error: null };
  if (mode === "too_short") return { status: "too_short", data: report, error: null };
  if (mode === "legacy" || mode === "legacy_only") return { status: "legacy_only", data: report, error: null };
  return { status: "ready", data: report, error: null, latest_attempt: latestAttempt };
}

function statusState(status: ReportStatus): SessionReportState {
  switch (status.status) {
    case "ready":
      return readyState(status.report, status.latest_attempt);
    case "not_applicable":
    case "too_short":
    case "legacy_only":
      return { status: status.status, data: status.report, error: null };
    case "generating":
      return { status: "generating", data: undefined, error: null, latest_attempt: status.latest_attempt };
    case "failed":
      return {
        status: "failed",
        data: undefined,
        error: reportError("request", status.reason.message ?? "Report generation failed. Please try again."),
      };
    case "missing":
    case "incomplete":
      return {
        status: "missing",
        data: undefined,
        error: reportError("not_found", status.reason.message ?? "This report is not available"),
      };
    case "empty_transcript":
    case "no_evidence":
      // These statuses have a valid readable report. The section-level reason is
      // preserved in the payload rather than inventing another hook state.
      return readyState(status.report);
  }
}

function terminalErrorState(error: unknown): SessionReportState {
  const reportFailure = errorForStatus(error);
  switch (reportFailure.category) {
    case "unauthorized":
      return { status: "unauthorized", data: undefined, error: reportFailure };
    case "forbidden":
      return { status: "forbidden", data: undefined, error: reportFailure };
    case "validation":
      return { status: "validation_error", data: undefined, error: reportFailure };
    case "network":
    case "decode":
    case "server":
      return { status: "retryable_error", data: undefined, error: reportFailure };
    default:
      return { status: "failed", data: undefined, error: reportFailure };
  }
}

export function useSessionReport(
  sessionId: string,
  options: UseSessionReportOptions = {},
): UseSessionReportResult {
  const [runNumber, setRunNumber] = useState(0);
  const [state, setState] = useReducer(
    (_current: SessionReportState, next: SessionReportState) => next,
    { status: "loading", data: undefined, error: null } as SessionReportState,
  );
  const activeRun = useRef<ActiveRun | null>(null);
  const pollIntervalMs = options.pollIntervalMs ?? REPORT_POLL_INTERVAL_MS;
  const pollMaxAttempts = options.pollMaxAttempts ?? REPORT_POLL_MAX_ATTEMPTS;
  const retryLimit = options.retryLimit ?? REPORT_RETRY_LIMIT;

  useEffect(() => {
    const run: ActiveRun = { controller: new AbortController(), timer: null, cancelled: false };
    activeRun.current = run;
    setState({ status: "loading", data: undefined, error: null });

    if (!sessionId) {
      setState({ status: "validation_error", data: undefined, error: reportError("validation", "A session ID is required.") });
      return () => {
        run.cancelled = true;
        run.controller.abort();
      };
    }
    if (!Number.isFinite(pollIntervalMs) || pollIntervalMs <= 0 || !Number.isInteger(pollMaxAttempts) || pollMaxAttempts <= 0
      || !Number.isInteger(retryLimit) || retryLimit < 0) {
      setState({ status: "validation_error", data: undefined, error: reportError("validation", "Report polling configuration is invalid.") });
      return () => {
        run.cancelled = true;
        run.controller.abort();
      };
    }

    const transition = (next: SessionReportState) => {
      if (!isCancelled(run)) setState(next);
    };
    const stop = () => {
      if (run.timer !== null) {
        clearTimeout(run.timer);
        run.timer = null;
      }
    };
    const finish = (next: SessionReportState) => {
      stop();
      transition(next);
    };

    const poll = async (attempts: number): Promise<void> => {
      if (isCancelled(run)) return;
      let status: ReportStatus;
      try {
        status = await retryRequest(
          (requestOptions) => fetchSessionReportStatus(sessionId, requestOptions),
          run.controller.signal,
          retryLimit,
        );
      } catch (error) {
        if (!isCancelled(run)) finish(terminalErrorState(error));
        return;
      }
      if (isCancelled(run)) return;
      if (status.status !== "generating") {
        finish(statusState(status));
        return;
      }
      transition(statusState(status));
      if (attempts >= pollMaxAttempts) {
        finish({
          status: "retryable_error",
          data: undefined,
          error: reportError("server", "Report generation timed out. Please try again.", true),
        });
        return;
      }
      run.timer = setTimeout(() => {
        run.timer = null;
        void poll(attempts + 1);
      }, pollIntervalMs);
    };

    const load = async () => {
      try {
        const report = await retryRequest(
          (requestOptions) => fetchSessionReport(sessionId, requestOptions),
          run.controller.signal,
          retryLimit,
        );
        finish(readyState(report));
        return;
      } catch (error) {
        if (isCancelled(run)) return;
        if (!(error instanceof SessionArtifactError) || error.status !== 404) {
          finish(terminalErrorState(error));
          return;
        }
      }
      await poll(1);
    };

    void load();
    return () => {
      run.cancelled = true;
      stop();
      run.controller.abort();
      if (activeRun.current === run) activeRun.current = null;
    };
  }, [sessionId, runNumber, pollIntervalMs, pollMaxAttempts, retryLimit]);

  const refetch = useCallback(() => setRunNumber((value) => value + 1), []);
  const cancel = useCallback(() => {
    const run = activeRun.current;
    if (!run || run.cancelled) return;
    run.cancelled = true;
    if (run.timer !== null) clearTimeout(run.timer);
    run.controller.abort();
    setState({
      status: "retryable_error",
      data: undefined,
      error: reportError("network", "Report loading was cancelled.", false),
    });
  }, []);

  const isLoading = state.status === "loading";
  const isSuccess = state.data !== undefined;
  const isError = ["failed", "missing", "unauthorized", "forbidden", "validation_error", "retryable_error"].includes(state.status);
  return {
    ...state,
    state,
    isLoading,
    isError,
    isSuccess,
    data: state.data,
    error: state.error,
    refetch,
    cancel,
  } as UseSessionReportResult;
}
