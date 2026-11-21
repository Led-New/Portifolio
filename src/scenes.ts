import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
export const easeInOutQuart = (t: number): number =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function getScrollY(): number {
  return (
    window.scrollY ||
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

export function smoothstepJS(t: number, edge0: number, edge1: number): number {
  const x = clamp01((t - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
}

export function hexToVec3(hex: string): THREE.Vector3 {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255
  );
}

export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shared rAF ticker
type TickerCallback = (nowMs: number, dtSec: number) => void;
const subscribers = new Set<TickerCallback>();
let rafId: number | null = null;
let lastFrameMs = performance.now();

function tickLoop(nowMs: number) {
  const dtSec = Math.min(0.05, Math.max(0.001, (nowMs - lastFrameMs) / 1000));
  lastFrameMs = nowMs;
  subscribers.forEach((fn) => {
    try {
      fn(nowMs, dtSec);
    } catch (err) {
      console.error(err);
    }
  });
  if (subscribers.size > 0) {
    rafId = requestAnimationFrame(tickLoop);
  } else {
    rafId = null;
  }
}

export function subscribeTicker(fn: TickerCallback): () => void {
  subscribers.add(fn);
  if (rafId === null) {
    lastFrameMs = performance.now();
    rafId = requestAnimationFrame(tickLoop);
  }
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0 && rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}

function createWebGL1OrFallback(
  params: THREE.WebGLRendererParameters
): THREE.WebGLRenderer {
  try {
    const W1 = (THREE as unknown as { WebGL1Renderer?: typeof THREE.WebGLRenderer })
      .WebGL1Renderer;
    if (W1) {
      return new W1(params);
    }
  } catch {
    // Fallback to WebGLRenderer
  }
  return new THREE.WebGLRenderer(params);
}

// ============================================================================
// SCENE A — Gradient Background (Mesh Gradient Fullscreen Fragment Shader)
// ============================================================================
const GRADIENT_VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const GRADIENT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2  uResolution;
uniform vec3  uBase;
uniform vec3  uLight;
uniform float uSeed;

// Mancha gaussiana elíptica suave — a peça básica do mesh gradient suave.
float blob(vec2 uv, vec2 c, vec2 r){ vec2 d = (uv - c) / r; return exp(-dot(d, d)); }

void main(){
  vec2 uv = vUv;                       // 0..1, (0,0) no canto inferior esquerdo
  vec3 navy   = vec3(0.015, 0.028, 0.085); // preto-azulado profundo (mantém o tom azul, não cinza)
  vec3 ltblue = vec3(0.42, 0.60, 1.0);

  // Base: azul vivo, só com um leve degradê vertical (continua saturado).
  vec3 col = mix(uBase * 0.88, uBase * 1.08, smoothstep(0.0, 1.0, uv.y));

  // Deslocamento por mancha — mesmo estilo, arranjo diferente quando uSeed != 0.
  vec2 o1 = 0.22 * vec2(sin(uSeed * 1.3), cos(uSeed * 1.9));
  vec2 o2 = 0.22 * vec2(sin(uSeed * 2.1 + 1.7), cos(uSeed * 1.1 + 0.6));
  vec2 o3 = 0.22 * vec2(sin(uSeed * 0.7 + 3.1), cos(uSeed * 2.4 + 2.2));
  vec2 o4 = 0.22 * vec2(sin(uSeed * 1.7 + 4.2), cos(uSeed * 0.9 + 5.0));

  // Manchas escuras suaves — bordas macias, sobrepostas numa única massa preto-azulada. Sem turbulência.
  float dark = 0.0;
  dark += blob(uv, vec2(0.06, 0.86) + o1, vec2(0.30, 0.34)) * 0.85;
  dark += blob(uv, vec2(0.34, 0.66) + o2, vec2(0.34, 0.34)) * 1.00;
  dark += blob(uv, vec2(0.66, 0.56) + o3, vec2(0.46, 0.32)) * 1.10;
  dark += blob(uv, vec2(0.95, 0.66) + o4, vec2(0.30, 0.36)) * 0.80;
  dark = smoothstep(0.10, 0.9, clamp(dark, 0.0, 1.0));
  col = mix(col, navy, dark);

  // Brilho claro e suave no canto inferior esquerdo — concentrado, para não lavar o azul até o cinza.
  float g1 = blob(uv, vec2(0.08, -0.04), vec2(0.42, 0.36));
  col = mix(col, uLight, pow(clamp(g1, 0.0, 1.0), 1.7) * 0.95);

  // Luz mais suave no canto superior direito.
  float g2 = blob(uv, vec2(0.98, 1.05), vec2(0.40, 0.40));
  col = mix(col, ltblue, clamp(g2, 0.0, 1.0) * 0.4);

  // Força: mais saturação + um toque de contraste, para os meios-tons lerem azul, não cinza.
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = max(mix(vec3(l), col, 1.4), 0.0);      // satura (fator > 1)
  col = max((col - 0.5) * 1.1 + 0.5, 0.0);     // contraste leve

  gl_FragColor = vec4(col, 1.0);
}
`;

export function createGradientScene(
  canvas: HTMLCanvasElement,
  opts: { baseHex?: string; lightHex?: string; seed?: number } = {}
): () => void {
  const baseHex = opts.baseHex ?? '#1c3ee6';
  const lightHex = opts.lightHex ?? '#eef3ff';
  const seed = opts.seed ?? 0;

  const renderer = createWebGL1OrFallback({ canvas, antialias: false });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();

  const uniforms = {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uBase: { value: hexToVec3(baseHex) },
    uLight: { value: hexToVec3(lightHex) },
    uSeed: { value: seed },
  };

  const geo = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.ShaderMaterial({
    vertexShader: GRADIENT_VERT,
    fragmentShader: GRADIENT_FRAG,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  const resize = () => {
    const parent = canvas.parentElement || canvas;
    const rect = parent.getBoundingClientRect();
    const w = Math.max(1, rect.width || window.innerWidth);
    const h = Math.max(1, rect.height || window.innerHeight);
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w * pr, h * pr);
    renderer.render(scene, camera);
  };

  resize();
  const ro = new ResizeObserver(resize);
  if (canvas.parentElement) ro.observe(canvas.parentElement);

  return () => {
    ro.disconnect();
    geo.dispose();
    mat.dispose();
    renderer.dispose();
  };
}

// ============================================================================
// SCENE B — Plasma Explosion (Hero)
// ============================================================================
const FILAMENT_VERT = `
attribute vec3  aColor;
attribute vec3  aSway;
attribute vec3  aSway2;
attribute float aAlong;
attribute float aSeed;
uniform float uTime, uSway, uSwaySpeed, uEnergy;
uniform vec2  uPointer;                 // cursor em NDC (-1..1), suavizado
uniform float uMagnet, uTanHalfFov, uAspect; // força do ímã (suavizada) + parâmetros da câmera
uniform float uMagnetRadius;            // alcance do ímã no espaço de visão
varying vec3  vColor;
varying float vAlong, vSeed;
void main(){
  vColor = aColor; vAlong = aAlong; vSeed = aSeed;
  vec3 p = position;
  float amp = uSway * aAlong * (1.0 + uEnergy * 1.6);
  float ph  = aSeed * 6.2831;
  float t   = uTime * uSwaySpeed;
  float w1 = sin(t + ph + aAlong * 5.0);
  float w2 = cos(t * 1.27 + ph * 1.7 + aAlong * 9.0);
  float w3 = 0.5 * sin(t * 0.6 + ph);
  p += aSway  * (w1 + w3) * amp;
  p += aSway2 * w2 * amp * 0.8;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  // Magnetiza os filamentos em direção ao cursor no espaço da tela (de visão) — base
  // ancorada no núcleo (aAlong=0), pontas puxadas ao máximo (aAlong^2). uPointer está em NDC;
  // converta para o xy do espaço de visão que projeta ali na profundidade deste vértice.
  // Aplicado depois do modelView, para a inclinação seguir o cursor na tela apesar do giro.
  float hy = -mv.z * uTanHalfFov;
  float hx = hy * uAspect;
  vec2 targetView = vec2(uPointer.x * hx, uPointer.y * hy);
  // Só reagem os filamentos com a ponta perto do cursor: queda gaussiana pela
  // distância, no espaço de visão, entre o vértice e o cursor. Os distantes (prox->0) ficam parados.
  float dist = length(targetView - mv.xy);
  float prox = exp(-(dist * dist) / (uMagnetRadius * uMagnetRadius));
  float pull = uMagnet * aAlong * aAlong * prox;
  mv.xy = mix(mv.xy, targetView, pull);
  gl_Position = projectionMatrix * mv;
}
`;

const FILAMENT_FRAG = `
precision highp float;
uniform float uTime, uShimmer, uShimmerSpeed, uBright, uBrightness, uEnergy, uShock, uShockAmp;
varying vec3  vColor;
varying float vAlong, vSeed;
void main(){
  float sh = 0.6 + uShimmer * 0.55 * sin(vAlong * 16.0 - uTime * uShimmerSpeed + vSeed * 28.0);
  sh = max(sh, 0.0);
  float shock = 0.0;
  if (uShock >= 0.0) shock = uShockAmp * exp(-pow((vAlong - uShock) * 7.0, 2.0)) * 2.0;
  vec3 c = vColor * (sh * (1.0 + uEnergy * 0.8) + shock) * uBright * uBrightness;
  gl_FragColor = vec4(c, 1.0);
}
`;

const SPARK_VERT = `
attribute vec3  aColor;
attribute float aSize;
attribute float aPhase;
uniform float uTime, uSparkSize, uTwinkle, uPixelRatio, uEnergy;
varying vec3  vColor;
varying float vTw;
void main(){
  vColor = aColor;
  float tw = 0.45 + 0.55 * sin(uTime * uTwinkle + aPhase * 6.2831);
  vTw = tw;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float s = uSparkSize * aSize * uPixelRatio * (200.0 / max(0.001, -mv.z));
  gl_PointSize = s * (0.6 + 0.5 * tw) * (1.0 + uEnergy * 0.4);
  gl_Position = projectionMatrix * mv;
}
`;

const SPARK_FRAG = `
precision highp float;
uniform float uBrightness, uEnergy;
varying vec3  vColor;
varying float vTw;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  float a = smoothstep(0.5, 0.0, r);
  a *= a;
  vec3 c = vColor * (0.4 + vTw) * (1.0 + uEnergy * 0.6) * uBrightness;
  gl_FragColor = vec4(c, a);
}
`;

const CORE_VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const CORE_FRAG = `
precision highp float;
uniform vec3 uColCore, uColMid;
uniform float uTime, uGlow, uBrightness, uAlpha, uEnergy;
varying vec2 vUv;
void main(){
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float core = exp(-r * r * 16.0);
  float halo = exp(-r * 4.2) * 0.22;
  float flick = 0.97 + 0.03 * sin(uTime * 1.5); // respiração suave, sem cintilação rápida
  float boost = 1.0 + uEnergy * 1.2;
  vec3 c = (uColCore * core + uColMid * halo) * uGlow * flick * boost * uBrightness;
  float a = clamp(core + halo, 0.0, 1.0) * uAlpha;
  gl_FragColor = vec4(c, a);
}
`;

export function createPlasmaScene(
  canvas: HTMLCanvasElement,
  opts: {
    getHeroProgress: () => number;
    isIntroReady: () => boolean;
  }
): () => void {
  const CFG = {
    cameraZ: 4,
    rotateSpeed: 0.24,
    coreSize: 0.39,
    coreGlow: 0.59,
    bloomStr: 0.44,
    bloomRadius: 0,
    bloomThresh: 0.11,
    lineBrightness: 0.48,
    sway: 0.19,
    swaySpeed: 0.6,
    shimmer: 0,
    shimmerSpeed: 0.4,
    sparkBrightness: 0.32,
    sparkSize: 0.05,
    twinkle: 0.1,
    colCore: '#ffffff',
    colInner: '#c2c6ff',
    colMid: '#5c7cff',
    colOuter: '#242c9e',
    coreColor: '#a3a6ff',
    coreHalo: '#5f5cff',
    filaments: 60,
    sparks: 700,
    spread: 2.65,
    curl: 0,
    segments: 64,
    bendCfg: 0.55,
    tipFade: 0.14,
    lineBright: 1.1,
    TAU: 6.2831,
    colSpark: '#ffffff',
    colPink: '#e6ecff',
  };

  const dpr = window.devicePixelRatio || 1;
  const renderer = createWebGL1OrFallback({ canvas, antialias: true });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const parent = canvas.parentElement || canvas;
  const initRect = parent.getBoundingClientRect();
  const initW = Math.max(1, initRect.width || window.innerWidth);
  const initH = Math.max(1, initRect.height || window.innerHeight);

  const camera = new THREE.PerspectiveCamera(48, initW / initH, 0.1, 80);
  camera.position.z = CFG.cameraZ;

  const group = new THREE.Group();
  scene.add(group);

  // Build deterministic geometry with mulberry32(0x9e3779b9)
  const rng = mulberry32(0x9e3779b9);

  const coreCol = hexToVec3(CFG.colCore);
  const innerCol = hexToVec3(CFG.colInner);
  const midCol = hexToVec3(CFG.colMid);
  const outerCol = hexToVec3(CFG.colOuter);

  const F = CFG.filaments;
  const P = CFG.segments;
  const segCountPerFilament = P - 1;
  const totalVerts = F * segCountPerFilament * 2;

  const posArr = new Float32Array(totalVerts * 3);
  const colArr = new Float32Array(totalVerts * 3);
  const swayArr = new Float32Array(totalVerts * 3);
  const sway2Arr = new Float32Array(totalVerts * 3);
  const alongArr = new Float32Array(totalVerts);
  const seedArr = new Float32Array(totalVerts);

  const tipFlare: THREE.Vector3[] = [];
  let vIdx = 0;

  for (let f = 0; f < F; f++) {
    const seed = rng();
    const z = rng() * 2 - 1;
    const th = rng() * CFG.TAU;
    const rr = Math.sqrt(Math.max(0, 1 - z * z));
    const dir = new THREE.Vector3(rr * Math.cos(th), rr * Math.sin(th), z).normalize();

    const up =
      Math.abs(dir.y) > 0.99
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(dir, up).normalize();
    const v = new THREE.Vector3().crossVectors(dir, u).normalize();

    let len = CFG.spread * (0.28 + rng() * rng() * 1.15);
    if (rng() > 0.86) len *= 1.7;

    const f1 = 2 + rng() * 5;
    const f2 = 2 + rng() * 5;
    const p1 = rng() * CFG.TAU;
    const p2 = rng() * CFG.TAU;
    const curlF = CFG.curl * (0.45 + rng());

    const bend = new THREE.Vector3()
      .addScaledVector(u, rng() - 0.5)
      .addScaledVector(v, rng() - 0.5)
      .normalize()
      .multiplyScalar(CFG.bendCfg * (0.4 + rng()));

    const pts: THREE.Vector3[] = [];
    const cols: THREE.Vector3[] = [];
    const ts: number[] = [];

    const coreStart = 0.06;
    for (let i = 0; i < P; i++) {
      const t = i / (P - 1);
      const radius = coreStart + len * t;
      const pt = new THREE.Vector3()
        .copy(dir)
        .multiplyScalar(radius)
        .addScaledVector(u, Math.sin(t * f1 * Math.PI + p1) * curlF * t)
        .addScaledVector(v, Math.cos(t * f2 * Math.PI + p2) * curlF * t)
        .addScaledVector(bend, t * t);

      const c1 = innerCol.clone().lerp(midCol, smoothstepJS(t, 0, 0.5));
      const c = c1.lerp(outerCol, smoothstepJS(t, 0.5, 1));
      c.lerp(coreCol, (1 - smoothstepJS(t, 0, 0.12)) * 0.9);
      const bright = lerp(1.15, CFG.tipFade, smoothstepJS(t, 0, 1));
      c.multiplyScalar(bright);

      pts.push(pt);
      cols.push(c);
      ts.push(t);
    }

    tipFlare.push(pts[P - 1]);

    for (let i = 0; i < P - 1; i++) {
      for (let k = 0; k < 2; k++) {
        const idx = i + k;
        const pt = pts[idx];
        const c = cols[idx];
        const t = ts[idx];

        posArr[vIdx * 3] = pt.x;
        posArr[vIdx * 3 + 1] = pt.y;
        posArr[vIdx * 3 + 2] = pt.z;

        colArr[vIdx * 3] = c.x;
        colArr[vIdx * 3 + 1] = c.y;
        colArr[vIdx * 3 + 2] = c.z;

        swayArr[vIdx * 3] = u.x;
        swayArr[vIdx * 3 + 1] = u.y;
        swayArr[vIdx * 3 + 2] = u.z;

        sway2Arr[vIdx * 3] = v.x;
        sway2Arr[vIdx * 3 + 1] = v.y;
        sway2Arr[vIdx * 3 + 2] = v.z;

        alongArr[vIdx] = t;
        seedArr[vIdx] = seed;
        vIdx++;
      }
    }
  }

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  lineGeo.setAttribute('aColor', new THREE.BufferAttribute(colArr, 3));
  lineGeo.setAttribute('aSway', new THREE.BufferAttribute(swayArr, 3));
  lineGeo.setAttribute('aSway2', new THREE.BufferAttribute(sway2Arr, 3));
  lineGeo.setAttribute('aAlong', new THREE.BufferAttribute(alongArr, 1));
  lineGeo.setAttribute('aSeed', new THREE.BufferAttribute(seedArr, 1));

  const tanHalfFov = Math.tan(((48 * Math.PI) / 180) / 2);

  const lineUniforms = {
    uTime: { value: 0 },
    uSway: { value: CFG.sway },
    uSwaySpeed: { value: CFG.swaySpeed },
    uEnergy: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uMagnet: { value: 0 },
    uTanHalfFov: { value: tanHalfFov },
    uAspect: { value: initW / initH },
    uMagnetRadius: { value: 0.9 },
    uShimmer: { value: CFG.shimmer },
    uShimmerSpeed: { value: CFG.shimmerSpeed },
    uBright: { value: CFG.lineBright },
    uBrightness: { value: CFG.lineBrightness },
    uShock: { value: -1 },
    uShockAmp: { value: 0 },
    uAlpha: { value: 1 },
  };

  const lineMat = new THREE.ShaderMaterial({
    vertexShader: FILAMENT_VERT,
    fragmentShader: FILAMENT_FRAG,
    uniforms: lineUniforms,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const lineSegments = new THREE.LineSegments(lineGeo, lineMat);
  group.add(lineSegments);

  // Sparks (S = 700)
  const S = CFG.sparks;
  const sPosArr = new Float32Array(S * 3);
  const sColArr = new Float32Array(S * 3);
  const sSizeArr = new Float32Array(S);
  const sPhaseArr = new Float32Array(S);

  const sparkCol = hexToVec3(CFG.colSpark);
  const pinkCol = hexToVec3(CFG.colPink);

  for (let i = 0; i < S; i++) {
    const roll = rng();
    let isBokeh = false;
    const pos = new THREE.Vector3();

    if (roll < 0.42 && tipFlare.length > 0) {
      const tip = tipFlare[Math.floor(rng() * tipFlare.length)];
      pos.set(
        tip.x + (rng() - 0.5) * 0.18,
        tip.y + (rng() - 0.5) * 0.18,
        tip.z + (rng() - 0.5) * 0.18
      );
    } else if (roll < 0.88) {
      const z = rng() * 2 - 1;
      const th = rng() * CFG.TAU;
      const rr = Math.sqrt(Math.max(0, 1 - z * z));
      const rad = CFG.spread * (0.12 + Math.pow(rng(), 1.4) * 1.05);
      pos.set(rr * Math.cos(th) * rad, rr * Math.sin(th) * rad, z * rad);
    } else {
      isBokeh = true;
      const z = rng() * 2 - 1;
      const th = rng() * CFG.TAU;
      const rr = Math.sqrt(Math.max(0, 1 - z * z));
      const rad = CFG.spread * (1.0 + rng() * 1.2);
      pos.set(rr * Math.cos(th) * rad, rr * Math.sin(th) * rad, z * rad * 0.7);
    }

    const distN = Math.min(1, pos.length() / (CFG.spread * 1.4));
    const c = (rng() > 0.82 ? pinkCol : sparkCol).clone();
    c.multiplyScalar(lerp(1.0, 0.35, distN) * (isBokeh ? 0.55 : 1.0));

    const size = isBokeh ? 1.1 + rng() * 1.3 : 0.3 + rng() * rng() * 0.85;
    const phase = rng();

    sPosArr[i * 3] = pos.x;
    sPosArr[i * 3 + 1] = pos.y;
    sPosArr[i * 3 + 2] = pos.z;

    sColArr[i * 3] = c.x;
    sColArr[i * 3 + 1] = c.y;
    sColArr[i * 3 + 2] = c.z;

    sSizeArr[i] = size;
    sPhaseArr[i] = phase;
  }

  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPosArr, 3));
  sparkGeo.setAttribute('aColor', new THREE.BufferAttribute(sColArr, 3));
  sparkGeo.setAttribute('aSize', new THREE.BufferAttribute(sSizeArr, 1));
  sparkGeo.setAttribute('aPhase', new THREE.BufferAttribute(sPhaseArr, 1));

  const sparkUniforms = {
    uTime: { value: 0 },
    uSparkSize: { value: CFG.sparkSize },
    uTwinkle: { value: CFG.twinkle },
    uPixelRatio: { value: Math.min(dpr, 2) },
    uEnergy: { value: 0 },
    uBrightness: { value: CFG.sparkBrightness },
    uAlpha: { value: 1 },
  };

  const sparkMat = new THREE.ShaderMaterial({
    vertexShader: SPARK_VERT,
    fragmentShader: SPARK_FRAG,
    uniforms: sparkUniforms,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
  group.add(sparkPoints);

  // Core Sprite
  const coreGeo = new THREE.PlaneGeometry(3, 3);
  const coreUniforms = {
    uColCore: { value: hexToVec3(CFG.coreColor) },
    uColMid: { value: hexToVec3(CFG.coreHalo) },
    uTime: { value: 0 },
    uGlow: { value: CFG.coreGlow },
    uBrightness: { value: 1 },
    uAlpha: { value: 1 },
    uEnergy: { value: 0 },
  };

  const coreMat = new THREE.ShaderMaterial({
    vertexShader: CORE_VERT,
    fragmentShader: CORE_FRAG,
    uniforms: coreUniforms,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const coreSprite = new THREE.Mesh(coreGeo, coreMat);
  coreSprite.scale.setScalar(CFG.coreSize);
  scene.add(coreSprite);

  // Post-processing Composer
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(initW, initH),
    CFG.bloomStr,
    CFG.bloomRadius,
    CFG.bloomThresh
  );
  const gammaPass = new ShaderPass(GammaCorrectionShader);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(gammaPass);

  const resize = () => {
    const rect = parent.getBoundingClientRect();
    const w = Math.max(1, rect.width || window.innerWidth);
    const h = Math.max(1, rect.height || window.innerHeight);
    const curDpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(curDpr);
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    lineUniforms.uAspect.value = w / h;
    sparkUniforms.uPixelRatio.value = Math.min(curDpr, 2);
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(parent);

  // Cursor Magnet Tracking
  let pointerActive = false;
  let targetPX = 0;
  let targetPY = 0;
  let pX = 0;
  let pY = 0;
  let magnet = 0;

  const onPointerMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    pointerActive = inside;
    if (inside) {
      targetPX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      targetPY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    }
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Animation loop state
  const SPIN_MULT = 5;
  const ZOOM_MULT = 1.7;
  const INTRO_MS = 1400;
  const INTRO_SCALE_FROM = 0.45;
  const INTRO_SPIN = 3.2;
  const MAGNET_STRENGTH = 0.38;
  const MAGNET_EASE = 0.08;
  const POINTER_EASE = 0.12;

  let introStartMs: number | null = null;
  let spin = 0;

  const unsub = subscribeTicker((nowMs, dt) => {
    const rect = parent.getBoundingClientRect();
    if (rect.bottom < -300 || rect.top > window.innerHeight + 300) return;

    const ready = opts.isIntroReady();
    let introP = 0;
    let introE = 0;
    if (ready) {
      if (introStartMs === null) introStartMs = nowMs;
      introP = clamp01((nowMs - introStartMs) / INTRO_MS);
      introE = easeOutCubic(introP);
    }

    const alpha = introE;
    const hp = opts.getHeroProgress();
    const introSpin = ready ? (1 - introP) * INTRO_SPIN : 0;
    spin += (CFG.rotateSpeed * (1 + hp * (SPIN_MULT - 1)) + introSpin) * dt;
    group.rotation.y = spin;

    const s = lerp(INTRO_SCALE_FROM, 1, introE);
    group.scale.setScalar(s);

    camera.position.z = CFG.cameraZ / (1 + hp * (ZOOM_MULT - 1));

    const targetMag = pointerActive ? MAGNET_STRENGTH : 0;
    magnet += (targetMag - magnet) * MAGNET_EASE;
    if (pointerActive) {
      pX += (targetPX - pX) * POINTER_EASE;
      pY += (targetPY - pY) * POINTER_EASE;
    }

    lineUniforms.uMagnet.value = magnet;
    lineUniforms.uPointer.value.set(pX, pY);

    const nowSec = nowMs * 0.001;
    lineUniforms.uTime.value = nowSec;
    lineUniforms.uAlpha.value = alpha;
    lineUniforms.uBrightness.value = CFG.lineBrightness * alpha;

    sparkUniforms.uTime.value = nowSec;
    sparkUniforms.uAlpha.value = alpha;
    sparkUniforms.uBrightness.value = CFG.sparkBrightness * alpha;

    coreSprite.quaternion.copy(camera.quaternion);
    coreSprite.scale.setScalar(CFG.coreSize);
    coreUniforms.uTime.value = nowSec;
    coreUniforms.uAlpha.value = alpha;

    composer.render();
  });

  return () => {
    unsub();
    ro.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    lineGeo.dispose();
    lineMat.dispose();
    sparkGeo.dispose();
    sparkMat.dispose();
    coreGeo.dispose();
    coreMat.dispose();
    renderer.dispose();
  };
}

// ============================================================================
// SCENE C — Chrome Model (Chain + Footer Heart)
// ============================================================================
export function createChromeModelScene(
  canvas: HTMLCanvasElement,
  opts: {
    glbUrl: string;
    scrollSpin: boolean;
    spinAccel?: number;
    maxSpin?: number;
    spinDirection: number;
    getFallProgress: () => number;
  }
): () => void {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.2;

  const scene = new THREE.Scene();
  const parent = canvas.parentElement || canvas;
  const initRect = parent.getBoundingClientRect();
  const initW = Math.max(1, initRect.width || window.innerWidth);
  const initH = Math.max(1, initRect.height || window.innerHeight);

  const camera = new THREE.PerspectiveCamera(42, initW / initH, 0.1, 100);
  camera.position.set(0, 0, 8);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmrem.dispose();

  const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
  dirLight.position.set(4, 6, 5);
  scene.add(dirLight);

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xa5ade3,
    metalness: 1,
    roughness: 0.1,
    envMapIntensity: 2.8,
  });

  const TILT_X = 0.22;
  const IDLE_SPIN = 0.004;
  const FRICTION = 0.965;
  const FALL_TOP = 9;
  const FALL_BOTTOM = -9;
  const spinAccel = opts.spinAccel ?? 0.00004;
  const maxSpin = opts.maxSpin ?? 0.045;

  const group = new THREE.Group();
  group.rotation.x = TILT_X;
  scene.add(group);

  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  let disposed = false;
  loader.load(
    opts.glbUrl,
    (gltf) => {
      if (disposed) return;
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 0.001);
      const scale = 3.6 / maxDim;

      model.position.sub(center).multiplyScalar(scale);
      model.scale.setScalar(scale);

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).material = chromeMat;
        }
      });

      group.add(model);
      renderer.render(scene, camera);
    },
    undefined,
    () => {
      if (disposed) return;
      const fallbackGeo = new THREE.TorusKnotGeometry(1.1, 0.35, 128, 32);
      const fallbackMesh = new THREE.Mesh(fallbackGeo, chromeMat);
      group.add(fallbackMesh);
      renderer.render(scene, camera);
    }
  );

  const resize = () => {
    const rect = parent.getBoundingClientRect();
    const w = Math.max(1, rect.width || window.innerWidth);
    const h = Math.max(1, rect.height || window.innerHeight);
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(parent);

  let lastScroll = getScrollY();
  let spinVel = 0;

  const unsub = subscribeTicker(() => {
    const curScroll = getScrollY();
    const dScroll = curScroll - lastScroll;
    lastScroll = curScroll;

    const rect = parent.getBoundingClientRect();
    if (rect.bottom < -400 || rect.top > window.innerHeight + 400) return;

    const p = clamp01(opts.getFallProgress());
    group.position.y = FALL_TOP + (FALL_BOTTOM - FALL_TOP) * p;

    if (opts.scrollSpin) {
      spinVel = spinVel * FRICTION + dScroll * spinAccel;
      spinVel = Math.max(-maxSpin, Math.min(maxSpin, spinVel));
      group.rotation.y += opts.spinDirection * (IDLE_SPIN + spinVel);
    } else {
      group.rotation.y += opts.spinDirection * IDLE_SPIN;
    }

    renderer.render(scene, camera);
  });

  return () => {
    disposed = true;
    unsub();
    ro.disconnect();
    draco.dispose();
    chromeMat.dispose();
    envTex.dispose();
    renderer.dispose();
  };
}
