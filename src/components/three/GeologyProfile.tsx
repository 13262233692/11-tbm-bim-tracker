import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MatrixEngine } from './MatrixEngine';
import {
  useGeologyStore,
  selectHasHardRockAlert,
} from '@/store/geologyStore';
import {
  buildProfileFromTriangulation,
  performDelaunayTriangulation,
  detectStressConcentrationZones,
} from '@/utils/geologyUtils';
import { SOIL_LAYER_PRESETS } from '@/types/geology';

interface GeologyProfileProps {
  matrixEngine: MatrixEngine;
}

export const GeologyProfile: React.FC<GeologyProfileProps> = ({ matrixEngine }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const borderRef = useRef<THREE.LineSegments>(null);
  const stressMeshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const profileData = useGeologyStore((s) => s.profileData);
  const visible = useGeologyStore((s) => s.isProfileVisible);
  const showStress = useGeologyStore((s) => s.showStressHighlight);
  const hardnessThreshold = useGeologyStore((s) => s.hardnessAlertThreshold);
  const hasAlert = useGeologyStore(selectHasHardRockAlert);
  const updateProfilePosition = useGeologyStore((s) => s.updateProfilePosition);

  const { scene } = useThree();

  const profileWidth = 10;
  const profileHeight = 10;

  const builtContent = useMemo(() => {
    if (!profileData || !profileData.triangulation) return null;

    try {
      const { geometry, material } = buildProfileFromTriangulation(
        profileData.triangulation,
        profileWidth,
        profileHeight
      );
      return { geometry, material };
    } catch (e) {
      console.warn('[GeologyProfile] build failed:', e);
      return null;
    }
  }, [profileData?.profileId]);

  const borderGeometry = useMemo(() => {
    const w = profileWidth / 2;
    const h = profileHeight / 2;
    const pts: THREE.Vector3[] = [
      new THREE.Vector3(-w, 0, -h),
      new THREE.Vector3(w, 0, -h),
      new THREE.Vector3(w, 0, h),
      new THREE.Vector3(-w, 0, h),
      new THREE.Vector3(-w, 0, -h),
    ];
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return g;
  }, []);

  useEffect(() => {
    if (!builtContent) return;
    materialRef.current = builtContent.material;
  }, [builtContent]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const pos = matrixEngine.getBodyPosition();
    const quat = matrixEngine.getBodyQuaternion();

    if (pos && quat) {
      const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
      const offset = forward.clone().multiplyScalar(4.2);
      groupRef.current.position.copy(pos.clone().add(offset));

      const lookTarget = pos.clone().add(forward.clone().multiplyScalar(10));
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
      groupRef.current.quaternion.copy(quat);

      updateProfilePosition(pos.x, pos.y, pos.z, {
        x: quat.x,
        y: quat.y,
        z: quat.z,
        w: quat.w,
      });
    }

    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value += delta;
      materialRef.current.uniforms.u_showStress.value = showStress ? 1.0 : 0.0;
      materialRef.current.uniforms.u_hardnessThreshold.value = hardnessThreshold;

      if (profileData?.stressZones) {
        const arr = materialRef.current.uniforms.u_stressCenters.value as Float32Array;
        profileData.stressZones.forEach((zone, i) => {
          if (i >= 32) return;
          arr[i * 2] =
            (zone.centerU + profileWidth / 2) / profileWidth;
          arr[i * 2 + 1] =
            (zone.centerV + profileHeight / 2) / profileHeight;
        });
        materialRef.current.uniforms.u_stressCount.value = Math.min(
          profileData.stressZones.length,
          32
        );
      }

      const baseAlpha = hasAlert && showStress ? 0.95 : 0.88;
      const pulse = 0.08 * Math.sin(state.clock.elapsedTime * 2.5);
      materialRef.current.uniforms.u_transparency.value = Math.min(
        1.0,
        baseAlpha + pulse
      );
    }

    if (borderRef.current) {
      const mat = borderRef.current.material as THREE.LineBasicMaterial;
      const alertColor = new THREE.Color(hasAlert ? 0xff3020 : 0x00d4ff);
      const normalColor = new THREE.Color(0x00d4ff);
      const t = hasAlert && showStress ? 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 4) : 0;
      mat.color.copy(normalColor).lerp(alertColor, t);
      mat.opacity = 0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 3);
    }

    if (stressMeshRef.current) {
      const smat = stressMeshRef.current.material as THREE.MeshBasicMaterial;
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(state.clock.elapsedTime * 3));
      smat.opacity = hasAlert && showStress ? pulse * 0.5 : 0;
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} name="GeologyProfile">
      {builtContent && (
        <mesh
          ref={meshRef}
          geometry={builtContent.geometry}
          material={builtContent.material}
          renderOrder={900}
        />
      )}

      <lineSegments ref={borderRef} geometry={borderGeometry} renderOrder={950}>
        <lineBasicMaterial
          color={0x00d4ff}
          transparent
          opacity={0.8}
          linewidth={2}
        />
      </lineSegments>

      <mesh ref={stressMeshRef} renderOrder={990}>
        <planeGeometry args={[profileWidth * 0.98, profileHeight * 0.98, 1, 1]} />
        <meshBasicMaterial
          color={0xff2010}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <pointLight
        position={[0, 2, 0]}
        color={hasAlert ? 0xff3020 : 0x00d4ff}
        intensity={hasAlert ? 2.5 : 1.2}
        distance={25}
      />
    </group>
  );
};

export default GeologyProfile;
