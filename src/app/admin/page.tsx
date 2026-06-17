"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface CategoryAverage {
  category: string;
  average_score: number;
}

interface RecentSession {
  id: string;
  scenario_name: string;
  persona_name: string;
  status: string;
  overall_score: number | null;
  created_at: string;
}

interface DashboardData {
  total_sessions: number;
  completed_sessions: number;
  active_sessions: number;
  total_scenarios: number;
  average_overall_score: number | null;
  category_averages: CategoryAverage[];
  recent_sessions: RecentSession[];
  total_conversations: number;
  improvement_trend: number | null;
}

interface AgentRanking {
  rank: number;
  agent_id: string;
  agent_name: string;
  sessions_completed: number;
  average_score: number;
  best_score: number;
  improvement: number | null;
}

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_BASE_URL}/api/dashboard`);
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

async function fetchLeaderboard(): Promise<AgentRanking[]> {
  const res = await fetch(`${API_BASE_URL}/api/dashboard/leaderboard`);
  if (!res.ok) return [];
  return res.json();
}

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function CategoryBar({ category, score }: { category: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{category}</span>
        <span className="font-medium">{score}%</span>
      </div>
      <div className="h-3 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${getColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 30000,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive font-medium">Failed to load dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Training platform overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Sessions" value={data.total_sessions} subtitle={`${data.completed_sessions} completed`} />
        <StatCard title="Average Score" value={data.average_overall_score ? `${data.average_overall_score}%` : "—"} subtitle={data.improvement_trend !== null ? `${data.improvement_trend > 0 ? "+" : ""}${data.improvement_trend} trend` : undefined} />
        <StatCard title="Scenarios" value={data.total_scenarios} subtitle="Active training scenarios" />
        <StatCard title="Conversations" value={data.total_conversations} subtitle="Total transcript entries" />
      </div>

      {/* Category Averages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.category_averages.length > 0 ? (
            data.category_averages.map((cat) => (
              <CategoryBar key={cat.category} category={cat.category} score={cat.average_score} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center">No evaluation data yet</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_sessions.length > 0 ? (
            <div className="space-y-2">
              {data.recent_sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{session.scenario_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.persona_name} • {formatDate(session.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.overall_score !== null ? (
                      <span className={`text-sm font-bold ${session.overall_score >= 70 ? "text-green-600" : session.overall_score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                        {session.overall_score}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{session.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">No sessions yet</p>
          )}
        </CardContent>
      </Card>

      {/* Agent Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🏆 Agent Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard && leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium w-12">#</th>
                    <th className="pb-2 font-medium">Agent</th>
                    <th className="pb-2 font-medium text-center">Sessions</th>
                    <th className="pb-2 font-medium text-center">Avg Score</th>
                    <th className="pb-2 font-medium text-center">Best</th>
                    <th className="pb-2 font-medium text-center">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((agent) => (
                    <tr key={agent.agent_id} className="border-b last:border-0">
                      <td className="py-2">
                        <span className={`text-sm font-bold ${agent.rank === 1 ? "text-yellow-500" : agent.rank === 2 ? "text-gray-400" : agent.rank === 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                          {agent.rank === 1 ? "🥇" : agent.rank === 2 ? "🥈" : agent.rank === 3 ? "🥉" : agent.rank}
                        </span>
                      </td>
                      <td className="py-2 font-medium">{agent.agent_name}</td>
                      <td className="py-2 text-center text-muted-foreground">{agent.sessions_completed}</td>
                      <td className="py-2 text-center">
                        <span className={`font-bold ${agent.average_score >= 70 ? "text-green-600" : agent.average_score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                          {agent.average_score}%
                        </span>
                      </td>
                      <td className="py-2 text-center text-muted-foreground">{agent.best_score}%</td>
                      <td className="py-2 text-center">
                        {agent.improvement !== null ? (
                          <span className={`text-xs font-medium ${agent.improvement > 0 ? "text-green-600" : agent.improvement < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                            {agent.improvement > 0 ? "↑" : agent.improvement < 0 ? "↓" : "→"} {Math.abs(agent.improvement)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">No ranked agents yet. Complete sessions to appear on the leaderboard.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
