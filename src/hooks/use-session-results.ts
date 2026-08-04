import { useQuery } from "@tanstack/react-query";

import {
  fetchCoaching,
  fetchEvaluation,
  fetchLearningPlan,
  fetchTranscript,
} from "@/lib/api/sessions";

function retryResultQuery(failureCount: number, error: Error) {
  if (error.message.includes("404")) return false;
  return failureCount < 3;
}

export function useEvaluation(sessionId: string) {
  return useQuery({
    queryKey: ["sessions", sessionId, "evaluation"],
    queryFn: () => fetchEvaluation(sessionId),
    enabled: Boolean(sessionId),
    retry: retryResultQuery,
  });
}

export function useTranscript(sessionId: string) {
  return useQuery({
    queryKey: ["sessions", sessionId, "transcript"],
    queryFn: () => fetchTranscript(sessionId),
    enabled: Boolean(sessionId),
    retry: retryResultQuery,
  });
}

export function useCoaching(sessionId: string) {
  return useQuery({
    queryKey: ["sessions", sessionId, "coaching"],
    queryFn: () => fetchCoaching(sessionId),
    enabled: Boolean(sessionId),
    retry: retryResultQuery,
  });
}

export function useLearningPlan(sessionId: string) {
  return useQuery({
    queryKey: ["sessions", sessionId, "learning-plan"],
    queryFn: () => fetchLearningPlan(sessionId),
    enabled: Boolean(sessionId),
    retry: retryResultQuery,
  });
}
