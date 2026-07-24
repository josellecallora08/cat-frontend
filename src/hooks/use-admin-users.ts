import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/auth-store";
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  updateAdminUserStatus,
  deleteAdminUser,
  resetAdminUserPassword,
} from "@/lib/api/admin-users";
import type {
  AdminUserCreatePayload,
  AdminUserUpdatePayload,
  AdminUserStatusPayload,
  AdminPasswordResetPayload,
} from "@/lib/api/admin-users";

export function useAdminUsers() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchAdminUsers(token ?? ""),
  });
}

export function useCreateAdminUser() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AdminUserCreatePayload) =>
      createAdminUser(data, token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useUpdateAdminUser() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AdminUserUpdatePayload }) =>
      updateAdminUser(userId, data, token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useUpdateAdminUserStatus() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AdminUserStatusPayload }) =>
      updateAdminUserStatus(userId, data, token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useDeleteAdminUser() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId, token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useResetAdminUserPassword() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AdminPasswordResetPayload }) =>
      resetAdminUserPassword(userId, data, token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
