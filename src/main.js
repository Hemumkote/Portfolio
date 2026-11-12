import './style.css';
import { renderContent } from './render.js';
import { initText, decode } from './text.js';
import { Scene, THEMES } from './scene.js';
import { initTerminal } from './terminal.js';
import { PROFILE } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const isTouch = window.matchMedia('(hover: none)').matches;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
renderContent($('#content'));

/* ------------------------------------------------------------------ */
/* WebGL                                                               */
/* ------------------------------------------------------------------ */
let scene = null;
try {
  scene = new Scene($('#webgl'));
} catch (err) {
  console.warn('WebGL unavailable, running in text-only mode', err);
  document.body.classList.add('no-webgl');
}

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */
let themeIdx = 0;
function applyTheme(i) {
  themeIdx = (i + THEMES.length) % THEMES.length;
  const t = THEMES[themeIdx];
  document.documentElement.style.setProperty('--acc', t.a);
  document.documentElement.style.setProperty('--acc2', t.b);
  scene?.setTheme(t);
  try { localStorage.setItem('theme', t.name); } catch {}
  return t.name;
}
try {
  const saved = THEMES.findIndex((t) => t.name === localStorage.getItem('theme'));
  if (saved > 0) applyTheme(saved);
} catch {}
$('#theme-btn').addEventListener('click', () => applyTheme(themeIdx + 1));

/* ------------------------------------------------------------------ */
/* Boot sequence                                                       */
/* ------------------------------------------------------------------ */
const BOOT = [
  'BIOS v4.2.0 — hemantha.dev secure shell',
  'checking memory ................. 2.8 yrs OK',
  'mounting /dev/react-native ...... OK',
  'mounting /dev/nextjs ............ OK',
  'loading fastapi.service ......... OK',
  'connecting postgresql://core .... OK',
  'opening websocket channel ....... OK',
  'compiling shaders ............... OK',
  'initializing three.js renderer .. OK',
  `decrypting profile: ${PROFILE.name} ...`,
  'ACCESS GRANTED',
];
document.body.classList.add('booting');
let booted = false;
async function boot() {
  const log = $('#boot-log');
  const bar = $('#boot-progress');
  for (let i = 0; i < BOOT.length && !booted; i++) {
    const line = BOOT[i];
    const html = line.endsWith('OK')
      ? line.replace(/OK$/, '<span class="ok">OK</span>')
      : line === 'ACCESS GRANTED' ? `<span class="acc big">${line}</span>` : line;
    log.innerHTML += `<span class="dim">[${(performance.now() / 1000).toFixed(3).padStart(8, ' ')}]</span> ${html}\n`;
    bar.style.width = `${((i + 1) / BOOT.length) * 100}%`;
    await new Promise((r) => setTimeout(r, 70 + Math.random() * 110));
  }
  if (!booted) await new Promise((r) => setTimeout(r, 450));
  endBoot();
}
function endBoot() {
  if (booted) return;
  booted = true;
  $('#boot').classList.add('done');
  document.body.classList.remove('booting');
  scene?.kick(1);
  initText();
  setTimeout(() => $('#boot').remove(), 900);
}
['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { if (!booted) endBoot(); }, { once: true, passive: true }));
boot();

/* ------------------------------------------------------------------ */
/* Scroll → continuous section index                                   */
/* ------------------------------------------------------------------ */
const sections = $$('main section');
const navLinks = $$('#nav a');
let centers = [];
function measure() {
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  centers = sections.map((s) => {
    const c = s.offsetTop + s.offsetHeight / 2 - innerHeight / 2;
    return Math.min(Math.max(c, 0), maxScroll);
  });
}
measure();
window.addEventListener('resize', measure);
window.addEventListener('load', measure);

function sectionFloat(y) {
  if (y <= centers[0]) return 0;
  for (let i = 0; i < centers.length - 1; i++) {
    if (y < centers[i + 1]) return i + (y - centers[i]) / Math.max(1, centers[i + 1] - centers[i]);
  }
  return centers.length - 1;
}

let lastY = scrollY;
let vel = 0;
let activeIdx = -1;
function onScrollFrame() {
  const y = scrollY;
  vel += ((y - lastY) * 60 - vel) * 0.2;
  lastY = y;
  const s = sectionFloat(y);
  if (scene) {
    scene.section = s;
    scene.velocity = vel;
  }
  const idx = Math.round(s);
  if (idx !== activeIdx) {
    activeIdx = idx;
    const sec = sections[idx];
    $('#hud-sector').textContent = String(idx).padStart(2, '0');
    const nameEl = $('#hud-name');
    nameEl.textContent = sec.dataset.name;
    nameEl.dataset.final = sec.dataset.name;
    decode(nameEl);
    $('#hud-path').textContent = sec.dataset.path;
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${sec.id}`));
  }
  const max = document.documentElement.scrollHeight - innerHeight;
  const pct = max > 0 ? y / max : 0;
  $('#hud-scroll').style.transform = `scaleX(${pct})`;
  $('#hud-pct').textContent = String(Math.round(pct * 100)).padStart(3, '0');
}

/* ------------------------------------------------------------------ */
/* Pointer: cursor, HUD coords, tilt, magnetic, core click             */
/* ------------------------------------------------------------------ */
const cursor = $('#cursor');
const pos = { x: innerWidth / 2, y: innerHeight / 2 };
const cpos = { ...pos };
window.addEventListener('pointermove', (e) => {
  pos.x = e.clientX;
  pos.y = e.clientY;
  scene?.setPointer(e.clientX, e.clientY);
  $('#hud-x').textContent = String(Math.round(e.clientX)).padStart(4, '0');
  $('#hud-y').textContent = String(Math.round(e.clientY)).padStart(4, '0');
});
document.addEventListener('pointerover', (e) => {
  if (scene) scene.blockHover = !!e.target.closest('.panel, a, button, input, .hud-top');
  cursor.classList.toggle('link', !!e.target.closest('a, button, input, [data-magnetic], .project'));
});
window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('a, button, input, .term-live')) return;
  if (scene?.click()) cursor.classList.add('fire');
  setTimeout(() => cursor.classList.remove('fire'), 300);
});

if (!isTouch) {
  $$('.tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
      el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 10}deg) translateZ(0)`;
    });
    el.addEventListener('pointerleave', () => (el.style.transform = ''));
  });
  $$('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    el.addEventListener('pointerleave', () => (el.style.transform = ''));
  });
} else {
  cursor.remove();
}

