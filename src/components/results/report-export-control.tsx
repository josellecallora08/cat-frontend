"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { exportReportCsv } from "@/lib/report-csv";

interface ReportExportControlProps {
  sessionId: string;
}

export function ReportExportControl({ sessionId }: ReportExportControlProps) {
  const [state, setState] = useState<"idle" | "preparing" | "success" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleExport(): Promise<void> {
    if (state === "preparing") return;
    setState("preparing");
    setError(null);
    try {
      await exportReportCsv(sessionId);
      setState("success");
    } catch (exportError) {
      setState("failed");
      setError(exportError instanceof Error ? exportError.message : "Unable to export the report. Please try again.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        onClick={handleExport}
        disabled={state === "preparing"}
        aria-busy={state === "preparing"}
        aria-label={state === "preparing" ? "Preparing CSV export" : "Download report as CSV"}
        className="min-h-11 gap-2"
      >
        {state === "preparing" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {state === "preparing" ? "Preparing…" : "Download CSV"}
      </Button>
      <div role="status" aria-live="polite" aria-atomic="true" className="min-h-5 text-right text-xs text-destructive">
        {error}
      </div>
    </div>
  );
}
