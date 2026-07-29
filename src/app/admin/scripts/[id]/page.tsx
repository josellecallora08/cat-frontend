"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContent } from "@/components/page-content";
import { fetchScript, updateScript } from "@/lib/api/scripts";
import { useAuthStore } from "@/stores/auth-store";

export default function ScriptReviewPage() {
  const params = useParams<{ id: string }>();
  const scriptId = params.id;
  const token = useAuthStore((state) => state.token);
  const [name, setName] = useState("");
  const [format, setFormat] = useState<"json" | "yaml">("json");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token || !scriptId) return;
    void fetchScript(scriptId, token).then((script) => {
      setName(script.name);
      setFormat(script.format === "yaml" ? "yaml" : "json");
      setContent(JSON.stringify(script.draft_content ?? {}, null, 2));
    }).catch((err) => setError(err instanceof Error ? err.message : "Could not load script."));
  }, [scriptId, token]);

  async function save() {
    if (!token || !scriptId) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const parsed = format === "json" ? JSON.parse(content) : content;
      await updateScript(scriptId, { raw_definition: typeof parsed === "string" ? parsed : JSON.stringify(parsed), format }, token);
      setMessage("Draft saved. Publish it from the Script Library when ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save draft.");
    } finally { setSaving(false); }
  }

  return <PageContent><main className="mx-auto w-full max-w-4xl" aria-labelledby="review-heading">
    <Link href="/admin/scripts" className="mb-6 inline-flex items-center gap-2 text-sm text-[#5f3ca1]"><ArrowLeft size={16} /> Back to Scripts</Link>
    <h1 id="review-heading" className="text-2xl font-bold">{name || "Review script"}</h1>
    <p className="mt-2 text-sm text-[#595260]">Review the extracted ScriptContract, edit the draft, then publish it for new sessions.</p>
    {error && <div role="alert" className="mt-4 rounded-xl border border-[#d59aa3] bg-[#fff1f3] p-3 text-sm text-[#8f2032]">{error}</div>}
    {message && <div role="status" className="mt-4 rounded-xl border border-[#a7d9b8] bg-[#effaf2] p-3 text-sm text-[#155f35]">{message}</div>}
    <div className="mt-6 rounded-2xl border border-[#d9d3e3] bg-white p-5 shadow-sm">
      <label htmlFor="script-format" className="text-sm font-semibold">Format</label>
      <select id="script-format" value={format} onChange={(event) => setFormat(event.target.value as "json" | "yaml")} className="ml-3 rounded-md border px-2 py-1 text-sm">
        <option value="json">JSON</option><option value="yaml">YAML</option>
      </select>
      <label htmlFor="script-content" className="mt-4 block text-sm font-semibold">Sanitized ScriptContract draft</label>
      <textarea id="script-content" value={content} onChange={(event) => setContent(event.target.value)} className="mt-2 min-h-[420px] w-full rounded-xl border border-[#d9d3e3] p-4 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d47c7]" spellCheck={false} />
      <Button className="mt-4" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Save draft</Button>
    </div>
  </main></PageContent>;
}
