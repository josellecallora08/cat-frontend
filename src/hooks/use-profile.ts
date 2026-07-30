import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/auth-store";
import {
  fetchProfile,
  updateProfile,
  changePassword,
} from "@/lib/api/profile";
import type { ProfileUpdatePayload, PasswordChangePayload } from "@/lib/api/profile";

/**
 * Hook that fetches the authenticated user's profile.
 */
export function useProfile() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(token ?? ""),
    enabled: !!token,
  });
}

/**
 * Hook that updates the authenticated user's profile.
 * Invalidates the profile query on success.
 */
export function useUpdateProfile() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProfileUpdatePayload) =>
      updateProfile(data, token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

/**
 * Hook that changes the authenticated user's password.
 */
export function useChangePassword() {
  const token = useAuthStore((s) => s.token);

  return useMutation({
    mutationFn: (data: PasswordChangePayload) =>
      changePassword(data, token ?? ""),
  });
}
