import * as THREE from 'three';
import * as WebIFC from 'web-ifc';
import type { IfcParseProgress, LiningRing, TunnelSegment } from '@/types/ifc';

export class IfcParser {
  private ifcAPI: WebIFC.IfcAPI;
  private modelID: number = 0;
  private wasmLoaded: boolean = false;

  constructor() {
    this.ifcAPI = new WebIFC.IfcAPI();
  }

  async initWasm(wasmPath?: string): Promise<void> {
    if (this.wasmLoaded) return;

    try {
      await this.ifcAPI.Init();
      this.wasmLoaded = true;
    } catch (error) {
      console.error('Failed to load WebAssembly for IFC parsing:', error);
      throw error;
    }
  }

  async loadModel(
    file: File,
    onProgress?: (progress: IfcParseProgress) => void
  ): Promise<{ modelID: number; metadata: Record<string, unknown> }> {
    if (!this.wasmLoaded) {
      await this.initWasm();
    }

    onProgress?.({
      stage: 'loading',
      progress: 0,
      message: '正在加载IFC文件...',
    });

    const data = await this.readFileAsync(file);

    onProgress?.({
      stage: 'parsing',
      progress: 30,
      message: '正在解析IFC模型...',
    });

    try {
      this.modelID = await (this.ifcAPI as any).OpenModel(data);
    } catch (error) {
      console.error('Failed to parse IFC model:', error);
      throw new Error('IFC模型解析失败，请检查文件格式');
    }

    onProgress?.({
      stage: 'processing',
      progress: 70,
      message: '正在处理几何数据...',
    });

    const metadata = this.extractMetadata();

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'IFC模型加载完成',
    });

    return { modelID: this.modelID, metadata };
  }

  private readFileAsync(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result));
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  private extractMetadata(): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};
    const api = this.ifcAPI as any;

    try {
      const projectIDs = api.GetLineIDsWithType(this.modelID, WebIFC.IFCPROJECT);
      if (projectIDs.size() > 0) {
        const project = api.GetLine(this.modelID, projectIDs.get(0));
        metadata['projectName'] = project.Name?.value || 'Unknown';
        metadata['projectDescription'] = project.Description?.value || '';
      }

      const siteIDs = api.GetLineIDsWithType(this.modelID, WebIFC.IFCSITE);
      if (siteIDs.size() > 0) {
        const site = api.GetLine(this.modelID, siteIDs.get(0));
        metadata['siteName'] = site.Name?.value || 'Unknown';
      }

      metadata['ifcVersion'] = api.GetModelSchema(this.modelID);
    } catch (error) {
      console.warn('Failed to extract full metadata:', error);
    }

    return metadata;
  }

  extractTunnelSegments(): LiningRing[] {
    const rings: Map<number, TunnelSegment[]> = new Map();
    const api = this.ifcAPI as any;

    try {
      const elementIDs = api.GetLineIDsWithType(
        this.modelID,
        WebIFC.IFCBUILDINGELEMENTPROXY
      );

      for (let i = 0; i < elementIDs.size(); i++) {
        const expressID = elementIDs.get(i);
        const segment = this.processSegment(expressID);
        if (segment) {
          const ringNumber = segment.ringNumber;
          if (!rings.has(ringNumber)) {
            rings.set(ringNumber, []);
          }
          rings.get(ringNumber)!.push(segment);
        }
      }
    } catch (error) {
      console.error('Failed to extract tunnel segments:', error);
    }

    return Array.from(rings.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([ringNumber, segments]) => ({
        id: `ring-${ringNumber}`,
        ringNumber,
        segmentsCount: segments.length,
        diameter: 6.2,
        thickness: 0.3,
        type: 'standard',
        segments,
      }));
  }

  private processSegment(expressID: number): TunnelSegment | null {
    try {
      const element = (this.ifcAPI as any).GetLine(this.modelID, expressID);

      const name = element.Name?.value || '';
      const ringMatch = name.match(/R(\d+)/);
      const ringNumber = ringMatch ? parseInt(ringMatch[1]) : 0;

      const placement = element.ObjectPlacement;
      let position = { x: 0, y: 0, z: 0 };
      let rotation = { x: 0, y: 0, z: 0 };

      if (placement) {
        const relativePlacement = placement.RelativePlacement;
        if (relativePlacement?.Location) {
          position = {
            x: relativePlacement.Location.Coordinates[0] || 0,
            y: relativePlacement.Location.Coordinates[1] || 0,
            z: relativePlacement.Location.Coordinates[2] || 0,
          };
        }
      }

      return {
        id: `segment-${expressID}`,
        ifcGuid: element.GlobalId?.value || `guid-${expressID}`,
        ringNumber,
        position,
        rotation,
        material: 'concrete',
        lodLevel: 0,
        visible: true,
      };
    } catch (error) {
      return null;
    }
  }

  async getMeshGeometry(expressID: number): Promise<THREE.BufferGeometry | null> {
    try {
      const geometries = await (this.ifcAPI as any).LoadAllGeometry(this.modelID);
      const meshList = Array.from(geometries) as any[];
      const mesh = meshList.find((g: any) => g.expressID === expressID);
      if (!mesh || !mesh.geometries || mesh.geometries.length === 0) return null;

      const geom = mesh.geometries[0];
      const positionAttr = new THREE.BufferAttribute(
        new Float32Array(geom.positions),
        3
      );
      const indexAttr = new THREE.BufferAttribute(
        new Uint32Array(geom.indices),
        1
      );

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', positionAttr);
      geometry.setIndex(indexAttr);
      geometry.computeVertexNormals();

      return geometry;
    } catch (error) {
      console.error('Failed to get mesh geometry:', error);
      return null;
    }
  }

  closeModel(): void {
    if (this.modelID) {
      (this.ifcAPI as any).CloseModel(this.modelID);
      this.modelID = 0;
    }
  }

  dispose(): void {
    this.closeModel();
  }
}

