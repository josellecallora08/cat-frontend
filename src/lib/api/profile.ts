/**
 * Profile API client for user profile management.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// --- Types ---

export interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  department: string | null;
  avatar_url: string | null;
}

export interface ProfileUpdatePayload {
  full_name?: string;
  department?: string;
}

export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
}

// --- Helpers ---

async function extractErrorDetail(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return (body as { detail?: string }).detail ?? `Request failed: ${response.status}`;
}

// --- API Functions ---

/**
 * Fetch the authenticated user's profile.
 */
export async function fetchProfile(token: string): Promise<ProfileData> {
  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const message = await extractErrorDetail(response);
    throw new Error(message);
  }

  return response.json();
}

/**
 * Update the authenticated user's profile (full_name, department).
 */
export async function updateProfile(
  data: ProfileUpdatePayload,
  token: string
): Promise<ProfileData> {
  const response = await fetch(`${API_BASE_URL}/api/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await extractErrorDetail(response);
    throw new Error(message);
  }

  return response.json();
}

/**
 * Change the authenticated user's password.
 */
export async function changePassword(
  data: PasswordChangePayload,
  token: string
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/profile/password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await extractErrorDetail(response);
    throw new Error(message);
  }

  return response.json();
}
