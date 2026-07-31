import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Response shape returned by the avatar upload endpoint. */
interface UploadAvatarResponse {
  avatar_url: string;
}

/**
 * Uploads a file as the user's profile avatar.
 *
 * @param file - The image file to upload.
 * @param token - The Bearer token for authentication.
 * @returns The new avatar URL from the server.
 * @throws Error if the upload request fails.
 */
async function uploadAvatar(
  file: File,
  token: string
): Promise<UploadAvatarResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/profile/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { detail?: string }).detail ?? "Upload failed"
    );
  }

  return response.json() as Promise<UploadAvatarResponse>;
}

/**
 * Hook that uploads a new avatar for the authenticated user.
 *
 * Posts the file as `multipart/form-data` to `/api/profile/avatar` with
 * a Bearer token. On success, invalidates the `["profile"]` query so
 * the UI reflects the updated avatar.
 *
 * @returns A TanStack Query mutation result for avatar upload.
 */
export function useUploadAvatar() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file, token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
