import { create } from "zustand";

export type CallStatus = "idle" | "connecting" | "active" | "ended" | "error";

interface CallState {
  sessionId: string | null;
  status: CallStatus;
  errorMessage: string | null;

  setSessionId: (sessionId: string) => void;
  setStatus: (status: CallStatus) => void;
  setError: (message: string) => void;
  reset: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  sessionId: null,
  status: "idle",
  errorMessage: null,

  setSessionId: (sessionId) => set({ sessionId }),
  setStatus: (status) => set({ status, errorMessage: null }),
  setError: (message) => set({ status: "error", errorMessage: message }),
  reset: () => set({ sessionId: null, status: "idle", errorMessage: null }),
}));
