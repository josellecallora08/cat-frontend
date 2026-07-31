const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface ScriptListItem {
  id: string;
  name: string;
  scenario_id: string;
  status: "draft" | "published" | "unpublished";
  format: string;
  created_at: string;
  updated_at: string;
}

export interface ScriptVersion {
  id: string;
  version_number: number;
  content: Record<string, unknown>;
  published_at: string;
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = typeof body.detail === "string" ? body.detail : body.detail?.message;
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export async function fetchScripts(token: string): Promise<ScriptListItem[]> {
  const data = await request<{ items: ScriptListItem[] }>("/api/scripts?page=1&page_size=100", token);
  return data.items;
}

export function publishScript(id: string, token: string) {
  return request(`/api/scripts/${id}/publish`, token, { method: "POST" });
}

export function unpublishScript(id: string, token: string) {
  return request(`/api/scripts/${id}/unpublish`, token, { method: "POST" });
}

export function assignScript(id: string, scenarioId: string, token: string) {
  return request(`/api/scripts/${id}/assignment`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_id: scenarioId }),
  });
}

export function fetchScript(id: string, token: string) {
  return request<ScriptListItem & { draft_content?: Record<string, unknown> | null }>(`/api/scripts/${id}`, token);
}

export function updateScript(id: string, body: { raw_definition: string; format: "json" | "yaml" }, token: string) {
  return request(`/api/scripts/${id}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteScript(id: string, token: string) {
  return request<void>(`/api/scripts/${id}`, token, { method: "DELETE" });
}

export function bulkDeleteScripts(ids: string[], token: string) {
  return request<void>("/api/scripts/bulk-delete", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ids),
  });
}

export function fetchScriptVersions(id: string, token: string) {
  return request<ScriptVersion[]>(`/api/scripts/${id}/versions`, token);
}
