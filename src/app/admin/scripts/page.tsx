"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ChevronDown, ChevronUp, FileCode2, Loader2, Plus, LayoutGrid, XCircle, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageContent } from "@/components/page-content";
import { assignScript, bulkDeleteScripts, deleteScript, fetchScriptVersions, fetchScripts, publishScript, unpublishScript, type ScriptListItem, type ScriptVersion } from "@/lib/api/scripts";
import { fetchScenarios, type ScenarioListItem } from "@/lib/api/scenarios";
import { useAuthStore } from "@/stores/auth-store";

const statusStyles: Record<string, string> = {
  draft: "bg-[#fff7e6] text-[#8a5a00]",
  published: "bg-[#e6f6ec] text-[#155f35]",
  unpublished: "bg-[#f1eff4] text-[#595260]",
};

export default function AdminScriptsPage() {
  const token = useAuthStore((state) => state.token);
  const [scripts, setScripts] = useState<ScriptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, ScriptVersion[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioListItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [loadedScripts, loadedScenarios] = await Promise.all([fetchScripts(token), fetchScenarios(token)]);
      setScripts(loadedScripts);
      setScenarios(loadedScenarios);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load scripts.");
    } finally {
      setLoading(false);
    }
  }

  async function changeScenario(script: ScriptListItem, scenarioId: string) {
    if (!token || !scenarioId || scenarioId === script.scenario_id) return;
    setBusy(script.id);
    try {
      await assignScript(script.id, scenarioId, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign scenario.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(ids: string[]) {
    if (!token || ids.length === 0) return;
    const label = ids.length === 1 ? "this script" : `${ids.length} scripts`;
    if (!window.confirm(`Delete ${label}? This removes them from the library.`)) return;
    setBusy("delete");
    try {
      if (ids.length === 1) await deleteScript(ids[0], token);
      else await bulkDeleteScripts(ids, token);
      setSelected([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete scripts.");
    } finally { setBusy(null); }
  }

  // Loading data is an external synchronization boundary.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleVersions(script: ScriptListItem) {
    if (!token) return;
    if (expanded === script.id) {
      setExpanded(null);
      return;
    }
    setExpanded(script.id);
    if (!versions[script.id]) {
      const items = await fetchScriptVersions(script.id, token);
      setVersions((current) => ({ ...current, [script.id]: items }));
    }
  }

  async function changeStatus(script: ScriptListItem) {
    if (!token) return;
    setBusy(script.id);
    try {
      if (script.status === "published") await unpublishScript(script.id, token);
      else await publishScript(script.id, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update script status.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PageContent>
      <main aria-labelledby="scripts-heading" className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-[#5f3ca1]">Behavior library</p>
            <h1 id="scripts-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">Scripts</h1>
            <p className="mt-2 text-sm text-[#595260]">Publish reusable debtor behavior contracts and track their versions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/scenarios"><Button variant="outline"><LayoutGrid aria-hidden="true" /> Manage by scenario</Button></Link>
            <Button onClick={() => void load()}><Plus aria-hidden="true" /> Refresh library</Button>
          </div>
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-[#d59aa3] bg-[#fff1f3] p-3 text-sm text-[#8f2032]">{error}</div>}
        <div className="overflow-hidden rounded-3xl border border-[#d9d3e3] bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-[#655e6d]"><Loader2 className="animate-spin" /> Loading scripts…</div>
          ) : scripts.length === 0 ? (
            <div className="p-12 text-center"><FileCode2 className="mx-auto mb-3 size-8 text-[#8e69e0]" /><h2 className="font-bold">No scripts yet</h2><p className="mt-1 text-sm text-[#655e6d]">Upload a document to create your first behavior contract.</p></div>
          ) : (
            <div className="divide-y divide-[#ede8f2]">
              {scripts.map((script) => (
                <div key={script.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <input type="checkbox" aria-label={`Select ${script.name}`} checked={selected.includes(script.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, script.id] : current.filter((id) => id !== script.id))} className="mt-1 size-4 accent-[#6d47c7]" />
                      <FileCode2 className="mt-1 size-5 shrink-0 text-[#5f3ca1]" aria-hidden="true" />
                      <div className="min-w-0">
                        <h2 className="truncate font-bold">{script.name}</h2>
                        <p className="mt-1 text-xs text-[#655e6d]">{scenarios.find((item) => item.id === script.scenario_id)?.name ?? "Unknown scenario"} · {script.format.toUpperCase()}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[script.status] ?? statusStyles.draft}`}>{script.status}</span>
                      <Button variant="outline" size="sm" disabled={busy === script.id} onClick={() => void changeStatus(script)}>
                        {busy === script.id ? <Loader2 className="animate-spin" /> : script.status === "published" ? <XCircle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                        {script.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                      <label className="sr-only" htmlFor={`scenario-${script.id}`}>Scenario for {script.name}</label>
                      <select id={`scenario-${script.id}`} value={script.scenario_id} disabled={busy === script.id} onChange={(event) => void changeScenario(script, event.target.value)} className="h-9 max-w-[220px] rounded-md border border-[#d9d3e3] bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d47c7]">
                        {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
                      </select>
                      <Link href={`/admin/scripts/${script.id}`}><Button variant="ghost" size="sm"><Pencil aria-hidden="true" /> Review / edit</Button></Link>
                      <Button variant="ghost" size="sm" aria-label={`Delete ${script.name}`} onClick={() => void remove([script.id])}><Trash2 aria-hidden="true" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => void toggleVersions(script)} aria-expanded={expanded === script.id}>
                        {expanded === script.id ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />} Versions
                      </Button>
                    </div>
                  </div>
                  {expanded === script.id && (
                    <div className="mt-4 rounded-2xl bg-[#faf9fc] p-4" aria-live="polite">
                      <h3 className="text-sm font-bold">Published versions</h3>
                      {(versions[script.id] ?? []).length === 0 ? <p className="mt-2 text-sm text-[#655e6d]">No published versions yet.</p> : (
                        <ul className="mt-2 space-y-2 text-sm">{versions[script.id].map((version) => <li key={version.id} className="flex justify-between rounded-lg border border-[#e5dfed] bg-white px-3 py-2"><span>Version {version.version_number}</span><time dateTime={version.published_at}>{new Date(version.published_at).toLocaleString()}</time></li>)}</ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {selected.length > 0 && typeof document !== "undefined" && createPortal(
          <div
            role="toolbar"
            aria-label="Selected script actions"
            className="script-selection-toolbar fixed bottom-6 left-1/2 z-[9999] flex items-center gap-2 rounded-2xl border border-[#d9d3e3] bg-white/95 p-2 shadow-[0_16px_44px_rgba(45,32,67,0.28)] backdrop-blur-sm"
          >
            <span className="whitespace-nowrap px-2 text-sm font-semibold text-[#3d3743]" aria-live="polite">
              {selected.length} selected
            </span>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setSelected([])}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-[#b42318] text-white hover:bg-[#8f1c13] focus-visible:ring-[#b42318]"
              disabled={busy === "delete"}
              onClick={() => void remove(selected)}
            >
              {busy === "delete" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
              Delete
            </Button>
          </div>,
          document.body,
        )}
        <style jsx global>{`
          @keyframes script-toolbar-enter {
            from {
              opacity: 0;
              transform: translate(-50%, 18px) scale(0.94);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0) scale(1);
            }
          }
          .script-selection-toolbar {
            transform: translateX(-50%);
            animation: script-toolbar-enter 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
            will-change: transform, opacity;
          }
          @media (prefers-reduced-motion: reduce) {
            .script-selection-toolbar {
              animation: none;
            }
          }
        `}</style>
      </main>
    </PageContent>
  );
}
