import { create } from 'zustand';
import type { IfcModel, LiningRing } from '@/types/ifc';
import type { LODConfig, FrustumCullingConfig, TbmModelConfig } from '@/types/tbm';

interface ModelStore {
  ifcModels: IfcModel[];
  currentModelId: string | null;
  tunnelRings: LiningRing[];
  lodConfig: LODConfig;
  frustumConfig: FrustumCullingConfig;
  tbmConfig: TbmModelConfig;
  currentLODLevel: number;
  renderStats: {
    drawCalls: number;
    triangles: number;
    fps: number;
    visibleSegments: number;
  };
  loadingProgress: number;
  isLoading: boolean;

  setCurrentModel: (id: string | null) => void;
  addModel: (model: IfcModel) => void;
  removeModel: (id: string) => void;
  setTunnelRings: (rings: LiningRing[]) => void;
  updateRingVisibility: (ringNumber: number, visible: boolean) => void;
  updateSegmentLOD: (segmentId: string, lodLevel: number) => void;
  setLODConfig: (config: Partial<LODConfig>) => void;
  setFrustumConfig: (config: Partial<FrustumCullingConfig>) => void;
  setCurrentLODLevel: (level: number) => void;
  setRenderStats: (stats: Partial<ModelStore['renderStats']>) => void;
  setLoadingProgress: (progress: number | ((prev: number) => number)) => void;
  setIsLoading: (loading: boolean) => void;
  getRingByNumber: (ringNumber: number) => LiningRing | undefined;
  getVisibleRings: () => LiningRing[];
}

const defaultLODConfig: LODConfig = {
  level0: { distance: 50, detail: 'high' },
  level1: { distance: 200, detail: 'medium' },
  level2: { distance: 500, detail: 'low' },
  level3: { distance: 1000, detail: 'billboard' },
};

const defaultFrustumConfig: FrustumCullingConfig = {
  enabled: true,
  margin: 10,
  dynamicLOD: true,
  occlusionCulling: true,
};

const defaultTbmConfig: TbmModelConfig = {
  bodyLength: 12,
  bodyDiameter: 6.2,
  cutterHeadDiameter: 6.4,
  segmentWidth: 1.5,
  totalSegments: 2000,
  diameter: 6.2,
  thickness: 0.3,
};

export const useModelStore = create<ModelStore>((set, get) => ({
  ifcModels: [],
  currentModelId: null,
  tunnelRings: [],
  lodConfig: defaultLODConfig,
  frustumConfig: defaultFrustumConfig,
  tbmConfig: defaultTbmConfig,
  currentLODLevel: 0,
  renderStats: {
    drawCalls: 0,
    triangles: 0,
    fps: 60,
    visibleSegments: 0,
  },
  loadingProgress: 0,
  isLoading: false,

  setCurrentModel: (id) => set({ currentModelId: id }),

  addModel: (model) =>
    set((state) => ({
      ifcModels: [...state.ifcModels, model],
    })),

  removeModel: (id) =>
    set((state) => ({
      ifcModels: state.ifcModels.filter((m) => m.id !== id),
      currentModelId: state.currentModelId === id ? null : state.currentModelId,
    })),

  setTunnelRings: (rings) => set({ tunnelRings: rings }),

  updateRingVisibility: (ringNumber, visible) =>
    set((state) => ({
      tunnelRings: state.tunnelRings.map((ring) =>
        ring.ringNumber === ringNumber
          ? {
              ...ring,
              segments: ring.segments.map((s) => ({ ...s, visible })),
            }
          : ring
      ),
    })),

  updateSegmentLOD: (segmentId, lodLevel) =>
    set((state) => ({
      tunnelRings: state.tunnelRings.map((ring) => ({
        ...ring,
        segments: ring.segments.map((s) =>
          s.id === segmentId ? { ...s, lodLevel } : s
        ),
      })),
    })),

  setLODConfig: (config) =>
    set((state) => ({
      lodConfig: { ...state.lodConfig, ...config },
    })),

  setFrustumConfig: (config) =>
    set((state) => ({
      frustumConfig: { ...state.frustumConfig, ...config },
    })),

  setCurrentLODLevel: (level) => set({ currentLODLevel: level }),

  setRenderStats: (stats) =>
    set((state) => ({
      renderStats: { ...state.renderStats, ...stats },
    })),

  setLoadingProgress: (progress) =>
    set((state) => ({
      loadingProgress: typeof progress === 'function' ? progress(state.loadingProgress) : progress,
    })),

  setIsLoading: (loading) => set({ isLoading: loading }),

  getRingByNumber: (ringNumber) => {
    return get().tunnelRings.find((r) => r.ringNumber === ringNumber);
  },

  getVisibleRings: () => {
    return get().tunnelRings.filter((ring) =>
      ring.segments.some((s) => s.visible)
    );
  },
}));

export function selectTunnelRings(state: ModelStore) {
  return state.tunnelRings;
}

export function selectCurrentModel(state: ModelStore) {
  return state.ifcModels.find((m) => m.id === state.currentModelId);
}

export function selectLODConfig(state: ModelStore) {
  return state.lodConfig;
}

export function selectRenderStats(state: ModelStore) {
  return state.renderStats;
}
