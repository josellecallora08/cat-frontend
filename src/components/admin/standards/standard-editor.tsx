"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Check, Loader2, Plus, Save, Send, X } from "lucide-react";

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
  return { id: `block-${crypto.randomUUID()}`, category: "New rubric block", weight: 0, passing_score: 70, scoring_instructions: "", positive_behaviors: [], violations: [], penalties: [], recommendation_guidance: "", display_order: displayOrder };
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
  const readOnly = !isAdmin || (standard !== null && standard.status !== "draft");
  const busy = createMutation.isPending || updateMutation.isPending || validateMutation.isPending || publishMutation.isPending || archiveMutation.isPending || deleteMutation.isPending;

  const updateBlock = (block: RubricBlock) => setContent((current) => ({ ...current, blocks: current.blocks.map((item) => item.id === block.id ? block : item) }));
  const addBlock = () => setContent((current) => ({ ...current, blocks: [...current.blocks, createBlock(current.blocks.length)] }));
  const removeBlock = (id: string) => setContent((current) => ({ ...current, blocks: current.blocks.filter((block) => block.id !== id).map((block, order) => ({ ...block, display_order: order })) }));

  const saveDraft = async () => {
    setNotice(null);
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

  if (!isAdmin) {
    return <PageEmpty title="Administrator access required" description="Only administrators can manage negotiation standards." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1"><label htmlFor="standard-name" className="text-sm font-medium text-foreground">Standard name</label><input id="standard-name" value={name} disabled={readOnly} onChange={(event) => setName(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" /><label htmlFor="standard-description" className="mt-3 block text-sm font-medium text-foreground">Description</label><textarea id="standard-description" value={description} disabled={readOnly} onChange={(event) => setDescription(event.target.value)} rows={2} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" /></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" onClick={saveDraft} disabled={readOnly || busy}><Save className="h-4 w-4" aria-hidden="true" />{updateMutation.isPending || createMutation.isPending ? "Saving…" : "Save draft"}</Button>{standard && standard.status === "draft" && <><Button variant="outline" className="min-h-11" onClick={validateDraft} disabled={busy}><Check className="h-4 w-4" aria-hidden="true" />Validate</Button><Button className="min-h-11" onClick={() => setPublishOpen(true)} disabled={busy || !validation?.valid}><Send className="h-4 w-4" aria-hidden="true" />Publish</Button></>}{standard && standard.status === "published" && <Button variant="destructive" className="min-h-11" onClick={() => setArchiveOpen(true)} disabled={busy}><Archive className="h-4 w-4" aria-hidden="true" />Archive</Button>}</div>
      </div>

      {notice && <div role="status" aria-live="polite" className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-secondary-foreground">{notice}</div>}
      {validation && !validation.valid && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4"><h2 className="font-semibold text-destructive">Publication validation failed</h2><ul className="mt-2 space-y-1 text-sm text-destructive">{validation.errors.map((error) => <li key={`${error.path}-${error.code}`}>{error.path}: {error.message}</li>)}</ul></div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,34%)_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start"><WeightSummary total={validation?.weight_total ?? total} errorCount={validation?.errors.length ?? 0} /><div className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-foreground">Rubric blocks</h2>{!readOnly && <button type="button" onClick={addBlock} className="min-h-11 min-w-11 rounded-lg p-2 text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Add rubric block"><Plus className="mx-auto h-4 w-4" aria-hidden="true" /></button>}</div><nav className="mt-3 space-y-1" aria-label="Rubric block navigation">{content.blocks.map((block) => <a key={block.id} href={`#block-${block.id}`} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{block.category || "Untitled block"}<span className="ml-2 text-xs">{block.weight}%</span></a>)}</nav>{content.blocks.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No blocks yet. Add one to begin.</p>}</div></aside>
        <main className="space-y-4">{content.blocks.length === 0 ? <PageEmpty title="No rubric blocks" description="Add a block to define the first scored category." actionLabel={readOnly ? undefined : "Add rubric block"} onAction={readOnly ? undefined : addBlock} /> : content.blocks.map((block) => <RubricBlockEditor key={block.id} block={block} readOnly={readOnly} errors={validation?.errors.reduce<Record<string, string>>((result, error) => ({ ...result, [error.path.split(".").pop() ?? error.path]: error.message }), {})} onChange={updateBlock} onRemove={() => removeBlock(block.id)} onMove={(direction) => setContent((current) => ({ ...current, blocks: moveBlock(current.blocks, block.id, direction) }))} />)}</main>
      </div>

      <div className="hidden sm:flex lg:hidden" role="tablist" aria-label="Preview and version history">
        <button type="button" role="tab" aria-selected={secondaryView === "preview"} onClick={() => setSecondaryView("preview")} className="min-h-11 flex-1 rounded-lg px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" >Preview</button>
        <button type="button" role="tab" aria-selected={secondaryView === "history"} onClick={() => setSecondaryView("history")} className="min-h-11 flex-1 rounded-lg px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" >Version history</button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`block ${secondaryView === "preview" ? "sm:block" : "sm:hidden"} lg:block`}><StandardPreview content={previewVersion ?? content} name={name} versionNumber={previewVersion ? versionsQuery.data?.items.find((version) => version.snapshot === previewVersion)?.version_number : standard?.current_version_number} /></div>
        <div className={`block ${secondaryView === "history" ? "sm:block" : "sm:hidden"} lg:block`}><div className="space-y-4"><VersionHistory versions={versionsQuery.data?.items ?? []} selectedVersionId={selectedVersionId} onSelect={selectVersion} />{previewVersion && <Button variant="outline" className="min-h-11" onClick={() => setPreviewVersion(null)}><X className="h-4 w-4" aria-hidden="true" />Close version preview</Button>}</div></div>
      </div>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}><DialogContent><DialogHeader><DialogTitle>Publish negotiation standard?</DialogTitle><DialogDescription>This creates an immutable version that future simulations can pin. Review the validation summary before publishing.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" className="min-h-11">Cancel</Button>} /><Button className="min-h-11" onClick={publish} disabled={publishMutation.isPending}>{publishMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Publishing…</> : "Confirm publish"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}><DialogContent><DialogHeader><DialogTitle>Archive this standard?</DialogTitle><DialogDescription>Archived standards cannot be used to start new simulations. Existing pinned versions remain readable.</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="outline" className="min-h-11">Cancel</Button>} /><Button variant="destructive" className="min-h-11" onClick={archive} disabled={archiveMutation.isPending}>{archiveMutation.isPending ? "Archiving…" : "Confirm archive"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

export function StandardEditor(props: StandardEditorProps) {
  const editorKey = `${props.standard?.id ?? "new"}-${props.standard?.revision ?? 0}`;
  return <StandardEditorForm key={editorKey} {...props} />;
}
