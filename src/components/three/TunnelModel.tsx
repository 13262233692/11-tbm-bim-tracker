import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LODManager } from './LODManager';
import type { LiningRing } from '@/types/ifc';
import { createSimplifiedSegmentMesh } from '@/utils/ifcUtils';
import { useModelStore, selectTunnelRings, selectLODConfig } from '@/store/modelStore';

interface TunnelModelProps {
  lodManager: React.MutableRefObject<LODManager | null>;
}

export const TunnelModel: React.FC<TunnelModelProps> = ({ lodManager }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const tunnelRings = useModelStore(selectTunnelRings);
  const lodConfig = useModelStore(selectLODConfig);
  const frustumConfig = useModelStore((state) => state.frustumConfig);
  const tbmConfig = useModelStore((state) => state.tbmConfig);
  const setRenderStats = useModelStore((state) => state.setRenderStats);
  const ringsRef = useRef<Map<string, THREE.Group>>(new Map());

  useEffect(() => {
    if (!groupRef.current) return;

    lodManager.current = new LODManager(camera, lodConfig, frustumConfig);

    return () => {
      lodManager.current?.dispose();
    };
  }, [camera, lodConfig, frustumConfig, lodManager]);

  useEffect(() => {
    if (!groupRef.current || !lodManager.current) return;

    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    ringsRef.current.clear();
    lodManager.current.clear();

    tunnelRings.forEach((ringData) => {
      const ringGroup = createRingGroup(ringData, tbmConfig);
      groupRef.current!.add(ringGroup);
      ringsRef.current.set(ringData.id, ringGroup);
      lodManager.current!.addRing(ringData, ringGroup);
    });

    setRenderStats({
      visibleSegments: tunnelRings.length * 6,
    });
  }, [tunnelRings, tbmConfig, setRenderStats, lodManager]);

  useFrame(() => {
    if (!lodManager.current) return;

    lodManager.current.setCamera(camera);
    lodManager.current.update();

    const stats = lodManager.current.getStats();
    setRenderStats({
      visibleSegments: stats.visibleSegments,
    });
  });

  const guideLinePoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const totalRings = tunnelRings.length;
    for (let i = 0; i <= totalRings; i++) {
      const ringAngle = (i * Math.PI * 2) / 100;
      const curveRadius = 500;
      const x = i * tbmConfig.segmentWidth;
      const y = Math.sin(ringAngle) * curveRadius - curveRadius;
      const z = Math.cos(ringAngle) * curveRadius - curveRadius;
      points.push(new THREE.Vector3(x, y, z));
    }
    return points;
  }, [tunnelRings.length, tbmConfig.segmentWidth]);

  return (
    <group ref={groupRef}>
      {guideLinePoints.length > 1 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={guideLinePoints.length}
              array={new Float32Array(
                guideLinePoints.flatMap((p) => [p.x, p.y, p.z])
              )}
              itemSize={3}
            />
          </bufferGeometry>
          <lineDashedMaterial
            color={0x00d4ff}
            linewidth={2}
            dashSize={2}
            gapSize={1}
            transparent
            opacity={0.6}
          />
        </line>
      )}
    </group>
  );
};

function createRingGroup(
  ringData: LiningRing,
  tbmConfig: {
    diameter: number;
    thickness: number;
    segmentWidth: number;
  }
): THREE.Group {
  const group = new THREE.Group();
  group.name = ringData.id;

  const ringAngle = (ringData.ringNumber * Math.PI * 2) / 100;
  const curveRadius = 500;
  const x = (ringData.ringNumber - 1) * tbmConfig.segmentWidth;
  const y = Math.sin(ringAngle) * curveRadius - curveRadius;
  const z = Math.cos(ringAngle) * curveRadius - curveRadius;

  group.position.set(x, y, z);
  group.rotation.y = ringAngle;

  ringData.segments.forEach((segment, index) => {
    const segAngle = (index / ringData.segmentsCount) * Math.PI * 2;
    const lodLevel = segment.lodLevel;

    const mesh = createSimplifiedSegmentMesh(
      tbmConfig.diameter,
      tbmConfig.thickness,
      tbmConfig.segmentWidth * 0.98,
      segAngle,
      lodLevel
    );

    mesh.name = `segment-${ringData.ringNumber}-${index}`;
    mesh.visible = segment.visible;

    if ((ringData.ringNumber + index) % 2 === 0) {
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(0x475569);
    }

    group.add(mesh);
  });

  return group;
}
