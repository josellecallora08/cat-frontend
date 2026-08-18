import type { SessionReport } from "@/lib/api/session-reports";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "—";
}

export function ReportSummary({ report }: { report: SessionReport }) {
  const summary = report.payload.summary;
  const fields: Array<[string, string]> = [
    ["Scenario", summary.scenario_id],
    ["Campaign", summary.campaign_name ?? "—"],
    ["Status", summary.status],
    ["Duration", formatDuration(summary.duration_seconds)],
    ["Created", formatDate(summary.created_at)],
    ["Ended", formatDate(summary.ended_at)],
    ["Standard", summary.standard_name ? `${summary.standard_name}${summary.standard_version_number ? ` · v${summary.standard_version_number}` : ""}` : "—"],
  ];

  return (
    <section aria-labelledby="report-summary" data-report-section="summary" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="report-summary" className="text-lg font-semibold">Session summary</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
