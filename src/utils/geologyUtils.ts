import * as THREE from 'three';
import type {
  BoreholePoint,
  DelaunayTriangulation,
  GeologyProfileData,
  SoilLayer,
  StressConcentrationZone,
} from '@/types/geology';
import { SOIL_LAYER_PRESETS } from '@/types/geology';

interface TriEdge {
  a: number;
  b: number;
  triIndex: number;
  opposite: number;
}

class Delaunay2D {
  private points: Array<{ u: number; v: number }> = [];
  private triangles: Array<[number, number, number]> = [];
  private tolerance: number = 1e-6;

  constructor(points?: Array<{ u: number; v: number }>) {
    if (points) {
      this.points = points.slice();
    }
  }

  addPoint(u: number, v: number): number {
    this.points.push({ u, v });
    return this.points.length - 1;
  }

  triangulate(): Array<[number, number, number]> {
    this.triangles = [];
    if (this.points.length < 3) return [];

    let minU = Infinity,
      minV = Infinity,
      maxU = -Infinity,
      maxV = -Infinity;
    for (const p of this.points) {
      if (p.u < minU) minU = p.u;
      if (p.v < minV) minV = p.v;
      if (p.u > maxU) maxU = p.u;
      if (p.v > maxV) maxV = p.v;
    }

    const spanU = maxU - minU;
    const spanV = maxV - minV;
    const span = Math.max(spanU, spanV, 1);
    const cx = (minU + maxU) / 2;
    const cy = (minV + maxV) / 2;

    const superP1 = { u: cx - 20 * span, v: cy - span };
    const superP2 = { u: cx + 20 * span, v: cy - span };
    const superP3 = { u: cx, v: cy + 20 * span };

    const allPoints = [superP1, superP2, superP3, ...this.points];
    const offset = 3;

    let tris: Array<[number, number, number]> = [[0, 1, 2]];

    for (let i = offset; i < allPoints.length; i++) {
      const p = allPoints[i];
      const edgeBuffer: TriEdge[] = [];
      const newTris: Array<[number, number, number]> = [];

      for (let j = 0; j < tris.length; j++) {
        const t = tris[j];
        const [a, b, c] = t;
        const pa = allPoints[a];
        const pb = allPoints[b];
        const pc = allPoints[c];

        const { inside } = this.inCircumcircle(p, pa, pb, pc);

        if (!inside) {
          newTris.push(t);
          continue;
        }

        this.addEdgeSorted(edgeBuffer, a, b, j, c);
        this.addEdgeSorted(edgeBuffer, b, c, j, a);
        this.addEdgeSorted(edgeBuffer, c, a, j, b);
      }

      const uniqueEdges = this.deduplicateEdges(edgeBuffer);
      for (const e of uniqueEdges) {
        newTris.push([e.a, e.b, i]);
      }

      tris = newTris;
    }

    const result: Array<[number, number, number]> = [];
    for (const t of tris) {
      if (t[0] < offset || t[1] < offset || t[2] < offset) continue;
      result.push([t[0] - offset, t[1] - offset, t[2] - offset]);
    }

    this.triangles = result;
    return result;
  }

  private addEdgeSorted(
    edges: TriEdge[],
    a: number,
    b: number,
    triIndex: number,
    opposite: number
  ) {
    if (a < b) {
      edges.push({ a, b, triIndex, opposite });
    } else {
      edges.push({ a: b, b: a, triIndex, opposite });
    }
  }

  private deduplicateEdges(edges: TriEdge[]): TriEdge[] {
    edges.sort((x, y) => (x.a === y.a ? x.b - y.b : x.a - y.a));
    const result: TriEdge[] = [];
    let i = 0;
    while (i < edges.length) {
      if (
        i + 1 < edges.length &&
        edges[i].a === edges[i + 1].a &&
        edges[i].b === edges[i + 1].b
      ) {
        i += 2;
      } else {
        result.push(edges[i]);
        i++;
      }
    }
    return result;
  }

  private inCircumcircle(
    p: { u: number; v: number },
    a: { u: number; v: number },
    b: { u: number; v: number },
    c: { u: number; v: number }
  ): { inside: boolean; det: number } {
    const ax = a.u - p.u;
    const ay = a.v - p.v;
    const bx = b.u - p.u;
    const by = b.v - p.v;
    const cxP = c.u - p.u;
    const cyP = c.v - p.v;

    const det =
      (ax * ax + ay * ay) * (bx * cyP - by * cxP) -
      (bx * bx + by * by) * (ax * cyP - ay * cxP) +
      (cxP * cxP + cyP * cyP) * (ax * by - ay * bx);

    return { inside: det > this.tolerance, det };
  }

