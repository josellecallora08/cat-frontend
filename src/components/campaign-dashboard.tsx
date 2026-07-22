"use client";

import { useRouter } from "next/navigation";
import {
  Award,
  AlertTriangle,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageError } from "@/components/page-error";
import { useCampaignDashboard } from "@/hooks/use-campaign-dashboard";
import { PASSING_THRESHOLD } from "@/lib/api/campaign-dashboard";

interface CampaignDashboardProps {
  campaignId: string;
}

export function CampaignDashboard({ campaignId }: CampaignDashboardProps) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useCampaignDashboard(campaignId);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return <PageError onRetry={() => void refetch()} />;
  }

  if (!data) {
    return null;
  }

  const isEmpty =
    data.score_history.length === 0 &&
    data.agent_summaries.every((a) => a.sessions_completed === 0);

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No training sessions have been completed yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          label="Total Agents"
          value={String(data.total_agents)}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          label="Average Score"
          value={
            data.average_score != null
              ? data.average_score.toFixed(1)
              : "—"
          }
        />
        <KpiCard
          icon={<Award className="h-4 w-4" aria-hidden="true" />}
          label="Agents Passed"
          value={String(data.agents_passed)}
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          label="Agents Needing Improvement"
          value={String(data.agents_needing_improvement)}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Score Trend Chart */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Score Trend
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.score_history}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="session_number" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="overall_score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Averages Chart */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              Category Performance
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.category_averages}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="category" className="text-xs" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Bar
                  dataKey="average_score"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance Table */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Agent Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Sessions</th>
                  <th className="pb-2 font-medium">Avg Score</th>
                  <th className="pb-2 font-medium">Trend</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.agent_summaries.map((agent) => (
                  <tr
                    key={agent.agent_id}
                    onClick={() =>
                      router.push(
                        `/admin/campaigns/${campaignId}/agents/${agent.agent_id}`
                      )
                    }
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3">{agent.agent_name}</td>
                    <td className="py-3">{agent.sessions_completed}</td>
                    <td className="py-3">
                      {agent.average_score != null
                        ? agent.average_score.toFixed(1)
                        : "—"}
                    </td>
                    <td className="py-3">
                      {agent.improvement_trend != null
                        ? agent.improvement_trend > 0
                          ? `+${agent.improvement_trend.toFixed(1)}`
                          : agent.improvement_trend.toFixed(1)
                        : "—"}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={
                          agent.average_score != null &&
                          agent.average_score >= PASSING_THRESHOLD
                            ? "success"
                            : "warning"
                        }
                      >
                        {agent.average_score != null &&
                        agent.average_score >= PASSING_THRESHOLD
                          ? "Passed"
                          : "Needs Improvement"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* KPI card helper component */
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function KpiCard({ icon, label, value }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

/* Loading skeleton for the dashboard */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Skeleton KPI Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Skeleton Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-4 w-32 bg-muted animate-pulse rounded mb-4" />
              <div className="h-[250px] w-full bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
