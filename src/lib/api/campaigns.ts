export interface CampaignScenarioItem {
  id: string;
  name: string;
  scenario_type: string;
}

export interface CampaignAgentItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export interface CampaignListItem {
  id: string;
  name: string;
  status: string;
  scenarios_count: number;
  agents_count: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  scenarios: CampaignScenarioItem[];
  agents: CampaignAgentItem[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedCampaigns {
  items: CampaignListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CampaignCreatePayload {
  name: string;
  description?: string | null;
  agents: Array<{ agent_id: string; role: string }>;
}

export interface CampaignUpdatePayload {
  name?: string;
  description?: string | null;
  status?: string;
  agents?: Array<{ agent_id: string; role: string }>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function fetchCampaigns(
  page: number,
  pageSize: number,
  status?: string,
  token?: string
): Promise<PaginatedCampaigns> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  if (status) {
    params.set("status", status);
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/campaigns?${params.toString()}`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch campaigns: ${response.status}`);
  }

  return response.json();
}

export async function fetchCampaignById(
  id: string,
  token: string
): Promise<CampaignDetail> {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch campaign: ${response.status}`);
  }

  return response.json();
}

export async function createCampaign(
  data: CampaignCreatePayload,
  token: string
): Promise<CampaignDetail> {
  const response = await fetch(`${API_BASE_URL}/api/campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create campaign: ${response.status}`);
  }

  return response.json();
}

export async function updateCampaign(
  id: string,
  data: CampaignUpdatePayload,
  token: string
): Promise<CampaignDetail> {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update campaign: ${response.status}`);
  }

  return response.json();
}

export async function deleteCampaign(
  id: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/campaigns/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete campaign: ${response.status}`);
  }
}
