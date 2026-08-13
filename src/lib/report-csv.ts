import { downloadReportCsv } from "@/lib/api/report";

export type CsvDownloadState = "idle" | "preparing" | "success" | "failed";

export const CSV_DOWNLOAD_ERROR = "Unable to export the report. Please try again.";

function safeFilename(sessionId: string): string {
  const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "session";
  return `cat-report-${safeId}.csv`;
}

export function triggerCsvDownload(blob: Blob, sessionId: string): void {
  if (typeof document === "undefined") {
    throw new Error(CSV_DOWNLOAD_ERROR);
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFilename(sessionId);
  anchor.setAttribute("aria-hidden", "true");
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function exportReportCsv(sessionId: string): Promise<void> {
  try {
    const blob = await downloadReportCsv(sessionId);
    if (blob.size === 0) throw new Error(CSV_DOWNLOAD_ERROR);
    triggerCsvDownload(blob, sessionId);
  } catch {
    throw new Error(CSV_DOWNLOAD_ERROR);
  }
}
