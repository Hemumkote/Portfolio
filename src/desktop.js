import * as THREE from 'three';

/* HM/OS wallpaper: a low-res, flat-shaded 3D demo scene — a blocky extruded "HM"
   logo above a scrolling checkerboard, with primitive shapes drifting around it.
   After a minute of inactivity it becomes a screensaver and flies through the shapes. */

const SHAPES = 16;
const RETRO = [0xff5f57, 0xffbd2e, 0x28c840, 0x3b82f6, 0xff7ad9, 0xffffff];

export class DesktopWorld {
  constructor(host) {
    this.host = host;
    this.group = new THREE.Group();
    this.group.visible = false;
    host.scene.add(this.group);
    this.t = 0;
    this.saver = 0; // 0 → 1 blend into screensaver
    this.saverOn = false;
    this.spin = 0;
    this.spinTarget = 0;
    this.logoX = 6.4;
    this.bg = new THREE.Color(0x0f8f8a);
    this.accent = new THREE.Color(0x1d3fbb);

    this.group.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-4, 6, 8);
    this.group.add(sun);

    this.buildFloor();
    this.buildLogo();
    this.buildShapes();
  }

  buildFloor() {
    this.floorU = { uTime: { value: 0 }, uBg: { value: this.bg }, uA: { value: this.accent }, uSpeed: { value: 0 } };
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.ShaderMaterial({
        uniforms: this.floorU,
        vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform vec3 uBg; uniform vec3 uA; varying vec3 vW;
          void main(){
            vec2 p = vec2(vW.x, vW.z + uTime) * 0.5;
            float c = mod(floor(p.x) + floor(p.y), 2.0);
            vec3 col = mix(uBg * 0.72, mix(uBg, uA, 0.35) * 1.05, c);
            float fog = smoothstep(8.0, 70.0, length(vW.xz - cameraPosition.xz));
            gl_FragColor = vec4(mix(col, uBg, fog), 1.0);
            #include <colorspace_fragment>
          }`,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3;
    this.group.add(floor);
  }

  buildLogo() {
    // "HM" built from boxes, like a 90s demo logo
    this.logo = new THREE.Group();
    this.logoMat = new THREE.MeshLambertMaterial({ color: this.accent, flatShading: true });
    const edgeMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    const D = 0.7;
    const bar = (x, y, w, h, rot = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, D), this.logoMat);
      m.position.set(x, y, 0);
      m.rotation.z = rot;
      this.logo.add(m);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 1.001, h * 1.001, 0.08), edgeMat);
      cap.position.set(x, y, D / 2);
      cap.rotation.z = rot;
      this.logo.add(cap);
    };
    // H
    bar(-2.6, 0, 0.6, 3);
    bar(-1.2, 0, 0.6, 3);
    bar(-1.9, 0, 0.9, 0.55);
    // M
    bar(0.3, 0, 0.6, 3);
    bar(2.7, 0, 0.6, 3);
    bar(0.95, 0.45, 0.5, 1.9, 0.5);
    bar(2.05, 0.45, 0.5, 1.9, -0.5);
    this.logo.position.set(6.4, 1.6, -3);
    this.logo.scale.setScalar(0.8);
    this.group.add(this.logo);
  }

  buildShapes() {
    const geos = [
      new THREE.IcosahedronGeometry(0.6, 0),
      new THREE.BoxGeometry(0.8, 0.8, 0.8),
      new THREE.ConeGeometry(0.55, 1, 4),
      new THREE.TorusGeometry(0.45, 0.18, 6, 10),
      new THREE.OctahedronGeometry(0.6, 0),
      new THREE.CylinderGeometry(0.4, 0.4, 0.9, 6),
    ];
    this.shapes = [];
    for (let i = 0; i < SHAPES; i++) {
      const mat = new THREE.MeshLambertMaterial({ color: RETRO[i % RETRO.length], flatShading: true });
      const m = new THREE.Mesh(geos[i % geos.length], mat);
      this.group.add(m);
      const s = { m, home: new THREE.Vector3(), spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(1.6), ph: Math.random() * 6.28, z: 0 };
      this.reseed(s, true);
      this.shapes.push(s);
    }
  }

  reseed(s, initial) {
    const a = Math.random() * Math.PI * 2;
    const r = 3.5 + Math.random() * 7;
    s.home.set(Math.cos(a) * r, Math.sin(a) * r * 0.45 + 0.8, -2 - Math.random() * 14);
    s.z = initial ? s.home.z : -40 - Math.random() * 10;
    s.m.scale.setScalar(0.6 + Math.random() * 0.8);
  }

  setVisible(v) {
    this.group.visible = v;
  }

  setSaver(on) {
    this.saverOn = on;
  }

  focus(idx) {
    this.spinTarget = idx * (Math.PI / 3);
  }

  onTheme(t) {
    if (!t?.desk) return;
    this.bg.set(t.desk);
    this.accent.set(t.a);
    this.logoMat.color.copy(this.accent);
    this.host.renderer.setClearColor(this.bg, 1);
    this.host.scene.fog.color.copy(this.bg);
  }

  shot(isMobile) {
    this.logoX = isMobile ? 1.2 : 6.4;
    const cam = new THREE.Vector3(0, 1.2, isMobile ? 13 : 9.5);
    const look = new THREE.Vector3(isMobile ? 1.5 : 0.8, 0.4, -2);
    return { cam, look };
  }

  update(dt) {
    this.t += dt;
    this.saver += ((this.saverOn ? 1 : 0) - this.saver) * (1 - Math.exp(-dt * 2));
    const fly = this.saver;
    this.floorU.uTime.value += dt * (0.6 + fly * 14);

    // logo: idles with a slow wobble, spins to a new face when a window gets focus
    this.spin += (this.spinTarget - this.spin) * (1 - Math.exp(-dt * 3));
    this.logo.rotation.y = this.spin + Math.sin(this.t * 0.6) * 0.35 + fly * this.t * 1.6;
    this.logo.rotation.x = Math.sin(this.t * 0.4) * 0.12;
    this.logo.position.y = 1.6 + Math.sin(this.t * 1.2) * 0.15 + Math.abs(Math.sin(this.t * 2.2)) * fly * 1.2;
    this.logo.position.x = this.logoX * (1 - fly);

    for (const s of this.shapes) {
      s.m.rotation.x += s.spin.x * dt;
      s.m.rotation.y += s.spin.y * dt;
      s.m.rotation.z += s.spin.z * dt * 0.5;
      // screensaver: everything streams toward the viewer and recycles far away
      s.z += dt * fly * 22;
      if (s.z > 10) this.reseed(s, false);
      if (fly < 0.02) s.z += (s.home.z - s.z) * (1 - Math.exp(-dt * 0.8));
      s.m.position.set(s.home.x, s.home.y + Math.sin(this.t * 0.7 + s.ph) * 0.35, s.z);
    }
  }
}
