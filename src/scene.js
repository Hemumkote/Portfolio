import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SKILL_CLOUD } from './data.js';
import { GLYPHS } from './text.js';
import { KeyboardWorld, DESK } from './keyboard.js';
import { GlitchWorld, VOID } from './glitch.js';
import { BlueprintWorld } from './blueprint.js';
import { DesktopWorld } from './desktop.js';

/* ------------------------------------------------------------------ */
/* GLSL helpers                                                        */
/* ------------------------------------------------------------------ */
const SNOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const HASH = /* glsl */ `float hash(float n){return fract(sin(n)*43758.5453123);}`;

/* ------------------------------------------------------------------ */
/* Section choreography: camera + core keyframes per section           */
/* ------------------------------------------------------------------ */
const KEYS = [
  // hero
  { cam: [0, 0, 7], look: [0, 0, 0], core: [2.5, 0.1, 0], scale: 1.0, labels: 0.12, rain: 1.0 },
  // about
  { cam: [-0.6, 0.7, 6.0], look: [0, 0, -1.5], core: [3.4, -0.6, -2.5], scale: 0.75, labels: 0.12, rain: 0.8 },
  // skills
  { cam: [0, 1.4, 4.2], look: [0, 0, -3.5], core: [0, 0, -3.5], scale: 1.05, labels: 1.0, rain: 0.6 },
  // experience
  { cam: [1.2, -0.4, 2.6], look: [0, 0, -5], core: [-3.4, 0.4, -5.5], scale: 0.7, labels: 0.15, rain: 1.2 },
  // projects
  { cam: [0, 0.6, 0.6], look: [0, 0, -7], core: [3.3, -0.2, -7.5], scale: 0.85, labels: 0.12, rain: 1.0 },
  // education
  { cam: [0.4, 0.3, -1.6], look: [0, 0, -9], core: [-2.8, 0, -9.5], scale: 0.75, labels: 0.12, rain: 0.8 },
  // contact
  { cam: [0, 0, -4.8], look: [0, 0, -12], core: [2.6, -0.4, -12], scale: 1.15, labels: 0.15, rain: 1.6 },
];

export const THEMES = [
  { name: 'matrix', a: '#00ff9c', b: '#00b3ff' },
  { name: 'cyber', a: '#00e5ff', b: '#a855ff' },
  { name: 'amber', a: '#ffb000', b: '#ff4d00' },
  { name: 'neon', a: '#ff2e88', b: '#7c5cff' },
];

const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const v3 = (a) => new THREE.Vector3(...a);

