import type { NegotiationStandardContent } from "@/lib/negotiation-standard-types";

interface StandardPreviewProps {
  content: NegotiationStandardContent;
  name: string;
  versionNumber?: number | null;
}

export function StandardPreview({ content, name, versionNumber }: StandardPreviewProps) {
  const blocks = [...content.blocks].sort((a, b) => a.display_order - b.display_order);
  return (
    <section aria-labelledby="standard-preview-heading" className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="standard-preview-heading" className="text-lg font-semibold text-foreground">{name || "Untitled standard"}</h2><p className="mt-1 text-sm text-muted-foreground">Trainee-facing rubric preview</p></div>
        {versionNumber && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">Version {versionNumber}</span>}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Overall passing score: <strong className="text-foreground">{content.overall_passing_score}%</strong></p>
      <div className="mt-5 space-y-4">
        {blocks.map((block) => <article key={block.id} className="rounded-lg border border-border p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold text-foreground">{block.category}</h3><span className="text-sm text-muted-foreground">{block.weight}% · pass {block.passing_score}%</span></div><p className="mt-2 text-sm text-muted-foreground">{block.scoring_instructions}</p>{block.positive_behaviors.length > 0 && <div className="mt-3"><h4 className="text-sm font-medium text-foreground">Positive behaviors</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{block.positive_behaviors.map((item) => <li key={item.id}>{item.name}: {item.description}</li>)}</ul></div>}{block.violations.length > 0 && <div className="mt-3"><h4 className="text-sm font-medium text-foreground">Violations</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{block.violations.map((item) => <li key={item.id}>{item.name}: {item.description}</li>)}</ul></div>}</article>)}
      </div>
    </section>
  );
}
