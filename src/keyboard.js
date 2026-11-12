import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { KEYCAPS, SKILLS, PROJECTS } from './data.js';

/* ------------------------------------------------------------------ */
/* Layout: a 60% board, 15 units wide. [code, legend, width-in-units]   */
/* ------------------------------------------------------------------ */
const L = (s) => [...s].map((c) => [`Key${c}`, c, 1]);
const ROWS = [
  [['Escape', 'esc', 1], ...[...'1234567890'].map((d) => [`Digit${d}`, d, 1]), ['Minus', '-', 1], ['Equal', '=', 1], ['Backspace', '⌫', 2]],
  [['Tab', 'tab', 1.5], ...L('QWERTYUIOP'), ['BracketLeft', '[', 1], ['BracketRight', ']', 1], ['Backslash', '\\', 1.5]],
  [['CapsLock', 'caps', 1.75], ...L('ASDFGHJKL'), ['Semicolon', ';', 1], ['Quote', "'", 1], ['Enter', 'enter', 2.25]],
  [['ShiftLeft', 'shift', 2.25], ...L('ZXCVBNM'), ['Comma', ',', 1], ['Period', '.', 1], ['Slash', '/', 1], ['ShiftRight', 'shift', 2.75]],
  [['ControlLeft', 'ctrl', 1.25], ['MetaLeft', '⌘', 1.25], ['AltLeft', 'alt', 1.25], ['Space', '', 6.25], ['AltRight', 'alt', 1.25], ['MetaRight', '⌘', 1.25], ['ContextMenu', 'fn', 1.25], ['ControlRight', 'ctrl', 1.25]],
];
const BOARD_W = 15;
const CAP_H = 0.42;
const GAP = 0.1;

// Per-section placement: camera, look target, board position + yaw.
const SHOTS = [
  { cam: [0, 7, 15], look: [0, 1, 0], kb: [5, 0, 0], yaw: -0.32 }, // hero: board on the right
  { cam: [-4, 9.5, 11], look: [0, 0.5, 0], kb: [3.5, 0, 0], yaw: 0.22 }, // about
  { cam: [0, 15, 6], look: [0, 0, 0.4], kb: [0, 0, 0], yaw: 0 }, // skills: top-down showcase
  { cam: [8, 5, 12], look: [0, 1, 0], kb: [-3.5, 0, 0], yaw: 0.5 }, // experience
  { cam: [0, 6, 13.5], look: [0, 1.5, 0], kb: [0, -0.6, 0], yaw: -0.18 }, // projects
  { cam: [-8, 7, 11], look: [0, 0.5, 0], kb: [3, 0, 0], yaw: -0.4 }, // education
  { cam: [0, 7, 15], look: [0, 3.4, 0], kb: [5.5, 0, 0], yaw: -0.3 }, // contact: low right, clear of the headline
];

// light "desk" palette
export const DESK = 0xe9e5dd;
const CREAM = 0xf5f1e9;
const MOD = 0xb5afa4;
const CASE = 0x2b2b2f;
const INK = 0x2b2925;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Card data for a keycap: proficiency, stack path and projects that used it. */
export function techInfo(tc) {
  const group = SKILLS.find((g) => g.items.some(([n]) => n === tc.skill));
  const level = group?.items.find(([n]) => n === tc.skill)?.[1] ?? null;
  const tag = norm(tc.tag || tc.skill);
  const usedIn = PROJECTS.filter((p) => p.stack.some((s) => norm(s) === tag)).map((p) => p.name);
  return { ...tc, level, path: group?.path ?? '~/stack', usedIn };
}

export class KeyboardWorld {
  constructor(host) {
    this.host = host; // the Scene: shares colors, pointer, raycaster
    this.group = new THREE.Group();
    this.group.visible = false;
    host.scene.add(this.group);

    this.board = new THREE.Group(); // everything that moves with the keyboard
    this.group.add(this.board);
    this.keys = [];
    this.byCode = new Map();
    this.bodies = [];
    this.hovered = null;
    this.t = 0;
    this.nextSwap = 4;
    this.tmpC = new THREE.Color();
    this.geoCache = new Map();

    this.buildLights();
    this.buildCase();
    this.buildKeys();
    this.pickFloaters(host.isMobile ? 5 : 7, true);
    // legends use web fonts; redraw once they are guaranteed to be ready
    document.fonts?.ready.then(() => this.keys.forEach((k) => this.drawLegend(k)));
  }