export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.section = 0; // continuous section index, set from scroll
    this.velocity = 0; // scroll velocity, set from scroll
    this.mouse = new THREE.Vector2(0, 0);
    this.mouseSmooth = new THREE.Vector2(0, 0);
    this.pointerNDC = new THREE.Vector2(10, 10);
    this.hover = 0;
    this.blockHover = false;
    this.pulse = 0;
    this.glitch = 0;
    this.rainTime = 0;
    this.mode = 'hacker'; // 'hacker' | 'keys'
    this.kb = null; // keyboard world, built lazily on first switch
    this.gw = null; // glitch world, built lazily on first switch
    this.bw = null; // blueprint world
    this.dw = null; // desktop (HM/OS) world
    this.theme = null;
    this.isMobile = window.innerWidth < 820;
    this.colorA = new THREE.Color(THEMES[0].a);
    this.colorB = new THREE.Color(THEMES[0].b);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x020403, 1);
    // shadows are only cast in the keyboard theme (the hacker scene has no shadow casters)
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.dpr = Math.min(window.devicePixelRatio, 1.75);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020403, 0.045);
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 0, 7);
    this.lookAt = new THREE.Vector3();
    this.camTarget = new THREE.Vector3(0, 0, 7);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();

    this.buildAtlas();
    // redraw the atlas once the Devanagari web font has loaded
    document.fonts?.load('bold 45px "Noto Sans Devanagari"', 'क').then(() => this.buildAtlas()).catch(() => {});
    this.buildCore();
    this.buildRain();
    this.buildGrid();
    this.buildDust();
    this.buildLabels();
    this.buildPost();

    window.addEventListener('resize', () => this.resize());
  }

  /* ---------------- glyph atlas (shared by rain) ---------------- */
  buildAtlas() {
    const N = 8; // 8x8 = 64 glyphs
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = N * S;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff';
    g.font = `bold ${S * 0.7}px "Noto Sans Devanagari", "JetBrains Mono", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const chars = [...GLYPHS];
    for (let i = 0; i < N * N; i++) {
      const x = (i % N) * S + S / 2;
      const y = Math.floor(i / N) * S + S / 2;
      g.save();
      g.translate(x, y);
      g.fillText(chars[i % chars.length], 0, 0);
      g.restore();
    }
    if (this.atlas) { this.atlas.image = c; this.atlas.needsUpdate = true; return; }
    this.atlas = new THREE.CanvasTexture(c);
    this.atlas.minFilter = THREE.LinearFilter;
    this.atlas.generateMipmaps = false;
  }

  /* ---------------- the "core": noise-displaced particle sphere + HUD rings ---------------- */
  buildCore() {
    this.core = new THREE.Group();
    this.scene.add(this.core);

    // particle shell
    // fibonacci sphere: evenly distributed points, no duplicates
    const N = this.isMobile ? 4000 : 7000;
    const fp = new Float32Array(N * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      fp.set([Math.cos(th) * r * 1.25, y * 1.25, Math.sin(th) * r * 1.25], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    this.coreUniforms = {
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uHover: { value: 0 },
      uColorA: { value: this.colorA },
      uColorB: { value: this.colorB },
      uPR: { value: this.dpr },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.coreUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime, uPulse, uHover, uPR;
        varying float vN;
        ${SNOISE}
        void main(){
          vec3 p = position;
          float n = snoise(p * 1.4 + vec3(uTime * 0.25));
          float n2 = snoise(p * 4.0 - vec3(uTime * 0.6));
          float wave = sin(length(p.xy) * 8.0 - uPulse * 18.0) * uPulse;
          p *= 1.0 + n * (0.16 + uHover * 0.22) + n2 * 0.04 * uHover + wave * 0.25;
          vN = n;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (1.6 + n * 1.4 + uHover) * uPR * (6.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColorA, uColorB;
        uniform float uHover;
        varying float vN;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          vec3 c = mix(uColorB, uColorA, smoothstep(-0.4, 0.6, vN));
          c += vec3(1.0) * smoothstep(0.55, 0.9, vN) * 0.6;
          gl_FragColor = vec4(c, (1.0 - d * 2.0) * (0.55 + uHover * 0.3));
        }`,
    });
    this.corePoints = new THREE.Points(geo, mat);
    this.core.add(this.corePoints);

    // wire shell
    const shell = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.75, 1)),
      new THREE.LineBasicMaterial({ color: this.colorA, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending })
    );
    this.shell = shell;
    this.core.add(shell);

    // gyroscope rings with tick marks
    this.rings = [];
    const mkRing = (r, ticks, tilt, op) => {
      const g = new THREE.Group();
      const pts = [];
      for (let i = 0; i <= 256; i++) {
        const a = (i / 256) * Math.PI * 2;
        // dashed: skip segments
        if (Math.floor(i / 8) % 5 === 4) continue;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
      }
      const segPts = [];
      for (let i = 0; i < pts.length - 1; i++) {
        if (pts[i].distanceTo(pts[i + 1]) < 0.2) segPts.push(pts[i], pts[i + 1]);
      }
      for (let i = 0; i < ticks; i++) {
        const a = (i / ticks) * Math.PI * 2;
        const l = i % 4 === 0 ? 0.16 : 0.07;
        segPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0), new THREE.Vector3(Math.cos(a) * (r + l), Math.sin(a) * (r + l), 0));
      }
      const line = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(segPts),
        new THREE.LineBasicMaterial({ color: this.colorA, transparent: true, opacity: op, blending: THREE.AdditiveBlending })
      );
      g.add(line);
      g.rotation.set(...tilt);
      this.core.add(g);
      this.rings.push(g);
      return g;
    };
    mkRing(2.2, 72, [Math.PI / 2.3, 0, 0], 0.5);
    mkRing(2.55, 48, [Math.PI / 2, Math.PI / 5, 0], 0.3);
    mkRing(1.95, 36, [0.3, Math.PI / 2.4, 0], 0.25);

    // click shockwave
    this.shock = new THREE.Mesh(
      new THREE.RingGeometry(0.97, 1, 128),
      new THREE.MeshBasicMaterial({ color: this.colorA, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
    );
    this.scene.add(this.shock);
  }

  /* ---------------- glyph rain ---------------- */
  buildRain() {
    const COLS = this.isMobile ? 110 : 220;
    const TRAIL = 22;
    const n = COLS * TRAIL;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 4); // speed, seed, k, size
    let p = 0;
    for (let c = 0; c < COLS; c++) {
      let x, z;
      // keep a corridor around the camera path clear-ish
      do {
        x = (Math.random() - 0.5) * 44;
        z = 8 - Math.random() * 46;
      } while (Math.abs(x) < 3.2 && Math.random() < 0.85);
      const speed = 2 + Math.random() * 5;
      const seed = Math.random();
      const size = 0.6 + Math.random() * 0.6;
      for (let k = 0; k < TRAIL; k++) {
        pos.set([x, 0, z], p * 3);
        col.set([speed, seed, k, size], p * 4);
        p++;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aData', new THREE.BufferAttribute(col, 4));
    this.rainUniforms = {
      uTime: { value: 0 },
      uAtlas: { value: this.atlas },
      uColor: { value: this.colorA },
      uTrail: { value: TRAIL },
      uPR: { value: this.dpr },
      uOpacity: { value: 0.0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.rainUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      vertexShader: /* glsl */ `
        attribute vec4 aData;
        uniform float uTime, uTrail, uPR;
        varying float vB; varying float vG; varying float vHead; varying float vFade;
        ${HASH}
        void main(){
          float speed = aData.x, seed = aData.y, k = aData.z, size = aData.w;
          float H = 26.0, top = 12.0, spacing = 0.36 * size;
          float head = top - mod(uTime * speed + seed * H * 7.0, H + uTrail * spacing);
          vec3 p = position;
          p.y = head + k * spacing;
          float rate = 3.0 + hash(seed * 91.0 + k) * 10.0;
          vG = floor(hash(seed * 311.0 + k * 7.13 + floor(uTime * rate)) * 64.0);
          vHead = step(k, 0.5);
          vB = pow(1.0 - k / uTrail, 1.6);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vFade = smoothstep(42.0, 6.0, -mv.z) * smoothstep(0.3, 2.5, -mv.z);
          gl_PointSize = size * 26.0 * uPR / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlas; uniform vec3 uColor; uniform float uOpacity;
        varying float vB; varying float vG; varying float vHead; varying float vFade;
        void main(){
          vec2 cell = vec2(mod(vG, 8.0), floor(vG / 8.0));
          vec2 uv = vec2((cell.x + gl_PointCoord.x) / 8.0, 1.0 - (cell.y + gl_PointCoord.y) / 8.0);
          float a = texture2D(uAtlas, uv).r;
          vec3 c = mix(uColor * 0.9, vec3(0.85, 1.0, 0.92), vHead);
          float alpha = a * (vB * 0.75 + vHead * 0.8) * vFade * uOpacity;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(c, alpha);
        }`,
    });
    this.rain = new THREE.Points(geo, mat);
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);
  }

  /* ---------------- tron grid floor + ceiling ---------------- */
  buildGrid() {
    this.gridUniforms = { uTime: { value: 0 }, uColor: { value: this.colorA }, uOpacity: { value: 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.gridUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uOpacity; uniform vec3 uColor; varying vec3 vW;
        float grid(vec2 p, float s){ vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s); return 1.0 - min(min(g.x, g.y), 1.0); }
        void main(){
          vec2 p = vW.xz + vec2(0.0, uTime * 1.5);
          float g = grid(p, 1.0) * 0.28 + grid(p, 5.0) * 0.5;
          float d = length(vW.xz - cameraPosition.xz);
          float fade = exp(-d * 0.11);
          float scan = smoothstep(0.0, 1.0, sin(vW.z * 0.6 + uTime * 3.0) * 0.5 + 0.5) * 0.35;
          gl_FragColor = vec4(uColor, g * fade * (0.55 + scan) * uOpacity);
        }`,
    });
    const plane = new THREE.PlaneGeometry(160, 160, 1, 1);
    this.floor = new THREE.Mesh(plane, mat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(0, -3.4, -20);
    this.scene.add(this.floor);
    const ceilMat = mat.clone();
    ceilMat.uniforms = { ...this.gridUniforms, uOpacity: { value: 0 } };
    this.ceilUniforms = ceilMat.uniforms;
    this.ceil = new THREE.Mesh(plane, ceilMat);
    this.ceil.rotation.x = Math.PI / 2;
    this.ceil.position.set(0, 5.5, -20);
    this.scene.add(this.ceil);
  }

  /* ---------------- floating dust ---------------- */
  buildDust() {
    const n = this.isMobile ? 900 : 2200;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 18, 8 - Math.random() * 50], i * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: this.colorB, size: 0.035, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.scene.add(this.dust);
  }

  /* ---------------- orbiting skill labels ---------------- */
  buildLabels() {
    this.labels = new THREE.Group();
    this.core.add(this.labels);
    this.labelItems = SKILL_CLOUD.map((txt, i) => {
      const c = document.createElement('canvas');
      const g = c.getContext('2d');
      const font = '600 44px "JetBrains Mono", monospace';
      g.font = font;
      const label = `<${txt}/>`;
      const w = Math.ceil(g.measureText(label).width) + 24;
      c.width = w;
      c.height = 64;
      g.font = font;
      g.fillStyle = '#fff';
      g.textBaseline = 'middle';
      g.fillText(label, 12, 34);
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      const mat = new THREE.SpriteMaterial({ map: tex, color: this.colorA, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
      const s = new THREE.Sprite(mat);
      const h = 0.2;
      s.scale.set((h * w) / 64, h, 1);
      this.labels.add(s);
      return {
        s,
        r: 2.4 + (i % 3) * 0.45 + Math.random() * 0.3,
        a: (i / SKILL_CLOUD.length) * Math.PI * 2,
        sp: (0.12 + Math.random() * 0.12) * (i % 2 ? 1 : -1),
        tilt: (Math.random() - 0.5) * 1.3,
        y: (Math.random() - 0.5) * 0.8,
      };
    });
  }

  /* ---------------- post processing: bloom + CRT/glitch ---------------- */
  buildPost() {
    const w = window.innerWidth, h = window.innerHeight;
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.dpr);
    this.composer.setSize(w, h);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.95, 0.55, 0.08);
    this.composer.addPass(this.bloom);
    this.crt = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uGlitch: { value: 0 },
        uRes: { value: new THREE.Vector2(w, h) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform float uTime, uGlitch; uniform vec2 uRes; varying vec2 vUv;
        ${HASH}
        void main(){
          vec2 uv = vUv;
          // horizontal tearing bands on glitch
          float band = floor(uv.y * 24.0);
          float tear = step(0.92 - uGlitch * 0.25, hash(band + floor(uTime * 18.0))) * uGlitch;
          uv.x += (hash(band * 3.1 + uTime) - 0.5) * 0.06 * tear;
          // chromatic aberration grows from the centre + with glitch
          vec2 dir = uv - 0.5;
          float ca = 0.0012 + uGlitch * 0.008;
          vec3 col;
          col.r = texture2D(tDiffuse, uv + dir * ca * 2.0).r;
          col.g = texture2D(tDiffuse, uv).g;
          col.b = texture2D(tDiffuse, uv - dir * ca * 2.0).b;
          // scanlines + grain + vignette
          float scan = sin(uv.y * uRes.y * 1.4) * 0.04;
          col -= scan;
          col += (hash(uv.x * 91.7 + uv.y * 517.3 + uTime) - 0.5) * 0.045;
          col *= 1.0 - dot(dir, dir) * 1.1;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.composer.addPass(this.crt);
    this.composer.addPass(new OutputPass());
  }

  /* ---------------- public API ---------------- */
  setTheme(t) {
    this.colorA.set(t.a);
    this.colorB.set(t.b);
    this.shell.material.color.copy(this.colorA);
    this.rings.forEach((r) => r.children[0].material.color.copy(this.colorA));
    this.dust.material.color.copy(this.colorB);
    this.shock.material.color.copy(this.colorA);
    this.labelItems.forEach((l) => l.s.material.color.copy(this.colorA));
    this.theme = t;
    this.kb?.onTheme();
    this.gw?.onTheme();
    if (this.mode === 'blueprint') this.bw?.onTheme(t);
    if (this.mode === 'os') this.dw?.onTheme(t);
    this.kick(0.8);
  }

  setMode(mode) {
    this.mode = ['keys', 'glitch', 'blueprint', 'os'].includes(mode) ? mode : 'hacker';
    const keys = this.mode === 'keys';
    const glitch = this.mode === 'glitch';
    const bp = this.mode === 'blueprint';
    const os = this.mode === 'os';
    const hacker = this.mode === 'hacker';
    if (keys && !this.kb) this.kb = new KeyboardWorld(this);
    if (glitch && !this.gw) this.gw = new GlitchWorld(this);
    if (bp && !this.bw) this.bw = new BlueprintWorld(this);
    if (os && !this.dw) this.dw = new DesktopWorld(this);
    this.kb?.setVisible(keys);
    this.gw?.setVisible(glitch);
    this.bw?.setVisible(bp);
    this.dw?.setVisible(os);
    // the desktop wallpaper renders at a quarter of the pixels, for chunky retro 3D
    this.renderer.setPixelRatio(os ? 0.5 : this.dpr);
    // every theme is its own world: nothing from the hacker scene stays visible elsewhere
    for (const o of [this.core, this.rain, this.shock, this.ceil, this.floor, this.dust]) o.visible = hacker;
    for (const c of ['core-hover', 'key-hover', 'g-hover']) document.body.classList.remove(c);
    const bg = keys ? DESK : glitch ? VOID : 0x020403;
    this.renderer.setClearColor(bg, 1);
    this.scene.fog.color.set(bg);
    this.scene.fog.density = keys ? 0.018 : glitch ? 0.03 : bp ? 0 : os ? 0.02 : 0.045;
    if (hacker) this.kick(1.3);
  }

  kick(amount = 1) {
    this.glitch = Math.max(this.glitch, amount);
  }

  setPointer(x, y) {
    this.mouse.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    this.pointerNDC.copy(this.mouse);
  }

  // hacker mode: true if the click hit the core.
  // keys mode: tech info object for a tech key, true for a plain key, null for a miss.
  click() {
    if (this.mode === 'keys') return this.kb.click();
    if (this.mode === 'glitch') { this.gw.burst(); return true; }
    if (this.mode === 'blueprint') {
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);
      return this.bw.click();
    }
    if (this.mode === 'os') return false;
    if (this.hover < 0.5) return false;
    this.pulse = 1;
    this.kick(1);
    this.shock.position.copy(this.core.position);
    this.shock.quaternion.copy(this.camera.quaternion);
    this.shock.scale.setScalar(this.core.scale.x * 1.2);
    this.shock.material.opacity = 1;
    return true;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.isMobile = w < 820;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.crt.uniforms.uRes.value.set(w, h);
    this.gw?.resize(w, h);
  }

  setQuality(dpr) {
    this.dpr = dpr;
    this.renderer.setPixelRatio(this.mode === 'os' ? 0.5 : dpr);
    this.composer.setPixelRatio(dpr);
    this.gw?.setPixelRatio(dpr);
    this.coreUniforms.uPR.value = dpr;
    this.rainUniforms.uPR.value = dpr;
    this.resize();
  }

  /* ---------------- frame ---------------- */
  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    // --- interpolate section keyframes ---
    const s = THREE.MathUtils.clamp(this.section, 0, KEYS.length - 1);
    const i0 = Math.floor(s), i1 = Math.min(i0 + 1, KEYS.length - 1);
    const f = smooth(s - i0);
    const A = KEYS[i0], B = KEYS[i1];
    const mobX = this.isMobile ? 0.25 : 1;

    const cam = v3(A.cam).lerp(v3(B.cam), f);
    const look = v3(A.look).lerp(v3(B.look), f);
    const corePos = v3(A.core).lerp(v3(B.core), f);
    corePos.x *= mobX;
    if (this.isMobile && s < 0.5) corePos.y += 1.3; // sit above the name on phones
    const coreScale = lerp(A.scale, B.scale, f) * (this.isMobile ? 0.7 : 1);
    const labelOp = lerp(A.labels, B.labels, f);
    const rainMul = lerp(A.rain, B.rain, f);

    // --- mouse parallax ---
    this.mouseSmooth.lerp(this.mouse, 0.05);
    cam.x += this.mouseSmooth.x * 0.45;
    cam.y += this.mouseSmooth.y * 0.3;

    let kbShot = null;
    if (this.mode === 'keys') {
      kbShot = this.kb.shot(s, this.isMobile);
      kbShot.cam.x += this.mouseSmooth.x * 0.8;
      kbShot.cam.y += this.mouseSmooth.y * 0.5;
      cam.copy(kbShot.cam);
      look.copy(kbShot.look);
    }
    if (this.mode === 'blueprint' || this.mode === 'os') {
      const bp = this.mode === 'blueprint';
      const shot = bp ? this.bw.shot(s, this.isMobile) : this.dw.shot(this.isMobile);
      shot.cam.x += this.mouseSmooth.x * (bp ? 0.9 : 0.6);
      shot.cam.y += this.mouseSmooth.y * (bp ? 0.6 : 0.4);
      this.camera.position.lerp(shot.cam, bp ? 0.06 : 0.05);
      this.lookAt.lerp(shot.look, bp ? 0.06 : 0.05);
      this.camera.lookAt(this.lookAt);
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);
      if (bp) this.bw.update(dt, shot, !this.blockHover);
      else this.dw.update(dt);
      this.hover = 0;
      this.glitch = 0;
      this.renderer.render(this.scene, this.camera);
      return;
    }
    let gShot = null;
    if (this.mode === 'glitch') {
      gShot = this.gw.shot(s, this.isMobile);
      cam.copy(gShot.cam);
      cam.x += this.mouseSmooth.x * 0.5;
      cam.y += this.mouseSmooth.y * 0.3;
      look.copy(gShot.look);
    }

    this.camera.position.lerp(cam, 0.08);
    this.lookAt.lerp(look, 0.08);
    this.camera.lookAt(this.lookAt);

    if (kbShot) {
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);
      this.kb.update(dt, kbShot, !this.blockHover);
      this.hover = 0;
      this.glitch = 0;
      // clean render: no bloom, no CRT, no glitch in the keyboard theme
      this.renderer.render(this.scene, this.camera);
      return;
    }
    if (gShot) {
      this.raycaster.setFromCamera(this.pointerNDC, this.camera);
      this.gw.update(dt, gShot, !this.blockHover, this.velocity);
      this.hover = 0;
      this.gw.render();
      return;
    }

    this.core.position.lerp(corePos, 0.07);
    const sc = THREE.MathUtils.lerp(this.core.scale.x, coreScale * (1 + this.hover * 0.08), 0.08);
    this.core.scale.setScalar(sc);

    // --- hover detection: ray vs core bounding sphere ---
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const hit = !this.blockHover && this.raycaster.ray.distanceToPoint(this.core.position) < 1.4 * sc;
    this.hover = THREE.MathUtils.lerp(this.hover, hit ? 1 : 0, 0.1);
    document.body.classList.toggle('core-hover', hit);

    // --- core motion ---
    const spin = 1 + this.hover * 2 + Math.abs(this.velocity) * 0.002;
    this.corePoints.rotation.y += dt * 0.15 * spin;
    this.corePoints.rotation.x = Math.sin(t * 0.2) * 0.2 + this.mouseSmooth.y * 0.4;
    this.shell.rotation.y -= dt * 0.1 * spin;
    this.shell.rotation.z += dt * 0.05;
    this.rings[0].rotation.z += dt * 0.4 * spin;
    this.rings[1].rotation.z -= dt * 0.25 * spin;
    this.rings[2].rotation.z += dt * 0.6 * spin;

    this.pulse = Math.max(0, this.pulse - dt * 0.9);
    this.coreUniforms.uTime.value = t;
    this.coreUniforms.uPulse.value = this.pulse;
    this.coreUniforms.uHover.value = this.hover;

    // shockwave
    if (this.shock.material.opacity > 0) {
      this.shock.scale.multiplyScalar(1 + dt * 3.2);
      this.shock.material.opacity = Math.max(0, this.shock.material.opacity - dt * 1.4);
    }

    // labels orbit
    this.labelItems.forEach((l) => {
      l.a += dt * l.sp * (1 + this.hover);
      l.s.position.set(Math.cos(l.a) * l.r, l.y + Math.sin(l.a) * l.tilt, Math.sin(l.a) * l.r);
      const front = (Math.sin(l.a) + 1) * 0.5; // dimmer when behind
      l.s.material.opacity = THREE.MathUtils.lerp(l.s.material.opacity, labelOp * (0.25 + 0.75 * front), 0.1);
    });

    // rain: accumulate time so speed changes never jump
    const boost = 1 + Math.min(Math.abs(this.velocity) * 0.004, 4);
    this.rainTime += dt * rainMul * boost;
    this.rainUniforms.uTime.value = this.rainTime;
    this.rainUniforms.uOpacity.value = Math.min(1, this.rainUniforms.uOpacity.value + dt * 0.4);

    this.gridUniforms.uTime.value = t;
    this.gridUniforms.uOpacity.value = Math.min(1, this.gridUniforms.uOpacity.value + dt * 0.3);
    this.ceilUniforms.uOpacity.value = this.gridUniforms.uOpacity.value * 0.35;
    this.dust.rotation.y = t * 0.01;

    // glitch: decays, spikes with fast scroll and occasionally at random
    if (Math.random() < 0.0025) this.kick(0.35 + Math.random() * 0.4);
    this.glitch = Math.max(this.glitch - dt * 1.8, Math.min(Math.abs(this.velocity) * 0.0009, 0.6), this.hover * 0.15);
    this.crt.uniforms.uGlitch.value = this.glitch;
    this.crt.uniforms.uTime.value = t;
    this.bloom.strength = 0.85 + this.hover * 0.4 + this.pulse * 0.8;

    this.composer.render();
  }
}