// skill bars fill when their panel enters the viewport
const barIO = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); barIO.unobserve(e.target); }
}), { threshold: 0.35 });
$$('.skill-group').forEach((el) => barIO.observe(el));

/* ------------------------------------------------------------------ */
/* Terminal + hotkeys                                                  */
/* ------------------------------------------------------------------ */
let overdrive = false;
const term = initTerminal({
  onTheme: (name) => {
    if (!name) return applyTheme(themeIdx + 1);
    const i = THEMES.findIndex((t) => t.name === name.toLowerCase());
    return i < 0 ? null : applyTheme(i);
  },
  onMatrix: () => {
    overdrive = !overdrive;
    scene?.kick(1);
    return overdrive;
  },
  onGlitch: () => scene?.kick(1.2),
});
window.addEventListener('keydown', (e) => {
  if (e.key === '~' || e.key === '`') {
    if (document.activeElement?.id === 'term-input') return;
    e.preventDefault();
    $('#contact').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => term.focus(), 700);
  }
});

/* ------------------------------------------------------------------ */
/* Main loop: scene, HUD, cursor, adaptive quality                     */
/* ------------------------------------------------------------------ */
let frames = 0;
let fpsT = performance.now();
let lowFps = 0;
function tick(now) {
  onScrollFrame();
  if (scene) {
    if (overdrive) scene.velocity = Math.max(scene.velocity, 900);
    scene.update();
  }
  if (!isTouch) {
    cpos.x += (pos.x - cpos.x) * 0.22;
    cpos.y += (pos.y - cpos.y) * 0.22;
    cursor.style.transform = `translate(${cpos.x}px, ${cpos.y}px)`;
  }
  frames++;
  if (now - fpsT > 1000) {
    const fps = Math.round((frames * 1000) / (now - fpsT));
    $('#hud-fps').textContent = fps;
    frames = 0;
    fpsT = now;
    // drop resolution if the machine struggles for a few seconds
    if (scene && booted && fps < 38 && scene.dpr > 1) {
      if (++lowFps >= 3) { scene.setQuality(1); lowFps = 0; }
    } else lowFps = 0;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

setInterval(() => {
  $('#hud-clock').textContent = new Date().toLocaleTimeString('en-GB', { hour12: false }) + ' LOCAL';
}, 1000);
