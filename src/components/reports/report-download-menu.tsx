import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DOWNLOAD_STARTED, useReportDownload } from "@/hooks/use-report-download";
import type { ReportDownloadFormat } from "@/lib/api/session-reports";

const FORMATS: readonly ReportDownloadFormat[] = ["json", "csv", "pdf"];

export function ReportDownloadMenu({ sessionId }: { sessionId: string }) {
  const { downloads, startDownload } = useReportDownload(sessionId);
  return (
    <div className="flex flex-wrap items-start gap-2" aria-label="Download report" data-report-download="true">
      {FORMATS.map((format) => {
        const state = downloads[format];
        const busy = state.status === DOWNLOAD_STARTED || state.status === "progress" || state.status === "indeterminate";
        return <Button key={format} variant="outline" size="sm" className="min-h-11" disabled={busy} onClick={() => startDownload(format)}>{busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}<span>{format.toUpperCase()}</span></Button>;
      })}
      {FORMATS.map((format) => {
        const state = downloads[format];
        if (state.status === "progress" || state.status === "indeterminate") {
          const label = state.status === "progress" && state.progress !== null
            ? `Downloading ${format.toUpperCase()} (${state.progress}%)`
            : `Downloading ${format.toUpperCase()}`;
          return <p key={`${format}-progress`} className="basis-full text-xs text-muted-foreground" role="status" aria-label={label}>Downloading {format.toUpperCase()}{state.status === "progress" && state.progress !== null ? ` (${state.progress}%)` : "…"}</p>;
        }
        if (state.status === "failure") return <p key={`${format}-error`} className="basis-full text-xs text-destructive" role="alert">{state.error?.message ?? "Unable to download the report. Please try again."}</p>;
        return null;
      })}
    </div>
  );
}
