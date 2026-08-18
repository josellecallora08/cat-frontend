"use client";

import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { downloadReportCsv, fetchReport, SECTION_NAMES } from "@/lib/api/report";
import { SessionArtifactError } from "@/lib/api/sessions";
import type {
    FailureClass,
    NormalizedReport,
    ReportFailure,
    ReportSectionName,
    SectionEnvelope,
} from "@/types/report";

export const reportQueryKeys = {
  all: (sessionId: string) => ["sessions", sessionId, "report"] as const,
};

type ExportState = "idle" | "preparing" | "success" | "failed";

interface SectionQueryState {
  data: SectionEnvelope;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  isFetching: boolean;
}

interface UseReportResult {
  metadata: UseQueryResult<NormalizedReport, Error>;
  sections: Record<ReportSectionName, SectionEnvelope>;
  sectionQueries: SectionQueryState[];
  report: NormalizedReport | null;
  isLoading: boolean;
  isError: boolean;
  hasFailedSection: boolean;
  completion: NormalizedReport["report_status"] | "loading";
  retrySection: (name: ReportSectionName) => Promise<unknown>;
  retryAll: () => Promise<unknown[]>;
  exportState: ExportState;
  exportReport: () => Promise<void>;
}

function retryableQuery(failureCount: number, error: Error): boolean {
  return error instanceof SessionArtifactError && error.retryable && failureCount < 3;
}

function failureClass(error: Error): FailureClass {
  if (error instanceof SessionArtifactError) {
    if (error.category === "network") return "infrastructure";
    if (error.category === "validation" || error.category === "decode") return "data_contract";
    if (error.category === "server") return "backend";
    if (error.category === "unauthorized" || error.category === "forbidden") return "backend";
  }
  return "frontend";
}

function failedSection(name: ReportSectionName, error: Error): SectionEnvelope {
  const failure: ReportFailure = {
    class: failureClass(error),
    code: error instanceof SessionArtifactError ? error.category : "request_failed",
    safe_message: error.message || "This report section is unavailable.",
    correlation_id: null,
  };
  return { name, state: "failed", data: null, unavailable_reason: null, failure, updated_at: null };
}

function triggerDownload(blob: Blob, sessionId: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-${sessionId}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useReport(sessionId: string): UseReportResult {
  const queryClient = useQueryClient();
  const [exportState, setExportState] = useState<ExportState>("idle");
  const metadata = useQuery<NormalizedReport, Error>({
    queryKey: reportQueryKeys.all(sessionId),
    queryFn: () => fetchReport(sessionId),
    enabled: Boolean(sessionId),
    retry: retryableQuery,
    placeholderData: (previousData) => previousData,
  });

  const sections = useMemo(() => {
    if (metadata.data) return metadata.data.sections;
    if (metadata.error) {
      return SECTION_NAMES.reduce((result, name) => {
        result[name] = failedSection(name, metadata.error as Error);
        return result;
      }, {} as Record<ReportSectionName, SectionEnvelope>);
    }
    return SECTION_NAMES.reduce((result, name) => {
      result[name] = {
        name, state: "loading", data: null, unavailable_reason: null, failure: null, updated_at: null,
      };
      return result;
    }, {} as Record<ReportSectionName, SectionEnvelope>);
  }, [metadata.data, metadata.error]);

  const sectionQueries = useMemo(() => SECTION_NAMES.map((name) => ({
    data: sections[name],
    error: metadata.error,
    isError: Boolean(metadata.error),
    isLoading: metadata.isLoading && !metadata.data,
    isFetching: metadata.isFetching,
  })), [metadata.data, metadata.error, metadata.isFetching, metadata.isLoading, sections]);

  const retryReport = useCallback(() => queryClient.refetchQueries({
    queryKey: reportQueryKeys.all(sessionId),
    exact: true,
  }), [queryClient, sessionId]);
  const retrySection = useCallback(async () => retryReport(), [retryReport]);
  const retryAll = useCallback(async () => [await retryReport()], [retryReport]);

  const exportReport = useCallback(async () => {
    if (exportState === "preparing") return;
    setExportState("preparing");
    try {
      triggerDownload(await downloadReportCsv(sessionId), sessionId);
      setExportState("success");
    } catch {
      setExportState("failed");
    }
  }, [exportState, sessionId]);

  const report = metadata.data ?? null;
  const hasFailedSection = SECTION_NAMES.some((name) => sections[name].state === "failed");
  const isLoading = metadata.isLoading && !metadata.data;

  return {
    metadata,
    sections,
    sectionQueries,
    report,
    isLoading,
    isError: metadata.isError,
    hasFailedSection,
    completion: report?.report_status ?? (isLoading ? "loading" : "failed"),
    retrySection,
    retryAll,
    exportState,
    exportReport,
  };
}
