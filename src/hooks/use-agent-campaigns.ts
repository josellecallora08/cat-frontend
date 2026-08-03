import { useQuery } from "@tanstack/react-query";

import { fetchAgentCampaigns } from "@/lib/api/campaigns";
import { useAuthStore } from "@/stores/auth-store";

const AGENT_CAMPAIGNS_QUERY_KEY = ["campaigns", "my"] as const;
const MAX_RETRIES = 3;

export function useAgentCampaigns() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: AGENT_CAMPAIGNS_QUERY_KEY,
    queryFn: () => fetchAgentCampaigns(token ?? ""),
    enabled: !!token,
    retry: MAX_RETRIES,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
