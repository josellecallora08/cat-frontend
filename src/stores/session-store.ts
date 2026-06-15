import { create } from "zustand";
import {
  createSession as apiCreateSession,
  endSession as apiEndSession,
  type SessionResponse,
} from "@/lib/api/sessions";

export type SessionStoreStatus =
  | "idle"
  | "creating"
  | "connecting"
  | "active"
  | "ending"
  | "completed"
  | "error";

export interface SessionState {
  sessionId: string | null;
  scenarioId: string | null;
  status: SessionStoreStatus;
  error: string | null;
  session: SessionResponse | null;
}

export interface SessionActions {
  createSession: (scenarioId: string) => Promise<void>;
  endSession: () => Promise<void>;
  setStatus: (status: SessionStoreStatus) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export type SessionStore = SessionState & SessionActions;

const initialState: SessionState = {
  sessionId: null,
  scenarioId: null,
  status: "idle",
  error: null,
  session: null,
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  createSession: async (scenarioId: string) => {
    set({ status: "creating", scenarioId, error: null });

    try {
      const session = await apiCreateSession(scenarioId);
      set({
        sessionId: session.id,
        session,
        status: "connecting",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create session";
      set({ status: "error", error: message });
    }
  },

  endSession: async () => {
    const { sessionId } = get();
    if (!sessionId) {
      set({ status: "error", error: "No active session to end" });
      return;
    }

    set({ status: "ending" });

    try {
      const session = await apiEndSession(sessionId);
      set({ session, status: "completed" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to end session";
      set({ status: "error", error: message });
    }
  },

  setStatus: (status: SessionStoreStatus) => {
    set({ status });
  },

  setError: (error: string | null) => {
    set({ error, status: error ? "error" : get().status });
  },

  reset: () => {
    set(initialState);
  },
}));
