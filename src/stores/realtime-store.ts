import { create } from "zustand";

import type { ConnectionStatus } from "@/types/realtime";

interface RealtimeState {
  lastSeq: number;
  status: ConnectionStatus;
}

interface RealtimeActions {
  setLastSeq: (seq: number) => void;
  setStatus: (status: ConnectionStatus) => void;
  reset: () => void;
}

export type RealtimeStore = RealtimeState & RealtimeActions;

const initialState: RealtimeState = {
  lastSeq: 0,
  status: "disconnected",
};

export const useRealtimeStore = create<RealtimeStore>((set) => ({
  ...initialState,
  setLastSeq: (seq) => set({ lastSeq: seq }),
  setStatus: (status) => set({ status }),
  reset: () => set(initialState),
}));
