import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { VersionResponse } from "@/lib/api/negotiation-standards";

interface VersionHistoryProps {
  versions: VersionResponse[];
  selectedVersionId?: string;
  currentVersionId?: string | null;
  onSelect: (version: VersionResponse) => void;
}

export function VersionHistory({ versions, selectedVersionId, currentVersionId, onSelect }: VersionHistoryProps) {
  if (versions.length === 0) {
    return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No published versions yet.</div>;
  }
  return (
    <section aria-labelledby="version-history-heading" className="rounded-xl border border-border bg-card p-4">
      <h2 id="version-history-heading" className="text-lg font-semibold text-foreground">Version history</h2>
      <div className="mt-3 space-y-2">
        {versions.map((version) => <button key={version.id} type="button" onClick={() => onSelect(version)} aria-pressed={selectedVersionId === version.id} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" >
          <span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">Version {version.version_number}</span>
              {currentVersionId === version.id && <Badge variant="success">Currently active</Badge>}
            </span>
            <span className="block text-xs text-muted-foreground">Published {new Date(version.published_at).toLocaleDateString()}</span>
            {version.publication_note && <span className="block text-xs text-muted-foreground">{version.publication_note}</span>}
          </span>
          <Eye className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>)}
      </div>
    </section>
  );
}
