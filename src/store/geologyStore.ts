import { create } from 'zustand';
import type { GeologyStore, GeologyProfileData, StressConcentrationZone } from '@/types/geology';
import { SOIL_LAYER_PRESETS } from '@/types/geology';
import { buildGeologyProfileData } from '@/utils/geologyUtils';

export const useGeologyStore = create<GeologyStore>((set, get) => ({
  profileData: null,
  isProfileVisible: true,
  isLoading: false,
  loadingProgress: 0,
  selectedLayerId: null,
  showStressHighlight: true,
  hardnessAlertThreshold: 0.7,
  activeStressZones: [],
  lastUpdateTime: 0,

  setProfileData: (data) =>
    set((state) => ({
      profileData: data,
      activeStressZones: data?.stressZones ?? [],
      lastUpdateTime: Date.now(),
    })),

  setProfileVisible: (visible) => set({ isProfileVisible: visible }),
  toggleProfileVisible: () =>
    set((state) => ({ isProfileVisible: !state.isProfileVisible })),

  setLoading: (loading) => set({ isLoading: loading }),
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),

  setSelectedLayer: (layerId) => set({ selectedLayerId: layerId }),

  setShowStressHighlight: (show) => set({ showStressHighlight: show }),
  toggleStressHighlight: () =>
    set((state) => ({ showStressHighlight: !state.showStressHighlight })),

  setHardnessAlertThreshold: (threshold) =>
    set({ hardnessAlertThreshold: Math.max(0, Math.min(1, threshold)) }),

  generateMockProfile: (cutterX, cutterY, cutterZ, cutterQuat) => {
    set({ isLoading: true, loadingProgress: 0 });

    setTimeout(() => {
      set({ loadingProgress: 30 });
    }, 50);
    setTimeout(() => {
      set({ loadingProgress: 70 });
    }, 120);
    setTimeout(() => {
      const data = buildGeologyProfileData(
        cutterX,
        cutterY,
        cutterZ,
        cutterQuat,
        {
          hardnessThreshold: get().hardnessAlertThreshold,
        }
      );
      set({
        profileData: data,
        activeStressZones: data.stressZones,
        isLoading: false,
        loadingProgress: 100,
        lastUpdateTime: Date.now(),
      });
    }, 250);
  },

  updateProfilePosition: (x, y, z, quat) => {
    const state = get();
    if (!state.profileData) {
      state.generateMockProfile(x, y, z, quat);
      return;
    }
    if (Date.now() - state.lastUpdateTime < 3000) return;

    state.generateMockProfile(x, y, z, quat);
  },
}));

export const selectActiveStressZones = (state: GeologyStore): StressConcentrationZone[] =>
  state.activeStressZones;

export const selectHasHardRockAlert = (state: GeologyStore): boolean => {
  if (!state.profileData) return false;
  return state.profileData.boreholePoints.some(
    (p) => p.hardness >= state.hardnessAlertThreshold
  );
};

export const selectAverageHardness = (state: GeologyStore): number => {
  if (!state.profileData || state.profileData.boreholePoints.length === 0) return 0;
  const sum = state.profileData.boreholePoints.reduce((s, p) => s + p.hardness, 0);
  return sum / state.profileData.boreholePoints.length;
};

export { SOIL_LAYER_PRESETS };
export type { GeologyProfileData };
