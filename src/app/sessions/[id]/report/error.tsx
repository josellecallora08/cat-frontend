"use client";

export default function SessionReportError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div role="alert" className="p-8 text-center"><h2 className="text-lg font-semibold">Report unavailable</h2><p className="mt-2 text-sm text-muted-foreground">We could not load this session report.</p><button type="button" className="mt-4 min-h-11 rounded-md border px-4" onClick={() => reset()}>Try again</button></div>;
}
