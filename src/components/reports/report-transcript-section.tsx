import type { SessionReport } from "@/lib/api/session-reports";
import { ReportSectionStatus } from "./report-status";

export function ReportTranscriptSection({ report }: { report: SessionReport }) {
  const data = report.payload.transcript;
  if (!data.available) {
    return <section data-report-section="transcript" aria-labelledby="report-transcript"><ReportSectionStatus title="Transcript unavailable" reasonCode={data.reason_code} message={data.reason} /></section>;
  }
  if (data.entries.length === 0) {
    return <section data-report-section="transcript" aria-labelledby="report-transcript"><ReportSectionStatus title="Transcript is empty" reasonCode={data.reason_code ?? "empty_transcript"} message={data.reason ?? "No transcript entries were recorded."} tone="terminal" /></section>;
  }

  return (
    <section data-report-section="transcript" aria-labelledby="report-transcript" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="report-transcript" className="text-lg font-semibold">Transcript</h2>
      <ol className="mt-4 space-y-3">
        {data.entries.map((entry) => <li key={`transcript-${entry.sequence_number}`} className="rounded-xl border border-border p-3"><div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span className="font-semibold uppercase">{entry.speaker}</span><span>Turn {entry.sequence_number}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm">{entry.text}</p><time className="mt-2 block text-xs text-muted-foreground" dateTime={entry.timestamp}>{new Date(entry.timestamp).toLocaleString()}</time></li>)}
      </ol>
    </section>
  );
}
