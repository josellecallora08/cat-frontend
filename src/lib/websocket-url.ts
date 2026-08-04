/**
 * Shared WebSocket URL resolution for all WS connections.
 *
 * Priority:
 * 1. NEXT_PUBLIC_WS_URL environment variable (explicit configuration)
 * 2. Derived from window.location (wss: for HTTPS, ws: for HTTP)
 * 3. Fallback to ws://localhost:8000 (SSR/test contexts)
 */

/**
 * Resolve the WebSocket base URL.
 *
 * Uses NEXT_PUBLIC_WS_URL env var if set, otherwise derives from the
 * current page's protocol and host. Falls back to ws://localhost:8000
 * in server-side rendering or test environments where window is unavailable.
 *
 * @returns The WebSocket base URL without trailing slash (e.g., "ws://localhost:8000")
 */
export function getWsBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }
  return "ws://localhost:8000";
}
