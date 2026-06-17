"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, ArrowRight } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface SessionItem {
  id: string;
  scenario_id: string;
  persona: { name: string; communication_style: string; emotional_state: string } | null;
  status: string;
  created_at: string;
  ended_at: string | null;
}

async function fetchAllSessions(): Promise<SessionItem[]> {
  const stored = localStorage.getItem("cat_sessions");
  if (!stored) return [];
  const sessionIds: string[] = JSON.parse(stored);
  const sessions: SessionItem[] = [];
  for (const id of sessionIds) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions/${id}`);
      if (res.ok) sessions.push(await res.json());
    } catch {
      /* skip failed */
    }
  }
  return sessions.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
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
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["all-sessions"],
    queryFn: fetchAllSessions,
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium leading-tight text-foreground">
          Sessions
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your training session history.
        </p>
      </header>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[72px] animate-pulse rounded-lg border border-border bg-muted"
            />
          ))}
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
          <Link href="/" className="mt-4">
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
                        {session.persona?.name ?? "Training session"}
                      </p>
                      <StatusBadge status={session.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(session.created_at)}
                      {session.persona &&
                        ` · ${session.persona.communication_style}`}
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
