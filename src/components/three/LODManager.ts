import * as THREE from 'three';
import type { LODConfig, FrustumCullingConfig } from '@/types/tbm';
import type { LiningRing } from '@/types/ifc';
import { computeDistanceToCamera, isInFrustum } from '@/utils/geometry';

export interface LODSegment {
  id: string;
  ringNumber: number;
  segmentIndex: number;
  meshes: THREE.Mesh[];
  currentLOD: number;
  visible: boolean;
  position: THREE.Vector3;
  boundingBox: THREE.Box3;
}

export interface LODRing {
  id: string;
  ringNumber: number;
  segments: LODSegment[];
  group: THREE.Group;
  distance: number;
  inFrustum: boolean;
}

export class LODManager {
  private rings: Map<string, LODRing> = new Map();
  private lodConfig: LODConfig;
  private frustumConfig: FrustumCullingConfig;
  private camera: THREE.Camera;
  private stats = {
    totalSegments: 0,
    visibleSegments: 0,
    culledSegments: 0,
    lod0Count: 0,
    lod1Count: 0,
    lod2Count: 0,
    lod3Count: 0,
  };

  constructor(
    camera: THREE.Camera,
    lodConfig: LODConfig,
    frustumConfig: FrustumCullingConfig
  ) {
    this.camera = camera;
    this.lodConfig = lodConfig;
    this.frustumConfig = frustumConfig;
  }

  addRing(ringData: LiningRing, ringGroup: THREE.Group): void {
    const segments: LODSegment[] = [];

    ringData.segments.forEach((segment, index) => {
      const segmentMeshes: THREE.Mesh[] = [];
      ringGroup.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.name.includes(`segment-${segment.ringNumber}-${index}`)
        ) {
          segmentMeshes.push(child);
        }
      });

      if (segmentMeshes.length > 0) {
        const position = new THREE.Vector3(
          segment.position.x,
          segment.position.y,
          segment.position.z
        );

        const boundingBox = new THREE.Box3().setFromObject(segmentMeshes[0]);

        segments.push({
          id: segment.id,
          ringNumber: segment.ringNumber,
          segmentIndex: index,
          meshes: segmentMeshes,
          currentLOD: 0,
          visible: segment.visible,
          position,
          boundingBox,
        });

        this.stats.totalSegments++;
      }
    });

    this.rings.set(ringData.id, {
      id: ringData.id,
      ringNumber: ringData.ringNumber,
      segments,
      group: ringGroup,
      distance: 0,
      inFrustum: true,
    });
  }

  update(): void {
    if (!this.frustumConfig.enabled) {
      this.showAll();
      return;
    }

    this.resetStats();

    this.rings.forEach((ring) => {
      const ringCenter = new THREE.Vector3();
      ring.group.getWorldPosition(ringCenter);

      ring.distance = computeDistanceToCamera(ring.group, this.camera);
      ring.inFrustum = isInFrustum(
        ring.group,
        this.camera,
        this.frustumConfig.margin
      );

      const targetLOD = this.getLODLevelForDistance(ring.distance);

      ring.segments.forEach((segment) => {
        const wasVisible = segment.visible;

        segment.visible = ring.inFrustum;

        if (segment.visible !== wasVisible) {
          segment.meshes.forEach((mesh) => {
            mesh.visible = segment.visible;
          });
        }

        if (segment.visible) {
          this.stats.visibleSegments++;

          if (this.frustumConfig.dynamicLOD && segment.currentLOD !== targetLOD) {
            this.updateSegmentLOD(segment, targetLOD);
          }

          this.updateLODStats(targetLOD);
        } else {
          this.stats.culledSegments++;
        }
      });
    });
  }

  private getLODLevelForDistance(distance: number): number {
    if (distance < this.lodConfig.level0.distance) return 0;
    if (distance < this.lodConfig.level1.distance) return 1;
    if (distance < this.lodConfig.level2.distance) return 2;
    return 3;
  }

  private updateSegmentLOD(segment: LODSegment, targetLOD: number): void {
    segment.currentLOD = targetLOD;

    segment.meshes.forEach((mesh) => {
      const geometry = mesh.geometry;
      const material = mesh.material as THREE.MeshStandardMaterial;

      switch (targetLOD) {
        case 0:
          material.wireframe = false;
          geometry.setDrawRange(0, Infinity);
          break;
        case 1:
          material.wireframe = false;
          break;
        case 2:
          material.wireframe = true;
          break;
        case 3:
          material.wireframe = true;
          break;
      }

      mesh.visible = targetLOD < 3;
    });
  }

  private showAll(): void {
    this.rings.forEach((ring) => {
      ring.inFrustum = true;
      ring.segments.forEach((segment) => {
        segment.visible = true;
        segment.meshes.forEach((mesh) => {
          mesh.visible = true;
          (mesh.material as THREE.MeshStandardMaterial).wireframe = false;
        });
      });
    });
    this.stats.visibleSegments = this.stats.totalSegments;
    this.stats.culledSegments = 0;
  }

  private resetStats(): void {
    this.stats.visibleSegments = 0;
    this.stats.culledSegments = 0;
    this.stats.lod0Count = 0;
    this.stats.lod1Count = 0;
    this.stats.lod2Count = 0;
    this.stats.lod3Count = 0;
  }

  private updateLODStats(lod: number): void {
    switch (lod) {
      case 0:
        this.stats.lod0Count++;
        break;
      case 1:
        this.stats.lod1Count++;
        break;
      case 2:
        this.stats.lod2Count++;
        break;
      case 3:
        this.stats.lod3Count++;
        break;
    }
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  getVisibleRings(): LODRing[] {
    return Array.from(this.rings.values()).filter((r) => r.inFrustum);
  }

  getRingByNumber(ringNumber: number): LODRing | undefined {
    return Array.from(this.rings.values()).find(
      (r) => r.ringNumber === ringNumber
    );
  }

  setLODConfig(config: Partial<LODConfig>): void {
    this.lodConfig = { ...this.lodConfig, ...config };
  }

  setFrustumConfig(config: Partial<FrustumCullingConfig>): void {
    this.frustumConfig = { ...this.frustumConfig, ...config };
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  clear(): void {
    this.rings.clear();
    this.resetStats();
    this.stats.totalSegments = 0;
  }

  dispose(): void {
    this.clear();
  }
}