  getEdges(): Array<[number, number]> {
    const edgeSet = new Set<string>();
    const result: Array<[number, number]> = [];
    for (const [a, b, c] of this.triangles) {
      const pairs: Array<[number, number]> = [
        [a, b],
        [b, c],
        [c, a],
      ];
      for (const [x, y] of pairs) {
        const key = x < y ? `${x}-${y}` : `${y}-${x}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          result.push([x, y]);
        }
      }
    }
    return result;
  }
}

export function performDelaunayTriangulation(
  boreholePoints: Array<{
    u: number;
    v: number;
    z: number;
    layerId: string;
    hardness: number;
  }>
): DelaunayTriangulation {
  const delaunay = new Delaunay2D();
  for (const p of boreholePoints) {
    delaunay.addPoint(p.u, p.v);
  }
  const triangles = delaunay.triangulate();
  const edges = delaunay.getEdges();
  return { vertices: boreholePoints.slice(), triangles, edges };
}

export function buildProfileFromTriangulation(
  triangulation: DelaunayTriangulation,
  width: number,
  height: number
): {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  hardnessData: Float32Array;
} {
  const { vertices, triangles } = triangulation;

  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const hardnessArr: number[] = [];
  const layerIds: number[] = [];
  const indices: number[] = [];

  const layerIdMap = new Map<string, number>();
  SOIL_LAYER_PRESETS.forEach((l, i) => layerIdMap.set(l.id, i));

  for (const v of vertices) {
    positions.push(v.u, v.z, v.v);
    uvs.push((v.u + width / 2) / width, (v.v + height / 2) / height);
    hardnessArr.push(v.hardness);
    layerIds.push(layerIdMap.get(v.layerId) ?? 0);

    const layer = SOIL_LAYER_PRESETS.find((l) => l.id === v.layerId);
    const col = new THREE.Color(layer?.color || '#888888');
    colors.push(col.r, col.g, col.b);
  }

  for (const tri of triangles) {
    indices.push(tri[0], tri[1], tri[2]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(colors, 3)
  );
  geometry.setAttribute(
    'a_hardness',
    new THREE.Float32BufferAttribute(hardnessArr, 1)
  );
  geometry.setAttribute(
    'a_layerId',
    new THREE.Float32BufferAttribute(layerIds, 1)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return {
    geometry,
    material: createGeologyShaderMaterial(),
    hardnessData: new Float32Array(hardnessArr),
  };
}

export function createGeologyShaderMaterial(): THREE.ShaderMaterial {
  const layerColors: number[][] = SOIL_LAYER_PRESETS.map((l) => {
    const c = new THREE.Color(l.color);
    return [c.r, c.g, c.b];
  });
  const layerColorFlat = layerColors.flat();

  return new THREE.ShaderMaterial({
    uniforms: {
      u_layerColors: {
        value: new Float32Array(layerColorFlat),
      },
      u_hardnessThreshold: { value: 0.75 },
      u_stressIntensity: { value: 0.0 },
      u_stressCenters: {
        value: new Float32Array(64),
      },
      u_stressCount: { value: 0 },
      u_time: { value: 0 },
      u_showStress: { value: 1.0 },
      u_transparency: { value: 0.92 },
    },
    vertexShader: `
      attribute float a_hardness;
      attribute float a_layerId;
      attribute vec3 color;

      varying vec3 vColor;
      varying vec2 vUv;
      varying float vHardness;
      varying float vLayerId;
      varying vec3 vWorldPos;

      void main() {
        vColor = color;
        vUv = uv;
        vHardness = a_hardness;
        vLayerId = a_layerId;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform vec3 u_layerColors[6];
      uniform float u_hardnessThreshold;
      uniform float u_stressIntensity;
      uniform vec2 u_stressCenters[32];
      uniform float u_stressCount;
      uniform float u_time;
      uniform float u_showStress;
      uniform float u_transparency;

      varying vec3 vColor;
      varying vec2 vUv;
      varying float vHardness;
      varying float vLayerId;
      varying vec3 vWorldPos;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        int layerIdx = int(clamp(vLayerId, 0.0, 5.0));
        vec3 baseColor = u_layerColors[layerIdx];

        float grain = fbm(vUv * 80.0) * 0.18;
        float ring = sin(vUv.y * 300.0) * 0.04;
        baseColor += grain + ring;

        float stress = 0.0;
        for (int i = 0; i < 32; i++) {
          if (float(i) >= u_stressCount) break;
          vec2 center = u_stressCenters[i];
          float d = distance(vUv, center);
          float radius = 0.12 + 0.04 * sin(u_time * 2.0 + float(i));
          stress += smoothstep(radius, 0.0, d) * (0.6 + 0.4 * sin(u_time * 3.0));
        }

        float aboveThreshold = smoothstep(
          u_hardnessThreshold - 0.1,
          u_hardnessThreshold + 0.05,
          vHardness
        );
        float alert = clamp(stress + aboveThreshold * 0.4, 0.0, 1.0) * u_showStress;

        vec3 stressColor = mix(
          vec3(1.0, 0.15, 0.05),
          vec3(1.0, 0.85, 0.0),
          1.0 - alert
        );
        vec3 finalColor = mix(baseColor, stressColor, alert * 0.75);

        float edgeDist = min(
          min(vUv.x, 1.0 - vUv.x),
          min(vUv.y, 1.0 - vUv.y)
        );
        float edgeGlow = smoothstep(0.0, 0.02, edgeDist) < 0.5 ? 1.0 : 0.0;
        finalColor += edgeGlow * 0.25 * vec3(0.0, 0.9, 1.0);

        float alpha = u_transparency;
        if (alert > 0.4) {
          alpha = 1.0;
        }

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
}

export function detectStressConcentrationZones(
  triangulation: DelaunayTriangulation,
  width: number,
  height: number,
  hardnessThreshold: number = 0.7
): StressConcentrationZone[] {
  const zones: StressConcentrationZone[] = [];
  const { vertices, triangles } = triangulation;

  const gridSize = 8;
  const cellW = width / gridSize;
  const cellH = height / gridSize;
  const gridHardness: number[][] = Array(gridSize + 2)
    .fill(0)
    .map(() => Array(gridSize + 2).fill(-1));
  const gridCount: number[][] = Array(gridSize + 2)
    .fill(0)
    .map(() => Array(gridSize + 2).fill(0));

  for (const v of vertices) {
    const cx = Math.floor((v.u + width / 2) / cellW);
    const cy = Math.floor((v.v + height / 2) / cellH);
    if (cx >= 0 && cx <= gridSize && cy >= 0 && cy <= gridSize) {
      if (gridHardness[cx][cy] < 0) {
        gridHardness[cx][cy] = v.hardness;
      } else {
        gridHardness[cx][cy] = (gridHardness[cx][cy] + v.hardness) / 2;
      }
      gridCount[cx][cy]++;
    }
  }

  for (let x = 1; x <= gridSize; x++) {
    for (let y = 1; y <= gridSize; y++) {
      if (gridCount[x][y] === 0) continue;
      const h = gridHardness[x][y];
      if (h < 0) continue;

      let maxDelta = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nh = gridHardness[x + dx][y + dy];
          if (nh >= 0) {
            const delta = Math.abs(h - nh);
            if (delta > maxDelta) maxDelta = delta;
          }
        }
      }

      if (maxDelta >= hardnessThreshold - 0.2 && h >= hardnessThreshold * 0.8) {
        zones.push({
          id: `stress-${x}-${y}`,
          centerU: (x + 0.5) * cellW - width / 2,
          centerV: (y + 0.5) * cellH - height / 2,
          radius: cellW * 1.2,
          intensity: Math.min(1.0, maxDelta * 1.6),
          hardnessDelta: maxDelta,
        });
      }
    }
  }

  if (zones.length === 0) {
    for (const v of vertices) {
      if (v.hardness >= hardnessThreshold) {
        zones.push({
          id: `stress-zone-${zones.length}`,
          centerU: v.u,
          centerV: v.v,
          radius: Math.max(cellW, cellH),
          intensity: v.hardness,
          hardnessDelta: v.hardness - 0.5,
        });
        if (zones.length >= 5) break;
      }
    }
  }

  return zones;
}

export function generateBoreholeGrid(
  cutterX: number,
  cutterY: number,
  cutterZ: number,
  profileWidth: number = 10,
  profileHeight: number = 10,
  gridCols: number = 7,
  gridRows: number = 7
): BoreholePoint[] {
  const points: BoreholePoint[] = [];
  const stepU = profileWidth / (gridCols - 1);
  const stepV = profileHeight / (gridRows - 1);
  const boreholeId = `BH-${Date.now()}`;

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const u = col * stepU - profileWidth / 2;
      const v = row * stepV - profileHeight / 2;

      const normalizedV = (v + profileHeight / 2) / profileHeight;
      const noiseBase = Math.sin(col * 0.7 + row * 0.9) * 0.5 + 0.5;
      const wave = Math.sin(u * 0.6 + v * 0.4 + cutterX * 0.01) * 0.3;
      const layerDepthFactor = normalizedV + noiseBase * 0.2 + wave * 0.15;

      let layer: SoilLayer;
      let hardness: number;

      if (layerDepthFactor < 0.25) {
        layer = SOIL_LAYER_PRESETS[0];
        hardness = layer.hardness + (Math.random() - 0.5) * 0.05;
      } else if (layerDepthFactor < 0.45) {
        layer = SOIL_LAYER_PRESETS[1];
        hardness = layer.hardness + (Math.random() - 0.5) * 0.08;
      } else if (layerDepthFactor < 0.65) {
        layer = SOIL_LAYER_PRESETS[2];
        hardness = layer.hardness + (Math.random() - 0.5) * 0.1;
      } else if (layerDepthFactor < 0.82) {
        layer = SOIL_LAYER_PRESETS[3];
        hardness = layer.hardness + (Math.random() - 0.5) * 0.07;
      } else {
        layer = SOIL_LAYER_PRESETS[4];
        hardness = layer.hardness + (Math.random() - 0.5) * 0.04;
      }

      const sharpZoneX =
        Math.sin(cutterX * 0.02) * profileWidth * 0.3 +
        Math.cos(cutterZ * 0.015) * profileWidth * 0.2;
      const sharpZoneY =
        Math.sin(cutterZ * 0.025) * profileHeight * 0.25;
      const distToSharp = Math.sqrt(
        Math.pow(u - sharpZoneX, 2) + Math.pow(v - sharpZoneY, 2)
      );
      if (distToSharp < 1.8) {
        layer = SOIL_LAYER_PRESETS[4];
        hardness = 0.93 + Math.random() * 0.07;
      }

      const mixedZoneX = profileWidth * 0.1;
      const mixedZoneY = -profileHeight * 0.15;
      if (
        Math.sqrt(
          Math.pow(u - mixedZoneX, 2) + Math.pow(v - mixedZoneY, 2)
        ) < 1.5
      ) {
        layer = SOIL_LAYER_PRESETS[5];
        hardness = 0.5 + Math.random() * 0.3;
      }

      points.push({
        id: `pt-${row}-${col}-${Date.now()}`,
        boreholeId,
        x: cutterX,
        y: cutterY,
        z: cutterZ,
        depth: v,
        layerId: layer.id,
        hardness: Math.max(0, Math.min(1, hardness)),
        soilType: layer.soilType,
        timestamp: Date.now(),
      });
    }
  }

