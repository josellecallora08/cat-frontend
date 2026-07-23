/**
 * Authentication API client for Lark OAuth flow.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface AuthorizeResponse {
  authorize_url: string;
  state: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
  };
}

/**
 * Get the Lark OAuth authorization URL and state.
 */
export async function getLarkAuthorizeUrl(): Promise<AuthorizeResponse> {
  const resp = await fetch(`${API_BASE_URL}/api/auth/lark/authorize`);
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to get Lark authorize URL");
  }
  return resp.json();
}

/**
 * Exchange a Lark authorization code for a CAT JWT.
 */
export async function larkCallback(code: string, state: string): Promise<TokenResponse> {
  const resp = await fetch(`${API_BASE_URL}/api/auth/lark/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, state }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.detail || "Lark authentication failed");
  }
  return resp.json();
}

