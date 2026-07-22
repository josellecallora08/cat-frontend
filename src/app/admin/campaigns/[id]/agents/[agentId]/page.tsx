"use client";

import { ArrowLeft, BookOpen, Target, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { use } from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { PageContent } from "@/components/page-content";
import { PageEmpty } from "@/components/page-empty";
import { PageError } from "@/components/page-error";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAgentProgress } from "@/hooks/use-campaign-dashboard";

interface AgentProgressPageProps {
  params: Promise<{ id: string; agentId: string }>;
}

export default function AgentProgressPage({ params }: AgentProgressPageProps) {
  const { id, agentId } = use(params);
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useAgentProgress(id, agentId);

  if (isLoading) {
    return (
      <PageContent>
        <PageSkeleton variant="detail" />
      </PageContent>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    const isNotFound = message.includes("404");

    if (isNotFound) {
      return (
        <PageContent>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/campaigns/${id}`)}
            aria-label="Go back to campaign"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Campaign
          </Button>
          <PageEmpty
            title="Agent not found"
            description="This agent is not assigned to this campaign or does not exist."
          />
        </PageContent>
      );
    }

    return (
      <PageContent>
        <PageError
          title="Failed to load agent progress"
          message={message}
          onRetry={() => refetch()}
        />
      </PageContent>
    );
  }

  if (!data) {
    return (
      <PageContent>
        <PageError title="Failed to load agent progress" onRetry={() => refetch()} />
      </PageContent>
    );
  }

  const hasNoSessions = data.sessions_completed === 0;

  return (
    <PageContent>
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/admin/campaigns/${id}`)}
        aria-label="Go back to campaign"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Campaign
      </Button>

      {/* Page header */}
      <PageHeader title={data.agent_name} />

      {/* KPI cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Target className="h-5 w-5 text-secondary-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Average Score</p>
              <p className="mt-0.5 text-2xl font-semibold leading-tight text-foreground">
                {data.average_score !== null ? `${data.average_score.toFixed(1)}%` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <BookOpen className="h-5 w-5 text-secondary-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Sessions Completed</p>
              <p className="mt-0.5 text-2xl font-semibold leading-tight text-foreground">
                {data.sessions_completed}
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
              <p className="text-xs font-medium text-muted-foreground">Improvement Trend</p>
              <p className="mt-0.5 text-2xl font-semibold leading-tight text-foreground">
                {data.improvement_trend !== null
                  ? `${data.improvement_trend > 0 ? "+" : ""}${data.improvement_trend.toFixed(1)}`
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {hasNoSessions ? (
        <PageEmpty
          title="No sessions yet"
          description="This agent has not completed any training sessions in this campaign."
        />
      ) : (
        <>
          {/* Score progression chart */}
          {data.score_history.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium text-foreground">Score Progression</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.score_history}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="session_number"
                          label={{ value: "Session", position: "insideBottom", offset: -5 }}
                        />
                        <YAxis domain={[0, 100]} label={{ value: "Score", angle: -90, position: "insideLeft" }} />
                        <Tooltip
                          formatter={(value: number) => [`${value.toFixed(1)}%`, "Score"]}
                          labelFormatter={(label: number) => `Session ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="overall_score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Scenario performance */}
          {data.scenario_performance.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium text-foreground">Scenario Performance</h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {data.scenario_performance.map((scenario) => (
                  <Card key={scenario.scenario_id}>
                    <CardContent className="pt-6">
                      <p className="text-sm font-medium text-foreground">{scenario.scenario_name}</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">
                        {scenario.average_score.toFixed(1)}%
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {scenario.sessions_count} {scenario.sessions_count === 1 ? "session" : "sessions"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Session history table */}
          {data.session_history.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-medium text-foreground">Session History</h2>
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Scenario
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Score
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.session_history.map((session) => (
                        <tr key={session.session_id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 text-foreground">{session.scenario_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(session.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {session.overall_score !== null ? `${session.overall_score.toFixed(1)}%` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={session.status === "completed" ? "success" : "warning"}
                            >
                              {session.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </PageContent>
  );
}
