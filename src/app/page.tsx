"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { useQuery } from "@tanstack/react-query";
import {
    AlertCircle,
    LayoutGrid,
    Medal,
    MessageSquare,
    Phone,
    Target,
    TrendingUp,
    Trophy,
} from "lucide-react";
import Link from "next/link";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// --- Types ---

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

interface ScoreDataPoint {
  session_number: number;
  overall_score: number;
  call_opening: number | null;
  compliance: number | null;
  empathy_communication: number | null;
  negotiation_resolution: number | null;
  date: string;
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

// --- API ---

async function fetchDashboard(agentId?: string): Promise<DashboardData> {
  const params = agentId ? `?agent_id=${agentId}` : "";
  const res = await fetch(`${API_BASE_URL}/api/dashboard${params}`);
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

async function fetchScoreHistory(agentId?: string): Promise<ScoreDataPoint[]> {
  const params = agentId ? `?agent_id=${agentId}` : "";
  const res = await fetch(`${API_BASE_URL}/api/dashboard/score-history${params}`);
  if (!res.ok) return [];
  return res.json();
}

async function fetchLeaderboard(): Promise<AgentRanking[]> {
  const res = await fetch(`${API_BASE_URL}/api/dashboard/leaderboard`);
  if (!res.ok) return [];
  return res.json();
}

// --- Components ---

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof TrendingUp;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Icon className="h-4 w-4 text-secondary-foreground" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-xl font-semibold leading-tight text-foreground">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-PH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const CHART_COLORS = {
  primary: "#8e69e0",
  compliance: "#b33bc4",
  empathy: "#6278d1",
  negotiation: "#e9a3f3",
  callOpening: "#472481",
};

const RANK_COLORS = ["#8e69e0", "#b33bc4", "#6278d1", "#e9a3f3", "#472481", "#7b8285"];

function getRankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

// --- Page ---

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";
  // Agents only see their own data; admins see everything
  const agentFilter = !isAdmin && user?.id ? user.id : undefined;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", agentFilter],
    queryFn: () => fetchDashboard(agentFilter),
    refetchInterval: 30000,
  });

  const { data: scoreHistory } = useQuery({
    queryKey: ["score-history", agentFilter],
    queryFn: () => fetchScoreHistory(agentFilter),
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    enabled: isAdmin,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-medium leading-tight text-foreground">Dashboard</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">Loading...</p>
        </header>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-border bg-muted" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-medium leading-tight text-foreground">Dashboard</h1>
        </header>
        <div role="alert" className="flex flex-col items-center rounded-lg border border-border bg-card px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-medium text-foreground">
            Couldn&apos;t load dashboard
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Make sure the backend is running and try again.
          </p>
        </div>
      </div>
    );
  }

  // Radar chart data
  const radarData = data.category_averages.map((cat) => ({
    category: cat.category.replace("&", "\n&"),
    score: cat.average_score,
    fullMark: 100,
  }));

  // Leaderboard bar chart data (top 8)
  const leaderboardChartData = (leaderboard ?? []).slice(0, 8).map((agent) => ({
    name: agent.agent_name.split(" ")[0],
    score: agent.average_score,
    best: agent.best_score,
    sessions: agent.sessions_completed,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium leading-tight text-foreground">
            {user ? `Welcome, ${user.email.split("@")[0]}` : "Dashboard"}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isAdmin
              ? "Training platform overview and performance metrics."
              : "Your personal training progress and performance."}
          </p>
        </div>
        <Link href="/scenarios">
          <Button size="lg">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Start Training
          </Button>
        </Link>
      </header>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sessions"
          value={data.total_sessions}
          subtitle={`${data.completed_sessions} completed`}
          icon={Target}
        />
        <StatCard
          title="Average Score"
          value={data.average_overall_score ? `${data.average_overall_score}%` : "—"}
          subtitle={
            data.improvement_trend !== null
              ? `${data.improvement_trend > 0 ? "+" : ""}${data.improvement_trend} trend`
              : undefined
          }
          icon={TrendingUp}
        />
        <StatCard
          title="Scenarios"
          value={data.total_scenarios}
          subtitle="Active training scenarios"
          icon={LayoutGrid}
        />
        <StatCard
          title="Conversations"
          value={data.total_conversations}
          subtitle="Total transcript entries"
          icon={MessageSquare}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Score Progression Chart */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium leading-tight text-foreground">
              Score Progression
            </h2>
            <p className="text-sm text-muted-foreground">
              Overall score trend across sessions
            </p>
          </CardHeader>
          <CardContent>
            {scoreHistory && scoreHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={scoreHistory} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="session_number"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    label={{ value: "Session", position: "insideBottom", offset: -5, fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                      fontSize: "0.8rem",
                    }}
                    labelFormatter={(v) => `Session ${v}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="overall_score"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    fill="url(#gradPrimary)"
                    name="Overall"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Complete 2+ sessions to see score progression.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competency Radar Chart */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium leading-tight text-foreground">
              Competency Radar
            </h2>
            <p className="text-sm text-muted-foreground">
              Average scores by evaluation category
            </p>
          </CardHeader>
          <CardContent>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke={CHART_COLORS.primary}
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                      fontSize: "0.8rem",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No evaluation data yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Ranking Bar Chart — admin only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-medium leading-tight text-foreground">
                Agent Rankings
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Top agents by average evaluation score
            </p>
          </CardHeader>
          <CardContent>
            {leaderboardChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={leaderboardChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                      fontSize: "0.8rem",
                    }}
                    formatter={(value: number, name: string) => [
                      `${value}%`,
                      name === "score" ? "Average" : "Best",
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "0.75rem" }}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (value === "score" ? "Average Score" : "Best Score")}
                  />
                  <Bar dataKey="score" name="score" radius={[4, 4, 0, 0]}>
                    {leaderboardChartData.map((_, index) => (
                      <Cell key={index} fill={RANK_COLORS[index % RANK_COLORS.length]} />
                    ))}
                  </Bar>
                  <Bar dataKey="best" name="best" fill={CHART_COLORS.empathy} radius={[4, 4, 0, 0]} fillOpacity={0.4} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No ranked agents yet. Complete sessions to see rankings.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Agent Leaderboard Table — admin only */}
      {isAdmin && leaderboard && leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-medium leading-tight text-foreground">
                Leaderboard
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground w-12">Rank</th>
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground">Agent</th>
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground text-center">Sessions</th>
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground text-center">Avg Score</th>
                    <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground text-center">Best</th>
                    <th className="pb-3 text-xs font-medium text-muted-foreground text-center">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaderboard.map((agent) => (
                    <tr key={agent.agent_id}>
                      <td className="py-3 pr-4">
                        <span className="text-base">{getRankBadge(agent.rank)}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                            {agent.agent_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {agent.agent_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-center text-sm text-muted-foreground">
                        {agent.sessions_completed}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <span className="text-sm font-medium text-foreground">
                          {agent.average_score}%
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-center text-sm text-muted-foreground">
                        {agent.best_score}%
                      </td>
                      <td className="py-3 text-center">
                        {agent.improvement !== null ? (
                          <span
                            className={`text-xs font-medium ${
                              agent.improvement > 0
                                ? "text-success-foreground"
                                : agent.improvement < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            {agent.improvement > 0 ? "↑" : agent.improvement < 0 ? "↓" : "→"}{" "}
                            {Math.abs(agent.improvement)}
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
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium leading-tight text-foreground">
            Recent Sessions
          </h2>
        </CardHeader>
        <CardContent>
          {data.recent_sessions.length > 0 ? (
            <dl className="divide-y divide-border">
              {data.recent_sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between py-3">
                  <div>
                    <dt className="text-sm font-medium text-foreground">
                      {session.scenario_name}
                    </dt>
                    <dd className="mt-0.5 text-xs text-muted-foreground">
                      {session.persona_name} · {formatDate(session.created_at)}
                    </dd>
                  </div>
                  <dd>
                    {session.overall_score !== null ? (
                      <span className="text-sm font-medium text-foreground">
                        {session.overall_score}%
                      </span>
                    ) : (
                      <span className="text-xs capitalize text-muted-foreground">
                        {session.status}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No sessions yet. Start a training call to see your history.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
