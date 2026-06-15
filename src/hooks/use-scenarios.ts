import { useQuery } from "@tanstack/react-query";
import { fetchScenarios, fetchScenarioById } from "@/lib/api/scenarios";

export function useScenarios() {
  return useQuery({
    queryKey: ["scenarios"],
    queryFn: fetchScenarios,
  });
}

export function useScenario(id: string) {
  return useQuery({
    queryKey: ["scenarios", id],
    queryFn: () => fetchScenarioById(id),
    enabled: !!id,
  });
}
