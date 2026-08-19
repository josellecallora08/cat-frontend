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
    <div className="min-w-0 space-y-2">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={() => setExpanded((current) => !current)}
        className="min-h-11 w-full rounded-lg border border-border px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {expanded ? "Hide what was said" : `Show what was said (${evidence.length})`}
      </button>
      <div id={regionId} role="region" aria-label="Transcript evidence details" hidden={!expanded} className="min-w-0 space-y-3 rounded-lg bg-muted/40 p-3 [overflow-wrap:anywhere]">
        {evidence.map((item) => {
          const transcriptEntry = transcript.find((entry) => entry.sequence_number === item.sequence_number);
          const speakerLabel = item.speaker === "agent" ? "You" : item.speaker === "debtor" ? "Customer" : item.speaker;
          return (
            <blockquote key={`${item.sequence_number}-${item.speaker}`} className="min-w-0 break-words border-l-2 border-primary/50 pl-3 text-sm [overflow-wrap:anywhere]">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sequence {item.sequence_number} · {speakerLabel}
              </p>
              <p className="mt-1 break-words text-foreground">“{transcriptEntry?.text ?? item.excerpt}”</p>
              <p className="mt-1 break-words text-xs text-muted-foreground">{item.explanation}</p>
            </blockquote>
          );
        })}
      </div>
    </div>
  );
}
