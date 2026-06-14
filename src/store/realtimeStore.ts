import { create } from 'zustand';

export type RealtimeConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface RealtimeState {
  status: RealtimeConnectionStatus;
  setStatus: (status: RealtimeConnectionStatus) => void;
}

export const useRealtimeConnectionStore = create<RealtimeState>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}));
