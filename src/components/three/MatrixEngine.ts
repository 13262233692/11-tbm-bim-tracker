import * as THREE from 'three';
import type { TbmPoseData, TransformHierarchy } from '@/types/tbm';
import {
  buildTransformHierarchy,
  interpolateMatrices,
  DEG2RAD,
  slerpQuaternions,
  buildQuaternionPoseState,
  interpolatePoseWithQuaternion,
  composeMatrixFromTRS,
} from '@/utils/matrixUtils';

interface PoseState {
  position: THREE.Vector3;
  bodyQuaternion: THREE.Quaternion;
}

export class MatrixEngine {
  private currentTransforms: TransformHierarchy | null = null;
  private currentPose: PoseState | null = null;
  private targetPose: PoseState | null = null;

  private interpolationProgress: number = 1;
  private interpolationDuration: number = 100;
  private lastUpdateTime: number = 0;

  private cutterHeadAccumulatedRotation: number = 0;
  private lastCutterSpeed: number = 0;
  private lastRingCount: number = 0;

  private pendingPoseData: TbmPoseData | null = null;

  constructor(interpolationDuration: number = 100) {
    this.interpolationDuration = interpolationDuration;
  }

  updateTargetPose(pose: TbmPoseData): void {
    this.pendingPoseData = pose;
    this.lastCutterSpeed = pose.cutterHead.speed;
    this.lastRingCount = pose.ringCount;

    const newTargetPose = buildQuaternionPoseState(pose);

    if (!this.currentPose) {
      this.currentPose = {
        position: newTargetPose.position.clone(),
        bodyQuaternion: newTargetPose.bodyQuaternion.clone(),
      };
      this.targetPose = {
        position: newTargetPose.position.clone(),
        bodyQuaternion: newTargetPose.bodyQuaternion.clone(),
      };
      this.currentTransforms = buildTransformHierarchy(
        pose,
        this.currentPose.bodyQuaternion
      );
      this.interpolationProgress = 1;
    } else {
      const dot = this.currentPose.bodyQuaternion.dot(newTargetPose.bodyQuaternion);
      if (dot < 0) {
        newTargetPose.bodyQuaternion.x = -newTargetPose.bodyQuaternion.x;
        newTargetPose.bodyQuaternion.y = -newTargetPose.bodyQuaternion.y;
        newTargetPose.bodyQuaternion.z = -newTargetPose.bodyQuaternion.z;
        newTargetPose.bodyQuaternion.w = -newTargetPose.bodyQuaternion.w;
      }
      this.targetPose = {
        position: newTargetPose.position.clone(),
        bodyQuaternion: newTargetPose.bodyQuaternion.clone(),
      };
      this.interpolationProgress = 0;
      this.lastUpdateTime = performance.now();
    }
  }

  update(deltaTime: number): void {
    if (!this.currentPose || !this.targetPose) return;

    const currentTime = performance.now();

    if (this.interpolationProgress < 1) {
      const elapsed = currentTime - this.lastUpdateTime;
      this.interpolationProgress = Math.min(1, elapsed / this.interpolationDuration);

      const t = this.easeInOutCubic(this.interpolationProgress);

      const interpolated = interpolatePoseWithQuaternion(
        this.currentPose.position,
        this.currentPose.bodyQuaternion,
        this.targetPose.position,
        this.targetPose.bodyQuaternion,
        t
      );

      this.currentPose.position.copy(interpolated.position);
      this.currentPose.bodyQuaternion.copy(interpolated.quaternion);
    }

    this.cutterHeadAccumulatedRotation +=
      (this.lastCutterSpeed * DEG2RAD * deltaTime) / 60;
    while (this.cutterHeadAccumulatedRotation > Math.PI * 2) {
      this.cutterHeadAccumulatedRotation -= Math.PI * 2;
    }
    while (this.cutterHeadAccumulatedRotation < 0) {
      this.cutterHeadAccumulatedRotation += Math.PI * 2;
    }

    if (this.currentPose) {
      this.rebuildTransforms();
    }
  }

