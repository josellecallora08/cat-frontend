const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// --- Types ---

export interface CategoryAverage {
  category: string;
  average_score: number;
}

export interface RecentSession {
  id: string;
  scenario_name: string;
  persona_name: string;
  status: string;
  overall_score: number | null;
  created_at: string;
}

export interface AgentRanking {
  rank: number;
  agent_id: string;
  agent_name: string;
  sessions_completed: number;
  average_score: number;
  best_score: number;
  improvement: number | null;
}

export interface ScoreDataPoint {
  session_number: number;
  overall_score: number;
  call_opening: number | null;
  compliance: number | null;
  empathy_communication: number | null;
  negotiation_resolution: number | null;
  date: string;
}

export interface DashboardResponse {
  total_sessions: number;
  completed_sessions: number;
  active_sessions: number;
  total_scenarios: number;
  average_overall_score: number | null;
  category_averages: CategoryAverage[];
  recent_sessions: RecentSession[];
  total_conversations: number;
  improvement_trend: number | null;
  campaign_name: string | null;
  campaign_id: string | null;
  leaderboard: AgentRanking[] | null;
}

// --- API Functions ---

/**
 * Fetch role-scoped dashboard data.
 * Backend handles scoping based on the authenticated user's role.
 */
export async function fetchDashboard(
  agentId?: string,
  token?: string
): Promise<DashboardResponse> {
  const params = agentId ? `?agent_id=${agentId}` : "";
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}/api/dashboard${params}`, {
    headers,
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

/**
 * Fetch role-scoped score history.
 * Returns empty array on failure to allow graceful degradation.
 */
export async function fetchScoreHistory(
  agentId?: string,
  token?: string
): Promise<ScoreDataPoint[]> {
  const params = agentId ? `?agent_id=${agentId}` : "";
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(
    `${API_BASE_URL}/api/dashboard/score-history${params}`,
    { headers }
  );
  if (!res.ok) return [];
  return res.json();
}

/**
 * Fetch role-scoped leaderboard rankings.
 * Available for admin (all agents) and trainer (campaign agents only).
 * Returns empty array on failure to allow graceful degradation.
 */
export async function fetchLeaderboard(
  token?: string
): Promise<AgentRanking[]> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}/api/dashboard/leaderboard`, {
    headers,
  });
  if (!res.ok) return [];
  return res.json();
}

// --- Helpers ---

/**
 * Check if a dashboard response represents a trainer with no campaign.
 * Used to render an appropriate empty state.
 */
export function isNoCampaignState(
  data: DashboardResponse,
  variant: "admin" | "trainer" | "agent"
): boolean {
  return variant === "trainer" && data.campaign_id === null;
}
