import './style.css';
import { renderContent } from './render.js';
import { renderKeys } from './render-keys.js';
import { renderGlitch } from './render-glitch.js';
import { initText, decode } from './text.js';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { techInfo } from './keyboard.js';
import { Scene, THEMES } from './scene.js';
import { initTerminal } from './terminal.js';
import { PROFILE } from './data.js';

const escHTML = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const isTouch = window.matchMedia('(hover: none)').matches;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
renderContent($('#content'));
renderKeys($('#kcontent'), { touch: isTouch });
renderGlitch($('#gcontent'), { touch: isTouch });

// Each theme is a complete, separate frontend. Pick the saved one before anything renders.
const MODES = ['hacker', 'keys', 'glitch'];
const MAINS = { hacker: '#content', keys: '#kcontent', glitch: '#gcontent' };
const PREFIX = { hacker: '', keys: 'k-', glitch: 'g-' }; // section id prefix per frontend
let mode = (() => { try { const m = localStorage.getItem('mode'); return MODES.includes(m) ? m : 'hacker'; } catch { return 'hacker'; } })();
const showMain = (m) => MODES.forEach((x) => ($(MAINS[x]).hidden = x !== m));
document.body.dataset.mode = mode;
showMain(mode);

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
/* Color palettes — each theme has its own set, cycled by ◐            */
/* ------------------------------------------------------------------ */
const KEY_THEMES = [
  { name: 'retro', a: '#ff5a1f', b: '#1f6feb' },
  { name: 'ocean', a: '#2563eb', b: '#f59e0b' },
  { name: 'mint', a: '#0d9488', b: '#e11d48' },
  { name: 'grape', a: '#7c3aed', b: '#10b981' },
];
const GLITCH_THEMES = [
  { name: 'signal', a: '#ff1f4b', b: '#00e5ff' },
  { name: 'vhs', a: '#ff2bd6', b: '#ffe600' },
  { name: 'acid', a: '#b6ff00', b: '#8a2bff' },
  { name: 'mono', a: '#ffffff', b: '#7a7a7a' },
];
const PALETTES = { hacker: THEMES, keys: KEY_THEMES, glitch: GLITCH_THEMES };
const STORE_KEY = { hacker: 'theme', keys: 'ktheme', glitch: 'gtheme' };
const themeIdx = { hacker: 0, keys: 0, glitch: 0 };
function paintVars(m) {
  const t = PALETTES[m][themeIdx[m]];
  const st = document.documentElement.style;
  const [va, vb] = { hacker: ['--acc', '--acc2'], keys: ['--k-acc', '--k-acc2'], glitch: ['--g-a', '--g-b'] }[m];
  st.setProperty(va, t.a);
  st.setProperty(vb, t.b);
  return t;
}
function applyTheme(i) {
  const list = PALETTES[mode];
  themeIdx[mode] = (i + list.length) % list.length;
  const t = paintVars(mode);
  scene?.setTheme(t);
  try { localStorage.setItem(STORE_KEY[mode], t.name); } catch {}
  return t.name;
}
for (const m of MODES) {
  try {
    const i = PALETTES[m].findIndex((t) => t.name === localStorage.getItem(STORE_KEY[m]));
    if (i > 0) themeIdx[m] = i;
  } catch {}
  paintVars(m);
}
$('#theme-btn').addEventListener('click', () => applyTheme(themeIdx[mode] + 1));

/* ------------------------------------------------------------------ */
/* Mode: hacker ⇄ glitch ⇄ keyboard (three separate frontends)        */
/* ------------------------------------------------------------------ */
function applyMode(m) {
  if (!MODES.includes(m)) return null;
  const changed = m !== mode;
  const idx = Math.max(0, activeIdx);
  mode = m;
  document.body.dataset.mode = m;
  showMain(m);
  scene?.setMode(m);
  scene?.setTheme(PALETTES[m][themeIdx[m]]);
  $$('#mode-switch button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
  try { localStorage.setItem('mode', m); } catch {}
  card.classList.remove('show');
  // re-measure the now-visible frontend and stay on the same section
  sections = $$('main:not([hidden]) section');
  measure();
  activeIdx = -1;
  if (changed && sections[idx]) window.scrollTo({ top: idx === 0 ? 0 : sections[idx].offsetTop, behavior: 'instant' });
  ScrollTrigger.refresh();
  return m;
}
$$('#mode-switch button').forEach((b) => b.addEventListener('click', () => applyMode(b.dataset.mode)));

// in-page links: map section ids to the active frontend (#about ⇄ #k-about)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = PREFIX[mode] + a.getAttribute('href').slice(1).replace(/^[kg]-/, '');
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: 'smooth' });
});

// keys + glitch frontends: blocks rise in when they enter the viewport
const riseIO = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add('in'); riseIO.unobserve(e.target); }
}), { threshold: 0.12 });
$$('#kcontent .k-rise, #gcontent .g-rise').forEach((el) => {
  const cls = el.classList.contains('k-rise') ? 'k-rise' : 'g-rise';
  const sib = [...el.parentElement.children].filter((c) => c.classList.contains(cls));
  el.style.setProperty('--d', `${sib.indexOf(el) * 70}ms`);
  riseIO.observe(el);
});

