/**
 * TypeScript types for the real-time WebSocket event system.
 *
 * These types define the structure of event payloads received over the
 * WebSocket connection at `/ws/events`, as well as connection state types
 * used by the frontend realtime store and hook.
 */

/** Payload data section of a real-time event. */
export interface EventData {
  id: string;
  timestamp: string;
}

/** Complete event payload received over WebSocket. */
export interface EventPayload {
  event: string;
  data: EventData;
  seq: number;
}

/** Categories of events broadcast by the backend. */
export type EventCategory =
  | "session"
  | "campaign"
  | "scenario"
  | "user"
  | "dashboard"
  | "system";

/** WebSocket connection status tracked by the realtime store. */
export type ConnectionStatus = "connecting" | "connected" | "disconnected";
