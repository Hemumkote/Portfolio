import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { PROFILE, STATS, SKILLS, PROJECTS } from './data.js';

/* Blueprint world: an engineering drawing sheet that is drafted live, in front of you,
   by several pens at once. Straight lines are ruled against sliding scales, circles are
   swung with a compass, lettering is written in by hand. Scrolling explodes the device;
   every section you reach gets its own balloon callout, and clicking the sheet asks the
   nearest free pen to draw a detail circle right there. */

const V2 = THREE.Vector2;
const V3 = THREE.Vector3;
const C30 = Math.cos(Math.PI / 6);
const iso = (x, y, z) => new V2((x - z) * C30, y + (x + z) * 0.5);

const STEP = 0.05; // stroke resolution (paper units)
const SPEED = { ruler: 7.5, compass: 6.5, free: 4.2, text: 6.5 };
const LIFT = 0.6;
const FONT = '"Architects Daughter", "Share Tech Mono", ui-monospace, monospace';
const TEXT_PX = 46;
const TEXT_H = 64;

// per-section framing: focus point on the sheet, camera distance, tilt, how far the
// focus is pushed right (content column lives on the left), and the explode amount
const SHOTS = [
  { f: [6.4, 1.6], d: 19, tilt: [1.6, -2.6], sh: 0.22, e: 0.38 }, // hero: the exploded device
  { f: [-7.6, 1.2], d: 14, tilt: [1.2, -1.6], sh: 0.22, e: 0.6 }, // about: front + side views
  { f: [0, -0.4], d: 27, tilt: [0, -3.2], sh: 0, e: 1.0 }, // stack: whole sheet behind the BOM
  { f: [10.9, -7.6], d: 10.5, tilt: [1.4, -1.4], sh: 0.22, e: 0.9 }, // experience: title block
  { f: [6.6, 2.4], d: 17, tilt: [-1.6, -2], sh: 0.22, e: 1.1 }, // projects: fully exploded
  { f: [-10, 4.3], d: 8.5, tilt: [-1, -1], sh: 0.22, e: 0.7 }, // education: detail of the top
  { f: [0, 0], d: 25, tilt: [0, -2], sh: 0.16, e: 0.45 }, // contact: the finished sheet
];

// one balloon per section, pinned to a layer of the exploded phone
const BALLOONS = {
  1: { layer: 4, at: [0.5, 0.9], side: 1, dy: 0.9, label: 'DISPLAY — UI / UX' },
  2: { layer: 1, at: [0.3, 1.2], side: -1, dy: 0.9, label: () => `LOGIC — ${SKILLS.reduce((n, g) => n + g.items.length, 0)} MODULES` },
  3: { layer: 1, at: [0.3, -0.8], side: 1, dy: 0.2, label: () => `POWER — ${STATS[0].value}${STATS[0].suffix} YRS` },
  4: { layer: 2, at: [-0.9, -0.6], side: -1, dy: 0.5, label: () => `FRAME — ${PROJECTS.length} BUILDS` },
  5: { layer: 3, at: [0.5, -1.2], side: 1, dy: 0.5, label: 'PANEL — B.E. CSE · 8.1' },
  6: { layer: 0, at: [-0.5, 1.6], side: -1, dy: 0.6, label: 'LENS — SAY HELLO' },
};

const PEN_LEAN = [
  [0.42, 0.32, 1],
  [-0.38, 0.36, 1],
  [0.18, -0.42, 1],
];
const SCALES = [
  { len: 12, label: 'SCALE 1:1 · mm' },
  { len: 9, label: 'SCALE 1:2' },
  { len: 7, label: 'SCALE 1:50' },
];
const LIGHT = new V3(0.35, -0.55, 1).normalize();
const Y_UP = new V3(0, 1, 0);

function resample(pts, step) {
  const out = [pts[0].clone()];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const n = Math.max(1, Math.ceil(a.distanceTo(b) / step));
    for (let k = 1; k <= n; k++) out.push(a.clone().lerp(b, k / n));
  }
  if (out.length < 2) out.push(out[0].clone());
  return out;
}

export class BlueprintWorld {
  constructor(host) {
    this.host = host;
    this.group = new THREE.Group();
    this.group.visible = false;
    host.scene.add(this.group);
    this.sheet = new THREE.Group();
    this.group.add(this.sheet);

    this.t = 0;
    this.speed = 1;
    this.texts = [];
    this.details = [];
    this.detailN = 0;
    this.balloonsDone = new Set();
    this.layers = [];
    this.explode = SHOTS[0].e;
    this.focus = new V2(...SHOTS[0].f);
    this.plane = new THREE.Plane(new V3(0, 0, 1), 0);
    this.ptr = new V3();
    this.tmp = new V3();
    this.tmp2 = new V3();
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.palette = { paper: new THREE.Color('#0f3d73'), ink: new THREE.Color('#e8f1ff'), a: new THREE.Color('#ffd166'), b: new THREE.Color('#7fd8ff') };

    this.buildPaper();
    this.buildLights();
    this.buildMaterials();
    this.buildTools();
    this.buildDrawing();
    // handwritten lettering uses a web font: redraw every label once it is available
    document.fonts?.load(`${TEXT_PX}px "Architects Daughter"`).then(() => this.texts.forEach((t) => t.draw())).catch(() => {});
  }

