"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, RefreshCw, ShieldCheck, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { convertUploadToScript, uploadTrainingDocument, type UploadFailure, type UploadResult } from "@/lib/api/uploads";
import { fetchScenarios, type ScenarioListItem } from "@/lib/api/scenarios";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const ACCEPTED = [".pdf", ".docx", ".txt", ".csv", ".md"];
type State = "idle" | "uploading" | "processing" | "success" | "error";

function readableSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface ScriptUploadPanelProps {
  scenarioId?: string;
  scenarioName?: string;
  onScriptCreated?: (scriptId: string) => void;
}

export function ScriptUploadPanel({
  scenarioId: fixedScenarioId,
  scenarioName,
  onScriptCreated,
}: ScriptUploadPanelProps = {}) {
  const token = useAuthStore((s) => s.token);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<State>("idle");
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [failure, setFailure] = useState<UploadFailure | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioListItem[]>([]);
  const [scenarioId, setScenarioId] = useState(fixedScenarioId ?? "");

  useEffect(() => {
    if (!token || fixedScenarioId) return;
    void fetchScenarios(token).then(setScenarios).catch(() => {
      setFailure({ message: "Could not load scenarios. Refresh the page and try again." });
    });
  }, [fixedScenarioId, token]);

  function chooseFile(next: File | undefined) {
    if (!next) return;
    const extension = `.${next.name.split(".").pop()?.toLowerCase()}`;
    if (!ACCEPTED.includes(extension)) {
      setFile(next);
      setState("error");
      setFailure({ reasonCode: "extension_not_allowed", message: `Unsupported file type. Choose ${ACCEPTED.join(", ")}.` });
      return;
    }
    setFile(next);
    setState("idle");
    setProgress(0);
    setFailure(null);
    setResult(null);
  }

  async function startUpload() {
    if (!file || !token) {
      setFailure({ message: token ? "Choose a document first." : "Your session has expired. Sign in again." });
      setState("error");
      return;
    }
    setState("uploading");
    setProgress(0);
    setFailure(null);
    if (!scenarioId) {
      setFailure({ message: "Choose a scenario before uploading." });
      setState("error");
      return;
    }
    const operation = uploadTrainingDocument(file, token, (value) => {
      setProgress(value);
      if (value === 100) setState("processing");
    }, scenarioId);
    abortRef.current = operation.abort;
    try {
      const uploaded = await operation.promise;
      setResult(uploaded);
      setState("processing");
      const converted = await convertUploadToScript(uploaded.id, token);
      setResult({ ...uploaded, script_id: converted.script_id, scenario_id: converted.scenario_id });
      setState("success");
      onScriptCreated?.(converted.script_id);
    } catch (error) {
      setFailure(error as UploadFailure);
      setState("error");
    } finally {
      abortRef.current = null;
    }
  }

  async function retryConversion() {
    if (!result || !token) return;
    setState("processing");
    setFailure(null);
    try {
      const converted = await convertUploadToScript(result.id, token);
      setResult({ ...result, script_id: converted.script_id, scenario_id: converted.scenario_id });
      setState("success");
      onScriptCreated?.(converted.script_id);
    } catch (error) {
      setFailure(error as UploadFailure);
      setState("error");
    }
  }

  function reset() {
    abortRef.current?.();
    setFile(null);
    setState("idle");
    setProgress(0);
    setFailure(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const busy = state === "uploading" || state === "processing";
  const announcement =
    state === "uploading" ? `Uploading ${file?.name ?? "document"}, ${progress} percent.`
    : state === "processing" ? "Upload complete. Security scanning and extracting content."
    : state === "success" ? `${file?.name} uploaded and processed successfully.`
    : state === "error" ? `Upload failed. ${failure?.message ?? ""}` : "";

  return (
    <section aria-labelledby="upload-heading" className="mx-auto w-full max-w-5xl">
      <div className="mb-6">
        <p className="mb-2 text-sm font-semibold text-[#5f3ca1]">Script library</p>
        <h1 id="upload-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">Upload training document</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#595260] sm:text-base">
          Add a source document for secure scanning, text extraction, and script processing.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-3xl border border-[#d9d3e3] bg-white p-4 shadow-sm sm:p-6">
          {fixedScenarioId ? (
            <div className="mb-4 rounded-xl border border-[#d9d3e3] bg-[#f7f5fc] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#655e6d]">Assigned scenario</p>
              <p className="mt-1 text-sm font-bold text-[#2b2339]">{scenarioName ?? "Current scenario"}</p>
            </div>
          ) : (
            <>
              <label htmlFor="upload-scenario" className="mb-2 block text-sm font-bold">Scenario</label>
              <select
                id="upload-scenario"
                value={scenarioId}
                disabled={busy}
                onChange={(event) => setScenarioId(event.target.value)}
                className="mb-4 h-11 w-full rounded-xl border border-[#b8adc8] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d47c7]"
              >
                <option value="">Choose the scenario this script will train</option>
                {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
              </select>
            </>
          )}
          <input
            ref={inputRef}
            id="training-document"
            type="file"
            className="sr-only"
            accept={ACCEPTED.join(",")}
            disabled={busy}
            onChange={(event) => chooseFile(event.target.files?.[0])}
          />
          <div
            role="button"
            tabIndex={busy ? -1 : 0}
            aria-disabled={busy}
            aria-describedby="upload-help"
            onClick={() => !busy && inputRef.current?.click()}
            onKeyDown={(event) => {
              if (!busy && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragEnter={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (!busy) chooseFile(event.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#8e69e0]/35",
              dragging ? "border-[#6f48bf] bg-[#f3f1fc]" : "border-[#b8adc8] bg-[#fbfaff] hover:border-[#8e69e0]",
              busy && "cursor-not-allowed opacity-70",
            )}
          >
            <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-[#ede8fb] text-[#5f3ca1]" aria-hidden="true">
              <UploadCloud className="size-7" />
            </span>
            <span className="text-base font-bold">Drag and drop your document here</span>
            <span className="mt-1 text-sm text-[#595260]">or press Enter to browse files</span>
            <span id="upload-help" className="mt-4 text-xs font-medium text-[#655e6d]">
              PDF, DOCX, TXT, CSV, or MD
            </span>
          </div>

          {file && (
            <div className="mt-4 rounded-2xl border border-[#d9d3e3] bg-[#faf9fc] p-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="size-5 shrink-0 text-[#5f3ca1]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{file.name}</p>
                  <p className="text-xs text-[#655e6d]">{readableSize(file.size)}</p>
                </div>
                {!busy && state !== "success" && (
                  <Button variant="ghost" size="icon" onClick={reset} aria-label={`Remove ${file.name}`}>
                    <X aria-hidden="true" />
                  </Button>
                )}
              </div>

              {busy && (
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-xs font-semibold">
                    <span>{state === "uploading" ? "Uploading" : "Scanning and processing"}</span>
                    <span>{state === "uploading" ? `${progress}%` : "Please wait"}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#ded8e8]" role="progressbar"
                    aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100}
                    aria-valuenow={state === "uploading" ? progress : undefined}>
                    <div className={cn("h-full rounded-full bg-[#6f48bf] transition-[width]", state === "processing" && "animate-pulse")}
                      style={{ width: state === "processing" ? "100%" : `${progress}%` }} />
                  </div>
                </div>
              )}

              {state === "success" && result && (
                <div className="mt-4 flex gap-2 rounded-xl bg-[#e6f6ec] p-3 text-sm text-[#155f35]">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div><p><strong>Script draft created.</strong> Security scan, extraction, and conversion completed.</p><Link href="/admin/scripts" className="mt-1 inline-block font-bold underline">Review it in Scripts</Link></div>
                </div>
              )}

              {state === "error" && failure && (
                <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-[#d59aa3] bg-[#fff1f3] p-3 text-sm text-[#8f2032]">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-bold">Upload rejected</p>
                    <p>{failure.message}</p>
                    {failure.retryAfterSeconds && <p className="mt-1">Try again in {failure.retryAfterSeconds} seconds.</p>}
                    {failure.reasonCode && <p className="mt-1 text-xs">Security code: {failure.reasonCode}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {state === "error" && file && (
              <Button variant="outline" size="lg" onClick={() => void (result ? retryConversion() : startUpload())}>
                <RefreshCw aria-hidden="true" /> {result ? "Retry conversion" : "Retry upload"}
              </Button>
            )}
            {state === "success" ? (
              <Button size="lg" onClick={reset}>Upload another document</Button>
            ) : (
              <Button size="lg" disabled={!file || !scenarioId || busy || state === "error"} onClick={startUpload}>
                {busy ? "Processing…" : "Upload securely"}
              </Button>
            )}
          </div>
        </div>

        <aside aria-labelledby="security-heading" className="h-fit rounded-3xl border border-[#d9d3e3] bg-[#f7f5fc] p-5">
          <ShieldCheck className="mb-3 size-6 text-[#5f3ca1]" aria-hidden="true" />
          <h2 id="security-heading" className="font-bold">Security checks</h2>
          <ul className="mt-3 space-y-3 text-sm text-[#514959]">
            <li>File type and content signature verification</li>
            <li>Malware and unsafe archive scanning</li>
            <li>Encrypted PDF and active-content rejection</li>
            <li>Secure quarantine during processing</li>
          </ul>
        </aside>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    </section>
  );
}
