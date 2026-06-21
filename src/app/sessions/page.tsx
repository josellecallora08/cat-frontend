"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { Mic, ArrowRight, Loader2 } from "lucide-react";

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

async function fetchMySessions(agentId?: string): Promise<SessionItem[]> {
  const params = new URLSearchParams({ page: "1", page_size: "50" });
  if (agentId) params.set("agent_id", agentId);
  const res = await fetch(`${API_BASE_URL}/api/dashboard/sessions?${params}`);
  if (!res.ok) return [];
  const data: PaginatedSessions = await res.json();
  return data.items;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type BadgeVariant = "default" | "success" | "warning" | "accent" | "destructive";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    pending: { variant: "warning", label: "Pending" },
    active: { variant: "accent", label: "Active" },
    completed: { variant: "success", label: "Completed" },
    error: { variant: "destructive", label: "Error" },
  };
  const { variant, label } = map[status] ?? {
    variant: "default" as BadgeVariant,
    label: status,
  };
  return <Badge variant={variant}>{label}</Badge>;
}

export default function SessionsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  // Agents see only their own sessions; admins see all
  const agentFilter = !isAdmin && user?.id ? user.id : undefined;

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["my-sessions", agentFilter],
    queryFn: () => fetchMySessions(agentFilter),
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium leading-tight text-foreground">
          Sessions
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {isAdmin ? "All training sessions." : "Your training session history."}
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      )}

      {!isLoading && (!sessions || sessions.length === 0) && (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Mic className="h-6 w-6 text-secondary-foreground" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-medium text-foreground">
            No sessions yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Pick a scenario to run your first training call.
          </p>
          <Link href="/scenarios" className="mt-4">
            <Button size="sm">Browse scenarios</Button>
          </Link>
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <Card className="py-0 transition-colors duration-100 hover:bg-muted">
                <CardContent className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {session.scenario_name}
                      </p>
                      <StatusBadge status={session.status} />
                      {session.overall_score !== null && (
                        <span className="text-xs font-medium text-foreground">
                          {session.overall_score}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.persona_name} · {formatDate(session.created_at)}
                      {isAdmin && ` · ${session.agent_name}`}
                    </p>
                  </div>
                  {session.status === "completed" && (
                    <Link href={`/sessions/${session.id}/results`} className="shrink-0">
                      <Button variant="outline" size="sm">
                        View results
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
