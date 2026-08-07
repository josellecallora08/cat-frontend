"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Check, ChevronRight, Loader2, Plus, Save, Send, X } from "lucide-react";

import { PageEmpty } from "@/components/page-empty";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useArchiveNegotiationStandard, useCreateNegotiationStandard, useDeleteNegotiationStandard, useNegotiationStandardVersions, usePublishNegotiationStandard, useUpdateNegotiationStandard, useValidateNegotiationStandard } from "@/hooks/use-negotiation-standards";
import type { StandardResponse, ValidationIssue } from "@/lib/api/negotiation-standards";
import type { NegotiationStandardContent, RubricBlock } from "@/lib/negotiation-standard-types";
import { RubricBlockEditor } from "./rubric-block-editor";
import { StandardPreview } from "./standard-preview";
import { VersionHistory } from "./version-history";
import { WeightSummary } from "./weight-summary";

interface StandardEditorProps {
  campaignId: string;
  standard: StandardResponse | null;
  isAdmin: boolean;
}

const emptyContent: NegotiationStandardContent = { schema_version: 1, overall_passing_score: 70, blocks: [] };

function createBlock(displayOrder: number): RubricBlock {
  return {
    id: `block-${crypto.randomUUID()}`,
    category: "New rubric block",
    weight: 0,
    passing_score: 70,
    scoring_instructions: "Score this category using observable evidence from the conversation.",
    positive_behaviors: [],
    violations: [],
    penalties: [],
    recommendation_guidance: "Reinforce strengths and practice improvements for this category.",
    display_order: displayOrder,
  };
}

function validateRequiredRubricText(content: NegotiationStandardContent): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const requireText = (value: string, path: string, label: string) => {
    if (!value.trim()) errors.push({ code: "required", path, message: `${label} is required.` });
  };

  content.blocks.forEach((block, blockIndex) => {
    const blockPath = `blocks.${blockIndex}`;
    requireText(block.id, `${blockPath}.id`, "Stable ID");
    requireText(block.category, `${blockPath}.category`, "Category");
    requireText(block.scoring_instructions, `${blockPath}.scoring_instructions`, "Scoring instructions");
    requireText(block.recommendation_guidance, `${blockPath}.recommendation_guidance`, "Recommendation guidance");

    for (const [collection, items, label] of [
      ["positive_behaviors", block.positive_behaviors, "Positive behavior"] as const,
      ["violations", block.violations, "Violation"] as const,
    ]) {
      items.forEach((criterion, criterionIndex) => {
        const criterionPath = `${blockPath}.${collection}.${criterionIndex}`;
        requireText(criterion.id, `${criterionPath}.id`, `${label} stable ID`);
        requireText(criterion.name, `${criterionPath}.name`, `${label} name`);
        requireText(criterion.description, `${criterionPath}.description`, `${label} description`);
        requireText(criterion.evidence_instructions, `${criterionPath}.evidence_instructions`, `${label} evidence instructions`);
      });
    }
  });
  return errors;
}

function moveBlock(blocks: RubricBlock[], id: string, direction: "up" | "down") {
  const index = blocks.findIndex((block) => block.id === id);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) return blocks;
  const next = [...blocks];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next.map((block, order) => ({ ...block, display_order: order }));
}

