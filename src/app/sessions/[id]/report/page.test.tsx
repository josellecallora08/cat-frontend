import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { canonicalReport } from "@/lib/api/session-report-fixtures";
import type { ReportDownloadStates } from "@/hooks/use-report-download";

const mocks = vi.hoisted(() => ({
  useSessionReport: vi.fn(),
  useReportDownload: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, use: () => ({ id: "session-1" }) };
});
vi.mock("@/hooks/use-session-report", () => ({ useSessionReport: mocks.useSessionReport }));
vi.mock("@/hooks/use-report-download", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/use-report-download")>("@/hooks/use-report-download");
  return { ...actual, useReportDownload: mocks.useReportDownload };
});

import SessionReportPage from "./page";

function downloadStates(): ReportDownloadStates {
  const state = { status: "idle" as const, loaded: 0, total: null, progress: null, filename: null, error: null };
  return { json: { ...state }, csv: { ...state }, pdf: { ...state } };
}

function readyState() {
  const data = canonicalReport();
  return { status: "ready", state: { status: "ready", data, error: null }, isLoading: false, isError: false, isSuccess: true, data, error: null, latest_attempt: null, refetch: vi.fn(), cancel: vi.fn() };
}

describe("session report route", () => {
  beforeEach(() => {
    mocks.useReportDownload.mockReturnValue({ downloads: downloadStates(), startDownload: vi.fn(), cancelDownload: vi.fn(), isDownloading: vi.fn(() => false) });
    mocks.useSessionReport.mockReturnValue(readyState());
  });

  it("renders extracted sections and the download/print page actions", async () => {
    render(<Suspense fallback={<div>Loading route</div>}><SessionReportPage params={Promise.resolve({ id: "session-1" })} /></Suspense>);

    expect(await screen.findByText("Session summary")).toBeInTheDocument();
    expect(screen.getByText("Session report")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "JSON" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Print/ })).toBeInTheDocument();
  });

  it("renders download progress and keeps the active format control operable state visible", async () => {
    const states = downloadStates();
    states.pdf = { ...states.pdf, status: "progress", loaded: 50, total: 100, progress: 50 };
    mocks.useReportDownload.mockReturnValue({ downloads: states, startDownload: vi.fn(), cancelDownload: vi.fn(), isDownloading: vi.fn(() => true) });
    render(<Suspense fallback={<div>Loading route</div>}><SessionReportPage params={Promise.resolve({ id: "session-1" })} /></Suspense>);

    expect(await screen.findByRole("status", { name: /Downloading PDF \(50%\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PDF" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "JSON" })).not.toBeDisabled();
  });

  it("renders a safe download failure without exposing a response body", async () => {
    const states = downloadStates();
    states.csv = { ...states.csv, status: "failure", error: { name: "SessionArtifactError", category: "server", message: "Unable to download the report right now. Please try again.", retryable: true } as never };
    mocks.useReportDownload.mockReturnValue({ downloads: states, startDownload: vi.fn(), cancelDownload: vi.fn(), isDownloading: vi.fn(() => false) });
    render(<Suspense fallback={<div>Loading route</div>}><SessionReportPage params={Promise.resolve({ id: "session-1" })} /></Suspense>);

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to download the report right now. Please try again.");
    expect(screen.getByRole("alert")).not.toHaveTextContent(/response|stack|database|campaign owner/i);
  });


  it("announces generating state without showing a retry action", async () => {
    mocks.useSessionReport.mockReturnValue({ status: "generating", state: { status: "generating", data: undefined, error: null }, isLoading: false, isError: false, isSuccess: false, data: undefined, error: null, latest_attempt: undefined, refetch: vi.fn(), cancel: vi.fn() });
    render(<Suspense fallback={<div>Loading route</div>}><SessionReportPage params={Promise.resolve({ id: "session-1" })} /></Suspense>);

    expect(await screen.findByRole("status")).toHaveTextContent(/being generated/);
    expect(screen.queryByRole("button", { name: /Try again/ })).not.toBeInTheDocument();
  });
});