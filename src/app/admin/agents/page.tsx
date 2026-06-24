"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Target,
  CheckCircle2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Download,
  Filter,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface SessionItem {
  id: string;
  scenario_name: string;
  persona_name: string;
  agent_name: string;
  agent_email: string;
  status: string;
  overall_score: number | null;
  created_at: string;
}

interface PaginatedSessions {
  items: SessionItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface AgentOption {
  id: string;
  full_name: string;
  email: string;
}

// All exportable fields
const EXPORT_FIELDS = [
  { key: "agent_name", label: "Agent Name" },
  { key: "agent_email", label: "Agent Email" },
  { key: "scenario_name", label: "Scenario" },
  { key: "persona_name", label: "Debtor Persona" },
  { key: "status", label: "Status" },
  { key: "overall_score", label: "Score" },
  { key: "created_at", label: "Date" },
] as const;

type ExportFieldKey = (typeof EXPORT_FIELDS)[number]["key"];

async function fetchSessions(
  page: number,
  pageSize: number,
  agentId?: string,
  status?: string
): Promise<PaginatedSessions> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (agentId) params.set("agent_id", agentId);
  if (status) params.set("status", status);
  const res = await fetch(`${API_BASE_URL}/api/dashboard/sessions?${params}`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

async function fetchAllSessionsForExport(
  agentId?: string,
  status?: string
): Promise<SessionItem[]> {
  const params = new URLSearchParams({ page: "1", page_size: "1000" });
  if (agentId) params.set("agent_id", agentId);
  if (status) params.set("status", status);
  const res = await fetch(`${API_BASE_URL}/api/dashboard/sessions?${params}`);
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  return data.items;
}

async function fetchAgents(): Promise<AgentOption[]> {
  const res = await fetch(`${API_BASE_URL}/api/dashboard/agents`);
  if (!res.ok) return [];
  return res.json();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-PH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function downloadCsv(data: SessionItem[], fields: ExportFieldKey[]) {
  const header = fields
    .map((key) => EXPORT_FIELDS.find((f) => f.key === key)!.label)
    .join(",");

  const rows = data.map((row) =>
    fields
      .map((key) => {
        let val = row[key as keyof SessionItem];
        if (key === "created_at" && val) val = formatDate(val as string);
        if (val === null || val === undefined) val = "";
        // Escape commas and quotes in CSV
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `agent-sessions-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminAgentsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Filters
  const [filterAgent, setFilterAgent] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Export dialog
  const [showExport, setShowExport] = useState(false);
  const [exportFields, setExportFields] = useState<Set<ExportFieldKey>>(
    new Set(EXPORT_FIELDS.map((f) => f.key))
  );
  const [isExporting, setIsExporting] = useState(false);

  const { data: agents } = useQuery({
    queryKey: ["agents-list"],
    queryFn: fetchAgents,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-sessions", page, pageSize, filterAgent, filterStatus],
    queryFn: () => fetchSessions(page, pageSize, filterAgent || undefined, filterStatus || undefined),
  });

  const sessions = data?.items ?? [];
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const scoredSessions = completedSessions.filter((s) => s.overall_score !== null);
  const avgScore =
    scoredSessions.length > 0
      ? scoredSessions.reduce((acc, s) => acc + (s.overall_score ?? 0), 0) / scoredSessions.length
      : null;

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const allData = await fetchAllSessionsForExport(
        filterAgent || undefined,
        filterStatus || undefined
      );
      downloadCsv(allData, Array.from(exportFields));
    } catch {
      // silent fail
    } finally {
      setIsExporting(false);
      setShowExport(false);
    }
  }, [filterAgent, filterStatus, exportFields]);

  const toggleExportField = (key: ExportFieldKey) => {
    setExportFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key); // at least 1 field required
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium leading-tight text-foreground">
            Agent Performance
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Review training sessions, filter by agent, and export data.
          </p>
        </div>
        <Button size="lg" onClick={() => setShowExport(true)}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Export
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Agent:</label>
          <Select
            ariaLabel="Filter by agent"
            size="sm"
            className="w-44"
            value={filterAgent}
            onChange={(v) => {
              setFilterAgent(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "All agents" },
              ...(agents?.map((a) => ({ value: a.id, label: a.full_name })) ?? []),
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Status:</label>
          <Select
            ariaLabel="Filter by status"
            size="sm"
            className="w-40"
            value={filterStatus}
            onChange={(v) => {
              setFilterStatus(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "All statuses" },
              { value: "completed", label: "Completed" },
              { value: "pending", label: "Pending" },
              { value: "active", label: "Active" },
            ]}
          />
        </div>
        {(filterAgent || filterStatus) && (
          <button
            onClick={() => {
              setFilterAgent("");
              setFilterStatus("");
              setPage(1);
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Target className="h-5 w-5 text-secondary-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Sessions</p>
              <p className="mt-0.5 text-2xl font-semibold leading-tight text-foreground">
                {data?.total ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <CheckCircle2 className="h-5 w-5 text-secondary-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Completed (this page)</p>
              <p className="mt-0.5 text-2xl font-semibold leading-tight text-foreground">
                {completedSessions.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <TrendingUp className="h-5 w-5 text-secondary-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Avg Score (this page)</p>
              <p className="mt-0.5 text-2xl font-semibold leading-tight text-foreground">
                {avgScore ? `${avgScore.toFixed(1)}%` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <h2 className="text-lg font-medium leading-tight text-foreground">
            All Sessions
          </h2>
          {data && (
            <p className="text-xs text-muted-foreground">
              {data.total} total · Page {data.page} of {data.total_pages}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : isError ? (
            <div role="alert" className="flex flex-col items-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">Failed to load sessions</p>
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sessions match the current filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground">Agent</th>
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground">Scenario</th>
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground">Debtor</th>
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 text-xs font-medium text-muted-foreground text-right">Score</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                            {s.agent_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {s.agent_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {s.agent_email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm text-foreground">{s.scenario_name}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm text-muted-foreground">{s.persona_name}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(s.created_at)}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={s.status === "completed" ? "success" : "default"}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        {s.overall_score !== null ? (
                          <span className="text-sm font-medium text-foreground">
                            {s.overall_score}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pl-2 text-right">
                        {s.status === "completed" && (
                          <Link href={`/sessions/${s.id}/results`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Showing {(data.page - 1) * data.page_size + 1}–
                {Math.min(data.page * data.page_size, data.total)} of {data.total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                {Array.from({ length: Math.min(data.total_pages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (data.total_pages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= data.total_pages - 2) {
                    pageNum = data.total_pages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        pageNum === page
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                  disabled={page >= data.total_pages}
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export session data</DialogTitle>
            <DialogDescription>
              Choose which fields to include in the CSV export.
              {filterAgent || filterStatus
                ? " Current filters will be applied."
                : " All sessions will be exported."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Select fields:</p>
            <div className="grid grid-cols-2 gap-2">
              {EXPORT_FIELDS.map((field) => {
                const checked = exportFields.has(field.key);
                return (
                  <label
                    key={field.key}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      checked
                        ? "border-primary/40 bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleExportField(field.key)}
                      className="rounded border-border"
                    />
                    {field.label}
                  </label>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm">Cancel</Button>} />
            <Button size="sm" onClick={handleExport} disabled={isExporting || exportFields.size === 0}>
              {isExporting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Exporting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download CSV
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
