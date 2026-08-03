/** Campaign summary and progress for an agent's campaign selection view. */
export interface AgentCampaignWithProgress {
  id: string;
  name: string;
  description: string | null;
  total_scenarios: number;
  accomplished_scenarios: number;
  is_completed: boolean;
}

/** Progress state for an individual scenario within a campaign. */
export interface ScenarioProgressItem {
  scenario_id: string;
  scenario_name: string;
  scenario_type: string;
  accomplished: boolean;
}

/** Detailed progress response for an agent and campaign. */
export interface CampaignProgressResponse {
  campaign_id: string;
  campaign_name: string;
  total_scenarios: number;
  accomplished_scenarios: number;
  is_completed: boolean;
  scenarios: ScenarioProgressItem[];
}
