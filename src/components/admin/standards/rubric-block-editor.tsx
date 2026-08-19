"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import type { RubricBlock, RubricCriterion, RubricPenalty } from "@/lib/negotiation-standard-types";

interface RubricBlockEditorProps {
  block: RubricBlock;
  readOnly?: boolean;
  errors?: Record<string, string>;
  onChange: (block: RubricBlock) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}

/** Marks a field label as required, matching the pattern used elsewhere in the app. */
function RequiredMark() {
  return <span className="text-destructive" aria-hidden="true"> *</span>;
}

function Field({ id, label, value, onChange, type = "text", disabled = false, error, hint, required = false }: {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number";
  disabled?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-xs font-semibold text-foreground">{label}{required && <RequiredMark />}</label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1.5 min-h-11 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60 ${error ? "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/20" : "border-input"}`}
      />
      {hint && !error && <p id={hintId} className="mt-1 text-xs text-muted-foreground">Unit: {hint}</p>}
      {error && <p id={errorId} className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Read-only Stable ID, tucked behind a toggle so it doesn't compete with editable fields. */
function StableIdDisclosure({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const regionId = `stable-id-${useId().replaceAll(":", "")}`;
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {open ? "Hide" : "Show"} stable ID
        {open ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
      <div id={regionId}>
        {open && (
          <p className="mt-1.5 rounded-lg border border-card-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Stable ID: <span className="font-mono text-foreground">{id}</span> · auto-generated, not editable.
          </p>
        )}
      </div>
    </div>
  );
}

function SectionHeading({ title, description, count }: { title: string; description: string; count?: number }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {count !== undefined && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{count} {count === 1 ? "item" : "items"}</span>}
    </div>
  );
}

function CriterionEditor({ criterion, kind, readOnly, errors, onChange, onRemove }: {
  criterion: RubricCriterion;
  kind: "behavior" | "violation";
  readOnly: boolean;
  errors: Record<string, string>;
  onChange: (criterion: RubricCriterion) => void;
  onRemove: () => void;
}) {
  const update = (field: keyof RubricCriterion, value: string) => onChange({ ...criterion, [field]: value });
  const label = kind === "behavior" ? "Positive behavior" : "Violation";
  const descriptionErrorId = `${criterion.id}-description-error`;
  const evidenceErrorId = `${criterion.id}-evidence-error`;
  return (
    <div className="rounded-xl border border-card-border bg-background p-4 shadow-xs sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${kind === "behavior" ? "bg-success" : "bg-destructive"}`} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Define the observable evidence for this item.</p>
          </div>
        </div>
        {!readOnly && <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="min-h-11 min-w-11 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${kind}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>}
      </div>
      <div className="mt-4">
        <Field id={`${criterion.id}-name`} label="Name" value={criterion.name} disabled={readOnly} onChange={(value) => update("name", value)} error={errors.name} required />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label htmlFor={`${criterion.id}-description`} className="block text-xs font-semibold text-foreground">Description<RequiredMark />
          <textarea id={`${criterion.id}-description`} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? descriptionErrorId : undefined} value={criterion.description} disabled={readOnly} onChange={(event) => update("description", event.target.value)} rows={3} className={`mt-1.5 min-h-11 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm font-normal text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60 ${errors.description ? "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/20" : "border-input"}`} />
          {errors.description && <p id={descriptionErrorId} className="mt-1 text-xs text-destructive">{errors.description}</p>}
        </label>
        <label htmlFor={`${criterion.id}-evidence`} className="block text-xs font-semibold text-foreground">Evidence instructions<RequiredMark />
          <textarea id={`${criterion.id}-evidence`} aria-invalid={Boolean(errors.evidence_instructions)} aria-describedby={errors.evidence_instructions ? evidenceErrorId : undefined} value={criterion.evidence_instructions} disabled={readOnly} onChange={(event) => update("evidence_instructions", event.target.value)} rows={3} className={`mt-1.5 min-h-11 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm font-normal text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60 ${errors.evidence_instructions ? "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/20" : "border-input"}`} />
          {errors.evidence_instructions && <p id={evidenceErrorId} className="mt-1 text-xs text-destructive">{errors.evidence_instructions}</p>}
        </label>
      </div>
      <StableIdDisclosure id={criterion.id} />
    </div>
  );
}

function defaultCriterion(prefix: string, name: string): RubricCriterion {
  return { id: `${prefix}-${crypto.randomUUID()}`, name, description: "", evidence_instructions: "" };
}

export function RubricBlockEditor({ block, readOnly = false, errors = {}, onChange, onRemove, onMove }: RubricBlockEditorProps) {
  const update = <K extends keyof RubricBlock>(field: K, value: RubricBlock[K]) => onChange({ ...block, [field]: value });
  const updateBehavior = (id: string, value: RubricCriterion) => update("positive_behaviors", block.positive_behaviors.map((item) => item.id === id ? value : item));
  const updateViolation = (id: string, value: RubricCriterion) => update("violations", block.violations.map((item) => item.id === id ? value : item));
  const removeViolation = (id: string) => onChange({ ...block, violations: block.violations.filter((item) => item.id !== id), penalties: block.penalties.filter((penalty) => penalty.violation_id !== id) });
  const updatePenalty = (currentViolationId: string, value: RubricPenalty) => update("penalties", block.penalties.map((item) => item.violation_id === currentViolationId ? value : item));
  const removePenalty = (violationId: string) => update("penalties", block.penalties.filter((item) => item.violation_id !== violationId));
  const availableViolation = block.violations.find((violation) => !block.penalties.some((penalty) => penalty.violation_id === violation.id));
  const criterionErrors = (collection: "positive_behaviors" | "violations", index: number) => {
    const prefix = `${collection}.${index}.`;
    return Object.entries(errors).reduce<Record<string, string>>((result, [path, message]) => {
      if (path.startsWith(prefix)) result[path.slice(prefix.length)] = message;
      return result;
    }, {});
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-sm" aria-labelledby={`block-${block.id}`}>
      <header className="border-b border-card-border bg-linear-to-br from-primary/10 via-card to-card px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Rubric block</p>
              <h3 id={`block-${block.id}`} className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground">{block.category || "Untitled rubric block"}</h3>
            </div>
          </div>
          {!readOnly && <div className="flex items-center gap-1 rounded-xl border border-card-border bg-background/80 p-1 shadow-xs">
            <Button type="button" variant="ghost" size="icon" onClick={() => onMove("up")} className="min-h-11 min-w-11 text-muted-foreground" aria-label={`Move ${block.category} up`}><ChevronUp className="h-4 w-4" aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => onMove("down")} className="min-h-11 min-w-11 text-muted-foreground" aria-label={`Move ${block.category} down`}><ChevronDown className="h-4 w-4" aria-hidden="true" /></Button>
            <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
            <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="min-h-11 min-w-11 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove ${block.category}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
          </div>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{block.weight}% weight</span>
          <span className="rounded-full border border-border bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">Passing score {block.passing_score}%</span>
        </div>
      </header>

      <div className="space-y-6 px-5 py-5 sm:px-7 sm:py-7">
        <section className="rounded-xl border border-card-border bg-muted/20 p-4 sm:p-5" aria-labelledby={`details-${block.id}`}>
          <SectionHeading title="Block details" description="Set the category, weight, and passing threshold for this block." />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field id={`${block.id}-category`} label="Category" value={block.category} disabled={readOnly} onChange={(value) => update("category", value)} error={errors.category} required />
            <div>
              <Field id={`${block.id}-weight`} label="Weight (%)" type="number" value={block.weight} disabled={readOnly} onChange={(value) => update("weight", Number(value))} error={errors.weight} required />
              <p className="mt-1 text-xs text-muted-foreground">Share of the total score this category is worth. All blocks must add up to 100%.</p>
            </div>
            <div>
              <Field id={`${block.id}-passing-score`} label="Passing score" hint="%" type="number" value={block.passing_score} disabled={readOnly} onChange={(value) => update("passing_score", Number(value))} error={errors.passing_score} required />
              <p className="mt-1 text-xs text-muted-foreground">Minimum score a trainee needs in just this category.</p>
            </div>
          </div>
          <label htmlFor={`${block.id}-scoring-instructions`} className="mt-4 block text-xs font-semibold text-foreground">Scoring instructions<RequiredMark />
            <textarea id={`${block.id}-scoring-instructions`} aria-invalid={Boolean(errors.scoring_instructions)} aria-describedby={errors.scoring_instructions ? `${block.id}-scoring-instructions-error` : undefined} value={block.scoring_instructions} disabled={readOnly} onChange={(event) => update("scoring_instructions", event.target.value)} rows={8} className={`mt-1.5 min-h-11 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm font-normal text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60 ${errors.scoring_instructions ? "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/20" : "border-input"}`} placeholder="Explain how this block should be scored." />
            {errors.scoring_instructions && <p id={`${block.id}-scoring-instructions-error`} className="mt-1 text-xs text-destructive">{errors.scoring_instructions}</p>}
          </label>
          <StableIdDisclosure id={block.id} />
        </section>

        <section className="rounded-xl border border-card-border bg-card p-4 sm:p-5" aria-labelledby={`behaviors-${block.id}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 id={`behaviors-${block.id}`} className="text-sm font-semibold text-foreground">Positive behaviors</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Behaviors the evaluator should reward.</p></div>{!readOnly && <Button type="button" variant="outline" className="min-h-11" onClick={() => update("positive_behaviors", [...block.positive_behaviors, defaultCriterion("behavior", "New behavior")])}><Plus className="h-4 w-4" aria-hidden="true" />Add behavior</Button>}</div>
          <div className="mt-4 space-y-3">{block.positive_behaviors.map((criterion, index) => <CriterionEditor key={criterion.id} criterion={criterion} kind="behavior" readOnly={readOnly} errors={criterionErrors("positive_behaviors", index)} onChange={(value) => updateBehavior(criterion.id, value)} onRemove={() => update("positive_behaviors", block.positive_behaviors.filter((item) => item.id !== criterion.id))} />)}</div>
          {block.positive_behaviors.length === 0 && <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">No positive behaviors added yet.</p>}
        </section>

        <section className="rounded-xl border border-card-border bg-card p-4 sm:p-5" aria-labelledby={`violations-${block.id}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 id={`violations-${block.id}`} className="text-sm font-semibold text-foreground">Violations</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Behaviors that should trigger a finding or deduction.</p></div>{!readOnly && <Button type="button" variant="outline" className="min-h-11" onClick={() => update("violations", [...block.violations, defaultCriterion("violation", "New violation")])}><Plus className="h-4 w-4" aria-hidden="true" />Add violation</Button>}</div>
          <div className="mt-4 space-y-3">{block.violations.map((criterion, index) => <CriterionEditor key={criterion.id} criterion={criterion} kind="violation" readOnly={readOnly} errors={criterionErrors("violations", index)} onChange={(value) => updateViolation(criterion.id, value)} onRemove={() => removeViolation(criterion.id)} />)}</div>
          {block.violations.length === 0 && <p className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">No violations added yet.</p>}
        </section>

        <section className="rounded-xl border border-card-border bg-muted/20 p-4 sm:p-5" aria-labelledby={`penalties-${block.id}`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 id={`penalties-${block.id}`} className="text-sm font-semibold text-foreground">Penalties</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Optional deductions linked to a violation.</p></div>{!readOnly && <Button type="button" variant="outline" className="min-h-11" onClick={() => { if (availableViolation) update("penalties", [...block.penalties, { violation_id: availableViolation.id, deduction: 0, max_occurrences: 1 }]); }} disabled={!availableViolation}><Plus className="h-4 w-4" aria-hidden="true" />Add penalty</Button>}</div>
          <div className="mt-4 space-y-3">
            {block.penalties.map((penalty) => <div key={`${block.id}-penalty-${penalty.violation_id}`} className="rounded-xl border border-card-border bg-background p-4 shadow-xs sm:p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-foreground">Penalty rule</p><p className="mt-0.5 text-xs text-muted-foreground">Connect a violation to its deduction.</p></div>{!readOnly && <Button type="button" variant="ghost" size="icon" onClick={() => removePenalty(penalty.violation_id)} className="min-h-11 min-w-11 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Remove penalty for ${penalty.violation_id}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>}</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label htmlFor={`${block.id}-penalty-${penalty.violation_id}-violation`} className="text-xs font-semibold text-foreground sm:col-span-2">Violation
                  <select id={`${block.id}-penalty-${penalty.violation_id}-violation`} value={penalty.violation_id} disabled={readOnly} onChange={(event) => updatePenalty(penalty.violation_id, { ...penalty, violation_id: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60"><option value="">Select violation</option>{block.violations.map((violation) => <option key={violation.id} value={violation.id} disabled={block.penalties.some((item) => item !== penalty && item.violation_id === violation.id)}>{violation.name || violation.id}</option>)}</select>
                </label>
                <Field id={`${block.id}-penalty-${penalty.violation_id}-deduction`} label="Deduction" hint="points" type="number" value={penalty.deduction} disabled={readOnly} onChange={(value) => updatePenalty(penalty.violation_id, { ...penalty, deduction: Number(value) })} />
                <Field id={`${block.id}-penalty-${penalty.violation_id}-occurrences`} label="Max occurrences" type="number" value={penalty.max_occurrences} disabled={readOnly} onChange={(value) => updatePenalty(penalty.violation_id, { ...penalty, max_occurrences: Number(value) })} />
              </div>
            </div>)}
          </div>
          {block.penalties.length === 0 && <p className="mt-4 rounded-lg border border-dashed border-background/60 px-4 py-3 text-sm text-muted-foreground">No penalties configured.</p>}
        </section>

        <section className="rounded-xl border border-card-border bg-muted/20 p-4 sm:p-5" aria-labelledby={`guidance-${block.id}`}>
          <div><h4 id={`guidance-${block.id}`} className="text-sm font-semibold text-foreground">Recommendation guidance</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Give the coach practical guidance for this block.</p></div>
          <label htmlFor={`${block.id}-recommendation-guidance`} className="sr-only">Recommendation guidance</label>
          <textarea id={`${block.id}-recommendation-guidance`} aria-invalid={Boolean(errors.recommendation_guidance)} aria-describedby={errors.recommendation_guidance ? `${block.id}-recommendation-guidance-error` : undefined} value={block.recommendation_guidance} disabled={readOnly} onChange={(event) => update("recommendation_guidance", event.target.value)} rows={3} className={`mt-4 min-h-11 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-60 ${errors.recommendation_guidance ? "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/20" : "border-input"}`} placeholder="Explain what a coach should reinforce or practice next." />
          {errors.recommendation_guidance && <p id={`${block.id}-recommendation-guidance-error`} className="mt-1 text-xs text-destructive">{errors.recommendation_guidance}</p>}
        </section>
      </div>
    </article>
  );
}
