import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReportExportControl } from "@/components/results/report-export-control";
import { exportReportCsv } from "@/lib/report-csv";

vi.mock("@/lib/report-csv", () => ({
  exportReportCsv: vi.fn(),
}));

describe("ReportExportControl", () => {
  it("shows busy state and prevents duplicate exports", async () => {
    let resolveExport: (() => void) | undefined;
    vi.mocked(exportReportCsv).mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveExport = resolve;
    }));
    render(<ReportExportControl sessionId="session-1" />);
    const button = screen.getByRole("button", { name: "Download report as CSV" });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(exportReportCsv).toHaveBeenCalledOnce();

    resolveExport?.();
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("displays a safe actionable error and remains usable after failure", async () => {
    vi.mocked(exportReportCsv).mockRejectedValueOnce(new Error("Unable to export the report. Please try again."));
    render(<ReportExportControl sessionId="session-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Download report as CSV" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Unable to export the report. Please try again.");
    expect(screen.getByRole("button", { name: "Download report as CSV" })).not.toBeDisabled();
  });
});