  private rebuildTransforms(): void {
    if (!this.currentPose || !this.pendingPoseData) return;

    const { position, bodyQuaternion } = this.currentPose;
    const pose = this.pendingPoseData;

    const rootMatrix = new THREE.Matrix4().makeTranslation(
      position.x,
      position.y,
      position.z
    );

    const bodyRotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(
      bodyQuaternion.clone().normalize()
    );
    const bodyWorld = rootMatrix.clone().multiply(bodyRotationMatrix);

    const cutterHeadLocal = this.buildCutterHeadLocalMatrix();
    const cutterHeadWorld = bodyWorld.clone().multiply(cutterHeadLocal);

    const screwConveyorLocal = new THREE.Matrix4().makeTranslation(-1.5, -1, -3);
    const screwConveyorWorld = bodyWorld.clone().multiply(screwConveyorLocal);

    const erectorLocal = this.buildErectorLocalMatrix();
    const erectorWorld = bodyWorld.clone().multiply(erectorLocal);

    this.currentTransforms = {
      root: rootMatrix,
      body: bodyWorld,
      cutterHead: cutterHeadWorld,
      screwConveyor: screwConveyorWorld,
      erector: erectorWorld,
    };
  }

  private buildCutterHeadLocalMatrix(): THREE.Matrix4 {
    const rotation = new THREE.Matrix4().makeRotationZ(
      this.cutterHeadAccumulatedRotation
    );
    const offset = new THREE.Matrix4().makeTranslation(
      0,
      0,
      this.lastCutterSpeed > 0 ? 0.5 : 0
    );
    return offset.clone().multiply(rotation);
  }

  private buildErectorLocalMatrix(): THREE.Matrix4 {
    const rotation = new THREE.Matrix4().makeRotationZ(
      (this.lastRingCount % 6) * 60 * DEG2RAD
    );
    const offset = new THREE.Matrix4().makeTranslation(0, 0, -6);
    return offset.clone().multiply(rotation);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  getTransforms(): TransformHierarchy | null {
    return this.currentTransforms;
  }

  getBodyPosition(): THREE.Vector3 | null {
    return this.currentPose ? this.currentPose.position.clone() : null;
  }

  getBodyQuaternion(): THREE.Quaternion | null {
    return this.currentPose
      ? this.currentPose.bodyQuaternion.clone().normalize()
      : null;
  }

  getCutterHeadRotation(): number {
    return this.cutterHeadAccumulatedRotation;
  }

  applyToObject3D(
    object: THREE.Object3D,
    matrix: THREE.Matrix4 | null
  ): void {
    if (!matrix) return;

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);

    object.position.copy(position);
    object.quaternion.copy(quaternion.normalize());
    object.scale.copy(scale);
    object.matrixAutoUpdate = false;
    object.matrix.copy(matrix);
    object.matrixWorldNeedsUpdate = true;
  }

  reset(): void {
    this.currentTransforms = null;
    this.currentPose = null;
    this.targetPose = null;
    this.pendingPoseData = null;
    this.interpolationProgress = 1;
    this.cutterHeadAccumulatedRotation = 0;
    this.lastCutterSpeed = 0;
    this.lastRingCount = 0;
  }

  setInterpolationDuration(duration: number): void {
    this.interpolationDuration = Math.max(16, duration);
  }
}

export function createTBMGroup(): {
  root: THREE.Group;
  body: THREE.Group;
  cutterHead: THREE.Group;
  screwConveyor: THREE.Group;
  erector: THREE.Group;
} {
  const root = new THREE.Group();
  root.name = 'TBM_Root';

  const body = new THREE.Group();
  body.name = 'TBM_Body';

  const cutterHead = new THREE.Group();
  cutterHead.name = 'TBM_CutterHead';

  const screwConveyor = new THREE.Group();
  screwConveyor.name = 'TBM_ScrewConveyor';

  const erector = new THREE.Group();
  erector.name = 'TBM_Erector';

  body.add(cutterHead);
  body.add(screwConveyor);
  body.add(erector);
  root.add(body);

  return { root, body, cutterHead, screwConveyor, erector };
}
