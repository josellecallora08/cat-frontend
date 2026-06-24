import type { AuthErrorCode } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface AuthResult {
  success: boolean;
  errorCode?: AuthErrorCode;
  data?: {
    access_token: string;
    user: {
      id: string;
      email: string;
      full_name: string;
      role: "admin" | "agent";
      is_active: boolean;
    };
  };
}

function mapErrorToCode(status: number, detail?: string): AuthErrorCode {
  if (status === 401) return "INVALID_CREDENTIALS";
  if (status === 403 && detail?.toLowerCase().includes("verify"))
    return "ACCOUNT_UNVERIFIED";
  if (status === 429) return "TOO_MANY_ATTEMPTS";
  if (status === 409) return "EMAIL_ALREADY_USED";
  if (status === 400 && detail?.toLowerCase().includes("already"))
    return "EMAIL_ALREADY_USED";
  if (status >= 500) return "SERVER_ERROR";
  return "SERVER_ERROR";
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, errorCode: mapErrorToCode(res.status, data.detail) };
      }

      const data = await res.json();
      return { success: true, data };
    } catch {
      return { success: false, errorCode: "NETWORK_ERROR" };
    }
  },

  async signup(email: string, password: string, fullName: string): Promise<AuthResult> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName, role: "agent" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, errorCode: mapErrorToCode(res.status, data.detail) };
      }

      const data = await res.json();
      return { success: true, data };
    } catch {
      return { success: false, errorCode: "NETWORK_ERROR" };
    }
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; errorCode?: AuthErrorCode }> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Always return success for security (don't reveal if account exists)
      if (!res.ok && res.status === 410) {
        return { success: false, errorCode: "RESET_LINK_EXPIRED" };
      }

      return { success: true };
    } catch {
      return { success: false, errorCode: "NETWORK_ERROR" };
    }
  },

  async loginWithGoogle(): Promise<AuthResult> {
    // Placeholder for OAuth flow
    return { success: false, errorCode: "SERVER_ERROR" };
  },

  async loginWithLark(): Promise<AuthResult> {
    // Placeholder for OAuth flow
    return { success: false, errorCode: "SERVER_ERROR" };
  },
};
