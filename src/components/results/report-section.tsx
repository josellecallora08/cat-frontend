import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { SectionEnvelope } from "@/types/report";

interface ReportSectionProps {
  section: SectionEnvelope;
  title: string;
  children: ReactNode;
  onRetry?: () => void;
}

export function ReportSection({ section, title, children, onRetry }: ReportSectionProps) {
  const stateMessage = section.state === "failed"
    ? "This report section is unavailable."
    : section.state === "empty"
      ? section.unavailable_reason ?? "No data is available."
      : section.state === "loading" ? "Loading section…" : "Section loaded.";
  const correlation = section.failure?.correlation_id;

  return (
    <section aria-labelledby={`${section.name}-heading`} className="w-full min-w-0 break-inside-avoid" data-report-section={section.name}>
      <h2 id={`${section.name}-heading`} className="text-lg font-semibold text-foreground">{title}</h2>
      <div role="status" aria-live="polite" aria-atomic="true" className="mt-1 text-sm text-muted-foreground">
        {stateMessage}
        {correlation && <span className="ml-2 text-xs">Support reference: {correlation}</span>}
      </div>
      {section.state === "failed" && onRetry && (
        <Button type="button" variant="outline" className="mt-3 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={onRetry}>Retry section</Button>
      )}
      <div className="report-content-boundary mt-3 min-w-0 max-w-full">{children}</div>
    </section>
  );
}
