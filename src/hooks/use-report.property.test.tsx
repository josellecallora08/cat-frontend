import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useReport } from "@/hooks/use-report";
import { SECTION_NAMES } from "@/lib/api/report";
import type {
    NormalizedReport,
    ReportSectionName,
    SectionEnvelope,
} from "@/types/report";

import { fetchReport } from "@/lib/api/report";

vi.mock("@/lib/api/report", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/report")>()),
  fetchReport: vi.fn(),
}));

const mockedFetchReport = vi.mocked(fetchReport);
const SESSION_ID = "session-property-test";

function createGenerator(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state;
  };
}

function createSection(
  name: ReportSectionName,
  state: "loaded" | "empty" | "failed",
  value: string,
): SectionEnvelope {
  return {
    name,
    state,
    data: state === "loaded" ? { value } : null,
    unavailable_reason: state === "empty" ? "No data is available." : null,
    failure: state === "failed"
      ? {
          class: "frontend",
          code: "temporary_failure",
          safe_message: "This report section is unavailable.",
          correlation_id: null,
        }
      : null,
    updated_at: null,
  };
}

function generateReport(seed: number, includeFailure: boolean): NormalizedReport {
  const next = createGenerator(seed);
  const sections = {} as Record<ReportSectionName, SectionEnvelope>;
  SECTION_NAMES.forEach((name, index) => {
    const state = includeFailure && index === next() % SECTION_NAMES.length
      ? "failed"
      : next() % 3 === 0
        ? "empty"
        : "loaded";
    sections[name] = createSection(name, state, `${seed}-${index}-${next()}`);
  });
  return {
    session_id: SESSION_ID,
    session: { status: "completed" },
    report_status: includeFailure ? "partial" : "complete",
    score_status: "evaluated",
    evaluation_version: { id: "version-1", number: 1, name: "Current", kind: "current" },
    evaluation_kind: "current",
    sections,
    correlation_id: null,
  };
}

function createWrapper(queryClient: QueryClient): ({ children }: { children: ReactNode }) => ReactNode {
  function ReportTestWrapper({ children }: { children: ReactNode }): ReactNode {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return ReportTestWrapper;
}

function sectionSnapshot(report: NormalizedReport | null): string {
  return JSON.stringify(report?.sections ?? null);
}

afterEach(() => {
  mockedFetchReport.mockReset();
});

describe("useReport property behavior", () => {
  it("preserves successful sections through generated partial failures and retries", async () => {
    // Feature: report-quality-release-gates, Property 2
    for (let seed = 0; seed < 100; seed += 1) {
      const initial = generateReport(seed, true);
      const retried = generateReport(seed + 1000, false);
      for (const name of SECTION_NAMES) {
        if (initial.sections[name].state === "loaded") {
          retried.sections[name] = initial.sections[name];
        }
      }
      mockedFetchReport.mockReset();
      mockedFetchReport.mockResolvedValue(initial);
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const { result, unmount } = renderHook(() => useReport(SESSION_ID), {
        wrapper: createWrapper(queryClient),
      });
      await waitFor(() => expect(result.current.report).not.toBeNull());
      mockedFetchReport.mockResolvedValue(retried);
      const successfulBeforeRetry = Object.fromEntries(
        SECTION_NAMES.filter((name) => initial.sections[name].state === "loaded")
          .map((name) => [name, initial.sections[name].data]),
      );

      await result.current.retryAll();
      await waitFor(() => expect(result.current.report?.report_status).toBe("complete"));
      for (const name of Object.keys(successfulBeforeRetry) as ReportSectionName[]) {
        expect(result.current.sections[name].data).toEqual(successfulBeforeRetry[name]);
      }
      unmount();
      queryClient.clear();
    }
  }, 30000);

  it("produces identical state after repeated generated full retries", async () => {
    // Feature: report-quality-release-gates, Property 7
    for (let seed = 0; seed < 100; seed += 1) {
      const generated = generateReport(seed + 2000, false);
      mockedFetchReport.mockReset();
      mockedFetchReport.mockResolvedValue(generated);
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const { result, unmount } = renderHook(() => useReport(SESSION_ID), {
        wrapper: createWrapper(queryClient),
      });
      await waitFor(() => expect(result.current.report).not.toBeNull());
      await result.current.retryAll();
      await waitFor(() => expect(result.current.report).not.toBeNull());
      const once = sectionSnapshot(result.current.report);
      await result.current.retryAll();
      await waitFor(() => expect(result.current.report).not.toBeNull());
      expect(sectionSnapshot(result.current.report)).toBe(once);
      unmount();
      queryClient.clear();
    }
  }, 30000);
});
