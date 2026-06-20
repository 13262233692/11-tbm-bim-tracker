import * as THREE from 'three';

export function createCylinderSegment(
  innerRadius: number,
  outerRadius: number,
  height: number,
  thetaStart: number,
  thetaLength: number,
  detail: number = 32
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, thetaStart, thetaStart + thetaLength, false);
  shape.absarc(0, 0, innerRadius, thetaStart + thetaLength, thetaStart, true);

  const extrudeSettings = {
    depth: height,
    bevelEnabled: false,
    steps: 1,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, height / 2, 0);
  geometry.computeVertexNormals();

  return geometry;
}

export function createTunnelRing(
  diameter: number,
  thickness: number,
  width: number,
  segmentsCount: number = 6,
  lodLevel: number = 0
): THREE.BufferGeometry[] {
  const innerRadius = diameter / 2;
  const outerRadius = innerRadius + thickness;
  const segmentAngle = (Math.PI * 2) / segmentsCount;

  const detailLevels = [64, 32, 16, 8];
  const detail = detailLevels[Math.min(lodLevel, detailLevels.length - 1)];

  const geometries: THREE.BufferGeometry[] = [];

  for (let i = 0; i < segmentsCount; i++) {
    const thetaStart = i * segmentAngle;
    const geometry = createCylinderSegment(
      innerRadius,
      outerRadius,
      width,
      thetaStart,
      segmentAngle * 0.98,
      detail
    );
    geometries.push(geometry);
  }

  return geometries;
}

export function createTBMBody(
  length: number,
  diameter: number,
  lodLevel: number = 0
): THREE.Group {
  const group = new THREE.Group();
  const detailLevels = [64, 32, 16, 8];
  const detail = detailLevels[Math.min(lodLevel, detailLevels.length - 1)];

  const bodyGeometry = new THREE.CylinderGeometry(
    diameter / 2,
    diameter / 2,
    length,
    detail,
    1,
    true
  );
  bodyGeometry.rotateX(Math.PI / 2);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.3,
    side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  group.add(body);

  const frontCapGeometry = new THREE.CircleGeometry(diameter / 2, detail);
  frontCapGeometry.rotateY(Math.PI / 2);
  frontCapGeometry.translate(length / 2, 0, 0);
  const frontCap = new THREE.Mesh(frontCapGeometry, bodyMaterial);
  group.add(frontCap);

  const rearCapGeometry = new THREE.CircleGeometry(diameter / 2, detail);
  rearCapGeometry.rotateY(-Math.PI / 2);
  rearCapGeometry.translate(-length / 2, 0, 0);
  const rearCap = new THREE.Mesh(rearCapGeometry, bodyMaterial);
  group.add(rearCap);

  return group;
}

export function createCutterHead(
  diameter: number,
  lodLevel: number = 0
): THREE.Group {
  const group = new THREE.Group();
  const detailLevels = [16, 8, 4, 2];
  const spokes = detailLevels[Math.min(lodLevel, detailLevels.length - 1)];

  const hubGeometry = new THREE.CylinderGeometry(0.8, 1.2, 0.6, 32);
  hubGeometry.rotateX(Math.PI / 2);
  const hubMaterial = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.9,
    roughness: 0.2,
  });
  const hub = new THREE.Mesh(hubGeometry, hubMaterial);
  hub.position.x = 0.3;
  group.add(hub);

  const cutterMaterial = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.6,
    roughness: 0.4,
  });

  for (let i = 0; i < spokes; i++) {
    const angle = (i / spokes) * Math.PI * 2;
    const spokeGeometry = new THREE.BoxGeometry(diameter / 2 - 1, 0.3, 0.15);
    const spoke = new THREE.Mesh(spokeGeometry, cutterMaterial);
    spoke.position.set(diameter / 4 + 0.5, 0, 0);
    spoke.rotation.z = angle;
    spoke.position.x = Math.cos(angle) * (diameter / 4) + 0.3;
    spoke.position.y = Math.sin(angle) * (diameter / 4);
    spoke.rotation.y = angle;
    group.add(spoke);
  }

  const teethCount = lodLevel === 0 ? 24 : lodLevel === 1 ? 12 : 6;
  const toothMaterial = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    metalness: 0.7,
    roughness: 0.3,
  });

  for (let i = 0; i < teethCount; i++) {
    const angle = (i / teethCount) * Math.PI * 2;
    const toothGeometry = new THREE.ConeGeometry(0.12, 0.3, 6);
    toothGeometry.rotateZ(Math.PI / 2);
    const tooth = new THREE.Mesh(toothGeometry, toothMaterial);
    tooth.position.set(
      Math.cos(angle) * (diameter / 2) + 0.15,
      Math.sin(angle) * (diameter / 2),
      0
    );
    tooth.rotation.y = angle;
    group.add(tooth);
  }

  return group;
}

export function createTrack(diameter: number, length: number): THREE.Line {
  const points: THREE.Vector3[] = [];
  const segments = Math.floor(length / 2);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = -length / 2 + t * length;
    const angle = Math.sin(t * Math.PI * 0.5) * 0.3;
    const y = Math.sin(angle) * diameter * 0.3;
    const z = Math.cos(angle) * diameter * 0.3;
    points.push(new THREE.Vector3(x, y, z));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color: 0x00d4ff,
    linewidth: 2,
    dashSize: 1,
    gapSize: 0.5,
  });

  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

export function computeDistanceToCamera(
  object: THREE.Object3D,
  camera: THREE.Camera
): number {
  const objectPos = new THREE.Vector3();
  const cameraPos = new THREE.Vector3();
  object.getWorldPosition(objectPos);
  camera.getWorldPosition(cameraPos);
  return objectPos.distanceTo(cameraPos);
}

export function isInFrustum(
  object: THREE.Object3D,
  camera: THREE.Camera,
  margin: number = 0
): boolean {
  const frustum = new THREE.Frustum();
  const projScreenMatrix = new THREE.Matrix4();
  projScreenMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );
  frustum.setFromProjectionMatrix(projScreenMatrix);

  const box = new THREE.Box3().setFromObject(object);
  box.expandByScalar(margin);
  return frustum.intersectsBox(box);
}
