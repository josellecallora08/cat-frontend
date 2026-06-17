"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface SessionItem {
  id: string;
  scenario_name: string;
  persona_name: string;
  status: string;
  overall_score: number | null;
  created_at: string;
}

async function fetchSessionList(): Promise<SessionItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/sessions/list`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" });
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  const color = score >= 70 ? "text-green-600 bg-green-50" : score >= 50 ? "text-yellow-600 bg-yellow-50" : "text-red-600 bg-red-50";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}%</span>;
}

export default function AdminAgentsPage() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: fetchSessionList,
  });

  const completedSessions = sessions?.filter((s) => s.status === "completed") ?? [];
  const avgScore = completedSessions.length > 0
    ? completedSessions.reduce((acc, s) => acc + (s.overall_score ?? 0), 0) / completedSessions.filter(s => s.overall_score).length
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Agent Performance</h2>
        <p className="text-muted-foreground">Review all training sessions and scores</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{sessions?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{completedSessions.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{avgScore ? `${avgScore.toFixed(1)}%` : "—"}</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Session History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Scenario</th>
                    <th className="pb-2 font-medium">Debtor</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Score</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{s.scenario_name}</td>
                      <td className="py-2 text-muted-foreground">{s.persona_name}</td>
                      <td className="py-2 text-muted-foreground">{formatDate(s.created_at)}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === "completed" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2 text-right"><ScoreBadge score={s.overall_score} /></td>
                      <td className="py-2 text-right">
                        {s.status === "completed" && (
                          <Link href={`/sessions/${s.id}/results`}>
                            <Button variant="ghost" size="sm">Details</Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">No sessions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
