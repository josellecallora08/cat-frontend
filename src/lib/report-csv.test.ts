import { beforeEach, describe, expect, it, vi } from "vitest";

import { downloadReportCsv } from "@/lib/api/report";
import { exportReportCsv, triggerCsvDownload } from "@/lib/report-csv";

vi.mock("@/lib/api/report", () => ({
  downloadReportCsv: vi.fn(),
}));

describe("report CSV download", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a safe session-derived filename and clicks the download link", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");

    triggerCsvDownload(new Blob(["session_id,abc\n"]), "abc/with spaces");

    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:test");
    expect(document.querySelector("a")).toBeNull();
  });

  it("delegates to the backend and rejects empty downloads safely", async () => {
    vi.mocked(downloadReportCsv).mockResolvedValueOnce(new Blob(["session_id,abc\n"]));
    const download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    await expect(exportReportCsv("abc")).resolves.toBeUndefined();
    expect(download).toHaveBeenCalledOnce();

    vi.mocked(downloadReportCsv).mockResolvedValueOnce(new Blob());
    await expect(exportReportCsv("abc")).rejects.toThrow("Unable to export the report");
  });

  it("hides backend and network details behind the safe error", async () => {
    vi.mocked(downloadReportCsv).mockRejectedValueOnce(new Error("SQL connection failed at /internal/db"));
    await expect(exportReportCsv("abc")).rejects.toThrow("Unable to export the report. Please try again.");
  });
});
