import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MatrixEngine, createTBMGroup } from './MatrixEngine';
import { createTBMBody, createCutterHead } from '@/utils/geometry';
import { usePoseStore, selectSmoothedPose } from '@/store/poseStore';
import { useModelStore } from '@/store/modelStore';

interface TBMModelProps {
  matrixEngine: MatrixEngine;
}

export const TBMModel: React.FC<TBMModelProps> = ({ matrixEngine }) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const cutterHeadRef = useRef<THREE.Group>(null);
  const screwConveyorRef = useRef<THREE.Group>(null);
  const erectorRef = useRef<THREE.Group>(null);
  const tbmConfig = useModelStore((state) => state.tbmConfig);
  const smoothedPose = usePoseStore(selectSmoothedPose);

  useEffect(() => {
    if (!groupRef.current) return;

    const { root, body, cutterHead, screwConveyor, erector } = createTBMGroup();

    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    const bodyMesh = createTBMBody(tbmConfig.bodyLength, tbmConfig.bodyDiameter, 0);
    body.add(bodyMesh);

    const cutterMesh = createCutterHead(tbmConfig.cutterHeadDiameter, 0);
    cutterMesh.position.set(tbmConfig.bodyLength / 2 + 0.3, 0, 0);
    cutterHead.add(cutterMesh);

    const screwGeometry = new THREE.CylinderGeometry(0.4, 0.6, 8, 16);
    screwGeometry.rotateZ(Math.PI / 4);
    const screwMaterial = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.7,
      roughness: 0.3,
    });
    const screwMesh = new THREE.Mesh(screwGeometry, screwMaterial);
    screwMesh.position.set(-2, -1, -2);
    screwConveyor.add(screwMesh);

    const erectorGeometry = new THREE.TorusGeometry(2.5, 0.3, 8, 32);
    const erectorMaterial = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x0891b2,
      emissiveIntensity: 0.3,
    });
    const erectorMesh = new THREE.Mesh(erectorGeometry, erectorMaterial);
    erectorMesh.position.set(0, 0, -6);
    erector.add(erectorMesh);

    groupRef.current.add(root);

    bodyRef.current = body;
    cutterHeadRef.current = cutterHead;
    screwConveyorRef.current = screwConveyor;
    erectorRef.current = erector;
  }, [tbmConfig]);

  useEffect(() => {
    if (smoothedPose) {
      matrixEngine.updateTargetPose(smoothedPose);
    }
  }, [smoothedPose, matrixEngine]);

  useFrame((_, delta) => {
    matrixEngine.update(delta * 1000);

    const transforms = matrixEngine.getTransforms();
    if (!transforms) return;

    if (groupRef.current) {
      matrixEngine.applyToObject3D(groupRef.current, transforms.root);
    }

    if (bodyRef.current) {
      const bodyMatrix = transforms.body.clone();
      const rootInverse = transforms.root.clone().invert();
      const bodyLocal = bodyMatrix.premultiply(rootInverse);
      matrixEngine.applyToObject3D(bodyRef.current, bodyLocal);
    }

    if (cutterHeadRef.current && bodyRef.current) {
      const cutterWorld = transforms.cutterHead.clone();
      const bodyWorld = transforms.body.clone().invert();
      const cutterLocal = cutterWorld.premultiply(bodyWorld);
      matrixEngine.applyToObject3D(cutterHeadRef.current, cutterLocal);
    }

    if (screwConveyorRef.current && bodyRef.current) {
      const screwWorld = transforms.screwConveyor.clone();
      const bodyWorld = transforms.body.clone().invert();
      const screwLocal = screwWorld.premultiply(bodyWorld);
      matrixEngine.applyToObject3D(screwConveyorRef.current, screwLocal);
    }

    if (erectorRef.current && bodyRef.current) {
      const erectorWorld = transforms.erector.clone();
      const bodyWorld = transforms.body.clone().invert();
      const erectorLocal = erectorWorld.premultiply(bodyWorld);
      matrixEngine.applyToObject3D(erectorRef.current, erectorLocal);
    }
  });

  return (
    <group ref={groupRef}>
      <spotLight
        position={[tbmConfig.bodyLength / 2 + 1, 0, 0]}
        color={0xffffff}
        intensity={2}
        distance={50}
        angle={Math.PI / 3}
        penumbra={0.5}
      />
      <pointLight
        position={[tbmConfig.bodyLength / 2 + 1, 1.5, 0]}
        color={0xffaa00}
        intensity={1}
        distance={30}
      />
      <pointLight
        position={[tbmConfig.bodyLength / 2 + 1, -1.5, 0]}
        color={0xffaa00}
        intensity={1}
        distance={30}
      />
    </group>
  );
};
