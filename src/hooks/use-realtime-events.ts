"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useAuthStore } from "@/stores/auth-store";
import { useRealtimeStore } from "@/stores/realtime-store";
import type { EventPayload } from "@/types/realtime";

/**
 * Base URL for WebSocket connections.
 * Uses NEXT_PUBLIC_WS_URL env var if set, otherwise derives from window location.
 */
const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  (typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`
    : "ws://localhost:8000");

/**
 * Mapping from event type strings to the TanStack Query keys that
 * should be invalidated when that event is received.
 *
 * The special "system.resync" event invalidates all queries.
 */
export const EVENT_TO_QUERY_KEYS: Record<string, string[][]> = {
  "session.created": [["sessions"], ["dashboard"]],
  "session.ended": [["sessions"], ["dashboard"]],
  "session.evaluated": [
    ["sessions"],
    ["dashboard"],
    ["score-history"],
    ["leaderboard"],
  ],
  "campaign.created": [["campaigns"], ["dashboard"]],
  "campaign.updated": [["campaigns"]],
  "campaign.archived": [["campaigns"], ["dashboard"]],
  "campaign.scenario_added": [["campaigns"], ["agent-campaign-scenarios"]],
  "campaign.scenario_removed": [["campaigns"], ["agent-campaign-scenarios"]],
  "scenario.created": [["scenarios"]],
  "scenario.updated": [["scenarios"]],
  "scenario.deleted": [["scenarios"]],
  "user.created": [["admin-users"]],
  "user.updated": [["admin-users"]],
  "user.status_changed": [["admin-users"]],
  "user.deleted": [["admin-users"]],
  "dashboard.updated": [["dashboard"], ["score-history"], ["leaderboard"]],
  "system.resync": [], // handled specially — invalidates all queries
};

/**
 * Compute exponential backoff delay for WebSocket reconnection.
 *
 * Returns `min(1000 * 2^(attempt - 1), 30000)` milliseconds,
 * producing the sequence: 1s, 2s, 4s, 8s, 16s, 30s, 30s, ...
 *
 * @param attempt - The reconnection attempt number (1-based).
 * @returns Delay in milliseconds before the next reconnection attempt.
 */
export function computeBackoffDelay(attempt: number): number {
  const base = 1000;
  const max = 30000;
  return Math.min(base * Math.pow(2, attempt - 1), max);
}

/**
 * Invalidate TanStack Query caches based on the received event type.
 *
 * For "system.resync", all queries are invalidated (full cache reset).
 * For known event types, only the mapped query keys are invalidated.
 * Unknown event types are silently ignored.
 *
 * @param queryClient - The TanStack QueryClient instance.
 * @param eventType - The dot-notation event type string (e.g., "session.created").
 */
export function invalidateQueriesForEvent(
  queryClient: QueryClient,
  eventType: string,
): void {
  if (eventType === "system.resync") {
    queryClient.invalidateQueries();
    return;
  }
  const keys = EVENT_TO_QUERY_KEYS[eventType];
  if (!keys) return;
  for (const key of keys) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}

/**
 * React hook that manages a WebSocket connection to `/ws/events` for
 * receiving real-time event broadcasts from the backend.
 *
 * Behavior:
 * - Opens a WebSocket when a JWT token is available in the auth store.
 * - Passes `token` and optionally `last_seq` as query parameters.
 * - Implements exponential backoff reconnection (1s → 2s → 4s → ... → 30s max).
 * - On message: parses the event payload, updates `lastSeq` in the realtime
 *   store, and invalidates the relevant TanStack Query keys.
 * - On close: sets connection status to "disconnected" and schedules a reconnect.
 * - On logout (token becomes null): closes the connection and resets the store.
 * - Does not open a connection if the token is not available.
 */
export function useRealtimeEvents(): void {
  const token = useAuthStore((s) => s.token);
  const { lastSeq, setLastSeq, setStatus, reset } = useRealtimeStore();
  const queryClient = useQueryClient();
  const lastSeqRef = useRef(lastSeq);

  // Keep ref in sync with store (for use in closure without re-triggering effect)
  useEffect(() => {
    lastSeqRef.current = lastSeq;
  }, [lastSeq]);

  useEffect(() => {
    if (!token) {
      reset();
      return;
    }

    // Local const for type narrowing inside the connect() closure
    const currentToken: string = token;

    let ws: WebSocket | null = null;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let isClosed = false;

    function connect() {
      if (isClosed) return;

      const params = new URLSearchParams();
      params.set("token", currentToken);
      if (lastSeqRef.current > 0) {
        params.set("last_seq", String(lastSeqRef.current));
      }

      const url = `${WS_BASE_URL}/ws/events?${params.toString()}`;
      ws = new WebSocket(url);
      setStatus("connecting");

      ws.onopen = () => {
        attempt = 0;
        setStatus("connected");
      };

      ws.onmessage = (msg: MessageEvent) => {
        try {
          const payload: EventPayload = JSON.parse(msg.data as string);
          if (payload.seq) {
            setLastSeq(payload.seq);
          }
          invalidateQueriesForEvent(queryClient, payload.event);
        } catch {
          // Ignore malformed messages (e.g., ping frames parsed as text)
        }
      };

      ws.onerror = () => {
        // onerror is always followed by onclose, so let onclose handle reconnection
      };

      ws.onclose = () => {
        if (isClosed) return;
        setStatus("disconnected");
        attempt += 1;
        const delay = computeBackoffDelay(attempt);
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      isClosed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null; // prevent reconnection on intentional close
        ws.close();
      }
    };
  }, [token, queryClient, setLastSeq, setStatus, reset]);
}
