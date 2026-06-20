import { create } from 'zustand';

interface SettingsStore {
  wsUrl: string;
  wsReconnectInterval: number;
  wsMaxReconnectAttempts: number;
  wsHeartbeatInterval: number;
  alarmPitchThreshold: number;
  alarmYawThreshold: number;
  alarmRollThreshold: number;
  criticalPitchThreshold: number;
  criticalYawThreshold: number;
  criticalRollThreshold: number;
  smoothingAlpha: number;
  interpolationDuration: number;
  lodLevel0Distance: number;
  lodLevel1Distance: number;
  lodLevel2Distance: number;
  lodLevel3Distance: number;
  frustumMargin: number;
  dynamicLOD: boolean;
  occlusionCulling: boolean;

  setWsUrl: (url: string) => void;
  setAlarmThresholds: (thresholds: Partial<SettingsStore>) => void;
  setLODDistances: (distances: Partial<SettingsStore>) => void;
  setRenderSettings: (settings: Partial<SettingsStore>) => void;
  reset: () => void;
}

const defaultSettings = {
  wsUrl: 'ws://localhost:8080/ws',
  wsReconnectInterval: 3000,
  wsMaxReconnectAttempts: 10,
  wsHeartbeatInterval: 30000,
  alarmPitchThreshold: 3,
  alarmYawThreshold: 3,
  alarmRollThreshold: 3,
  criticalPitchThreshold: 5,
  criticalYawThreshold: 5,
  criticalRollThreshold: 5,
  smoothingAlpha: 0.15,
  interpolationDuration: 100,
  lodLevel0Distance: 50,
  lodLevel1Distance: 200,
  lodLevel2Distance: 500,
  lodLevel3Distance: 1000,
  frustumMargin: 10,
  dynamicLOD: true,
  occlusionCulling: true,
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...defaultSettings,

  setWsUrl: (url) => set({ wsUrl: url }),

  setAlarmThresholds: (thresholds) => set((state) => ({ ...state, ...thresholds })),

  setLODDistances: (distances) => set((state) => ({ ...state, ...distances })),

  setRenderSettings: (settings) => set((state) => ({ ...state, ...settings })),

  reset: () => set(defaultSettings),
}));
