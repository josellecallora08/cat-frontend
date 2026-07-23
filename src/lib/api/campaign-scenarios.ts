import type { CampaignScenarioItem } from "./campaigns";

export interface CampaignScenariosResponse {
  scenarios: CampaignScenarioItem[];
}

export interface AgentCampaignScenarioItem {
  id: string;
  name: string;
  scenario_type: string;
  description: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function addScenariosToCampaign(
  campaignId: string,
  scenarioIds: string[],
  token: string
): Promise<CampaignScenariosResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/campaigns/${campaignId}/scenarios`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ scenario_ids: scenarioIds }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to add scenarios to campaign: ${response.status}`
    );
  }

  return response.json();
}

export async function removeScenarioFromCampaign(
  campaignId: string,
  scenarioId: string,
  token: string
): Promise<CampaignScenariosResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/campaigns/${campaignId}/scenarios/${scenarioId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to remove scenario from campaign: ${response.status}`
    );
  }

  return response.json();
}

export async function fetchAgentCampaignScenarios(
  token: string
): Promise<AgentCampaignScenarioItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/me/campaign-scenarios`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch agent campaign scenarios: ${response.status}`
    );
  }

  return response.json();
}

export interface CreateScenarioPayload {
  name: string;
  scenario_type: string;
  description: string;
  debtor_profile: {
    name: string;
    outstanding_balance: string;
    days_past_due: number;
    personality_profile: string;
    conversation_goal: string;
    prompt_blocks: string[];
  };
}

export interface CreatedScenarioResponse {
  id: string;
  name: string;
  scenario_type: string;
  description: string;
  debtor_profile: Record<string, unknown>;
}

export async function createScenarioForCampaign(
  campaignId: string,
  payload: CreateScenarioPayload,
  token: string
): Promise<CreatedScenarioResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/campaigns/${campaignId}/scenarios/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.detail || `Failed to create scenario: ${response.status}`
    );
  }

  return response.json();
}