  return points;
}

export function buildGeologyProfileData(
  cutterX: number,
  cutterY: number,
  cutterZ: number,
  cutterQuat: { x: number; y: number; z: number; w: number },
  options?: {
    profileWidth?: number;
    profileHeight?: number;
    hardnessThreshold?: number;
  }
): GeologyProfileData {
  const cfg = {
    profileWidth: 10,
    profileHeight: 10,
    hardnessThreshold: 0.7,
    ...options,
  };

  const boreholePoints = generateBoreholeGrid(
    cutterX,
    cutterY,
    cutterZ,
    cfg.profileWidth,
    cfg.profileHeight,
    8,
    8
  );

  const triangulationVertices = boreholePoints.map((pt) => {
    const u = pt.depth >= 0 ? 0 : 0;
    const vV = pt.depth;
    const normalizedX =
      (parseFloat(pt.id.split('-')[2]) % 8) * (cfg.profileWidth / 7) -
      cfg.profileWidth / 2;
    return {
      u: normalizedX,
      v: vV,
      z: 0,
      layerId: pt.layerId,
      hardness: pt.hardness,
    };
  });

  const triangulation = performDelaunayTriangulation(triangulationVertices);

  const stressZones = detectStressConcentrationZones(
    triangulation,
    cfg.profileWidth,
    cfg.profileHeight,
    cfg.hardnessThreshold
  );

  const q = new THREE.Quaternion(
    cutterQuat.x,
    cutterQuat.y,
    cutterQuat.z,
    cutterQuat.w
  );
  const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(q);

  return {
    profileId: `profile-${Date.now()}`,
    timestamp: Date.now(),
    boreholePoints,
    soilLayers: SOIL_LAYER_PRESETS,
    triangulation,
    stressZones,
    centerPoint: { x: cutterX, y: cutterY, z: cutterZ },
    normal: { x: forward.x, y: forward.y, z: forward.z },
    width: cfg.profileWidth,
    height: cfg.profileHeight,
  };
}
