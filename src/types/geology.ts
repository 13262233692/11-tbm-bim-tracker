export interface BoreholePoint {
  id: string;
  boreholeId: string;
  x: number;
  y: number;
  z: number;
  depth: number;
  layerId: string;
  hardness: number;
  soilType: SoilType;
  timestamp: number;
}

export type SoilType =
  | 'soft_clay'
  | 'silty_sand'
  | 'gravel'
  | 'weathered_rock'
  | 'hard_rock'
  | 'mixed_face';

export interface SoilLayer {
  id: string;
  name: string;
  soilType: SoilType;
  color: string;
  hardness: number;
  hardnessRange: [number, number];
  description: string;
}

export interface StressConcentrationZone {
  id: string;
  centerU: number;
  centerV: number;
  radius: number;
  intensity: number;
  hardnessDelta: number;
}

export interface GeologyProfileData {
  profileId: string;
  timestamp: number;
  boreholePoints: BoreholePoint[];
  soilLayers: SoilLayer[];
  triangulation: DelaunayTriangulation | null;
  stressZones: StressConcentrationZone[];
  centerPoint: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  width: number;
  height: number;
}

export interface DelaunayTriangulation {
  vertices: Array<{ u: number; v: number; z: number; layerId: string; hardness: number }>;
  triangles: Array<[number, number, number]>;
  edges: Array<[number, number]>;
}

export interface GeologyStore {
  profileData: GeologyProfileData | null;
  isProfileVisible: boolean;
  isLoading: boolean;
  loadingProgress: number;
  selectedLayerId: string | null;
  showStressHighlight: boolean;
  hardnessAlertThreshold: number;
  activeStressZones: StressConcentrationZone[];
  lastUpdateTime: number;

  setProfileData: (data: GeologyProfileData | null) => void;
  setProfileVisible: (visible: boolean) => void;
  toggleProfileVisible: () => void;
  setLoading: (loading: boolean) => void;
  setLoadingProgress: (progress: number) => void;
  setSelectedLayer: (layerId: string | null) => void;
  setShowStressHighlight: (show: boolean) => void;
  toggleStressHighlight: () => void;
  setHardnessAlertThreshold: (threshold: number) => void;
  generateMockProfile: (
    cutterX: number,
    cutterY: number,
    cutterZ: number,
    cutterQuat: { x: number; y: number; z: number; w: number }
  ) => void;
  updateProfilePosition: (
    x: number,
    y: number,
    z: number,
    quat: { x: number; y: number; z: number; w: number }
  ) => void;
}

export const SOIL_LAYER_PRESETS: SoilLayer[] = [
  {
    id: 'soft_clay',
    name: '软黏土',
    soilType: 'soft_clay',
    color: '#8b7355',
    hardness: 0.15,
    hardnessRange: [0.1, 0.3],
    description: '软塑~流塑状态，压缩性高',
  },
  {
    id: 'silty_sand',
    name: '粉砂层',
    soilType: 'silty_sand',
    color: '#d4a574',
    hardness: 0.4,
    hardnessRange: [0.3, 0.55],
    description: '中密~密实，渗透性中等',
  },
  {
    id: 'gravel',
    name: '圆砾层',
    soilType: 'gravel',
    color: '#a0826d',
    hardness: 0.65,
    hardnessRange: [0.55, 0.75],
    description: '密实状态，颗粒级配良好',
  },
  {
    id: 'weathered_rock',
    name: '强风化岩',
    soilType: 'weathered_rock',
    color: '#6b5b4e',
    hardness: 0.82,
    hardnessRange: [0.75, 0.9],
    description: '岩体破碎，岩芯呈碎块状',
  },
  {
    id: 'hard_rock',
    name: '坚硬岩石',
    soilType: 'hard_rock',
    color: '#4a4038',
    hardness: 0.97,
    hardnessRange: [0.9, 1.0],
    description: '微风化~新鲜岩石，单轴抗压强度高',
  },
  {
    id: 'mixed_face',
    name: '复合地层',
    soilType: 'mixed_face',
    color: '#9e6b4e',
    hardness: 0.55,
    hardnessRange: [0.4, 0.8],
    description: '软硬不均，上软下硬复合断面',
  },
];
