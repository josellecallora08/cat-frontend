import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/auth-store";
import {
  archiveNegotiationStandard,
  createNegotiationStandard,
  deleteNegotiationStandard,
  fetchNegotiationStandard,
  fetchNegotiationStandardVersions,
  publishNegotiationStandard,
  updateNegotiationStandard,
  validateNegotiationStandard,
} from "@/lib/api/negotiation-standards";
import type {
  CreateStandardPayload,
  PublishPayload,
  UpdateStandardPayload,
} from "@/lib/api/negotiation-standards";

export const standardQueryKeys = {
  all: ["negotiation-standards"] as const,
  current: (campaignId: string) => ["negotiation-standards", campaignId] as const,
  versions: (campaignId: string) => ["negotiation-standards", campaignId, "versions"] as const,
};

export function useNegotiationStandard(campaignId: string) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: standardQueryKeys.current(campaignId),
    queryFn: () => fetchNegotiationStandard(campaignId, token ?? ""),
    enabled: Boolean(campaignId && token),
    retry: false,
  });
}

export function useNegotiationStandardVersions(campaignId: string) {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: standardQueryKeys.versions(campaignId),
    queryFn: () => fetchNegotiationStandardVersions(campaignId, token ?? ""),
    enabled: Boolean(campaignId && token),
    retry: false,
  });
}

function useStandardMutation<T>(campaignId: string, mutationFn: (token: string) => Promise<T>) {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => mutationFn(token ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: standardQueryKeys.current(campaignId) });
      void queryClient.invalidateQueries({ queryKey: standardQueryKeys.versions(campaignId) });
    },
  });
}

export function useCreateNegotiationStandard(campaignId: string) {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStandardPayload) => createNegotiationStandard(campaignId, payload, token ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: standardQueryKeys.current(campaignId) });
      void queryClient.invalidateQueries({ queryKey: standardQueryKeys.versions(campaignId) });
    },
  });
}

export function useUpdateNegotiationStandard(campaignId: string) {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateStandardPayload) => updateNegotiationStandard(campaignId, payload, token ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: standardQueryKeys.current(campaignId) });
      void queryClient.invalidateQueries({ queryKey: standardQueryKeys.versions(campaignId) });
    },
  });
}

export function useDeleteNegotiationStandard(campaignId: string) {
  return useStandardMutation(campaignId, (token) => deleteNegotiationStandard(campaignId, token));
}

export function useValidateNegotiationStandard(campaignId: string) {
  const token = useAuthStore((state) => state.token);
  return useMutation({
    mutationFn: () => validateNegotiationStandard(campaignId, token ?? ""),
  });
}

export function usePublishNegotiationStandard(campaignId: string) {
  return useMutationWithPayload<PublishPayload, Awaited<ReturnType<typeof publishNegotiationStandard>>>(
    campaignId,
    (payload, token) => publishNegotiationStandard(campaignId, payload, token),
  );
}

export function useArchiveNegotiationStandard(campaignId: string) {
  return useStandardMutation(campaignId, (token) => archiveNegotiationStandard(campaignId, token));
}

function useMutationWithPayload<TPayload, TResult>(
  campaignId: string,
  mutationFn: (payload: TPayload, token: string) => Promise<TResult>,
) {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TPayload) => mutationFn(payload, token ?? ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: standardQueryKeys.current(campaignId) });
      void queryClient.invalidateQueries({ queryKey: standardQueryKeys.versions(campaignId) });
    },
  });
}
