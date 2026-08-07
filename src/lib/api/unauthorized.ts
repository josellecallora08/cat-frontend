import { useAuthStore } from "@/stores/auth-store";

/**
 * Clear stale authentication and return the user to login after a 401 response.
 */
export function handleUnauthorized(response: Response): void {
  if (response.status !== 401 || typeof window === "undefined") {
    return;
  }

  useAuthStore.getState().logout();
  const redirectTo = `${window.location.pathname}${window.location.search}`;
  const loginUrl = `/login?redirectTo=${encodeURIComponent(redirectTo)}`;

  if (window.location.pathname !== "/login") {
    window.location.replace(loginUrl);
  }
}
