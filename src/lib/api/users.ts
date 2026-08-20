/** Shape returned by GET /api/auth/users (admin-only user directory listing). */
export interface SelectableAgentUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  user_type: string | null;
  is_active: boolean;
}

/**
 * The backend only accepts active users with role="user" and user_type="agent"
 * as campaign agent assignments (see `_validate_agent_ids` in campaign_service.py).
 * Filter the user directory down to that set before showing it in an agent picker,
 * otherwise selecting a trainer, admin, or inactive user causes a 422 on save.
 */
export function filterSelectableAgents(users: SelectableAgentUser[]): SelectableAgentUser[] {
  return users.filter((u) => u.is_active && u.role === "user" && u.user_type === "agent");
}
