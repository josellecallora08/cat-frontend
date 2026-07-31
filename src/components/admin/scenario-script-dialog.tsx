"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileCode2, FileUp, Loader2, RefreshCw, Trash2, XCircle } from "lucide-react";

import { ScriptUploadPanel } from "@/components/admin/script-upload-panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  deleteScript,
  fetchScripts,
  publishScript,
  unpublishScript,
  type ScriptListItem,
} from "@/lib/api/scripts";
import { useAuthStore } from "@/stores/auth-store";

interface ScenarioScriptDialogProps {
  scenarioId: string;
  scenarioName: string;
}

export function ScenarioScriptDialog({
  scenarioId,
  scenarioName,
}: ScenarioScriptDialogProps) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [script, setScript] = useState<ScriptListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadScript = useCallback(async () => {
    if (!token || user?.role !== "admin") return;
    setLoading(true);
    try {
      const scripts = await fetchScripts(token);
      setScript(scripts.find((item) => item.scenario_id === scenarioId) ?? null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this scenario's script.");
    } finally {
      setLoading(false);
    }
  }, [scenarioId, token, user?.role]);

  useEffect(() => {
    // Fetching the administrator-only registry is an external synchronization boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadScript();
  }, [loadScript]);

  if (user?.role !== "admin") return null;

  async function changeStatus() {
    if (!token || !script) return;
    setBusy(true);
    try {
      if (script.status === "published") await unpublishScript(script.id, token);
      else await publishScript(script.id, token);
      await loadScript();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update script status.");
    } finally {
      setBusy(false);
    }
  }

  async function replaceScript() {
    if (!token || !script) return;
    if (!window.confirm("Replace this scenario's script? The current script will be removed from the active library.")) return;
    setBusy(true);
    try {
      await deleteScript(script.id, token);
      setScript(null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare a replacement upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger
        className="group/button mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : script ? <FileCode2 className="h-4 w-4" aria-hidden="true" /> : <FileUp className="h-4 w-4" aria-hidden="true" />}
        {script ? "Manage script" : "Upload script"}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-6 py-5 pr-12">
          <DialogTitle>{script ? "Manage scenario script" : "Upload scenario script"}</DialogTitle>
          <DialogDescription>
            {scenarioName}. Published versions control the AI debtor for new sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {error && (
            <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading script status…
            </div>
          ) : script ? (
            <div className="rounded-2xl border border-border bg-muted/20 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{script.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {script.format.toUpperCase()} · <span className="capitalize">{script.status}</span>
                  </p>
                </div>
                <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">
                  {script.status}
                </span>
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link href={`/admin/scripts/${script.id}`}>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <FileCode2 aria-hidden="true" /> Review / edit
                  </Button>
                </Link>
                <Button disabled={busy} onClick={() => void changeStatus()}>
                  {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : script.status === "published" ? <XCircle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                  {script.status === "published" ? "Unpublish" : "Publish"}
                </Button>
                <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={busy} onClick={() => void replaceScript()}>
                  <Trash2 aria-hidden="true" /> Replace script
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => void loadScript()}>
                  <RefreshCw aria-hidden="true" /> Refresh
                </Button>
              </div>
            </div>
          ) : (
            <ScriptUploadPanel
              scenarioId={scenarioId}
              scenarioName={scenarioName}
              onScriptCreated={() => void loadScript()}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
