import * as THREE from 'three';
import type { TbmPoseData, TransformHierarchy } from '@/types/tbm';

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

export function createIdentityMatrix(): THREE.Matrix4 {
  return new THREE.Matrix4().identity();
}

export function eulerToQuaternion(
  pitch: number,
  yaw: number,
  roll: number
): THREE.Quaternion {
  const quaternion = new THREE.Quaternion();
  quaternion.setFromEuler(new THREE.Euler(pitch * DEG2RAD, yaw * DEG2RAD, roll * DEG2RAD, 'YZX'));
  return quaternion;
}

export function quaternionToEuler(quaternion: THREE.Quaternion): {
  pitch: number;
  yaw: number;
  roll: number;
} {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YZX');
  return {
    pitch: euler.x * RAD2DEG,
    yaw: euler.y * RAD2DEG,
    roll: euler.z * RAD2DEG,
  };
}

export function buildTransformHierarchy(pose: TbmPoseData): TransformHierarchy {
  const rootMatrix = new THREE.Matrix4();
  rootMatrix.makeTranslation(pose.position.x, pose.position.y, pose.position.z);

  const rotationQuat = eulerToQuaternion(
    pose.rotation.pitch,
    pose.rotation.yaw,
    pose.rotation.roll
  );
  const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(rotationQuat);

  const bodyMatrix = rotationMatrix.clone();

  const cutterHeadRotation = new THREE.Matrix4().makeRotationZ(
    pose.cutterHead.rotation * DEG2RAD
  );
  const cutterHeadMatrix = new THREE.Matrix4().makeTranslation(0, 0, pose.cutterHead.speed > 0 ? 0.5 : 0);
  cutterHeadMatrix.premultiply(cutterHeadRotation);

  const screwConveyorMatrix = new THREE.Matrix4().makeTranslation(-1.5, -1, -3);

  const erectorRotation = new THREE.Matrix4().makeRotationZ(
    (pose.ringCount % 6) * 60 * DEG2RAD
  );
  const erectorMatrix = new THREE.Matrix4().makeTranslation(0, 0, -6);
  erectorMatrix.premultiply(erectorRotation);

  const bodyWorld = rootMatrix.clone().multiply(bodyMatrix);
  const cutterHeadWorld = bodyWorld.clone().multiply(cutterHeadMatrix);
  const screwConveyorWorld = bodyWorld.clone().multiply(screwConveyorMatrix);
  const erectorWorld = bodyWorld.clone().multiply(erectorMatrix);

  return {
    root: rootMatrix,
    body: bodyWorld,
    cutterHead: cutterHeadWorld,
    screwConveyor: screwConveyorWorld,
    erector: erectorWorld,
  };
}

export function interpolateMatrices(
  matrixA: THREE.Matrix4,
  matrixB: THREE.Matrix4,
  t: number
): THREE.Matrix4 {
  const posA = new THREE.Vector3();
  const quatA = new THREE.Quaternion();
  const scaleA = new THREE.Vector3();
  matrixA.decompose(posA, quatA, scaleA);

  const posB = new THREE.Vector3();
  const quatB = new THREE.Quaternion();
  const scaleB = new THREE.Vector3();
  matrixB.decompose(posB, quatB, scaleB);

  const pos = posA.clone().lerp(posB, t);
  const quat = quatA.clone().slerp(quatB, t);
  const scale = scaleA.clone().lerp(scaleB, t);

  const result = new THREE.Matrix4();
  result.compose(pos, quat, scale);
  return result;
}

export function extractPosition(matrix: THREE.Matrix4): THREE.Vector3 {
  const position = new THREE.Vector3();
  position.setFromMatrixPosition(matrix);
  return position;
}

export function extractRotation(matrix: THREE.Matrix4): THREE.Euler {
  const quaternion = new THREE.Quaternion();
  matrix.decompose(new THREE.Vector3(), quaternion, new THREE.Vector3());
  return new THREE.Euler().setFromQuaternion(quaternion, 'YZX');
}
