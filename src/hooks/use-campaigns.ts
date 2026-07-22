import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/auth-store";
import {
  fetchCampaigns,
  fetchCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from "@/lib/api/campaigns";
import type {
  CampaignCreatePayload,
  CampaignUpdatePayload,
} from "@/lib/api/campaigns";

export function useCampaigns(page: number, pageSize: number, status?: string) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["campaigns", page, pageSize, status],
    queryFn: () => fetchCampaigns(page, pageSize, status, token ?? undefined),
  });
}

export function useCampaign(id: string) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["campaigns", id],
    queryFn: () => fetchCampaignById(id, token ?? ""),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CampaignCreatePayload) =>
      createCampaign(data, token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useUpdateCampaign() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CampaignUpdatePayload }) =>
      updateCampaign(id, data, token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useDeleteCampaign() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCampaign(id, token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
