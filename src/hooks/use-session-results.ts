import { useQuery } from "@tanstack/react-query";
import {
  fetchEvaluation,
  fetchCoaching,
  fetchLearningPlan,
} from "@/lib/api/sessions";

export function useEvaluation(sessionId: string) {
  return useQuery({
    queryKey: ["sessions", sessionId, "evaluation"],
    queryFn: () => fetchEvaluation(sessionId),
    enabled: !!sessionId,
    retry: (failureCount, error) => {
      // Don't retry on 404 (results not ready yet)
      if (error instanceof Error && error.message.includes("404")) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useCoaching(sessionId: string) {
  return useQuery({
    queryKey: ["sessions", sessionId, "coaching"],
    queryFn: () => fetchCoaching(sessionId),
    enabled: !!sessionId,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("404")) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useLearningPlan(sessionId: string) {
  return useQuery({
    queryKey: ["sessions", sessionId, "learning-plan"],
    queryFn: () => fetchLearningPlan(sessionId),
    enabled: !!sessionId,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("404")) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
