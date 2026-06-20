import * as THREE from 'three';

export interface ReverseDepthBufferConfig {
  near: number;
  far: number;
  fov: number;
  aspect: number;
  useLogarithmic: boolean;
  logDepthConstant: number;
}

export const DEFAULT_REVERSE_DEPTH_CONFIG: ReverseDepthBufferConfig = {
  near: 0.5,
  far: 10000,
  fov: 60,
  aspect: 16 / 9,
  useLogarithmic: true,
  logDepthConstant: 1.0,
};

export function createReverseProjectionMatrix(
  config: Partial<ReverseDepthBufferConfig> = {}
): {
  projectionMatrix: THREE.Matrix4;
  inverseProjectionMatrix: THREE.Matrix4;
  near: number;
  far: number;
} {
  const cfg = { ...DEFAULT_REVERSE_DEPTH_CONFIG, ...config };
  const { near, far, fov, aspect } = cfg;

  const top = near * Math.tan(((fov * 0.5) * Math.PI) / 180);
  const bottom = -top;
  const right = top * aspect;
  const left = -right;

  const P = new THREE.Matrix4();
  const te = P.elements;

  const x = (2 * near) / (right - left);
  const y = (2 * near) / (top - bottom);

  const a = (right + left) / (right - left);
  const b = (top + bottom) / (top - bottom);

  const c = (near + far) / (far - near);
  const d = (-2 * near * far) / (far - near);

  te[0] = x;
  te[4] = 0;
  te[8] = a;
  te[12] = 0;
  te[1] = 0;
  te[5] = y;
  te[9] = b;
  te[13] = 0;
  te[2] = 0;
  te[6] = 0;
  te[10] = -c;
  te[14] = d;
  te[3] = 0;
  te[7] = 0;
  te[11] = -1;
  te[15] = 0;

  const invP = new THREE.Matrix4().copy(P).invert();

  return {
    projectionMatrix: P,
    inverseProjectionMatrix: invP,
    near,
    far,
  };
}

export function createLogarithmicDepthUniforms(): Record<string, THREE.IUniform> {
  return {
    u_logDepthBufFC: {
      value: 2.0 / Math.log(DEFAULT_REVERSE_DEPTH_CONFIG.far + 1.0) / Math.LN2,
    },
  };
}

export function applyReverseDepthToRenderer(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
  config: Partial<ReverseDepthBufferConfig> = {}
): () => void {
  const cfg = { ...DEFAULT_REVERSE_DEPTH_CONFIG, ...config };

  const gl = renderer.getContext() as WebGLRenderingContext | WebGL2RenderingContext;

  camera.near = cfg.near;
  camera.far = cfg.far;
  camera.fov = cfg.fov;

  const ext =
    (gl as WebGL2RenderingContext).getExtension?.('EXT_clip_control') ||
    (gl as any).getExtension?.('WEBGL_clip_cull_distance');

  if (ext) {
    if ((ext as any).LOWER_LEFT_EXT && (ext as any).ZERO_TO_ONE_EXT) {
      try {
        (ext as any).clipControlEXT(
          (ext as any).LOWER_LEFT_EXT,
          (ext as any).ZERO_TO_ONE_EXT
        );
      } catch (e) {
        console.warn('[DepthBuffer] EXT_clip_control setup failed:', e);
      }
    }
  }

  const { projectionMatrix } = createReverseProjectionMatrix({
    ...cfg,
    aspect: camera.aspect || window.innerWidth / window.innerHeight,
  });

  camera.projectionMatrix.copy(projectionMatrix);
  camera.projectionMatrixInverse.copy(projectionMatrix).invert();
  camera.updateProjectionMatrix = () => {
    const { projectionMatrix: P } = createReverseProjectionMatrix({
      ...cfg,
      fov: camera.fov,
      aspect: camera.aspect,
      near: camera.near,
      far: camera.far,
    });
    camera.projectionMatrix.copy(P);
    camera.projectionMatrixInverse.copy(P).invert();
  };

  renderer.state.buffers.depth.setClear(0);
  try {
    (renderer as any).clearDepth = 0;
  } catch (e) { /* ignore */ }

  const originalSetRenderTarget = renderer.setRenderTarget.bind(renderer);
  renderer.setRenderTarget = function (...args: any[]) {
    originalSetRenderTarget.apply(renderer, args as any);
    if (!args[0]) {
      renderer.state.buffers.depth.setClear(0);
      try {
        (renderer as any).clearDepth = 0;
      } catch (e) { /* ignore */ }
    }
    return renderer;
  } as any;

  const resizeObserver = new ResizeObserver(() => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix?.();
  });
  resizeObserver.observe(document.body);

  return () => {
    resizeObserver.disconnect();
  };
}

