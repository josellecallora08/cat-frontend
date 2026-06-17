"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
        if (session.status === "completed") {
          sessions.push(session);
        }
      }
    } catch {
      // Skip
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
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Results</h2>
      <p className="text-muted-foreground mt-2">
        Evaluations from your completed training sessions.
      </p>

      <div className="mt-6 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && (!sessions || sessions.length === 0) && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                No results yet. Complete a{" "}
                <Link href="/" className="text-primary underline">
                  training session
                </Link>{" "}
                to receive your evaluation.
              </p>
            </CardContent>
          </Card>
        )}

        {sessions?.map((session) => (
          <Link key={session.id} href={`/sessions/${session.id}/results`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer mb-3">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {session.persona?.name ?? "Training Session"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(session.created_at)}
                      {session.persona && ` • ${session.persona.communication_style}`}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
