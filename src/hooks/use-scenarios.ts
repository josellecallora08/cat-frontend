import { useQuery } from "@tanstack/react-query";

import { fetchScenarioById, fetchScenarios } from "@/lib/api/scenarios";
import { useAuthStore } from "@/stores/auth-store";

export function useScenarios() {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  return useQuery({
    queryKey: ["scenarios", token],
    queryFn: () => fetchScenarios(token ?? undefined),
    enabled: isHydrated && !!token,
  });
}

export function useScenario(id: string) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  return useQuery({
    queryKey: ["scenarios", id, token],
    queryFn: () => fetchScenarioById(id, token!),
    enabled: !!id && isHydrated && !!token,
  });
}
