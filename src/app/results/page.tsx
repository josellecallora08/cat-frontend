"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, ArrowRight } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface SessionItem {
  id: string;
  persona: { name: string; communication_style: string } | null;
  status: string;
  created_at: string;
}

async function fetchCompletedSessions(): Promise<SessionItem[]> {
  const stored = localStorage.getItem("cat_sessions");
  if (!stored) return [];
  const sessionIds: string[] = JSON.parse(stored);
  const sessions: SessionItem[] = [];
  for (const id of sessionIds) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions/${id}`);
      if (res.ok) {
        const session = await res.json();
        if (session.status === "completed") sessions.push(session);
      }
    } catch {
      /* skip */
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

export default function ResultsPage() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["completed-sessions"],
    queryFn: fetchCompletedSessions,
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-medium leading-tight text-foreground">
          Results
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Evaluations from your completed training sessions.
        </p>
      </header>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[68px] animate-pulse rounded-lg border border-border bg-muted"
            />
          ))}
        </div>
      )}

      {!isLoading && (!sessions || sessions.length === 0) && (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <BarChart3 className="h-6 w-6 text-secondary-foreground" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-medium text-foreground">
            No results yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Complete a training call to receive your evaluation and coaching.
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
              <Link
                href={`/sessions/${session.id}/results`}
                aria-label={`View results for ${session.persona?.name ?? "training session"}`}
                className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="py-0 transition-colors duration-100 group-hover:bg-muted">
                  <CardContent className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {session.persona?.name ?? "Training session"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(session.created_at)}
                        {session.persona &&
                          ` · ${session.persona.communication_style}`}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary">
                      View
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-100 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
