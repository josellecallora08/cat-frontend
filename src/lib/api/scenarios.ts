export interface ScenarioListItem {
  id: string;
  name: string;
  scenario_type: string;
  description: string;
}

export interface DebtorProfile {
  name: string;
  outstanding_balance: number;
  days_past_due: number;
  personality_profile: string;
  conversation_goal: string;
}

export interface ScenarioDetail {
  id: string;
  name: string;
  scenario_type: string;
  description: string;
  debtor_profile: DebtorProfile;
}

export class ScenarioIncompleteProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenarioIncompleteProfileError";
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function fetchScenarios(): Promise<ScenarioListItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/scenarios`);

  if (!response.ok) {
    throw new Error(`Failed to fetch scenarios: ${response.status}`);
  }

  return response.json();
}

export async function fetchScenarioById(id: string): Promise<ScenarioDetail> {
  const response = await fetch(`${API_BASE_URL}/api/scenarios/${id}`);

  if (response.status === 422) {
    throw new ScenarioIncompleteProfileError(
      "This scenario has an incomplete debtor profile and cannot be loaded."
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch scenario: ${response.status}`);
  }

  return response.json();
}
