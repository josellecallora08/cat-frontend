export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  user_type: string | null;
  is_active: boolean;
  auth_provider: string;
  created_at: string;
}

export interface AdminUserCreatePayload {
  email: string;
  full_name: string;
  password: string;
  role: string;
  user_type?: string | null;
}

export interface AdminUserUpdatePayload {
  full_name: string;
  role: string;
  user_type?: string | null;
}

export interface AdminUserStatusPayload {
  is_active: boolean;
}

export interface AdminPasswordResetPayload {
  new_password: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function handleErrorResponse(response: Response): Promise<never> {
  const body = await response.json().catch(() => ({}));
  const message = (body as { detail?: string }).detail ?? `Request failed: ${response.status}`;
  throw new Error(message);
}

export async function fetchAdminUsers(token: string): Promise<AdminUser[]> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return response.json();
}

export async function createAdminUser(
  data: AdminUserCreatePayload,
  token: string
): Promise<AdminUser> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return response.json();
}

export async function updateAdminUser(
  userId: string,
  data: AdminUserUpdatePayload,
  token: string
): Promise<AdminUser> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return response.json();
}

export async function updateAdminUserStatus(
  userId: string,
  data: AdminUserStatusPayload,
  token: string
): Promise<AdminUser> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/users/${userId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return response.json();
}

export async function deleteAdminUser(
  userId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }
}

export async function resetAdminUserPassword(
  userId: string,
  data: AdminPasswordResetPayload,
  token: string
): Promise<{ message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/users/${userId}/reset-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return response.json();
}
