import * as THREE from 'three';
import type { TbmPoseData, TransformHierarchy } from '@/types/tbm';
import { buildTransformHierarchy, interpolateMatrices, DEG2RAD } from '@/utils/matrixUtils';

export class MatrixEngine {
  private currentTransforms: TransformHierarchy | null = null;
  private targetTransforms: TransformHierarchy | null = null;
  private interpolationProgress: number = 1;
  private interpolationDuration: number = 100;
  private lastUpdateTime: number = 0;
  private cutterHeadAccumulatedRotation: number = 0;
  private lastCutterSpeed: number = 0;

  constructor(interpolationDuration: number = 100) {
    this.interpolationDuration = interpolationDuration;
  }

  updateTargetPose(pose: TbmPoseData): void {
    if (this.currentTransforms) {
      this.targetTransforms = buildTransformHierarchy(pose);
      this.interpolationProgress = 0;
      this.lastUpdateTime = performance.now();
    } else {
      this.currentTransforms = buildTransformHierarchy(pose);
      this.targetTransforms = this.currentTransforms;
      this.interpolationProgress = 1;
    }
    this.lastCutterSpeed = pose.cutterHead.speed;
  }

  update(deltaTime: number): void {
    if (!this.currentTransforms || !this.targetTransforms) return;

    if (this.interpolationProgress < 1) {
      const elapsed = performance.now() - this.lastUpdateTime;
      this.interpolationProgress = Math.min(1, elapsed / this.interpolationDuration);

      const t = this.easeInOutCubic(this.interpolationProgress);

      this.currentTransforms = {
        root: interpolateMatrices(
          this.targetTransforms.root,
          this.targetTransforms.root,
          1
        ),
        body: interpolateMatrices(
          this.currentTransforms.body,
          this.targetTransforms.body,
          t
        ),
        cutterHead: this.interpolateCutterHead(t),
        screwConveyor: interpolateMatrices(
          this.currentTransforms.screwConveyor,
          this.targetTransforms.screwConveyor,
          t
        ),
        erector: interpolateMatrices(
          this.currentTransforms.erector,
          this.targetTransforms.erector,
          t
        ),
      };
    }

    this.cutterHeadAccumulatedRotation +=
      (this.lastCutterSpeed * DEG2RAD * deltaTime) / 60;

    if (this.currentTransforms) {
      const rotationMatrix = new THREE.Matrix4().makeRotationZ(
        this.cutterHeadAccumulatedRotation
      );
      const offsetMatrix = new THREE.Matrix4().makeTranslation(0, 0, 0.5);
      const cutterLocal = offsetMatrix.clone().multiply(rotationMatrix);

      const bodyWorld = this.currentTransforms.body.clone();
      this.currentTransforms.cutterHead = bodyWorld.multiply(cutterLocal);
    }
  }

  private interpolateCutterHead(t: number): THREE.Matrix4 {
    if (!this.currentTransforms || !this.targetTransforms) {
      return new THREE.Matrix4();
    }

    const posA = new THREE.Vector3();
    const quatA = new THREE.Quaternion();
    const scaleA = new THREE.Vector3();
    this.currentTransforms.cutterHead.decompose(posA, quatA, scaleA);

    const posB = new THREE.Vector3();
    const quatB = new THREE.Quaternion();
    const scaleB = new THREE.Vector3();
    this.targetTransforms.cutterHead.decompose(posB, quatB, scaleB);

    const pos = posA.clone().lerp(posB, t);
    const quat = quatA.clone().slerp(quatB, t);
    const scale = scaleA.clone().lerp(scaleB, t);

    const rotationMatrix = new THREE.Matrix4().makeRotationZ(
      this.cutterHeadAccumulatedRotation
    );

    const result = new THREE.Matrix4();
    result.compose(pos, quat, scale);
    result.multiply(rotationMatrix);

    return result;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  getTransforms(): TransformHierarchy | null {
    return this.currentTransforms;
  }

  getBodyPosition(): THREE.Vector3 | null {
    if (!this.currentTransforms) return null;
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(this.currentTransforms.body);
    return position;
  }

  getBodyQuaternion(): THREE.Quaternion | null {
    if (!this.currentTransforms) return null;
    const quaternion = new THREE.Quaternion();
    this.currentTransforms.body.decompose(
      new THREE.Vector3(),
      quaternion,
      new THREE.Vector3()
    );
    return quaternion;
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
    object.quaternion.copy(quaternion);
    object.scale.copy(scale);
    object.matrixAutoUpdate = false;
    object.matrix.copy(matrix);
    object.matrixWorldNeedsUpdate = true;
  }

  reset(): void {
    this.currentTransforms = null;
    this.targetTransforms = null;
    this.interpolationProgress = 1;
    this.cutterHeadAccumulatedRotation = 0;
    this.lastCutterSpeed = 0;
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