function StandardEditorForm({ campaignId, standard, isAdmin }: StandardEditorProps) {
  const [name, setName] = useState(standard?.name ?? "");
  const [description, setDescription] = useState(standard?.description ?? "");
  const [content, setContent] = useState<NegotiationStandardContent>(standard?.draft_content ?? emptyContent);
  const [validation, setValidation] = useState<{ valid: boolean; weight_total: number; errors: ValidationIssue[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const [previewVersion, setPreviewVersion] = useState<StandardResponse["draft_content"]>(null);
  const [secondaryView, setSecondaryView] = useState<"preview" | "history">("preview");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(standard?.draft_content?.blocks[0]?.id ?? null);
  const [blockNumbers, setBlockNumbers] = useState<Record<string, number>>(() => Object.fromEntries((standard?.draft_content?.blocks ?? []).map((block, index) => [block.id, index + 1])));

  const createMutation = useCreateNegotiationStandard(campaignId);
  const updateMutation = useUpdateNegotiationStandard(campaignId);
  const validateMutation = useValidateNegotiationStandard(campaignId);
  const publishMutation = usePublishNegotiationStandard(campaignId);
  const archiveMutation = useArchiveNegotiationStandard(campaignId);
  const deleteMutation = useDeleteNegotiationStandard(campaignId);
  const versionsQuery = useNegotiationStandardVersions(campaignId);

  useEffect(() => {
    if (!validation || validation.valid) return;
    const firstInvalid = document.querySelector<HTMLElement>("[aria-invalid='true']");
    firstInvalid?.focus();
  }, [validation]);

  const total = useMemo(() => content.blocks.reduce((sum, block) => sum + (Number.isFinite(block.weight) ? block.weight : 0), 0), [content.blocks]);
  const activeIndex = content.blocks.findIndex((block) => block.id === selectedBlockId);
  const selectedBlock = activeIndex >= 0 ? content.blocks[activeIndex] : null;
  const activeErrors = useMemo(() => {
    if (activeIndex < 0) return {};
    const prefix = `blocks.${activeIndex}.`;
    return (validation?.errors ?? []).reduce<Record<string, string>>((result, error) => {
      if (error.path.startsWith(prefix)) {
        const field = error.path.slice(prefix.length);
        result[field] = error.message;
      }
      return result;
    }, {});
  }, [activeIndex, validation]);
  const readOnly = !isAdmin || (standard !== null && standard.status !== "draft");
  const busy = createMutation.isPending || updateMutation.isPending || validateMutation.isPending || publishMutation.isPending || archiveMutation.isPending || deleteMutation.isPending;

  const updateBlock = (block: RubricBlock) => {
    setContent((current) => ({ ...current, blocks: current.blocks.map((item) => item.id === selectedBlockId ? block : item) }));
    setSelectedBlockId(block.id);
  };

  const addBlock = () => {
    const block = createBlock(content.blocks.length);
    setBlockNumbers((current) => ({ ...current, [block.id]: Math.max(0, ...Object.values(current)) + 1 }));
    setContent((current) => ({ ...current, blocks: [...current.blocks, block] }));
    setSelectedBlockId(block.id);
  };

  const removeBlock = (id: string) => {
    const index = content.blocks.findIndex((block) => block.id === id);
    const remaining = content.blocks.filter((block) => block.id !== id).map((block, order) => ({ ...block, display_order: order }));
    setContent((current) => ({ ...current, blocks: remaining }));
    setSelectedBlockId(remaining[Math.min(index, remaining.length - 1)]?.id ?? null);
  };

  const saveDraft = async () => {
    setNotice(null);
    const requiredErrors = validateRequiredRubricText(content);
    if (requiredErrors.length > 0) {
      setValidation({ valid: false, weight_total: total, errors: requiredErrors });
      setNotice("Complete all required rubric fields before saving.");
      return;
    }
    try {
      if (!standard) {
        await createMutation.mutateAsync({ name: name.trim() || "New negotiation standard", description: description || null, draft_content: content });
      } else {
        await updateMutation.mutateAsync({ expected_revision: standard.revision, name: name.trim() || standard.name, description: description || null, draft_content: content });
      }
      setNotice("Draft saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save the draft.");
    }
  };

  const validateDraft = async () => {
    try {
      const result = await validateMutation.mutateAsync();
      setValidation(result);
      setNotice(result.valid ? "Validation passed." : "Validation found issues. The draft can still be saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not validate the draft.");
    }
  };

  const publish = async () => {
    try {
      const version = await publishMutation.mutateAsync({ publication_note: "Published from the administrator rubric manager." });
      setPublishOpen(false);
      setNotice(`Published version ${version.version_number}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not publish the standard.");
    }
  };

  const archive = async () => {
    try {
      await archiveMutation.mutateAsync();
      setArchiveOpen(false);
      setNotice("Standard archived.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not archive the standard.");
    }
  };

  const selectVersion = (version: NonNullable<typeof versionsQuery.data>["items"][number]) => {
    setSelectedVersionId(version.id);
    setPreviewVersion(version.snapshot);
  };

  const focusBlock = (index: number) => {
    const block = content.blocks[index];
    if (!block) return;
    setSelectedBlockId(block.id);
    requestAnimationFrame(() => document.getElementById(`block-tab-${block.id}`)?.focus());
  };

  const handleBlockKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      focusBlock((index + 1) % content.blocks.length);
    }
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      focusBlock((index - 1 + content.blocks.length) % content.blocks.length);
    }
  };

  if (!isAdmin) {
    return <PageEmpty title="Administrator access required" description="Only administrators can manage negotiation standards." />;
  }

  return (
    <div className="space-y-5 overflow-x-hidden">
      <header className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground">
                {standard?.status ?? "Draft"}
              </span>
              {standard?.current_version_number && <span className="text-xs text-muted-foreground">Version {standard.current_version_number}</span>}
            </div>
            <label htmlFor="standard-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Standard name</label>
            <input id="standard-name" value={name} disabled={readOnly} onChange={(event) => setName(event.target.value)} className="mt-1 min-h-12 w-full rounded-xl border-0 bg-muted/40 px-3 text-xl font-semibold text-foreground outline-none ring-0 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:text-2xl" />
            <label htmlFor="standard-description" className="mt-3 block text-sm text-muted-foreground">Description</label>
            <textarea id="standard-description" value={description} disabled={readOnly} onChange={(event) => setDescription(event.target.value)} rows={2} className="mt-1 min-h-11 w-full max-w-2xl resize-y rounded-xl border-0 bg-muted/30 px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" placeholder="Describe the outcome this standard should guide." />
          </div>
          <div className="flex flex-wrap gap-2 xl:max-w-md xl:justify-end">
            <Button variant="outline" className="min-h-11" onClick={saveDraft} disabled={readOnly || busy}><Save className="h-4 w-4" aria-hidden="true" />{updateMutation.isPending || createMutation.isPending ? "Saving…" : "Save draft"}</Button>
            {standard && standard.status === "draft" && <>
              <Button variant="outline" className="min-h-11" onClick={validateDraft} disabled={busy}><Check className="h-4 w-4" aria-hidden="true" />Validate</Button>
              <Button className="min-h-11" onClick={() => setPublishOpen(true)} disabled={busy || !validation?.valid}><Send className="h-4 w-4" aria-hidden="true" />Publish</Button>
            </>}
            {standard && standard.status === "published" && <Button variant="destructive" className="min-h-11" onClick={() => setArchiveOpen(true)} disabled={busy}><Archive className="h-4 w-4" aria-hidden="true" />Archive</Button>}
          </div>
        </div>
      </header>

      {notice && <div role="status" aria-live="polite" className="rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground">{notice}</div>}
      {validation && !validation.valid && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4"><h2 className="font-semibold text-destructive">Publication validation failed</h2><ul className="mt-2 space-y-1 text-sm text-destructive">{validation.errors.map((error) => <li key={`${error.path}-${error.code}`}>{error.path}: {error.message}</li>)}</ul></div>}

      <div className="grid gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-3 lg:sticky lg:top-4">
          <WeightSummary total={validation?.weight_total ?? total} errorCount={validation?.errors.length ?? 0} />
          <section className="rounded-2xl border border-border/70 bg-card p-2 shadow-sm" aria-labelledby="rubric-blocks-heading">
            <div className="flex items-center justify-between gap-2 px-2 py-2">
              <div>
                <h2 id="rubric-blocks-heading" className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rubric blocks</h2>
                <p className="mt-1 text-xs text-muted-foreground">Select a block to edit</p>
              </div>
              {!readOnly && <button type="button" onClick={addBlock} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Add rubric block"><Plus className="h-4 w-4" aria-hidden="true" /></button>}
            </div>
            {content.blocks.length > 0 ? <nav className="mt-2 space-y-1" aria-label="Rubric block navigation" role="tablist" aria-orientation="vertical">
              {content.blocks.map((block, index) => {
                const active = block.id === selectedBlockId;
                return <button key={block.id} id={`block-tab-${block.id}`} type="button" role="tab" aria-selected={active} aria-controls={`block-panel-${block.id}`} onClick={() => setSelectedBlockId(block.id)} onKeyDown={(event) => handleBlockKeyDown(event, index)} className={`group flex min-h-14 w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary/10 text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{String(blockNumbers[block.id] ?? index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{block.category || "Untitled block"}</span><span className="mt-0.5 block text-xs text-muted-foreground">{block.weight}% weight</span></span>
                  <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${active ? "text-primary" : "opacity-0 group-hover:opacity-100"}`} aria-hidden="true" />
                </button>;
              })}
            </nav> : <p className="px-2 pb-3 pt-2 text-sm text-muted-foreground">No blocks yet. Add one to begin.</p>}
          </section>
        </aside>

        <section id={selectedBlock ? `block-panel-${selectedBlock.id}` : undefined} role={selectedBlock ? "tabpanel" : undefined} aria-labelledby={selectedBlock ? `block-tab-${selectedBlock.id}` : undefined} className="min-w-0">
          {selectedBlock ? <RubricBlockEditor block={selectedBlock} readOnly={readOnly} errors={activeErrors} onChange={updateBlock} onRemove={() => removeBlock(selectedBlock.id)} onMove={(direction) => setContent((current) => ({ ...current, blocks: moveBlock(current.blocks, selectedBlock.id, direction) }))} /> : <PageEmpty title="No rubric blocks" description="Add a block to define the first scored category." actionLabel={readOnly ? undefined : "Add rubric block"} onAction={readOnly ? undefined : addBlock} />}
        </section>
      </div>

      <div className="hidden sm:flex lg:hidden" role="tablist" aria-label="Preview and version history">
        <button type="button" role="tab" aria-selected={secondaryView === "preview"} onClick={() => setSecondaryView("preview")} className="min-h-11 flex-1 rounded-xl px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Preview</button>
        <button type="button" role="tab" aria-selected={secondaryView === "history"} onClick={() => setSecondaryView("history")} className="min-h-11 flex-1 rounded-xl px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Version history</button>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className={`${secondaryView === "preview" ? "block" : "hidden"} lg:block`}><StandardPreview content={previewVersion ?? content} name={name} versionNumber={previewVersion ? versionsQuery.data?.items.find((version) => version.snapshot === previewVersion)?.version_number : standard?.current_version_number} /></div>
        <div className={`${secondaryView === "history" ? "block" : "hidden"} lg:block`}><div className="space-y-4"><VersionHistory versions={versionsQuery.data?.items ?? []} selectedVersionId={selectedVersionId} onSelect={selectVersion} />{previewVersion && <Button variant="outline" className="min-h-11" onClick={() => setPreviewVersion(null)}><X className="h-4 w-4" aria-hidden="true" />Close version preview</Button>}</div></div>
      </div>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}><DialogContent><DialogHeader><DialogTitle>Publish negotiation standard?</DialogTitle><DialogDescription>This creates an immutable version that future simulations can pin. Review the validation summary before publishing.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" className="min-h-11">Cancel</Button>} /><Button className="min-h-11" onClick={publish} disabled={publishMutation.isPending}>{publishMutation.isPending ? <><Loader2 className="h-4 w-4 motion-reduce:animate-none" aria-hidden="true" />Publishing…</> : "Confirm publish"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}><DialogContent><DialogHeader><DialogTitle>Archive this standard?</DialogTitle><DialogDescription>Archived standards cannot be used to start new simulations. Existing pinned versions remain readable.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" className="min-h-11">Cancel</Button>} /><Button variant="destructive" className="min-h-11" onClick={archive} disabled={archiveMutation.isPending}>{archiveMutation.isPending ? "Archiving…" : "Confirm archive"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

export function StandardEditor(props: StandardEditorProps) {
  const editorKey = `${props.standard?.id ?? "new"}-${props.standard?.revision ?? 0}`;
  return <StandardEditorForm key={editorKey} {...props} />;
}
