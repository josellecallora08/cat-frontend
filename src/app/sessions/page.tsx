"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  // Fetch sessions from a simple listing endpoint
  // Since we don't have a list endpoint yet, we'll use localStorage to track session IDs
  const stored = localStorage.getItem("cat_sessions");
  if (!stored) return [];

  const sessionIds: string[] = JSON.parse(stored);
  const sessions: SessionItem[] = [];

  for (const id of sessionIds) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sessions/${id}`);
      if (res.ok) {
        sessions.push(await res.json());
      }
    } catch {
      // Skip failed fetches
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    active: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}

export default function SessionsPage() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["all-sessions"],
    queryFn: fetchAllSessions,
  });

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Sessions</h2>
      <p className="text-muted-foreground mt-2">
        Your training session history.
      </p>

      <div className="mt-6 space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && (!sessions || sessions.length === 0) && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                No sessions yet. Start by selecting a{" "}
                <Link href="/" className="text-primary underline">
                  training scenario
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        )}

        {sessions?.map((session) => (
          <Card key={session.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">
                      {session.persona?.name ?? "Training Session"}
                    </p>
                    <StatusBadge status={session.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(session.created_at)}
                    {session.persona && ` • ${session.persona.communication_style}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {session.status === "completed" && (
                    <Link href={`/sessions/${session.id}/results`}>
                      <Button variant="outline" size="sm">
                        View Results
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
