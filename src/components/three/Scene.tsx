import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { TBMModel } from './TBMModel';
import { TunnelModel } from './TunnelModel';
import { GeologyProfile } from './GeologyProfile';
import { MatrixEngine } from './MatrixEngine';
import { LODManager } from './LODManager';
import { useModelStore } from '@/store/modelStore';
import { usePoseStore, selectSmoothedPose } from '@/store/poseStore';
import { applyReverseDepthToRenderer, applyLogDepthToMaterial, DEFAULT_REVERSE_DEPTH_CONFIG } from '@/utils/depthBuffer';

interface SceneContentProps {
  matrixEngine: MatrixEngine;
  lodManager: React.MutableRefObject<LODManager | null>;
  followTBM: boolean;
  cameraMode: string;
}

const SceneContent: React.FC<SceneContentProps> = ({
  matrixEngine,
  lodManager,
  followTBM,
  cameraMode,
}) => {
  const { camera, scene, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const smoothedPose = usePoseStore(selectSmoothedPose);
  const tbmConfig = useModelStore((state) => state.tbmConfig);
  const setRenderStats = useModelStore((state) => state.setRenderStats);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  const depthSetupRef = useRef(false);

  useEffect(() => {
    if (depthSetupRef.current) return;
    depthSetupRef.current = true;

    try {
      applyReverseDepthToRenderer(
        gl as unknown as THREE.WebGLRenderer,
        camera as THREE.PerspectiveCamera,
        {
          near: 1.0,
          far: 50000,
          fov: 60,
        }
      );
    } catch (e) {
      console.warn('[Scene] Reverse depth buffer setup failed:', e);
    }

    const cam = camera as THREE.PerspectiveCamera;
    cam.near = 1.0;
    cam.far = 50000;
    cam.updateProjectionMatrix();

    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;

    const dispose = () => { depthSetupRef.current = false; };
    return dispose;
  }, [camera, gl]);

  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x0a1628, 0.004);
    scene.background = new THREE.Color(0x0a1628);
  }, [scene]);

  useEffect(() => {
    const applyLogDepth = (obj: THREE.Object3D) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (m && (m as any).isMaterial && !(m as any)._logDepthApplied) {
            try {
              applyLogDepthToMaterial(m);
              (m as any)._logDepthApplied = true;
            } catch (e) {
              // skip
            }
          }
        });
      }
    };

    scene.traverse(applyLogDepth);
  }, [scene]);

  useFrame((state) => {
    const now = performance.now();
    frameCountRef.current++;

    if (now - lastTimeRef.current >= 1000) {
      setRenderStats({
        fps: frameCountRef.current,
      });
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    if (followTBM && smoothedPose && controlsRef.current) {
      const tbmPos = new THREE.Vector3(
        smoothedPose.position.x,
        smoothedPose.position.y,
        smoothedPose.position.z
      );

      let cameraOffset: THREE.Vector3;

      switch (cameraMode) {
        case 'front':
          cameraOffset = new THREE.Vector3(15, 3, 0);
          break;
        case 'side':
          cameraOffset = new THREE.Vector3(0, 3, 15);
          break;
        case 'top':
          cameraOffset = new THREE.Vector3(0, 25, 0.01);
          break;
        case 'follow':
        default:
          cameraOffset = new THREE.Vector3(-12, 5, 8);
          break;
      }

      const targetPos = tbmPos.clone().add(cameraOffset);
      state.camera.position.lerp(targetPos, 0.05);
      controlsRef.current.target.lerp(tbmPos, 0.05);
      controlsRef.current.update();
    }

    const info = state.gl.info;
    setRenderStats({
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
    });
  });

  return (
    <>
      <ambientLight intensity={0.15} color={0x404060} />
      <hemisphereLight args={[0x87ceeb, 0x0a1628, 0.3]} />
      <directionalLight
        position={[50, 50, 50]}
        intensity={0.5}
        color={0xffffff}
        castShadow
      />

      <Stars
        radius={300}
        depth={60}
        count={2000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      <TBMModel matrixEngine={matrixEngine} />
      <TunnelModel lodManager={lodManager} />
      <GeologyProfile matrixEngine={matrixEngine} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={500}
        maxPolarAngle={Math.PI / 2 + 0.3}
      />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          height={300}
          intensity={1.5}
        />
        <Vignette offset={0.5} darkness={0.5} />
        <ChromaticAberration
          offset={new THREE.Vector2(0.0005, 0.0005)}
          radialModulation={false}
          modulationOffset={0}
        />
      </EffectComposer>
    </>
  );
};

interface SceneProps {
  matrixEngine: MatrixEngine;
  lodManager: React.MutableRefObject<LODManager | null>;
}

export const Scene: React.FC<SceneProps> = ({ matrixEngine, lodManager }) => {
  const [followTBM, setFollowTBM] = useState(true);
  const [cameraMode, setCameraMode] = useState('follow');

  const handleFollowTBM = useCallback((follow: boolean) => {
    setFollowTBM(follow);
  }, []);

  const handleCameraMode = useCallback((mode: string) => {
    setCameraMode(mode);
  }, []);

  useEffect(() => {
    (window as any).__tbmControls = {
      setFollowTBM: handleFollowTBM,
      setCameraMode: handleCameraMode,
    };

    return () => {
      delete (window as any).__tbmControls;
    };
  }, [handleFollowTBM, handleCameraMode]);

  const onCreated = useCallback(
    (state: {
      gl: THREE.WebGLRenderer;
      camera: THREE.Camera;
      scene: THREE.Scene;
    }) => {
      const { gl, camera } = state;
      const cam = camera as THREE.PerspectiveCamera;
      cam.near = 1.0;
      cam.far = 50000;
      cam.updateProjectionMatrix();

      gl.setClearColor(0x0a1628, 1);
      gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.0;
    },
    []
  );

  return (
    <Canvas
      shadows
      camera={{ position: [0, 10, 20], fov: 60, near: 1.0, far: 50000 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        depth: true,
        logarithmicDepthBuffer: true,
        stencil: false,
      }}
      dpr={[1, 1.5]}
      onCreated={onCreated}
      frameloop="always"
    >
      <SceneContent
        matrixEngine={matrixEngine}
        lodManager={lodManager}
        followTBM={followTBM}
        cameraMode={cameraMode}
      />
    </Canvas>
  );
};