export const LOGARITHMIC_DEPTH_VERTEX_CHUNK = `
#ifdef USE_LOGDEPTHBUF
  #ifdef USE_LOGDEPTHBUF_EXT
    varying float vFragDepth;
    varying float vIsPerspective;
  #else
    gl_Position.z = 2.0 * log2(max(2.0e-24, gl_Position.w + 1.0)) * u_logDepthBufFC - 1.0;
    gl_Position.z *= gl_Position.w;
  #endif
#endif
`;

export const LOGARITHMIC_DEPTH_FRAGMENT_CHUNK = `
#ifdef USE_LOGDEPTHBUF
  #ifdef USE_LOGDEPTHBUF_EXT
    gl_FragDepthEXT =
      vIsPerspective *
        (log2(vFragDepth) * u_logDepthBufFC * 0.5) +
      (1.0 - vIsPerspective) * gl_FragCoord.z;
  #endif
#endif
`;

export function applyLogDepthToMaterial(material: THREE.Material): void {
  if (!material.defines) material.defines = {};
  (material.defines as any).USE_LOGDEPTHBUF = 1;
  (material.defines as any).USE_LOGDEPTHBUF_EXT = 1;

  const uniforms = (material as any).uniforms || {};
  if (!uniforms.u_logDepthBufFC) {
    uniforms.u_logDepthBufFC = {
      value: 2.0 / Math.log(DEFAULT_REVERSE_DEPTH_CONFIG.far + 1.0) / Math.LN2,
    };
  }
  (material as any).uniforms = uniforms;

  const onBeforeCompileOrig = (material as any).onBeforeCompile;
  (material as any).onBeforeCompile = function (shader: any) {
    if (!shader.uniforms.u_logDepthBufFC) {
      shader.uniforms.u_logDepthBufFC = {
        value: 2.0 / Math.log(DEFAULT_REVERSE_DEPTH_CONFIG.far + 1.0) / Math.LN2,
      };
    }
    if (!shader.defines) shader.defines = {};
    shader.defines.USE_LOGDEPTHBUF = 1;
    shader.defines.USE_LOGDEPTHBUF_EXT = 1;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       uniform float u_logDepthBufFC;
       #ifdef USE_LOGDEPTHBUF_EXT
         varying float vFragDepth;
       #endif
      `
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
       #ifdef USE_LOGDEPTHBUF
         vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
         #ifdef USE_LOGDEPTHBUF_EXT
           vFragDepth = 1.0 + mvPosition.z;
         #else
           gl_Position.z = 2.0 * log2(max(2.0e-24, gl_Position.w + 1.0)) * u_logDepthBufFC - 1.0;
           gl_Position.z *= gl_Position.w;
         #endif
       #endif
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform float u_logDepthBufFC;
       #ifdef USE_LOGDEPTHBUF_EXT
         #extension GL_EXT_frag_depth : enable
         varying float vFragDepth;
       #endif
      `
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       #if defined(USE_LOGDEPTHBUF) && defined(USE_LOGDEPTHBUF_EXT)
         gl_FragDepthEXT = log2(vFragDepth) * u_logDepthBufFC * 0.5;
       #endif
      `
    );

    if (onBeforeCompileOrig) {
      onBeforeCompileOrig.call(this, shader);
    }
  };
  material.needsUpdate = true;
}
