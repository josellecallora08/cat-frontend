import { useQuery } from "@tanstack/react-query";

import { useAuthStore } from "@/stores/auth-store";
import {
  fetchCampaignDashboard,
  fetchAgentProgress,
} from "@/lib/api/campaign-dashboard";

export function useCampaignDashboard(campaignId: string) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["campaigns", campaignId, "dashboard"],
    queryFn: () => fetchCampaignDashboard(campaignId, token ?? ""),
    enabled: !!campaignId && !!token,
  });
}

export function useAgentProgress(campaignId: string, agentId: string) {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["campaigns", campaignId, "agents", agentId, "progress"],
    queryFn: () => fetchAgentProgress(campaignId, agentId, token ?? ""),
    enabled: !!campaignId && !!agentId && !!token,
  });
}