export function generateMockTunnelRings(
  totalRings: number,
  diameter: number = 6.2,
  thickness: number = 0.3,
  segmentWidth: number = 1.5
): LiningRing[] {
  const rings: LiningRing[] = [];
  const segmentsPerRing = 6;

  for (let ringIndex = 0; ringIndex < totalRings; ringIndex++) {
    const segments: TunnelSegment[] = [];
    const ringAngle = (ringIndex * Math.PI * 2) / 100;
    const curveRadius = 500;
    const x = ringIndex * segmentWidth;
    const y = Math.sin(ringAngle) * curveRadius - curveRadius;
    const z = Math.cos(ringAngle) * curveRadius - curveRadius;

    for (let segIndex = 0; segIndex < segmentsPerRing; segIndex++) {
      const segAngle = (segIndex / segmentsPerRing) * Math.PI * 2;
      segments.push({
        id: `segment-${ringIndex}-${segIndex}`,
        ifcGuid: `guid-${ringIndex}-${segIndex}`,
        ringNumber: ringIndex + 1,
        position: {
          x: x + Math.cos(segAngle) * 0.01,
          y: y + Math.sin(segAngle) * (diameter / 2 + thickness / 2),
          z: z + Math.cos(segAngle) * (diameter / 2 + thickness / 2),
        },
        rotation: {
          x: 0,
          y: (ringIndex * 0.5) % 360,
          z: (segAngle * 180) / Math.PI,
        },
        material: 'concrete',
        lodLevel: 0,
        visible: true,
      });
    }

    rings.push({
      id: `ring-${ringIndex + 1}`,
      ringNumber: ringIndex + 1,
      segmentsCount: segmentsPerRing,
      diameter,
      thickness,
      type: 'standard',
      segments,
    });
  }

  return rings;
}

export function createSimplifiedSegmentMesh(
  diameter: number,
  thickness: number,
  width: number,
  angle: number,
  lodLevel: number
): THREE.Mesh {
  const innerRadius = diameter / 2;
  const outerRadius = innerRadius + thickness;

  const detailLevels = [32, 16, 8, 4];
  const detail = detailLevels[Math.min(lodLevel, detailLevels.length - 1)];

  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, angle, angle + (Math.PI * 2) / 6 - 0.05, false);
  shape.absarc(0, 0, innerRadius, angle + (Math.PI * 2) / 6 - 0.05, angle, true);

  const extrudeSettings = {
    depth: width,
    bevelEnabled: false,
    steps: 1,
    curveSegments: detail,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(Math.PI / 2);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.3,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(geometry, material);
}
