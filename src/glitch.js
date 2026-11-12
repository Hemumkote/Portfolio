import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* "Glitch in the matrix" world: a voxel HM monolith inside a void,
   sliced by corrupted scanline bands, with its own signal-damage post pass. */

export const VOID = 0x050505;
const HASH = /* glsl */ `float hash(float n){return fract(sin(n)*43758.5453123);}`;

// per-section placement of the monolith (camera stays mostly frontal: it is a broadcast)
const SHOTS = [
  { cam: [0, 0, 10], look: [0, 0, 0], pos: [4.5, 0.3, 0], yaw: -0.35, scale: 1.45 }, // hero
  { cam: [-2, 1, 9.5], look: [0, 0, 0], pos: [4.4, -0.6, -1.5], yaw: 0.35, scale: 1.05 }, // about
  { cam: [0, 0, 12], look: [0, 0, 0], pos: [0, 0.4, -6], yaw: 0, scale: 1.9 }, // stack: huge, far behind
  { cam: [2, -1, 9.5], look: [0, 0, 0], pos: [-4.4, 0, -1], yaw: 0.45, scale: 1.05 }, // experience
  { cam: [0, 1.5, 10], look: [0, 0.5, 0], pos: [4.4, 1.2, -2.5], yaw: -0.5, scale: 1.1 }, // projects
  { cam: [-1, 0, 9.5], look: [0, 0, 0], pos: [-4, -0.6, 0], yaw: 0.35, scale: 1.05 }, // education
  { cam: [0, 0, 9], look: [0, 0, 0], pos: [4, -0.2, 0], yaw: -0.25, scale: 1.3 }, // contact
];

export class GlitchWorld {
  constructor(host) {
    this.host = host;
    this.group = new THREE.Group();
    this.group.visible = false;
    host.scene.add(this.group);
    this.mono = new THREE.Group();
    this.group.add(this.mono);

    this.t = 0;
    this.burstAmt = 0;
    this.spike = 0;
    this.hover = 0;
    this.explodeT = -1;
    this.dummy = new THREE.Object3D();

    this.buildMonolith();
    this.buildFragments();
    this.buildPost();
  }

