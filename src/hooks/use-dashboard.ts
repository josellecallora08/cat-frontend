import { useQuery } from "@tanstack/react-query";

import {
  fetchDashboard,
  fetchLeaderboard,
  fetchScoreHistory,
} from "@/lib/api/dashboard";
import type { AuthUser } from "@/stores/auth-store";
import { useAuthStore } from "@/stores/auth-store";

export type DashboardVariant = "admin" | "trainer" | "agent";

/**
 * Determine the dashboard variant based on the authenticated user's role.
 */
export function getDashboardVariant(user: AuthUser | null): DashboardVariant {
  if (!user) return "agent";
  if (user.role === "admin") return "admin";
  if (user.role === "user" && user.user_type === "trainer") return "trainer";
  return "agent";
}

/**
 * Hook that fetches role-scoped dashboard data.
 * Automatically determines the agent filter based on the user's role:
 * - Admin: no filter (system-wide data)
 * - Trainer: no filter (backend scopes to campaign)
 * - Agent: filters by own user ID
 */
export function useDashboard() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const variant = getDashboardVariant(user);
  const agentFilter = variant === "agent" && user?.id ? user.id : undefined;

  const dashboard = useQuery({
    queryKey: ["dashboard", agentFilter],
    queryFn: () => fetchDashboard(agentFilter, token ?? undefined),
    refetchInterval: 30000,
  });

  return { ...dashboard, variant, agentFilter };
}

/**
 * Hook that fetches role-scoped score history.
 */
export function useScoreHistory() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const variant = getDashboardVariant(user);
  const agentFilter = variant === "agent" && user?.id ? user.id : undefined;

  return useQuery({
    queryKey: ["score-history", agentFilter],
    queryFn: () => fetchScoreHistory(agentFilter, token ?? undefined),
  });
}

/**
 * Hook that fetches role-scoped leaderboard.
 * Enabled only for admin and trainer roles.
 */
export function useLeaderboard() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const variant = getDashboardVariant(user);
  const showLeaderboard = variant === "admin" || variant === "trainer";

  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => fetchLeaderboard(token ?? undefined),
    enabled: showLeaderboard,
  });
}
