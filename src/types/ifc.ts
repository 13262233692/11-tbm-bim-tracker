export interface IfcModel {
  id: string;
  name: string;
  ifcVersion: string;
  totalSegments: number;
  metadata: Record<string, unknown>;
  loaded: boolean;
  loadingProgress: number;
}

export interface TunnelSegment {
  id: string;
  ifcGuid: string;
  ringNumber: number;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  material: string;
  lodLevel: number;
  geometry?: THREE.BufferGeometry;
  visible: boolean;
}

export interface LiningRing {
  id: string;
  ringNumber: number;
  segmentsCount: number;
  diameter: number;
  thickness: number;
  type: string;
  segments: TunnelSegment[];
}

export interface IfcParseProgress {
  stage: 'loading' | 'parsing' | 'processing' | 'complete';
  progress: number;
  message: string;
}

export interface IfcLoaderConfig {
  workerUrl: string;
  wasmUrl: string;
  coordinateToMeters: number;
}
