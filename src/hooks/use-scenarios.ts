import { useQuery } from "@tanstack/react-query";

import { fetchScenarioById, fetchScenarios } from "@/lib/api/scenarios";
import { useAuthStore } from "@/stores/auth-store";

export function useScenarios() {
  const token = useAuthStore((s) => s.token);

  return useQuery({
    queryKey: ["scenarios", token ? "authenticated" : "public"],
    queryFn: () => fetchScenarios(token ?? undefined),
  });
}

export function useScenario(id: string) {
  return useQuery({
    queryKey: ["scenarios", id],
    queryFn: () => fetchScenarioById(id),
    enabled: !!id,
  });
}