  /* ---------------- voxel "HM" ---------------- */
  buildMonolith() {
    const W = 180, H = 72, STEP = 3, S = 0.1;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff';
    // system fonts only: the shape must not depend on web-font timing
    g.font = '900 66px "Arial Black", Impact, "Helvetica Neue", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('HM', W / 2, H / 2 + 3);
    const px = g.getImageData(0, 0, W, H).data;

    const depth = this.host.isMobile ? 2 : 3;
    const cells = [];
    for (let y = 0; y < H; y += STEP) for (let x = 0; x < W; x += STEP) if (px[(y * W + x) * 4] > 128) cells.push([x, y]);
    const n = cells.length * depth;
    const base = new Float32Array(n * 3);
    const rnd = new Float32Array(n * 4); // seed, explode distance, color kind, layer
    const cx = W / STEP / 2, cy = H / STEP / 2;
    let i = 0;
    for (const [x, y] of cells) {
      for (let d = 0; d < depth; d++) {
        base.set([(x / STEP - cx) * S, (cy - y / STEP) * S, (d - (depth - 1) / 2) * S], i * 3);
        const r = Math.random();
        rnd.set([Math.random(), Math.random(), r < 0.05 ? 1 : r < 0.1 ? 2 : 0, d], i * 4);
        i++;
      }
    }
    const geo = new THREE.BoxGeometry(S * 0.86, S * 0.86, S * 0.86);
    geo.setAttribute('aBase', new THREE.InstancedBufferAttribute(base, 3));
    geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rnd, 4));

    this.uni = {
      uTime: { value: 0 },
      uGlitch: { value: 0 },
      uExplode: { value: 0 },
      uHover: { value: 0 },
      uHoverY: { value: 0 },
      uColA: { value: this.host.colorA },
      uColB: { value: this.host.colorB },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uni,
      vertexShader: /* glsl */ `
        attribute vec3 aBase; attribute vec4 aRand;
        uniform float uTime, uGlitch, uExplode, uHover, uHoverY;
        uniform vec3 uColA, uColB;
        varying vec3 vN; varying vec3 vCol;
        ${HASH}
        void main(){
          vec3 p = aBase;
          float tStep = floor(uTime * 12.0);
          // corrupted horizontal bands slide sideways
          float band = floor(aBase.y * 4.0);
          float bandOn = step(1.0 - (0.1 + uGlitch * 0.55), hash(band * 13.1 + tStep));
          p.x += (hash(band * 7.7 + tStep * 1.3) - 0.5) * 1.6 * bandOn * (0.35 + uGlitch);
          // pointer: local corruption around the hovered height
          float near = exp(-pow((aBase.y - uHoverY) * 2.2, 2.0)) * uHover;
          p.z += (hash(aRand.x * 99.0 + tStep) - 0.5) * near * 1.4;
          p.x += (hash(aRand.x * 41.0 + tStep) - 0.5) * near * 0.5;
          // reality reload: blow apart, then reassemble
          vec3 jitter = vec3(hash(aRand.x * 3.1), hash(aRand.x * 5.3), hash(aRand.x * 7.7)) - 0.5;
          p += (normalize(aBase + vec3(0.0, 0.0, 0.001)) * (1.5 + aRand.y * 5.0) + jitter * 5.0) * uExplode;
          // dead pixels: a few voxels drop out each frame
          float drop = step(0.985 - uGlitch * 0.06, hash(aRand.x * 31.0 + tStep));
          vec3 pos = position * (1.0 - drop) + p;
          vN = normalize(normalMatrix * normal);
          vCol = aRand.z < 0.5 ? vec3(0.95) : (aRand.z < 1.5 ? uColA : uColB);
          vCol = mix(vCol, mix(uColA, uColB, hash(band + tStep * 2.0)), bandOn * 0.75);
          vCol *= 0.75 + 0.25 * aRand.w; // front layer brighter
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vN; varying vec3 vCol;
        void main(){
          float l = 0.38 + 0.62 * max(dot(vN, normalize(vec3(-0.4, 0.7, 0.6))), 0.0);
          gl_FragColor = vec4(vCol * l, 1.0);
        }`,
    });
    this.voxels = new THREE.InstancedMesh(geo, mat, n);
    this.voxels.frustumCulled = false;
    this.mono.add(this.voxels);

    // invisible hit volume for hover/click
    this.hitBox = new THREE.Mesh(new THREE.BoxGeometry((W / STEP) * S, (H / STEP) * S, depth * S + 0.6), new THREE.MeshBasicMaterial());
    this.hitBox.visible = false;
    this.mono.add(this.hitBox);
  }

  /* ---------------- drifting dead-pixel fragments ---------------- */
  buildFragments() {
    const n = this.host.isMobile ? 60 : 140;
    this.fragMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
    this.fragMesh.frustumCulled = false;
    this.frags = [];
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      this.frags.push({
        p: new THREE.Vector3((Math.random() - 0.5) * 28, (Math.random() - 0.5) * 15, -14 + Math.random() * 15),
        v: 0.1 + Math.random() * 0.4,
        s: 0.03 + Math.pow(Math.random(), 3) * 0.22,
        kind: r < 0.15 ? 1 : r < 0.3 ? 2 : 0,
        seed: Math.random() * 100,
      });
    }
    this.group.add(this.fragMesh);
    this.onTheme();
  }

  /* ---------------- signal-damage post pass ---------------- */
  buildPost() {
    const w = window.innerWidth, h = window.innerHeight;
    this.composer = new EffectComposer(this.host.renderer);
    this.composer.setPixelRatio(this.host.dpr);
    this.composer.setSize(w, h);
    this.composer.addPass(new RenderPass(this.host.scene, this.host.camera));
    this.pass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uAmt: { value: 0 },
        uBurst: { value: 0 },
        uRes: { value: new THREE.Vector2(w, h) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform float uTime, uAmt, uBurst; uniform vec2 uRes; varying vec2 vUv;
        ${HASH}
        void main(){
          vec2 uv = vUv;
          float t = floor(uTime * 14.0);
          float k = uAmt + uBurst;
          // displaced macro-blocks (datamosh)
          vec2 blk = floor(uv * vec2(10.0, 28.0));
          float on = step(1.0 - (0.015 + k * 0.28), hash(blk.x * 17.0 + blk.y * 131.0 + t));
          uv.x += (hash(blk.y * 3.0 + t) - 0.5) * 0.12 * on;
          // rolling VHS tracking band
          float band = fract(uTime * 0.06);
          float inBand = smoothstep(0.035, 0.0, abs(uv.y - band));
          uv.x += (hash(floor(uv.y * uRes.y * 0.5) + t) - 0.5) * 0.012 * inBand;
          // line tears
          float line = floor(uv.y * 90.0);
          uv.x += (hash(line + t * 7.0) - 0.5) * 0.04 * step(0.985 - k * 0.2, hash(line * 1.7 + t)) * k;
          // RGB channel split
          float s = 0.0015 + k * 0.012;
          vec3 col;
          col.r = texture2D(tDiffuse, uv + vec2(s, 0.0)).r;
          col.g = texture2D(tDiffuse, uv).g;
          col.b = texture2D(tDiffuse, uv - vec2(s, 0.0)).b;
          // grain, scanlines, band glow
          col += (hash(uv.x * 512.0 + uv.y * 1024.0 + uTime * 60.0) - 0.5) * 0.07;
          col *= 0.93 + 0.07 * sin(uv.y * uRes.y * 3.14159);
          col += inBand * 0.05;
          // inverted blocks during a burst
          col = mix(col, 1.0 - col, on * step(0.4, uBurst) * 0.85);
          vec2 d = vUv - 0.5;
          col *= 1.0 - dot(d, d) * 0.9;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.composer.addPass(this.pass);
    this.composer.addPass(new OutputPass());
  }

  /* ---------------- api ---------------- */
  setVisible(v) {
    this.group.visible = v;
    if (v) this.burst(true); // tune-in tear when the channel switches here
  }

  onTheme() {
    const C = [new THREE.Color(0xf2f2f2), this.host.colorA, this.host.colorB];
    this.frags.forEach((f, i) => this.fragMesh.setColorAt(i, C[f.kind]));
    this.fragMesh.instanceColor.needsUpdate = true;
  }

  /** Click anywhere: reality reload. */
  burst(quiet = false) {
    this.burstAmt = 1;
    this.explodeT = 0;
    if (!quiet) staticSound();
  }

  resize(w, h) {
    this.composer.setSize(w, h);
    this.pass.uniforms.uRes.value.set(w, h);
  }

  setPixelRatio(dpr) {
    this.composer.setPixelRatio(dpr);
  }

  shot(s, isMobile) {
    const i0 = Math.floor(s), i1 = Math.min(i0 + 1, SHOTS.length - 1);
    const f = (x) => x * x * (3 - 2 * x);
    const t = f(s - i0);
    const A = SHOTS[i0], B = SHOTS[i1];
    const v = (a, b) => new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), t);
    const shot = { cam: v(A.cam, B.cam), look: v(A.look, B.look), pos: v(A.pos, B.pos), yaw: A.yaw + (B.yaw - A.yaw) * t, scale: A.scale + (B.scale - A.scale) * t };
    if (isMobile) {
      // phones: centred; in the hero it floats above the name
      const hero = 1 - Math.min(s, 1);
      shot.pos.x *= 0.15;
      shot.pos.y = shot.pos.y * (1 - hero) + 4.2 * hero;
      shot.yaw *= 0.4;
      shot.scale *= 0.42;
      shot.cam.x *= 0.3;
      shot.cam.z *= 1.15;
    }
    return shot;
  }

  update(dt, shot, hoverAllowed, velocity) {
    this.t += dt;
    const t = this.t;
    const H = this.host;

    this.mono.position.lerp(shot.pos, 0.07);
    const sc = THREE.MathUtils.lerp(this.mono.scale.x, shot.scale, 0.07);
    this.mono.scale.setScalar(sc);
    const yaw = shot.yaw + H.mouseSmooth.x * 0.35 + Math.sin(t * 0.3) * 0.12;
    this.mono.rotation.y += (yaw - this.mono.rotation.y) * 0.06;
    this.mono.rotation.x += (-H.mouseSmooth.y * 0.2 - this.mono.rotation.x) * 0.06;

    // hover → local corruption
    let hit = false;
    if (hoverAllowed) {
      const h = H.raycaster.intersectObject(this.hitBox, false)[0];
      if (h) {
        hit = true;
        this.uni.uHoverY.value = this.mono.worldToLocal(h.point.clone()).y;
      }
    }
    document.body.classList.toggle('g-hover', hit);
    this.hover += ((hit ? 1 : 0) - this.hover) * 0.12;

    // explode / reassemble
    if (this.explodeT >= 0) {
      this.explodeT += dt;
      const e = this.explodeT;
      const out = Math.min(1, e / 0.22);
      const back = Math.max(0, (e - 0.35) / 1.1);
      this.uni.uExplode.value = (1 - Math.pow(1 - out, 3)) * (1 - back * back * (3 - 2 * back));
      if (e > 1.45) { this.explodeT = -1; this.uni.uExplode.value = 0; }
    }

    // random signal spikes + scroll-speed corruption
    if (Math.random() < 0.006) this.spike = 0.4 + Math.random() * 0.6;
    this.spike = Math.max(0, this.spike - dt * 2.5);
    this.burstAmt = Math.max(0, this.burstAmt - dt * 1.6);
    const speed = Math.min(Math.abs(velocity) * 0.0006, 0.5);

    this.uni.uTime.value = t;
    this.uni.uGlitch.value = 0.12 + this.spike * 0.8 + this.hover * 0.4 + this.burstAmt + speed;
    this.uni.uHover.value = this.hover;
    this.pass.uniforms.uTime.value = t;
    this.pass.uniforms.uAmt.value = 0.05 + this.spike * 0.5 + speed + this.hover * 0.08;
    this.pass.uniforms.uBurst.value = this.burstAmt;

    // fragments drift upward and wrap, flickering in steps
    const step = Math.floor(t * 8);
    this.frags.forEach((f, i) => {
      f.p.y += f.v * dt * (1 + speed * 6);
      if (f.p.y > 8) f.p.y = -8;
      const flick = Math.sin(f.seed * 13 + step * 1.7) > 0.92 ? 0 : 1;
      this.dummy.position.copy(f.p);
      this.dummy.position.x += Math.sin(step * 0.31 + f.seed) > 0.97 ? 0.4 : 0; // occasional hop
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(f.s * flick);
      this.dummy.updateMatrix();
      this.fragMesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.fragMesh.instanceMatrix.needsUpdate = true;
  }

  render() {
    this.composer.render();
  }
}

/* short burst of static for the "reality reload" click */
let actx = null;
function staticSound() {
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const now = actx.currentTime;
    const len = 0.22;
    const buf = actx.createBuffer(1, Math.ceil(actx.sampleRate * len), actx.sampleRate);
    const d = buf.getChannelData(0);
    // stepped noise = digital crunch
    let hold = 0;
    for (let i = 0; i < d.length; i++) {
      if (i % 24 === 0) hold = Math.random() * 2 - 1;
      d[i] = hold * Math.pow(1 - i / d.length, 2);
    }
    const src = actx.createBufferSource();
    src.buffer = buf;
    const hp = actx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 700;
    const gain = actx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + len);
    src.connect(hp).connect(gain).connect(actx.destination);
    src.start(now);
  } catch {
    /* audio is optional */
  }
}
