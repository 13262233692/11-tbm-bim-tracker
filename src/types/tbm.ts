export interface TbmPoseData {
  timestamp: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    pitch: number;
    yaw: number;
    roll: number;
  };
  cutterHead: {
    speed: number;
    torque: number;
    rotation: number;
  };
  thrust: {
    totalForce: number;
    speed: number;
  };
  ringCount: number;
  mileage: number;
}

export interface TbmPoseState {
  currentPose: TbmPoseData | null;
  poseHistory: TbmPoseData[];
  isConnected: boolean;
  lastUpdateTime: number;
  smoothedPose: TbmPoseData | null;
}

export interface TransformHierarchy {
  root: THREE.Matrix4;
  body: THREE.Matrix4;
  cutterHead: THREE.Matrix4;
  screwConveyor: THREE.Matrix4;
  erector: THREE.Matrix4;
}

export interface LODConfig {
  level0: { distance: number; detail: 'high' };
  level1: { distance: number; detail: 'medium' };
  level2: { distance: number; detail: 'low' };
  level3: { distance: number; detail: 'billboard' };
}

export interface FrustumCullingConfig {
  enabled: boolean;
  margin: number;
  dynamicLOD: boolean;
  occlusionCulling: boolean;
}

export interface AlarmRecord {
  id: string;
  timestamp: number;
  type: string;
  level: 'warning' | 'alarm' | 'critical';
  description: string;
  value: number;
  threshold: number;
}

export interface TbmModelConfig {
  bodyLength: number;
  bodyDiameter: number;
  cutterHeadDiameter: number;
  segmentWidth: number;
  totalSegments: number;
  diameter: number;
  thickness: number;
}