// Stack section: DOM keycaps press the matching 3D key
$('#kcontent').addEventListener('click', (e) => {
  const b = e.target.closest('[data-skill]');
  if (!b) return;
  const name = b.dataset.skill;
  const t = scene?.kb ? scene.kb.pressSkill(name) : techInfo({ short: name, skill: name });
  const r = b.getBoundingClientRect();
  techCard(t, { x: r.right - 12, y: r.top });
});

/* skill card shown when a tech key is pressed */
const card = $('#key-card');
let cardTimer = 0;
function hideCardSoon(ms) {
  if (ms === null) return;
  clearTimeout(cardTimer);
  cardTimer = setTimeout(() => card.classList.remove('show'), ms);
}
function showCard(html, at, ms = 3800) {
  card.innerHTML = html;
  card.classList.add('show');
  if (at && !isTouch) {
    const w = card.offsetWidth, h = card.offsetHeight;
    const x = Math.min(Math.max(12, at.x + 22), innerWidth - w - 12);
    const y = Math.min(Math.max(70, at.y - h - 18), innerHeight - h - 60);
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    card.classList.remove('docked');
  } else {
    card.style.left = card.style.top = '';
    card.classList.add('docked');
  }
  hideCardSoon(ms);
}
function techCard(t, at) {
  const used = t.usedIn.length ? t.usedIn.map(escHTML).join(' · ') : 'core toolkit';
  showCard(`
    <div class="kc-top"><span class="kc-key">${escHTML(t.short)}</span><span class="dim">${escHTML(t.path)}/</span></div>
    <div class="kc-name">${escHTML(t.skill)}</div>
    ${t.level != null ? `<div class="kc-bar"><span style="width:${t.level}%"></span></div><div class="kc-meta"><span class="dim">proficiency</span> <b>${t.level}%</b></div>` : ''}
    <div class="kc-used"><span class="dim">used in →</span> ${used}</div>`, at);
}

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
  ScrollTrigger.refresh();
  setTimeout(() => $('#boot').remove(), 900);
}
['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { if (!booted) endBoot(); }, { once: true, passive: true }));
// the boot screen belongs to the hacker frontend only
if (mode === 'hacker') boot();
else endBoot();

/* ------------------------------------------------------------------ */
/* Scroll → continuous section index                                   */
/* ------------------------------------------------------------------ */
let sections = $$('main:not([hidden]) section');
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
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${sec.id.replace(/^[kg]-/, '')}`));
    $('#g-ch').textContent = `CH-${String(idx).padStart(2, '0')}`;
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
  if (scene) scene.blockHover = !!e.target.closest('.panel, .k-card, .cap, .g-block, a, button, input, .hud-top');
  cursor.classList.toggle('link', !!e.target.closest('a, button, input, [data-magnetic], .project'));
});
const UI = 'a, button, input, .term-live, .panel, .k-card, .cap, .g-block, .hud-top, #key-card';
window.addEventListener('pointerdown', (e) => {
  if (mode !== 'hacker' || e.target.closest('a, button, input, .term-live')) return;
  if (scene?.click()) cursor.classList.add('fire');
  setTimeout(() => cursor.classList.remove('fire'), 300);
});
// keys mode uses `click`, so a finger scrolling the page never presses keys
window.addEventListener('click', (e) => {
  if (mode === 'hacker' || !scene || e.target.closest(UI)) return;
  scene.setPointer(e.clientX, e.clientY);
  if (mode === 'glitch') {
    // corrupt reality: 3D monolith explodes + the page itself tears for a moment
    scene.click();
    document.body.classList.remove('g-burst');
    void document.body.offsetWidth;
    document.body.classList.add('g-burst');
    return;
  }
  const hit = scene.click();
  if (!hit) return;
  cursor.classList.add('fire');
  setTimeout(() => cursor.classList.remove('fire'), 300);
  if (hit !== true) techCard(hit, { x: e.clientX, y: e.clientY });
});
window.addEventListener('keydown', (e) => {
  if (mode !== 'keys' || !scene?.kb || e.repeat || e.metaKey || e.ctrlKey) return;
  if (e.target.closest?.('input, textarea, [contenteditable]')) return;
  const t = scene.kb.pressCode(e.code);
  if (t) techCard(t, null);
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
  onMode: (m) => {
    if (!m) return applyMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
    m = m.toLowerCase();
    return applyMode({ term: 'hacker', terminal: 'hacker', hacker: 'hacker', keys: 'keys', keyboard: 'keys', kb: 'keys', glitch: 'glitch' }[m] || m);
  },
});
window.addEventListener('keydown', (e) => {
  if (mode === 'hacker' && (e.key === '~' || e.key === '`')) {
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
const pad2 = (n) => String(n).padStart(2, '0');
const timecode = (ms) => {
  const f = Math.floor((ms / 1000) * 30);
  return `${pad2(Math.floor(f / 108000))}:${pad2(Math.floor(f / 1800) % 60)}:${pad2(Math.floor(f / 30) % 60)}:${pad2(f % 30)}`;
};
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
  if (mode === 'glitch') $('#g-tc').textContent = timecode(now);
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

// apply the starting frontend now that scroll tracking exists
applyMode(mode);
