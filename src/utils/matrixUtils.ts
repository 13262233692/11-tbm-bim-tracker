import * as THREE from 'three';
import type { TbmPoseData, TransformHierarchy } from '@/types/tbm';

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

const EPSILON = 1e-10;

export function createIdentityMatrix(): THREE.Matrix4 {
  return new THREE.Matrix4().identity();
}

export function createIdentityQuaternion(): THREE.Quaternion {
  return new THREE.Quaternion();
}

export function eulerToQuaternionSafe(
  pitch: number,
  yaw: number,
  roll: number
): THREE.Quaternion {
  const p = pitch * DEG2RAD;
  const yAng = yaw * DEG2RAD;
  const r = roll * DEG2RAD;

  const sinPitch = Math.sin(p * 0.5);
  const cosPitch = Math.cos(p * 0.5);
  const sinYaw = Math.sin(yAng * 0.5);
  const cosYaw = Math.cos(yAng * 0.5);
  const sinRoll = Math.sin(r * 0.5);
  const cosRoll = Math.cos(r * 0.5);

  const cosPitchCosYaw = cosPitch * cosYaw;
  const sinPitchSinYaw = sinPitch * sinYaw;

  const w = cosPitchCosYaw * cosRoll + sinPitchSinYaw * sinRoll;
  const x = sinPitch * cosYaw * cosRoll - cosPitch * sinYaw * sinRoll;
  const yQuat = cosPitch * sinYaw * cosRoll + sinPitch * cosYaw * sinRoll;
  const z = cosPitchCosYaw * sinRoll - sinPitchSinYaw * cosRoll;

  const q = new THREE.Quaternion(x, yQuat, z, w);
  if (q.lengthSq() < EPSILON) {
    q.identity();
  } else {
    q.normalize();
  }
  return q;
}

export function eulerToQuaternion(
  pitch: number,
  yaw: number,
  roll: number
): THREE.Quaternion {
  return eulerToQuaternionSafe(pitch, yaw, roll);
}

export function quaternionToEuler(quaternion: THREE.Quaternion): {
  pitch: number;
  yaw: number;
  roll: number;
} {
  const q = quaternion.clone().normalize();

  const sinrCosp = 2 * (q.w * q.x + q.y * q.z);
  const cosrCosp = 1 - 2 * (q.x * q.x + q.y * q.y);
  const roll = Math.atan2(sinrCosp, cosrCosp);

  let sinp = 2 * (q.w * q.y - q.z * q.x);
  let pitch: number;
  if (Math.abs(sinp) >= 1) {
    pitch = sinp >= 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    pitch = Math.asin(sinp);
  }

  const sinyCosp = 2 * (q.w * q.z + q.x * q.y);
  const cosyCosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  const yaw = Math.atan2(sinyCosp, cosyCosp);

  return {
    pitch: pitch * RAD2DEG,
    yaw: yaw * RAD2DEG,
    roll: roll * RAD2DEG,
  };
}

export function multiplyQuaternions(
  a: THREE.Quaternion,
  b: THREE.Quaternion
): THREE.Quaternion {
  return new THREE.Quaternion().multiplyQuaternions(a, b).normalize();
}

export function slerpQuaternions(
  from: THREE.Quaternion,
  to: THREE.Quaternion,
  t: number
): THREE.Quaternion {
  const clampedT = Math.max(0, Math.min(1, t));
  const result = from.clone().slerp(to, clampedT);
  if (result.lengthSq() < EPSILON) {
    return to.clone().normalize();
  }
  return result.normalize();
}

export function composeMatrixFromTRS(
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1)
): THREE.Matrix4 {
  const matrix = new THREE.Matrix4();
  matrix.compose(position, quaternion, scale);
  return matrix;
}

export function buildQuaternionPoseState(pose: TbmPoseData): {
  position: THREE.Vector3;
  bodyQuaternion: THREE.Quaternion;
} {
  return {
    position: new THREE.Vector3(
      pose.position.x,
      pose.position.y,
      pose.position.z
    ),
    bodyQuaternion: eulerToQuaternionSafe(
      pose.rotation.pitch,
      pose.rotation.yaw,
      pose.rotation.roll
    ),
  };
}

export function buildTransformHierarchy(
  pose: TbmPoseData,
  baseBodyQuaternion?: THREE.Quaternion
): TransformHierarchy {
  const rootPosition = new THREE.Vector3(
    pose.position.x,
    pose.position.y,
    pose.position.z
  );
  const rootMatrix = new THREE.Matrix4().makeTranslation(
    rootPosition.x,
    rootPosition.y,
    rootPosition.z
  );

  const rotationQuat = baseBodyQuaternion
    ? baseBodyQuaternion.clone().normalize()
    : eulerToQuaternionSafe(
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

export function interpolatePoseWithQuaternion(
  prevPos: THREE.Vector3,
  prevQuat: THREE.Quaternion,
  targetPos: THREE.Vector3,
  targetQuat: THREE.Quaternion,
  t: number
): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  const position = prevPos.clone().lerp(targetPos, Math.max(0, Math.min(1, t)));
  const quaternion = slerpQuaternions(prevQuat, targetQuat, t);
  return { position, quaternion };
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

  const pos = posA.clone().lerp(posB, Math.max(0, Math.min(1, t)));
  const quat = slerpQuaternions(quatA, quatB, t);
  const scale = scaleA.clone().lerp(scaleB, Math.max(0, Math.min(1, t)));

  const result = new THREE.Matrix4();
  result.compose(pos, quat, scale);
  return result;
}

export function extractPosition(matrix: THREE.Matrix4): THREE.Vector3 {
  const position = new THREE.Vector3();
  position.setFromMatrixPosition(matrix);
  return position;
}

export function extractRotationQuaternion(matrix: THREE.Matrix4): THREE.Quaternion {
  const quaternion = new THREE.Quaternion();
  matrix.decompose(new THREE.Vector3(), quaternion, new THREE.Vector3());
  return quaternion.normalize();
}

export function extractRotation(matrix: THREE.Matrix4): THREE.Euler {
  const quaternion = extractRotationQuaternion(matrix);
  return new THREE.Euler().setFromQuaternion(quaternion, 'YZX');
}
