"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import type { RubricBlock, RubricCriterion, RubricPenalty } from "@/lib/negotiation-standard-types";

interface RubricBlockEditorProps {
  block: RubricBlock;
  readOnly?: boolean;
  errors?: Record<string, string>;
  onChange: (block: RubricBlock) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function Field({ id, label, value, onChange, type = "text", disabled = false, error }: {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number";
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <input id={id} aria-invalid={Boolean(error)} type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function CriterionEditor({ criterion, kind, readOnly, onChange, onRemove }: {
  criterion: RubricCriterion;
  kind: "behavior" | "violation";
  readOnly: boolean;
  onChange: (criterion: RubricCriterion) => void;
  onRemove: () => void;
}) {
  const update = (field: keyof RubricCriterion, value: string) => onChange({ ...criterion, [field]: value });
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-foreground">{kind === "behavior" ? "Positive behavior" : "Violation"}</h4>
        {!readOnly && <button type="button" onClick={onRemove} className="min-h-11 min-w-11 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Remove ${kind}`}> <Trash2 className="mx-auto h-4 w-4" aria-hidden="true" /> </button>}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field id={`${criterion.id}-id`} label="Stable ID" value={criterion.id} disabled={readOnly} onChange={(value) => update("id", value)} />
        <Field id={`${criterion.id}-name`} label="Name" value={criterion.name} disabled={readOnly} onChange={(value) => update("name", value)} />
      </div>
      <label className="mt-3 block text-sm font-medium text-foreground">Description
        <textarea value={criterion.description} disabled={readOnly} onChange={(event) => update("description", event.target.value)} rows={2} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
      </label>
      <label className="mt-3 block text-sm font-medium text-foreground">Evidence instructions
        <textarea value={criterion.evidence_instructions} disabled={readOnly} onChange={(event) => update("evidence_instructions", event.target.value)} rows={2} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
      </label>
    </div>
  );
}

function defaultCriterion(prefix: string, name: string): RubricCriterion {
  return { id: createId(prefix), name, description: "", evidence_instructions: "" };
}

export function RubricBlockEditor({ block, readOnly = false, errors = {}, onChange, onRemove, onMove }: RubricBlockEditorProps) {
  const update = <K extends keyof RubricBlock>(field: K, value: RubricBlock[K]) => onChange({ ...block, [field]: value });
  const updateBehavior = (id: string, value: RubricCriterion) => update("positive_behaviors", block.positive_behaviors.map((item) => item.id === id ? value : item));
  const updateViolation = (id: string, value: RubricCriterion) => update("violations", block.violations.map((item) => item.id === id ? value : item));
  const removeViolation = (id: string) => {
    onChange({
      ...block,
      violations: block.violations.filter((item) => item.id !== id),
      penalties: block.penalties.filter((penalty) => penalty.violation_id !== id),
    });
  };
  const updatePenalty = (currentViolationId: string, value: RubricPenalty) => update("penalties", block.penalties.map((item) => item.violation_id === currentViolationId ? value : item));
  const removePenalty = (violationId: string) => update("penalties", block.penalties.filter((item) => item.violation_id !== violationId));
  const availableViolation = block.violations.find((violation) => !block.penalties.some((penalty) => penalty.violation_id === violation.id));

  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-6" aria-labelledby={`block-${block.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`block-${block.id}`} className="text-lg font-semibold text-foreground">{block.category || "Untitled rubric block"}</h3>
          <p className="mt-1 text-xs text-muted-foreground">Block ID: {block.id}</p>
        </div>
        {!readOnly && <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove("up")} className="min-h-11 min-w-11 rounded-lg p-2 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Move ${block.category} up`}><ChevronUp className="mx-auto h-4 w-4" aria-hidden="true" /></button>
          <button type="button" onClick={() => onMove("down")} className="min-h-11 min-w-11 rounded-lg p-2 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Move ${block.category} down`}><ChevronDown className="mx-auto h-4 w-4" aria-hidden="true" /></button>
          <button type="button" onClick={onRemove} className="min-h-11 min-w-11 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Remove ${block.category}`}><Trash2 className="mx-auto h-4 w-4" aria-hidden="true" /></button>
        </div>}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field id={`${block.id}-id`} label="Stable ID" value={block.id} disabled={readOnly} onChange={(value) => update("id", value)} error={errors.id} />
        <Field id={`${block.id}-category`} label="Category" value={block.category} disabled={readOnly} onChange={(value) => update("category", value)} error={errors.category} />
        <Field id={`${block.id}-weight`} label="Weight (%)" type="number" value={block.weight} disabled={readOnly} onChange={(value) => update("weight", Number(value))} error={errors.weight} />
        <Field id={`${block.id}-passing-score`} label="Passing score" type="number" value={block.passing_score} disabled={readOnly} onChange={(value) => update("passing_score", Number(value))} error={errors.passing_score} />
      </div>

      <label className="mt-4 block text-sm font-medium text-foreground">Scoring instructions
        <textarea value={block.scoring_instructions} disabled={readOnly} onChange={(event) => update("scoring_instructions", event.target.value)} rows={3} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
      </label>

      <section className="mt-6 space-y-3" aria-labelledby={`behaviors-${block.id}`}>
        <div className="flex items-center justify-between gap-3"><h4 id={`behaviors-${block.id}`} className="font-semibold text-foreground">Positive behaviors</h4>{!readOnly && <button type="button" onClick={() => update("positive_behaviors", [...block.positive_behaviors, defaultCriterion("behavior", "New behavior")])} className="min-h-11 rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="mr-1 inline h-4 w-4" aria-hidden="true" />Add behavior</button>}</div>
        {block.positive_behaviors.map((criterion) => <CriterionEditor key={criterion.id} criterion={criterion} kind="behavior" readOnly={readOnly} onChange={(value) => updateBehavior(criterion.id, value)} onRemove={() => update("positive_behaviors", block.positive_behaviors.filter((item) => item.id !== criterion.id))} />)}
      </section>

      <section className="mt-6 space-y-3" aria-labelledby={`violations-${block.id}`}>
        <div className="flex items-center justify-between gap-3"><h4 id={`violations-${block.id}`} className="font-semibold text-foreground">Violations</h4>{!readOnly && <button type="button" onClick={() => update("violations", [...block.violations, defaultCriterion("violation", "New violation")])} className="min-h-11 rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="mr-1 inline h-4 w-4" aria-hidden="true" />Add violation</button>}</div>
        {block.violations.map((criterion) => <CriterionEditor key={criterion.id} criterion={criterion} kind="violation" readOnly={readOnly} onChange={(value) => updateViolation(criterion.id, value)} onRemove={() => removeViolation(criterion.id)} />)}
      </section>

      <section className="mt-6 space-y-3" aria-labelledby={`penalties-${block.id}`}>
        <div className="flex items-center justify-between gap-3"><h4 id={`penalties-${block.id}`} className="font-semibold text-foreground">Penalties</h4>{!readOnly && <button type="button" onClick={() => { if (availableViolation) update("penalties", [...block.penalties, { violation_id: availableViolation.id, deduction: 0, max_occurrences: 1 }]); }} disabled={!availableViolation} className="min-h-11 rounded-lg px-3 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><Plus className="mr-1 inline h-4 w-4" aria-hidden="true" />Add penalty</button>}</div>
        {block.penalties.map((penalty) => <div key={`${block.id}-penalty-${penalty.violation_id}`} className="grid gap-3 rounded-lg border border-border bg-background p-3 sm:grid-cols-4"><label htmlFor={`${block.id}-penalty-${penalty.violation_id}-violation`} className="text-sm font-medium text-foreground">Violation<select id={`${block.id}-penalty-${penalty.violation_id}-violation`} value={penalty.violation_id} disabled={readOnly} onChange={(event) => updatePenalty(penalty.violation_id, { ...penalty, violation_id: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">Select violation</option>{block.violations.map((violation) => <option key={violation.id} value={violation.id} disabled={block.penalties.some((item) => item !== penalty && item.violation_id === violation.id)}>{violation.name || violation.id}</option>)}</select></label><Field id={`${block.id}-penalty-${penalty.violation_id}-deduction`} label="Deduction" type="number" value={penalty.deduction} disabled={readOnly} onChange={(value) => updatePenalty(penalty.violation_id, { ...penalty, deduction: Number(value) })} /><Field id={`${block.id}-penalty-${penalty.violation_id}-occurrences`} label="Max occurrences" type="number" value={penalty.max_occurrences} disabled={readOnly} onChange={(value) => updatePenalty(penalty.violation_id, { ...penalty, max_occurrences: Number(value) })} />{!readOnly && <button type="button" onClick={() => removePenalty(penalty.violation_id)} className="min-h-11 min-w-11 self-end rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Remove penalty for ${penalty.violation_id}`}><Trash2 className="mx-auto h-4 w-4" aria-hidden="true" /></button>}</div>)}
      </section>

      <label className="mt-6 block text-sm font-medium text-foreground">Recommendation guidance
        <textarea value={block.recommendation_guidance} disabled={readOnly} onChange={(event) => update("recommendation_guidance", event.target.value)} rows={3} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
      </label>
    </article>
  );
}
