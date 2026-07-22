export const PASSING_THRESHOLD = 70;

export interface ScoreDataPoint {
  session_number: number;
  overall_score: number;
  date: string;
  agent_id: string;
}

export interface CategoryAverage {
  category: string;
  average_score: number;
}

export interface AgentSummary {
  agent_id: string;
  agent_name: string;
  sessions_completed: number;
  average_score: number | null;
  best_score: number | null;
  improvement_trend: number | null;
}

export interface CampaignDashboardResponse {
  total_agents: number;
  average_score: number | null;
  agents_passed: number;
  agents_needing_improvement: number;
  agent_summaries: AgentSummary[];
  score_history: ScoreDataPoint[];
  category_averages: CategoryAverage[];
}

export interface AgentSessionItem {
  session_id: string;
  scenario_name: string;
  date: string;
  overall_score: number | null;
  status: string;
}

export interface ScenarioAverage {
  scenario_id: string;
  scenario_name: string;
  sessions_count: number;
  average_score: number;
}

export interface AgentProgressResponse {
  agent_id: string;
  agent_name: string;
  average_score: number | null;
  sessions_completed: number;
  improvement_trend: number | null;
  score_history: ScoreDataPoint[];
  session_history: AgentSessionItem[];
  scenario_performance: ScenarioAverage[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function fetchCampaignDashboard(
  campaignId: string,
  token: string
): Promise<CampaignDashboardResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/campaigns/${campaignId}/dashboard`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch campaign dashboard: ${response.status}`);
  }

  return response.json();
}

export async function fetchAgentProgress(
  campaignId: string,
  agentId: string,
  token: string
): Promise<AgentProgressResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/campaigns/${campaignId}/agents/${agentId}/progress`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch agent progress: ${response.status}`);
  }

  return response.json();
}