  /* ---------------- paper, light, materials ---------------- */
  buildPaper() {
    this.gridU = {
      uPaper: { value: this.palette.paper },
      uInk: { value: this.palette.ink },
    };
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.ShaderMaterial({
        uniforms: this.gridU,
        depthWrite: false,
        vertexShader: /* glsl */ `
          varying vec2 vW;
          void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xy; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uPaper; uniform vec3 uInk; varying vec2 vW;
          float grid(vec2 p, float s){ vec2 q = p / s; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); return 1.0 - min(min(g.x, g.y), 1.0); }
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
            return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
          void main(){
            float a = grid(vW, 0.5) * 0.06 + grid(vW, 2.5) * 0.13;
            // inside the sheet the paper is a touch cleaner; outside it is the drafting table
            float inside = step(abs(vW.x), 16.0) * step(abs(vW.y), 10.0);
            a *= mix(0.55, 1.0, inside);
            vec3 c = mix(uPaper, uInk, a);
            c *= 0.94 + 0.08 * vnoise(vW * 0.35) + 0.03 * (hash(floor(vW * 60.0)) - 0.5);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      })
    );
    paper.renderOrder = -10;
    this.group.add(paper);
  }

  buildLights() {
    this.group.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.copy(LIGHT).multiplyScalar(20);
    this.group.add(sun);
  }

  buildMaterials() {
    const lm = (linewidth, o = {}) => new LineMaterial({ color: 0xffffff, linewidth, transparent: true, depthWrite: false, ...o });
    this.mats = {
      obj: lm(1.8),
      dim: lm(1.05, { opacity: 0.78 }),
      con: lm(1, { opacity: 0.5, dashed: true, dashSize: 0.3, gapSize: 0.15 }),
      acc: lm(1.9),
    };
  }

  /* ---------------- strokes ---------------- */
  stroke(kind, pts, layer, parent, extra = {}) {
    const dense = resample(pts, STEP);
    const pos = [];
    dense.forEach((p) => pos.push(p.x, p.y, 0.004));
    const geo = new LineGeometry();
    geo.setPositions(pos);
    const line = new Line2(geo, this.mats[layer]);
    if (layer === 'con') line.computeLineDistances();
    line.visible = false;
    line.frustumCulled = false;
    parent.add(line);
    const cum = [0];
    for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + dense[i - 1].distanceTo(dense[i]));
    return { kind, pts: dense, cum, len: Math.max(cum[cum.length - 1], 1e-3), line, parent, segs: dense.length - 1, s: 0, k: 0, ...extra };
  }

  text(str, x, y, size, layer, parent, { align = 'left', angle = 0 } = {}) {
    const canvas = document.createElement('canvas');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: 0xffffff });
    const geo = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    mesh.rotation.z = angle;
    parent.add(mesh);
    const dir = new V2(Math.cos(angle), Math.sin(angle));
    const st = { kind: 'text', layer, mesh, mat, tex, parent, size, s: 0, k: 0, pts: [new V2(), new V2()], cum: [0, 1], len: 1, w: 1 };
    st.draw = () => {
      const g = canvas.getContext('2d');
      g.font = `${TEXT_PX}px ${FONT}`;
      const w = Math.ceil(g.measureText(str).width) + 12;
      canvas.width = w;
      canvas.height = TEXT_H;
      g.font = `${TEXT_PX}px ${FONT}`;
      g.fillStyle = '#fff';
      g.textBaseline = 'middle';
      g.fillText(str, 6, TEXT_H / 2 + 3);
      tex.needsUpdate = true;
      st.w = (w / TEXT_H) * size;
      const k = align === 'center' ? 0.5 : align === 'right' ? 1 : 0;
      const start = new V2(x, y).addScaledVector(dir, -st.w * k);
      mesh.position.set(start.x, start.y, 0.006);
      st.pts = [start, start.clone().addScaledVector(dir, st.w)];
      st.cum = [0, st.w];
      const p = st.len > 0 ? st.s / st.len : 0;
      st.len = st.w;
      st.s = p * st.len;
      this.reveal(st);
    };
    st.draw();
    this.texts.push(st);
    return st;
  }

  // drawing helpers that append to one pen's queue
  kit(q, parent) {
    const v = (p) => (p instanceof V2 ? p.clone() : new V2(p[0], p[1]));
    const self = this;
    const K = {
      line(a, b, layer = 'obj') {
        a = v(a); b = v(b);
        const kind = a.distanceTo(b) < 0.6 ? 'free' : 'ruler';
        q.push(self.stroke(kind, [a, b], layer, parent, { a, b }));
      },
      poly(pts, layer = 'obj') {
        q.push(self.stroke('free', pts.map(v), layer, parent));
      },
      arc(c, r, a0, a1, layer = 'obj') {
        c = v(c);
        const n = Math.max(10, Math.ceil((r * Math.abs(a1 - a0)) / STEP));
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const a = a0 + ((a1 - a0) * i) / n;
          pts.push(new V2(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r));
        }
        q.push(self.stroke(r > 0.3 ? 'compass' : 'free', pts, layer, parent, { c, r }));
      },
      circle(c, r, layer = 'obj') { K.arc(c, r, Math.PI / 2, Math.PI / 2 - Math.PI * 2, layer); },
      rrect(cx, cy, w, h, r, layer = 'obj') {
        const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
        const H = Math.PI / 2;
        K.line([x0 + r, y1], [x1 - r, y1], layer);
        K.arc([x1 - r, y1 - r], r, H, 0, layer);
        K.line([x1, y1 - r], [x1, y0 + r], layer);
        K.arc([x1 - r, y0 + r], r, 0, -H, layer);
        K.line([x1 - r, y0], [x0 + r, y0], layer);
        K.arc([x0 + r, y0 + r], r, -H, -2 * H, layer);
        K.line([x0, y0 + r], [x0, y1 - r], layer);
        K.arc([x0 + r, y1 - r], r, 2 * H, H, layer);
      },
      rect(x0, y0, x1, y1, layer = 'obj') {
        K.line([x0, y1], [x1, y1], layer);
        K.line([x1, y1], [x1, y0], layer);
        K.line([x1, y0], [x0, y0], layer);
        K.line([x0, y0], [x0, y1], layer);
      },
      text(str, x, y, size, opts = {}) {
        q.push(self.text(str, x, y, size, opts.layer || 'obj', parent, opts));
      },
      arrow(tip, dir) {
        tip = v(tip);
        const d = v(dir).normalize();
        const n = new V2(-d.y, d.x);
        K.poly([tip.clone().addScaledVector(d, 0.32).addScaledVector(n, 0.1), tip, tip.clone().addScaledVector(d, 0.32).addScaledVector(n, -0.1)], 'dim');
      },
      // horizontal dimension: extension lines from the object edge at yObj, value written above
      dimH(x1, x2, y, yObj, label) {
        const s = Math.sign(y - yObj);
        K.line([x1, yObj + s * 0.12], [x1, y + s * 0.25], 'dim');
        K.line([x2, yObj + s * 0.12], [x2, y + s * 0.25], 'dim');
        K.line([x1, y], [x2, y], 'dim');
        K.arrow([x1, y], [1, 0]);
        K.arrow([x2, y], [-1, 0]);
        K.text(label, (x1 + x2) / 2, y + 0.3, 0.34, { align: 'center' });
      },
      dimV(y1, y2, x, xObj, label) {
        const s = Math.sign(x - xObj);
        K.line([xObj + s * 0.12, y1], [x + s * 0.25, y1], 'dim');
        K.line([xObj + s * 0.12, y2], [x + s * 0.25, y2], 'dim');
        K.line([x, y1], [x, y2], 'dim');
        K.arrow([x, y1], [0, 1]);
        K.arrow([x, y2], [0, -1]);
        K.text(label, x - 0.3, (y1 + y2) / 2, 0.34, { align: 'center', angle: Math.PI / 2 });
      },
      // isometric primitives (x across, z deep, y up)
      isoRect(x0, z0, w, d, y = 0, layer = 'obj') {
        const P = [[x0, z0], [x0 + w, z0], [x0 + w, z0 + d], [x0, z0 + d]].map(([x, z]) => iso(x, y, z));
        for (let i = 0; i < 4; i++) K.line(P[i], P[(i + 1) % 4], layer);
      },
      isoBox(x0, z0, w, d, t, layer = 'obj') {
        K.isoRect(x0, z0, w, d, 0, layer);
        const A = [x0, z0], B = [x0 + w, z0], D = [x0, z0 + d];
        const p = (c, y) => iso(c[0], y, c[1]);
        for (const c of [A, B, D]) K.line(p(c, 0), p(c, -t), layer);
        K.line(p(A, -t), p(B, -t), layer);
        K.line(p(A, -t), p(D, -t), layer);
      },
      isoCircle(cx, cz, r, y = 0, layer = 'obj') {
        const pts = [];
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          pts.push(iso(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r));
        }
        K.poly(pts, layer);
      },
    };
    return K;
  }

  /* ---------------- the drawing itself ---------------- */
  buildDrawing() {
    const year = String(new Date().getFullYear());
    this.pens.forEach((p) => (p.queue = []));

    // pen 0 — the sheet: trim, frame, zones, notes and the title block
    {
      const K = this.kit(this.pens[0].queue, this.sheet);
      K.rect(-16, -10, 16, 10, 'dim');
      K.rect(-15.4, -9.4, 15.4, 9.4, 'obj');
      for (const x of [-7.7, 0, 7.7]) { K.line([x, 9.4], [x, 10], 'dim'); K.line([x, -9.4], [x, -10], 'dim'); }
      K.line([-15.4, 0], [-16, 0], 'dim');
      K.line([15.4, 0], [16, 0], 'dim');
      ['1', '2', '3', '4'].forEach((n, i) => K.text(n, -11.55 + i * 7.7, 9.7, 0.36, { align: 'center', layer: 'dim' }));
      ['A', 'B'].forEach((n, i) => K.text(n, -15.7, 4.7 - i * 9.4, 0.36, { align: 'center', layer: 'dim' }));
      // title block
      K.line([6.4, -6.2], [15.4, -6.2]);
      K.line([6.4, -6.2], [6.4, -9.4]);
      K.line([6.4, -7.0], [15.4, -7.0], 'dim');
      K.line([6.4, -7.8], [15.4, -7.8], 'dim');
      K.line([6.4, -8.6], [15.4, -8.6], 'dim');
      K.line([10.6, -7.0], [10.6, -9.4], 'dim');
      K.line([13.2, -7.8], [13.2, -9.4], 'dim');
      K.text(`${PROFILE.name} — PORTFOLIO`, 6.6, -6.6, 0.52, { layer: 'acc' });
      K.text(PROFILE.role.toUpperCase(), 6.6, -7.4, 0.36);
      K.text(PROFILE.company.toUpperCase(), 10.8, -7.4, 0.36);
      K.text('DWG  HM-001', 6.6, -8.2, 0.32);
      K.text('SCALE 1:1', 10.8, -8.2, 0.32);
      K.text('REV C', 13.4, -8.2, 0.32);
      K.text('DRAWN  H.M.M', 6.6, -9.0, 0.32);
      K.text('SHEET 1/1', 10.8, -9.0, 0.32);
      K.text(year, 13.4, -9.0, 0.32);
      // notes
      K.text('NOTES:', -15, 8.7, 0.4, { layer: 'acc' });
      K.text('1. ALL DIMENSIONS IN MM UNLESS NOTED.', -15, 8.2, 0.3);
      K.text('2. DRAWN LIVE IN THREE.JS — DO NOT SCALE.', -15, 7.78, 0.3);
      K.text('3. CLICK THE SHEET TO CALL OUT A DETAIL.', -15, 7.36, 0.3);
    }

    // pen 1 — orthographic views: front + side, with dimensions
    {
      const K = this.kit(this.pens[1].queue, this.sheet);
      K.rrect(-10, 1.2, 3.6, 7.4, 0.5);
      K.line([-10, -3.0], [-10, 5.5], 'con');
      K.line([-12.4, 1.2], [-7.6, 1.2], 'con');
      K.rrect(-10, 1.2, 3.2, 6.9, 0.32);
      K.rrect(-10, 4.32, 0.9, 0.24, 0.12);
      K.line([-10.55, -1.95], [-9.45, -1.95]);
      K.poly([[-11.8, 3.6], [-11.9, 3.6], [-11.9, 2.9], [-11.8, 2.9]]);
      K.poly([[-11.8, 2.6], [-11.9, 2.6], [-11.9, 1.9], [-11.8, 1.9]]);
      K.dimH(-11.8, -8.2, -3.5, -2.5, '71.5');
      K.dimV(-2.5, 4.9, -12.8, -11.9, '146.7');
      K.text('FRONT VIEW', -10, -4.4, 0.42, { align: 'center', layer: 'acc' });
      // side view
      K.rrect(-5.4, 1.2, 0.8, 7.4, 0.3);
      K.line([-5.4, -3.0], [-5.4, 5.5], 'con');
      K.poly([[-5.0, 3.7], [-4.88, 3.7], [-4.88, 2.9], [-5.0, 2.9]]);
      K.poly([[-5.0, 2.6], [-4.88, 2.6], [-4.88, 1.7], [-5.0, 1.7]]);
      K.dimH(-5.8, -5.0, 5.8, 4.9, '7.85');
      K.text('SIDE VIEW', -5.4, -4.4, 0.42, { align: 'center', layer: 'acc' });
      K.circle([-10, 1.2], 0.9, 'con');
    }

    // pen 2 — the exploded isometric device, bottom layer first
    {
      this.isoRoot = new THREE.Group();
      this.isoRoot.position.set(6.6, 0.8, 0);
      this.sheet.add(this.isoRoot);
      const q = this.pens[2].queue;
      const R = this.kit(q, this.isoRoot);
      R.line([0, -4.3], [0, 7.2], 'con');
      for (let i = 0; i < 5; i++) {
        const g = new THREE.Group();
        this.isoRoot.add(g);
        this.layers.push(g);
      }
      this.placeLayers();
      const Lk = (i) => this.kit(q, this.layers[i]);
      let K = Lk(0); // back plate + camera
      K.isoBox(-1.1, -2.3, 2.2, 4.6, 0.12);
      K.isoCircle(-0.5, 1.6, 0.36);
      K.isoCircle(-0.5, 1.6, 0.2, 0, 'acc');
      K.isoCircle(0.1, 1.8, 0.1);
      K = Lk(1); // battery + logic board
      K.isoBox(-0.85, -1.95, 1.7, 2.4, 0.22);
      K.isoBox(-1.0, 0.65, 2.0, 1.55, 0.06);
      K.isoRect(-0.75, 0.9, 0.6, 0.5, 0, 'acc');
      K.isoRect(0.1, 0.85, 0.55, 0.4);
      K.isoRect(0.15, 1.5, 0.5, 0.45);
      K = Lk(2); // mid frame
      K.isoBox(-1.1, -2.3, 2.2, 4.6, 0.18);
      K.isoRect(-0.9, -2.1, 1.8, 4.2);
      K = Lk(3); // display panel
      K.isoBox(-1.05, -2.25, 2.1, 4.5, 0.05);
      K.isoRect(-0.95, -2.1, 1.9, 4.2, 0, 'con');
      K = Lk(4); // cover glass
      K.isoBox(-1.1, -2.3, 2.2, 4.6, 0.05);
      K.isoCircle(0, 2.0, 0.09);
      R.text('EXPLODED VIEW — ISO', 0, -4.9, 0.44, { align: 'center', layer: 'acc' });
    }
  }

  placeLayers() {
    this.layers.forEach((g, i) => (g.position.y = -2.4 + i * (0.32 + this.explode)));
  }

  balloon(k) {
    const B = BALLOONS[k];
    if (!B) return [];
    const q = [];
    const K = this.kit(q, this.layers[B.layer]);
    const P = iso(B.at[0], 0, B.at[1]);
    const c = new V2(B.side * 4.1, B.dy);
    const r = 0.44;
    const end = c.clone().addScaledVector(c.clone().sub(P).normalize(), -r);
    K.arc(P, 0.07, 0, Math.PI * 2, 'acc');
    K.line(P, end, 'acc');
    K.circle(c, r, 'acc');
    K.text(String(k), c.x, c.y, 0.46, { align: 'center', layer: 'acc' });
    const label = typeof B.label === 'function' ? B.label() : B.label;
    K.text(label, c.x + B.side * 0.65, c.y, 0.36, { align: B.side > 0 ? 'left' : 'right' });
    return q;
  }

  /* ---------------- tools: pens, scales, compasses ---------------- */
  buildTools() {
    this.pens = [];
    const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...o });
    const wood = std(0xe9c79f, { flatShading: true });
    const lead = std(0x2b2b2b, { roughness: 0.3, metalness: 0.4 });
    const metal = std(0xc9ccd2, { roughness: 0.25, metalness: 0.85 });
    const eraser = std(0xf09a8e);
    const shadowTex = (() => {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 16;
      const g = c.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 0, 16);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(0.5, 'rgba(0,0,0,1)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 16);
      return new THREE.CanvasTexture(c);
    })();

    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const body = new THREE.Group();
      g.add(body);
      const dir = new V3(...PEN_LEAN[i]).normalize();
      body.quaternion.setFromUnitVectors(Y_UP, dir);
      const seg = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; body.add(m); return m; };
      seg(new THREE.ConeGeometry(0.035, 0.14, 12).rotateX(Math.PI), lead, 0.07);
      seg(new THREE.ConeGeometry(0.1, 0.38, 6).rotateX(Math.PI), wood, 0.32);
      const bodyMat = std(0xffd166, { flatShading: true, roughness: 0.45 });
      seg(new THREE.CylinderGeometry(0.1, 0.1, 2.3, 6), bodyMat, 1.66);
      seg(new THREE.CylinderGeometry(0.104, 0.104, 0.2, 16), metal, 2.91);
      seg(new THREE.CylinderGeometry(0.095, 0.095, 0.16, 16), eraser, 3.09);

      // fake shadow cast onto the paper
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0),
        new THREE.MeshBasicMaterial({ map: shadowTex, color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
      );
      shadow.renderOrder = -5;
      this.group.add(shadow);

      // pointer: crosshair + ring at the working tip
      const cg = new THREE.BufferGeometry();
      const cp = [-0.3, 0, 0, -0.1, 0, 0, 0.1, 0, 0, 0.3, 0, 0, 0, -0.3, 0, 0, -0.1, 0, 0, 0.1, 0, 0, 0.3, 0];
      for (let a = 0; a < 24; a++) {
        const a0 = (a / 24) * Math.PI * 2, a1 = ((a + 1) / 24) * Math.PI * 2;
        cp.push(Math.cos(a0) * 0.17, Math.sin(a0) * 0.17, 0, Math.cos(a1) * 0.17, Math.sin(a1) * 0.17, 0);
      }
      cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
      const cross = new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, depthWrite: false }));
      this.group.add(cross);

      const start = new V3(18 + i * 2, 12 - i * 3, LIFT * 3);
      g.position.copy(start);
      this.group.add(g);
      this.pens.push({
        i, g, body, dir, bodyMat, shadow, cross,
        tip: new V2(start.x, start.y), lift: start.z, liftT: LIFT,
        queue: [], cur: null, phase: 'idle', wait: 0, idle: 0, vis: 1,
        ruler: this.buildRuler(i), compass: this.buildCompass(metal, lead),
      });
    }
  }

  buildRuler(i) {
    const { len, label } = SCALES[i];
    const W = 0.72;
    const c = document.createElement('canvas');
    c.width = 1536;
    c.height = Math.round((1536 * W) / len);
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = 2;
    const pxu = c.width / len;
    for (let k = 0; k <= len * 10; k++) {
      const x = 4 + (k / 10) * (pxu - 8 / len);
      const h = k % 10 === 0 ? c.height * 0.42 : k % 5 === 0 ? c.height * 0.28 : c.height * 0.16;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
      if (k % 10 === 0 && k < len * 10) {
        g.font = `${Math.round(c.height * 0.24)}px "Share Tech Mono", monospace`;
        g.fillText(String(k / 10), x + 4, c.height * 0.62);
      }
    }
    g.font = `${Math.round(c.height * 0.2)}px "Share Tech Mono", monospace`;
    g.textAlign = 'right';
    g.fillText(label, c.width - 16, c.height * 0.88);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const top = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const side = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, W, 0.06), [side, side, side, side, top, side]);
    const rest = new V2(-10 + i * 10, -11.4);
    mesh.position.set(rest.x, rest.y, 0.03);
    this.group.add(mesh);
    return { mesh, top, side, len, W, pos: rest.clone(), ang: 0, tPos: rest.clone(), tAng: 0, rest, settled: false };
  }

  buildCompass(metal, lead) {
    const g = new THREE.Group();
    const leg = () => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.022, 1, 8), metal);
      g.add(m);
      return m;
    };
    const needle = leg(), pencil = leg();
    const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), metal);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 10), lead);
    g.add(hinge, handle);
    g.visible = false;
    this.group.add(g);
    return { g, needle, pencil, hinge, handle, vis: 0 };
  }

  /* ---------------- tool placement ---------------- */
  // world-space point at arc length s along a stroke
  pointAt(st, s, out) {
    while (st.k < st.cum.length - 2 && st.cum[st.k + 1] < s) st.k++;
    const a = st.pts[st.k], b = st.pts[Math.min(st.k + 1, st.pts.length - 1)];
    const seg = st.cum[st.k + 1] - st.cum[st.k] || 1;
    const f = Math.min(1, Math.max(0, (s - st.cum[st.k]) / seg));
    let x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
    if (st.kind === 'text') {
      // the pen scribbles up and down while it letters along the baseline
      const ang = st.mesh.rotation.z;
      const wob = Math.sin((s / st.size) * 14) * st.size * 0.3;
      x += -Math.sin(ang) * wob;
      y += Math.cos(ang) * wob;
    }
    out.set(x, y, 0);
    return st.parent.localToWorld(out);
  }

  reveal(st) {
    if (st.kind === 'text') {
      const p = Math.min(1, st.s / st.len);
      st.mesh.scale.set(Math.max(1e-4, st.w * p), st.size, 1);
      st.tex.repeat.x = Math.max(1e-4, p);
      return;
    }
    st.line.geometry.instanceCount = Math.max(1, Math.min(st.segs, st.k + 1));
  }

  aimRuler(R, st, s) {
    const a = st.parent.localToWorld(new V3(st.a.x, st.a.y, 0));
    const b = st.parent.localToWorld(new V3(st.b.x, st.b.y, 0));
    const u = new V2(b.x - a.x, b.y - a.y);
    const L = u.length();
    u.divideScalar(L || 1);
    let ang = Math.atan2(u.y, u.x);
    let n = new V2(-u.y, u.x);
    // the scale always sits below (or right of) the line, its ticked edge on the line
    if (n.y < -1e-6 || (Math.abs(n.y) <= 1e-6 && n.x > 0)) { ang += Math.PI; n.negate(); }
    const half = R.len / 2 - 0.4;
    const along = L <= R.len - 0.8 ? L / 2 : Math.min(Math.max(s, half), L - half);
    R.tPos.set(a.x + u.x * along - n.x * (R.W / 2 + 0.02), a.y + u.y * along - n.y * (R.W / 2 + 0.02));
    R.tAng = ang;
  }

  moveRuler(R, dt) {
    const k = 1 - Math.exp(-dt * 12);
    let da = R.tAng - R.ang;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    R.ang += da * k;
    R.pos.lerp(R.tPos, k);
    R.settled = Math.abs(da) < 0.02 && R.pos.distanceTo(R.tPos) < 0.05;
    R.mesh.position.set(R.pos.x, R.pos.y, 0.03);
    R.mesh.rotation.z = R.ang;
  }

  placeCompass(C, center, tip) {
    const r = Math.hypot(tip.x - center.x, tip.y - center.y);
    const Lg = Math.max(1.5, r * 0.8);
    const hz = Math.sqrt(Math.max(0.3, Lg * Lg - (r / 2) * (r / 2)));
    const hinge = new V3((center.x + tip.x) / 2, (center.y + tip.y) / 2, hz);
    const between = (m, p, q) => {
      const d = new V3().subVectors(q, p);
      m.position.copy(p).addScaledVector(d, 0.5);
      m.scale.set(1, d.length(), 1);
      m.quaternion.setFromUnitVectors(Y_UP, d.normalize());
    };
    between(C.needle, new V3(center.x, center.y, 0), hinge);
    between(C.pencil, new V3(tip.x, tip.y, 0), hinge);
    C.hinge.position.copy(hinge);
    C.handle.position.copy(hinge).add(new V3(0, 0, 0.26));
    C.handle.rotation.x = Math.PI / 2;
  }

  /* ---------------- public API ---------------- */
  setVisible(v) {
    this.group.visible = v;
    if (v && this.reduce) this.finishAll();
  }

  onTheme(t) {
    if (!t?.paper) return;
    const P = this.palette;
    P.paper.set(t.paper);
    P.ink.set(t.ink);
    P.a.set(t.a);
    P.b.set(t.b);
    this.host.renderer.setClearColor(P.paper, 1);
    this.mats.obj.color.copy(P.ink);
    this.mats.dim.color.copy(P.ink);
    this.mats.con.color.copy(P.ink);
    this.mats.acc.color.copy(P.a);
    this.texts.forEach((s) => s.mat.color.copy(s.layer === 'acc' ? P.a : P.ink));
    const light = P.paper.getHSL({}).l > 0.5;
    this.pens.forEach((p, i) => {
      p.bodyMat.color.copy([P.a, P.b, light ? new THREE.Color(0x3a3d44) : P.ink][i]);
      p.cross.material.color.copy(P.a);
      p.shadow.material.opacity = light ? 0.2 : 0.3;
      p.ruler.top.color.copy(P.ink);
      p.ruler.side.color.copy(P.ink);
    });
  }

  shot(s, isMobile) {
    const cl = Math.min(Math.max(s, 0), SHOTS.length - 1);
    const i0 = Math.floor(cl), i1 = Math.min(i0 + 1, SHOTS.length - 1);
    const x = cl - i0;
    const t = x * x * (3 - 2 * x);
    const A = SHOTS[i0], B = SHOTS[i1];
    const l = (a, b) => a + (b - a) * t;
    const f = new V2(l(A.f[0], B.f[0]), l(A.f[1], B.f[1]));
    let d = l(A.d, B.d);
    const cam = this.host.camera;
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const look = new V3(f.x, f.y, 0);
    if (isMobile) {
      d *= 1.45;
      // hero on phones: the drawing sits above the name
      const hero = 1 - Math.min(cl, 1);
      look.y -= 2 * d * tan * 0.2 * hero;
    } else {
      look.x -= l(A.sh, B.sh) * 2 * d * tan * cam.aspect;
    }
    const camPos = new V3(look.x + l(A.tilt[0], B.tilt[0]), look.y + l(A.tilt[1], B.tilt[1]), d);
    return { cam: camPos, look, explode: l(A.e, B.e), focus: f, section: cl };
  }

  click() {
    const hit = this.host.raycaster.ray.intersectPlane(this.plane, this.tmp2);
    if (!hit) return false;
    const P = new V2(Math.min(Math.max(hit.x, -14), 11), Math.min(Math.max(hit.y, -8.2), 7.6));
    const letter = String.fromCharCode(65 + (this.detailN++ % 26));
    const q = [];
    const K = this.kit(q, this.sheet);
    const r = 1.0;
    K.circle(P, r, 'acc');
    const a = P.clone().add(new V2(Math.SQRT1_2 * r, Math.SQRT1_2 * r));
    const b = P.clone().add(new V2(1.9, 1.6));
    K.line(a, b, 'acc');
    K.line(b, b.clone().add(new V2(2.9, 0)), 'acc');
    K.text(`DETAIL ${letter}`, b.x + 0.1, b.y + 0.32, 0.42, { layer: 'acc' });
    K.text(`X ${P.x.toFixed(1)}  Y ${P.y.toFixed(1)}`, b.x + 0.1, b.y - 0.3, 0.28);
    // the pen with the least work left takes it
    const pen = [...this.pens].sort((x, y) => this.workLeft(x) - this.workLeft(y))[0];
    pen.queue.unshift(...q);
    this.details.push(q);
    if (this.details.length > 5) {
      const old = this.details.find((d) => d.every((s) => s.done));
      if (old) {
        this.details.splice(this.details.indexOf(old), 1);
        old.forEach((s) => this.dispose(s));
      }
    }
    return true;
  }

  workLeft(p) {
    return p.queue.reduce((n, s) => n + s.len, p.cur ? p.cur.len - p.cur.s : 0);
  }

  dispose(st) {
    if (st.line) { st.parent.remove(st.line); st.line.geometry.dispose(); }
    if (st.mesh) {
      st.parent.remove(st.mesh);
      st.mesh.geometry.dispose();
      st.mat.dispose();
      st.tex.dispose();
      this.texts.splice(this.texts.indexOf(st), 1);
    }
  }

  finishAll() {
    for (const p of this.pens) {
      const all = p.cur ? [p.cur, ...p.queue] : p.queue;
      for (const st of all) {
        st.s = st.len;
        st.k = st.cum.length - 2;
        st.done = true;
        if (st.line) st.line.visible = true;
        if (st.mesh) st.mesh.visible = true;
        this.reveal(st);
      }
      p.queue = [];
      p.cur = null;
    }
  }

  update(dt, shot, hoverAllowed) {
    this.t += dt;
    this.focus.copy(shot.focus);
    this.explode += (shot.explode - this.explode) * (1 - Math.exp(-dt * 4));
    this.placeLayers();
    this.group.updateMatrixWorld(true);

    // a balloon callout for every section the visitor reaches
    const k = Math.round(shot.section);
    if (k >= 1 && !this.balloonsDone.has(k)) {
      this.balloonsDone.add(k);
      const q = this.balloon(k);
      const pen = [...this.pens].sort((x, y) => (x.cur ? 1 : 0) - (y.cur ? 1 : 0) || x.queue.length - y.queue.length)[0];
      pen.queue.unshift(...q);
      if (this.reduce) this.finishAll();
    }

    const hasPtr = hoverAllowed && Math.abs(this.host.pointerNDC.x) <= 1 && this.host.raycaster.ray.intersectPlane(this.plane, this.ptr);
    this.pens.forEach((p) => this.updatePen(p, dt, hasPtr));
  }

  updatePen(p, dt, hasPtr) {
    if (!p.cur && p.queue.length) {
      p.cur = p.queue.shift();
      p.phase = 'travel';
      p.wait = 0;
    }
    const st = p.cur;
    const tgt = this.tmp;
    let compassOn = false;
    if (st) {
      p.idle = 0;
      if (p.phase === 'travel') {
        this.pointAt(st, 0, tgt);
        const dx = tgt.x - p.tip.x, dy = tgt.y - p.tip.y;
        const d = Math.hypot(dx, dy);
        const step = Math.min(d, Math.max(4, d * 7) * dt * this.speed);
        if (d > 1e-6) { p.tip.x += (dx / d) * step; p.tip.y += (dy / d) * step; }
        p.liftT = d > 0.2 ? LIFT : 0;
        if (st.kind === 'ruler') this.aimRuler(p.ruler, st, 0);
        p.wait += dt;
        const toolReady = st.kind !== 'ruler' || p.ruler.settled || p.wait > 0.9;
        if (d < 0.02 && p.lift < 0.05 && toolReady) {
          p.phase = 'draw';
          if (st.line) st.line.visible = true;
          if (st.mesh) st.mesh.visible = true;
        }
      } else {
        st.s = Math.min(st.len, st.s + SPEED[st.kind] * this.speed * dt);
        this.pointAt(st, st.s, tgt);
        this.reveal(st);
        p.tip.set(tgt.x, tgt.y);
        p.liftT = 0;
        if (st.kind === 'ruler') this.aimRuler(p.ruler, st, st.s);
        if (st.kind === 'compass') {
          compassOn = true;
          const c = st.parent.localToWorld(this.tmp2.set(st.c.x, st.c.y, 0));
          this.placeCompass(p.compass, c, tgt);
        }
        if (st.s >= st.len) {
          st.done = true;
          st.line && (st.line.geometry.instanceCount = st.segs);
          p.cur = null;
        }
      }
    } else {
      // idle: the pens become pointers that hover around the cursor
      p.idle += dt;
      let tx, ty;
      if (hasPtr) {
        const a = this.t * 0.5 + p.i * 2.094;
        tx = this.ptr.x + Math.cos(a) * 1.1;
        ty = this.ptr.y + Math.sin(a) * 1.1;
      } else {
        tx = this.focus.x + 3.4 + p.i * 0.8;
        ty = this.focus.y - 2.6 + Math.sin(this.t * 0.8 + p.i) * 0.25;
      }
      const k = 1 - Math.exp(-dt * 3);
      p.tip.x += (tx - p.tip.x) * k;
      p.tip.y += (ty - p.tip.y) * k;
      p.liftT = 0.35 + Math.sin(this.t * 1.7 + p.i * 2) * 0.08;
      if (p.idle > 1.6) { p.ruler.tPos.copy(p.ruler.rest); p.ruler.tAng = 0; }
    }

    this.moveRuler(p.ruler, dt);
    p.lift += (p.liftT - p.lift) * (1 - Math.exp(-dt * 12));
    p.g.position.set(p.tip.x, p.tip.y, p.lift);
    p.vis += ((compassOn ? 0 : 1) - p.vis) * (1 - Math.exp(-dt * 16));
    p.g.scale.setScalar(Math.max(1e-3, p.vis));
    p.g.visible = p.vis > 0.02;
    const C = p.compass;
    C.vis += ((compassOn ? 1 : 0) - C.vis) * (1 - Math.exp(-dt * 16));
    C.g.visible = C.vis > 0.02;

    // shadow: from the tip to where the pen's top lands on the paper
    const top = new V3(p.tip.x, p.tip.y, p.lift).addScaledVector(p.dir, 3.2 * p.vis);
    const sx0 = p.tip.x - (LIGHT.x / LIGHT.z) * p.lift, sy0 = p.tip.y - (LIGHT.y / LIGHT.z) * p.lift;
    const sx1 = top.x - (LIGHT.x / LIGHT.z) * top.z, sy1 = top.y - (LIGHT.y / LIGHT.z) * top.z;
    const sl = Math.hypot(sx1 - sx0, sy1 - sy0);
    p.shadow.position.set(sx0, sy0, 0.002);
    p.shadow.rotation.z = Math.atan2(sy1 - sy0, sx1 - sx0);
    p.shadow.scale.set(Math.max(1e-3, sl), 0.24, 1);
    p.shadow.visible = p.vis > 0.05;

    p.cross.visible = !!st && p.phase === 'draw';
    p.cross.position.set(p.tip.x, p.tip.y, 0.01);
    p.cross.rotation.z = this.t * 1.5;
  }
}
