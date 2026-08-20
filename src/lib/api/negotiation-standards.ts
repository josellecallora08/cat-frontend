import type { RubricBlock, NegotiationStandardContent } from "@/lib/negotiation-standard-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface StandardResponse {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  revision: number;
  draft_content: NegotiationStandardContent | null;
  current_version_id: string | null;
  current_version_number: number | null;
}

export interface VersionResponse {
  id: string;
  standard_id: string;
  version_number: number;
  schema_version: number;
  snapshot: NegotiationStandardContent;
  content_hash: string;
  created_by: string;
  published_by: string;
  created_at: string;
  published_at: string;
  publication_note: string | null;
}

export interface VersionPage {
  items: VersionResponse[];
  page: number;
  page_size: number;
  total: number;
}

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ValidationResponse {
  valid: boolean;
  weight_total: number;
  errors: ValidationIssue[];
}

export interface StandardApiErrorDetail {
  code?: string;
  message?: string;
  weight_total?: number;
  errors?: ValidationIssue[];
}

export class StandardApiError extends Error {
  readonly status: number;
  readonly detail: StandardApiErrorDetail;

  constructor(status: number, detail: StandardApiErrorDetail) {
    super(detail.message ?? `Negotiation standard request failed (${status})`);
    this.name = "StandardApiError";
    this.status = status;
    this.detail = detail;
  }
}

export interface CreateStandardPayload {
  name: string;
  description?: string | null;
  draft_content: NegotiationStandardContent;
}

export interface UpdateStandardPayload {
  expected_revision: number;
  name?: string;
  description?: string | null;
  draft_content?: NegotiationStandardContent;
}

export interface PublishPayload {
  publication_note?: string | null;
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { detail?: StandardApiErrorDetail | string };
    const detail = typeof body.detail === "string" ? { message: body.detail } : body.detail ?? {};
    throw new StandardApiError(response.status, detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function fetchNegotiationStandard(campaignId: string, token: string): Promise<StandardResponse> {
  return request(`/api/campaigns/${campaignId}/negotiation-standard`, token);
}

export function createNegotiationStandard(campaignId: string, payload: CreateStandardPayload, token: string): Promise<StandardResponse> {
  return request(`/api/campaigns/${campaignId}/negotiation-standard`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateNegotiationStandard(campaignId: string, payload: UpdateStandardPayload, token: string): Promise<StandardResponse> {
  return request(`/api/campaigns/${campaignId}/negotiation-standard`, token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteNegotiationStandard(campaignId: string, token: string): Promise<void> {
  return request(`/api/campaigns/${campaignId}/negotiation-standard`, token, { method: "DELETE" });
}

export function validateNegotiationStandard(campaignId: string, token: string): Promise<ValidationResponse> {
  return request(`/api/campaigns/${campaignId}/negotiation-standard/validate`, token, { method: "POST" });
}

export function publishNegotiationStandard(campaignId: string, payload: PublishPayload, token: string): Promise<VersionResponse> {
  return request(`/api/campaigns/${campaignId}/negotiation-standard/publish`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function archiveNegotiationStandard(campaignId: string, token: string): Promise<StandardResponse> {
  return request(`/api/campaigns/${campaignId}/negotiation-standard/archive`, token, { method: "POST" });
}

export function reopenNegotiationStandard(campaignId: string, token: string): Promise<StandardResponse> {
  return request(`/api/campaigns/${campaignId}/negotiation-standard/reopen`, token, { method: "POST" });
}

export function fetchNegotiationStandardVersions(
  campaignId: string,
  token: string,
  page = 1,
  pageSize = 20,
): Promise<VersionPage> {
  return request(
    `/api/campaigns/${campaignId}/negotiation-standard/versions?page=${page}&page_size=${pageSize}`,
    token,
  );
}

export function fetchNegotiationStandardVersion(
  campaignId: string,
  versionId: string,
  token: string,
): Promise<VersionResponse> {
  return request(`/api/campaigns/${campaignId}/negotiation-standard/versions/${versionId}`, token);
}

export { API_BASE_URL, type RubricBlock };
