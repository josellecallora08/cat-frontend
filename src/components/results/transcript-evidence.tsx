"use client";

import { useId, useState } from "react";

import type { RubricEvidence, TranscriptEntry } from "@/lib/api/sessions";

interface TranscriptEvidenceProps {
  evidence: RubricEvidence[];
  transcript?: TranscriptEntry[];
}

export function TranscriptEvidence({ evidence, transcript = [] }: TranscriptEvidenceProps) {
  const [expanded, setExpanded] = useState(false);
  const regionId = `evidence-${useId().replaceAll(":", "")}`;

  if (evidence.length === 0) {
    return <p className="text-sm text-muted-foreground">No transcript evidence was recorded.</p>;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={() => setExpanded((current) => !current)}
        className="min-h-11 w-full rounded-lg border border-border px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {expanded ? "Hide transcript evidence" : `Show transcript evidence (${evidence.length})`}
      </button>
      <div id={regionId} hidden={!expanded} className="space-y-3 rounded-lg bg-muted/40 p-3">
        {evidence.map((item) => {
          const transcriptEntry = transcript.find((entry) => entry.sequence_number === item.sequence_number);
          return (
            <blockquote key={`${item.sequence_number}-${item.speaker}-${item.excerpt}`} className="border-l-2 border-primary/50 pl-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sequence {item.sequence_number} · {item.speaker}
              </p>
              <p className="mt-1 text-foreground">“{transcriptEntry?.text ?? item.excerpt}”</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.explanation}</p>
            </blockquote>
          );
        })}
      </div>
    </div>
  );
}
