import { useQuery } from "@tanstack/react-query";

import { fetchCampaignProgress } from "@/lib/api/campaigns";
import { useAuthStore } from "@/stores/auth-store";

const MAX_RETRIES = 3;

export function useCampaignProgress(campaignId: string | null) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ["campaigns", campaignId, "progress"],
    queryFn: () => fetchCampaignProgress(campaignId ?? "", token ?? ""),
    enabled: campaignId !== null && campaignId.length > 0 && !!token,
    retry: MAX_RETRIES,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
