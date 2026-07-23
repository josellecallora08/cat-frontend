import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CreateScenarioPayload } from "@/lib/api/campaign-scenarios";
import {
    addScenariosToCampaign,
    createScenarioForCampaign,
    fetchAgentCampaignScenarios,
    removeScenarioFromCampaign
} from "@/lib/api/campaign-scenarios";
import { useAuthStore } from "@/stores/auth-store";

export function useAddCampaignScenarios(campaignId: string) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scenarioIds: string[]) =>
      addScenariosToCampaign(campaignId, scenarioIds, token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
    },
  });
}

export function useRemoveCampaignScenario(campaignId: string) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scenarioId: string) =>
      removeScenarioFromCampaign(campaignId, scenarioId, token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
    },
  });
}

export function useAgentCampaignScenarios() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["agent-campaign-scenarios"],
    queryFn: () => fetchAgentCampaignScenarios(token ?? ""),
  });
}

export function useCreateCampaignScenario(campaignId: string) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateScenarioPayload) =>
      createScenarioForCampaign(campaignId, payload, token ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", campaignId] });
    },
  });
}
