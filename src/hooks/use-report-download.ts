import { useCallback, useEffect, useRef, useState } from "react";

import {
  downloadSessionReportArtifact,
  SessionArtifactError,
  type DownloadRequestOptions,
  type ReportDownloadFormat,
} from "@/lib/api/session-reports";

export { type ReportDownloadFormat };

export const DOWNLOAD_STARTED = "DOWNLOAD_STARTED" as const;

export type ReportDownloadStatus =
  | "idle"
  | typeof DOWNLOAD_STARTED
  | "progress"
  | "indeterminate"
  | "success"
  | "cancelled"
  | "failure";

export interface ReportDownloadState {
  status: ReportDownloadStatus;
  loaded: number;
  total: number | null;
  progress: number | null;
  filename: string | null;
  error: SessionArtifactError | null;
}

export type ReportDownloadStates = Record<ReportDownloadFormat, ReportDownloadState>;

const FORMATS: readonly ReportDownloadFormat[] = ["json", "csv", "pdf"];

function initialState(): ReportDownloadState {
  return { status: "idle", loaded: 0, total: null, progress: null, filename: null, error: null };
}

function initialStates(): ReportDownloadStates {
  return { json: initialState(), csv: initialState(), pdf: initialState() };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function safeFailure(error: unknown): SessionArtifactError {
  if (error instanceof SessionArtifactError) return error;
  return new SessionArtifactError("network", "Unable to download the report right now. Please try again.", { retryable: true });
}

function triggerDownload(blob: Blob, filename: string): void {
  if (blob.size === 0) throw new SessionArtifactError("decode", "Unable to read the report response. Please try again.");
  if (typeof document === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new SessionArtifactError("request", "Downloads are not available in this environment.");
  }
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.setAttribute("aria-hidden", "true");
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface UseReportDownloadResult {
  downloads: ReportDownloadStates;
  states: ReportDownloadStates;
  startDownload: (format: ReportDownloadFormat) => boolean;
  download: (format: ReportDownloadFormat) => boolean;
  cancelDownload: (format: ReportDownloadFormat) => void;
  isDownloading: (format?: ReportDownloadFormat) => boolean;
}

export function useReportDownload(sessionId: string): UseReportDownloadResult {
  const [downloads, setDownloads] = useState<ReportDownloadStates>(initialStates);
  const active = useRef(new Map<ReportDownloadFormat, AbortController>());

  const update = useCallback((format: ReportDownloadFormat, next: Partial<ReportDownloadState>) => {
    setDownloads((current) => ({
      ...current,
      [format]: { ...current[format], ...next },
    }));
  }, []);

  const cancelDownload = useCallback((format: ReportDownloadFormat) => {
    const controller = active.current.get(format);
    if (!controller) return;
    controller.abort();
    active.current.delete(format);
    update(format, { status: "cancelled", error: null });
  }, [update]);

  const startDownload = useCallback((format: ReportDownloadFormat): boolean => {
    if (active.current.has(format)) return false;
    const controller = new AbortController();
    active.current.set(format, controller);
    update(format, {
      status: DOWNLOAD_STARTED,
      loaded: 0,
      total: null,
      progress: null,
      filename: null,
      error: null,
    });

    const options: DownloadRequestOptions = {
      signal: controller.signal,
      onProgress: ({ loaded, total }) => {
        if (controller.signal.aborted || active.current.get(format) !== controller) return;
        const knownTotal = total !== null && total > 0;
        update(format, {
          status: knownTotal ? "progress" : "indeterminate",
          loaded,
          total,
          progress: knownTotal ? Math.min(100, Math.round((loaded / total) * 100)) : null,
        });
      },
    };

    void downloadSessionReportArtifact(sessionId, format, options)
      .then(({ blob, filename }) => {
        if (controller.signal.aborted || active.current.get(format) !== controller) return;
        triggerDownload(blob, filename);
        active.current.delete(format);
        update(format, { status: "success", loaded: blob.size, total: blob.size, progress: 100, filename, error: null });
      })
      .catch((error: unknown) => {
        if (active.current.get(format) !== controller) return;
        active.current.delete(format);
        if (isAbortError(error) || controller.signal.aborted) {
          update(format, { status: "cancelled", error: null });
          return;
        }
        update(format, { status: "failure", error: safeFailure(error) });
      });
    return true;
  }, [sessionId, update]);

  useEffect(() => () => {
    for (const controller of active.current.values()) controller.abort();
    active.current.clear();
  }, [sessionId]);

  const isDownloading = useCallback((format?: ReportDownloadFormat) => {
    if (format) return active.current.has(format);
    return FORMATS.some((item) => active.current.has(item));
  }, []);

  return {
    downloads,
    states: downloads,
    startDownload,
    download: startDownload,
    cancelDownload,
    isDownloading,
  };
}