  /* ---------------- scene pieces ---------------- */
  buildLights() {
    this.group.add(new THREE.HemisphereLight(0xffffff, 0xcfc6b6, 1.6));
    const sun = new THREE.DirectionalLight(0xfff4e6, 2.4);
    sun.position.set(-5, 16, 9);
    sun.castShadow = true;
    const S = this.host.isMobile ? 1024 : 2048;
    sun.shadow.mapSize.set(S, S);
    Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 12, bottom: -12, near: 1, far: 50 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 4;
    this.group.add(sun, sun.target);

    // desk: invisible except for the shadows falling on it
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.ShadowMaterial({ opacity: 0.16 }));
    desk.rotation.x = -Math.PI / 2;
    desk.position.y = -0.62;
    desk.receiveShadow = true;
    this.group.add(desk);
  }

  buildCase() {
    const kase = new THREE.Mesh(
      new RoundedBoxGeometry(BOARD_W + 0.7, 0.55, 5 + 0.7, 4, 0.2),
      new THREE.MeshStandardMaterial({ color: CASE, metalness: 0.35, roughness: 0.45 })
    );
    kase.position.y = -0.33;
    kase.castShadow = kase.receiveShadow = true;
    this.board.add(kase);

    // soft contact shadow beneath the case
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(BOARD_W * 1.25, 8),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = -0.615;
    this.board.add(this.glow);
  }

  capGeo(w) {
    if (!this.geoCache.has(w)) this.geoCache.set(w, new RoundedBoxGeometry(w - GAP, CAP_H, 1 - GAP, 3, 0.09));
    return this.geoCache.get(w);
  }

  buildKeys() {
    const techByCode = new Map(KEYCAPS.map((k) => [k.code, techInfo(k)]));
    const socketGeo = new THREE.PlaneGeometry(1 - GAP * 2, 1 - GAP * 2);
    ROWS.forEach((row, r) => {
      let x = -BOARD_W / 2;
      const z = (r - 2) * 1.0;
      row.forEach(([code, label, w]) => {
        const tech = techByCode.get(code) || null;
        const slot = new THREE.Vector3(x + w / 2, CAP_H / 2, z);
        x += w;

        const cap = new THREE.Group();
        cap.position.copy(slot);
        const isMod = !tech && label.length > 1;
        const body = new THREE.Mesh(
          this.capGeo(w),
          new THREE.MeshStandardMaterial({ color: tech ? this.host.colorA : isMod ? MOD : CREAM, roughness: 0.62, metalness: 0, emissive: 0x000000 })
        );
        body.castShadow = body.receiveShadow = true;
        const canvas = document.createElement('canvas');
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const legend = new THREE.Mesh(
          new THREE.PlaneGeometry(w - GAP - 0.08, 1 - GAP - 0.08),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: tech ? 0xffffff : INK })
        );
        legend.rotation.x = -Math.PI / 2;
        legend.position.y = CAP_H / 2 + 0.003;
        cap.add(body, legend);
        this.board.add(cap);

        // glowing socket revealed when a tech key floats away
        let socket = null;
        if (tech) {
          socket = new THREE.Mesh(
            w === 1 ? socketGeo : new THREE.PlaneGeometry(w - GAP * 2, 1 - GAP * 2),
            new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0, depthWrite: false })
          );
          socket.rotation.x = -Math.PI / 2;
          socket.position.set(slot.x, 0.01, slot.z);
          this.board.add(socket);
        }

        const k = {
          code, label, w, tech, cap, body, legend, tex, canvas, socket, slot,
          float: 0, // 0 docked … 1 fully floating
          floating: false,
          since: 0,
          anchor: new THREE.Vector3(),
          spin: new THREE.Vector3(),
          phase: Math.random() * 10,
          press: 1, // press animation progress (1 = idle)
          flash: 0,
          hover: 0,
        };
        body.userData.key = k;
        this.drawLegend(k);
        this.keys.push(k);
        this.byCode.set(code, k);
        this.bodies.push(body);
      });
    });
  }

  drawLegend(k) {
    const PX = 128;
    const c = k.canvas;
    c.width = Math.round(PX * k.w);
    c.height = PX;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    const fit = (txt, weight, size, maxW) => {
      let s = size;
      do g.font = `${weight} ${s}px "JetBrains Mono", ui-monospace, monospace`;
      while (g.measureText(txt).width > maxW && --s > 10);
    };
    if (k.tech) {
      // real key letter, small in the corner
      if (k.label && k.label.length === 1) {
        g.textAlign = 'left';
        g.globalAlpha = 0.5;
        g.font = '500 22px "JetBrains Mono", monospace';
        g.fillText(k.label, 16, 26);
        g.textAlign = 'center';
      }
      g.globalAlpha = 1;
      fit(k.tech.short, 800, 46, c.width - 22);
      g.fillText(k.tech.short, c.width / 2, 66);
      g.globalAlpha = 0.55;
      fit(k.tech.skill, 500, 15, c.width - 18);
      g.fillText(k.tech.skill, c.width / 2, 104);
      g.globalAlpha = 1;
    } else if (k.label) {
      fit(k.label, 600, k.label.length > 1 ? 26 : 40, c.width - 24);
      g.fillText(k.label, c.width / 2, 64);
    }
    k.tex.needsUpdate = true;
  }

  /* ---------------- floating keys ---------------- */
  floatable() {
    return this.keys.filter((k) => k.tech && k.w === 1);
  }

  newAnchor(k) {
    // drift somewhere above the board, spread out so they don't clump
    // pick the side with fewer floaters so they spread across the board
    const left = this.keys.filter((o) => o.floating && o !== k && o.anchor.x < 0).length;
    const right = this.keys.filter((o) => o.floating && o !== k && o.anchor.x >= 0).length;
    const side = left === right ? (Math.random() < 0.5 ? -1 : 1) : left < right ? -1 : 1;
    k.anchor.set(side * (0.8 + Math.random() * 5.6), 2 + Math.random() * 2.6, -2 + Math.random() * 4);
    k.spin.set((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.0);
  }

  lift(k) {
    if (!k || k.floating) return;
    k.floating = true;
    k.since = 0;
    this.newAnchor(k);
  }

  dock(k) {
    if (!k || !k.floating) return;
    k.floating = false;
    k.press = 0;
    k.flash = 1;
  }

  pickFloaters(n, instant = false) {
    const pool = this.floatable().sort(() => Math.random() - 0.5).slice(0, n);
    pool.forEach((k) => {
      this.lift(k);
      if (instant) k.float = 1;
    });
  }

  /* ---------------- interaction ---------------- */
  pick() {
    const hits = this.host.raycaster.intersectObjects(this.bodies, false);
    return hits.length ? hits[0].object.userData.key : null;
  }

  /** Click / tap. Returns the tech info if a tech key was hit, `true` for a plain key, null for a miss. */
  click() {
    if (!this.group.visible) return null;
    this.host.raycaster.setFromCamera(this.host.pointerNDC, this.host.camera);
    const k = this.pick();
    if (!k) return null;
    this.press(k);
    return k.tech || true;
  }

  /** Physical keyboard press. */
  pressCode(code) {
    const k = this.byCode.get(code);
    if (!k) return null;
    this.press(k, true);
    return k.tech;
  }

  /** DOM keycap in the Stack section → press the matching 3D key (if there is one). */
  pressSkill(name) {
    const k = this.keys.find((x) => x.tech && x.tech.skill === name);
    if (k) this.press(k);
    else clickSound(false);
    return k ? k.tech : techInfo({ short: name, skill: name });
  }

  press(k, quiet = false) {
    if (k.floating) {
      this.dock(k);
      // keep the sky populated: another key takes off shortly after
      setTimeout(() => {
        const docked = this.floatable().filter((x) => !x.floating && x !== k);
        this.lift(docked[(Math.random() * docked.length) | 0]);
      }, 1400);
    } else {
      k.press = 0;
      k.flash = 1;
    }
    this.host.kick(quiet ? 0.12 : 0.3);
    clickSound(k.w > 1.5);
  }

  /* ---------------- visibility ---------------- */
  setVisible(v) {
    this.group.visible = v;
  }

  onTheme() {
    this.keys.forEach((k) => k.tech && k.body.material.color.copy(this.host.colorA));
  }

  /* ---------------- per frame ---------------- */
  /** returns the camera shot for the given continuous section index */
  shot(s, isMobile) {
    const i0 = Math.floor(s), i1 = Math.min(i0 + 1, SHOTS.length - 1);
    const f = (x) => x * x * (3 - 2 * x);
    const t = f(s - i0);
    const A = SHOTS[i0], B = SHOTS[i1];
    const v = (a, b) => new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), t);
    const cam = v(A.cam, B.cam);
    const look = v(A.look, B.look);
    const kb = v(A.kb, B.kb);
    let yaw = A.yaw + (B.yaw - A.yaw) * t;
    if (isMobile) {
      // narrow screens: centre the board and pull back so its full width fits;
      // in the hero, aim low so the board sits in the empty space above the name
      kb.x = 0;
      yaw *= 0.3;
      cam.x *= 0.3;
      cam.multiplyScalar(1.75);
      const hero = 1 - Math.min(s, 1);
      look.y -= 7.4 * hero + 1;
    }
    return { cam, look, kb, yaw };
  }

  update(dt, shot, hoverAllowed) {
    this.t += dt;
    const t = this.t;
    const H = this.host;

    this.board.position.lerp(shot.kb, 0.07);
    this.board.rotation.y += (shot.yaw - this.board.rotation.y) * 0.07;

    // hover
    let hit = null;
    if (hoverAllowed) hit = this.pick();
    if (hit !== this.hovered) this.hovered = hit;
    document.body.classList.toggle('key-hover', !!hit);

    // occasionally swap which keys are floating
    this.nextSwap -= dt;
    if (this.nextSwap <= 0) {
      this.nextSwap = 5 + Math.random() * 4;
      const floaters = this.keys.filter((k) => k.floating);
      const oldest = floaters.sort((a, b) => b.since - a.since)[0];
      if (oldest && oldest.since > 10) {
        this.dock(oldest);
        const docked = this.floatable().filter((k) => !k.floating && k !== oldest);
        this.lift(docked[(Math.random() * docked.length) | 0]);
      }
    }

    for (const k of this.keys) {
      if (k.floating) k.since += dt;
      // ease float in/out
      const target = k.floating ? 1 : 0;
      k.float += (target - k.float) * Math.min(1, dt * (k.floating ? 1.4 : 4.5));
      const fe = ease(THREE.MathUtils.clamp(k.float, 0, 1));

      // press: quick dip then spring back
      if (k.press < 1) k.press = Math.min(1, k.press + dt * 4.5);
      const dip = Math.sin(k.press * Math.PI) * 0.22;
      k.flash = Math.max(0, k.flash - dt * 1.8);
      k.hover += ((k === this.hovered ? 1 : 0) - k.hover) * 0.2;

      // position: slot ⇄ bobbing anchor
      const p = k.cap.position;
      p.copy(k.slot);
      if (fe > 0.0005) {
        const ax = k.anchor.x + Math.sin(t * 0.7 + k.phase) * 0.35;
        const ay = k.anchor.y + Math.sin(t * 1.1 + k.phase * 2) * 0.28;
        const az = k.anchor.z + Math.cos(t * 0.6 + k.phase) * 0.3;
        p.x += (ax - p.x) * fe;
        p.y += (ay - p.y) * fe + Math.sin(fe * Math.PI) * 0.8; // arc up on the way
        p.z += (az - p.z) * fe;
        k.cap.rotation.set(
          (Math.sin(t * 0.5 + k.phase) * 0.5 + k.spin.x) * fe,
          (t * 0.25 * Math.sign(k.spin.y || 1) + k.spin.y) * fe,
          (Math.cos(t * 0.4 + k.phase) * 0.35 + k.spin.z) * fe
        );
      } else k.cap.rotation.set(0, 0, 0);
      p.y -= dip * (1 - fe) + k.hover * 0.06 * (1 - fe);
      const s = 1 + fe * 0.18 + k.hover * 0.05;
      k.cap.scale.setScalar(s);

      // press flash + hover lift tint
      k.body.material.emissive.copy(H.colorA).multiplyScalar(k.flash * 0.45 + k.hover * 0.18);
      if (k.socket) k.socket.material.opacity = fe * 0.55;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Tiny synthesized "thock" — no audio files                            */
/* ------------------------------------------------------------------ */
let actx = null;
function clickSound(big) {
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const now = actx.currentTime;
    const len = 0.06;
    const buf = actx.createBuffer(1, Math.ceil(actx.sampleRate * len), actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
    const src = actx.createBufferSource();
    src.buffer = buf;
    const bp = actx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = big ? 900 : 1700 + Math.random() * 500;
    bp.Q.value = 1.4;
    const gain = actx.createGain();
    gain.gain.setValueAtTime(big ? 0.35 : 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + len);
    src.connect(bp).connect(gain).connect(actx.destination);
    src.start(now);
  } catch {
    /* audio is optional */
  }
}
