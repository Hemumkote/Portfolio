// HM/OS window manager: draggable / resizable windows, focus order, taskbar,
// start menu, minimise / maximise, the opening "zoom" rectangles and the screensaver timer.
import { ICONS, APPS } from './render-os.js';

const SIZES = {
  hero: [600, 430],
  about: [620, 470],
  skills: [600, 560],
  experience: [660, 500],
  projects: [760, 500],
  education: [560, 330],
  contact: [520, 230],
  trash: [380, 200],
};
const SAVER_AFTER = 60_000;

export function initOS(root, { onFocus, onExit, onSaver } = {}) {
  const $ = (s, r = root) => r.querySelector(s);
  const $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const desk = $('.o-desk');
  const tasks = $('.o-tasks');
  const menu = $('.o-startmenu');
  const startBtn = $('.o-start');
  const wins = new Map($$('.o-win').map((w) => [w.dataset.app, w]));
  const geo = new Map(); // app -> {x, y, w, h}
  let z = 10;
  let focused = null;
  let lastIdx = 0;
  let active = false;
  const small = () => innerWidth < 820;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- geometry ---------------- */
  function bounds() {
    return { w: desk.clientWidth, h: desk.clientHeight };
  }
  function defaultGeo(app) {
    const B = bounds();
    const [w0, h0] = SIZES[app] || [520, 380];
    const w = Math.min(w0, B.w - 24), h = Math.min(h0, B.h - 24);
    const n = [...wins.values()].filter((x) => !x.hidden).length;
    const left = app === 'hero' ? (B.w - w) / 2 : Math.min(B.w - w - 12, 150 + n * 34);
    const top = app === 'hero' ? Math.max(12, (B.h - h) / 2 - 20) : Math.min(B.h - h - 12, 28 + n * 30);
    return { x: Math.max(12, left), y: Math.max(12, top), w, h };
  }
  function apply(app) {
    const w = wins.get(app), g = geo.get(app);
    if (!g) return;
    const B = bounds();
    // keep the title bar reachable after viewport changes
    g.w = Math.min(g.w, B.w);
    g.h = Math.min(g.h, B.h);
    g.x = Math.min(Math.max(g.x, -g.w + 90), B.w - 90);
    g.y = Math.min(Math.max(g.y, 0), B.h - 30);
    Object.assign(w.style, { left: `${g.x}px`, top: `${g.y}px`, width: `${g.w}px`, height: `${g.h}px` });
  }

  /* ---------------- zoom rectangles ---------------- */
  function zoom(from, to) {
    if (reduce || !from || !to) return;
    const r = document.createElement('div');
    r.className = 'o-zoom';
    document.body.appendChild(r);
    const f = (b) => ({ left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
    r.animate([f(from), f(to)], { duration: 240, easing: 'steps(6, end)' }).finished.then(() => r.remove(), () => r.remove());
  }
  const rectOf = (el) => el?.getBoundingClientRect();

  /* ---------------- window ops ---------------- */
  function taskBtn(app) {
    let b = tasks.querySelector(`[data-task="${app}"]`);
    if (!b) {
      const [icon, , title] = APPS[app] || ['trash', '', 'Trash'];
      b = document.createElement('button');
      b.type = 'button';
      b.className = 'o-task';
      b.dataset.task = app;
      b.innerHTML = `${ICONS[icon]}<span>${title}</span>`;
      b.addEventListener('click', () => {
        const w = wins.get(app);
        if (w.classList.contains('o-min')) restore(app);
        else if (focused === app) minimize(app);
        else focus(app);
      });
      tasks.appendChild(b);
    }
    return b;
  }

  function open(app, fromEl) {
    const w = wins.get(app);
    if (!w) return;
    closeMenu();
    if (w.hidden) {
      w.hidden = false;
      if (!geo.has(app)) geo.set(app, defaultGeo(app));
      apply(app);
      if (small()) w.classList.add('o-max');
      taskBtn(app);
      zoom(rectOf(fromEl), rectOf(w));
    } else if (w.classList.contains('o-min')) {
      restore(app);
      return;
    }
    focus(app);
  }

  function close(app) {
    const w = wins.get(app);
    if (!w || w.hidden) return;
    zoom(rectOf(w), rectOf(root.querySelector(`.o-icon[data-open="${app}"]`)));
    w.hidden = true;
    w.classList.remove('o-min', 'o-max', 'o-active');
    tasks.querySelector(`[data-task="${app}"]`)?.remove();
    if (focused === app) focusTop();
  }

  function minimize(app) {
    const w = wins.get(app);
    zoom(rectOf(w), rectOf(tasks.querySelector(`[data-task="${app}"]`)));
    w.classList.add('o-min');
    w.classList.remove('o-active');
    if (focused === app) focusTop();
  }

  function restore(app) {
    const w = wins.get(app);
    zoom(rectOf(tasks.querySelector(`[data-task="${app}"]`)), null);
    w.classList.remove('o-min');
    focus(app);
  }

  function toggleMax(app) {
    if (small()) return;
    wins.get(app).classList.toggle('o-max');
  }

  function focus(app) {
    const w = wins.get(app);
    if (!w || w.hidden) return;
    if (focused !== app) w.style.zIndex = ++z;
    focused = app;
    wins.forEach((x, a) => x.classList.toggle('o-active', a === app));
    $$('.o-task').forEach((b) => b.classList.toggle('on', b.dataset.task === app));
    if (w.dataset.idx != null) {
      lastIdx = Number(w.dataset.idx);
      onFocus?.(lastIdx);
    }
  }

  function focusTop() {
    let best = null, bz = -1;
    wins.forEach((w, a) => {
      if (w.hidden || w.classList.contains('o-min')) return;
      const zi = Number(w.style.zIndex || 0);
      if (zi > bz) { bz = zi; best = a; }
    });
    focused = null;
    if (best) focus(best);
    else {
      wins.forEach((x) => x.classList.remove('o-active'));
      $$('.o-task').forEach((b) => b.classList.remove('on'));
    }
  }

  /* ---------------- drag & resize ---------------- */
  function dragFrom(e, app, mode) {
    const w = wins.get(app);
    if (small() || w.classList.contains('o-max') || e.button !== 0) return;
    e.preventDefault();
    const g = geo.get(app);
    const sx = e.clientX, sy = e.clientY, g0 = { ...g };
    w.classList.add('o-dragging');
    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (mode === 'move') { g.x = g0.x + dx; g.y = g0.y + dy; }
      else { g.w = Math.max(300, g0.w + dx); g.h = Math.max(180, g0.h + dy); }
      apply(app);
    };
    const up = () => {
      w.classList.remove('o-dragging');
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  }

  wins.forEach((w, app) => {
    w.addEventListener('pointerdown', () => focus(app));
    const bar = w.querySelector('.o-title');
    bar.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) dragFrom(e, app, 'move'); });
    bar.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) toggleMax(app); });
    w.querySelector('.o-grip').addEventListener('pointerdown', (e) => dragFrom(e, app, 'size'));
    w.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      ({ min: minimize, max: toggleMax, close })[b.dataset.act]?.(app);
    });
  });

  /* ---------------- desktop icons, start menu, app widgets ---------------- */
  root.addEventListener('click', (e) => {
    const icon = e.target.closest('.o-icons .o-icon');
    if (icon) {
      $$('.o-icons .o-icon').forEach((i) => i.classList.toggle('sel', i === icon));
      // single click opens on touch screens and from the keyboard; double-click with a mouse
      if (icon.dataset.open && (e.detail === 0 || window.matchMedia('(hover: none)').matches)) open(icon.dataset.open, icon);
      return;
    }
    const opener = e.target.closest('[data-open]');
    if (opener) { open(opener.dataset.open, opener); return; }
    if (e.target.closest('[data-exit]')) { closeMenu(); onExit?.(); return; }
    if (e.target.closest('[data-next-tip]')) {
      const p = $('.o-tip');
      const list = JSON.parse(p.dataset.tips);
      p.textContent = list[(list.indexOf(p.textContent) + 1) % list.length];
      return;
    }
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      const box = tab.closest('.o-win');
      $$('[data-tab]', box).forEach((t) => { t.classList.toggle('on', t === tab); t.setAttribute('aria-selected', String(t === tab)); });
      $$('[data-panel]', box).forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab));
      return;
    }
    const proj = e.target.closest('[data-proj]');
    if (proj) {
      const box = proj.closest('.o-win');
      $$('[data-proj]', box).forEach((t) => t.setAttribute('aria-selected', String(t === proj)));
      $$('[data-pane]', box).forEach((p) => (p.hidden = p.dataset.pane !== proj.dataset.proj));
      return;
    }
    if (e.target === desk || e.target.classList.contains('o-icons')) $$('.o-icons .o-icon').forEach((i) => i.classList.remove('sel'));
  });
  root.addEventListener('dblclick', (e) => {
    const icon = e.target.closest('.o-icons .o-icon');
    if (icon?.dataset.open) open(icon.dataset.open, icon);
  });

  function closeMenu() {
    menu.hidden = true;
    startBtn.setAttribute('aria-expanded', 'false');
    startBtn.classList.remove('on');
  }
  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const show = menu.hidden;
    menu.hidden = !show;
    startBtn.setAttribute('aria-expanded', String(show));
    startBtn.classList.toggle('on', show);
  });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !e.target.closest('.o-startmenu, .o-start')) closeMenu();
  });
  addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'Escape') {
      if (!menu.hidden) closeMenu();
      else if (focused) close(focused);
    }
  });
  addEventListener('resize', () => {
    wins.forEach((w, app) => {
      if (w.hidden) return;
      w.classList.toggle('o-max', small() || w.classList.contains('o-max'));
      apply(app);
    });
  });

  /* ---------------- clock + screensaver ---------------- */
  const clock = $('.o-clock');
  const tickClock = () => (clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  tickClock();
  setInterval(tickClock, 10_000);

  let idleT = 0, saver = false;
  const wake = () => {
    if (saver) { saver = false; document.body.classList.remove('o-saver'); onSaver?.(false); }
    clearTimeout(idleT);
    if (active && !reduce) idleT = setTimeout(() => { saver = true; document.body.classList.add('o-saver'); onSaver?.(true); }, SAVER_AFTER);
  };
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => addEventListener(ev, wake, { passive: true }));

  return {
    tray: $('.o-tray-slot'),
    open: (id) => open(String(id).replace(/^#/, '').replace(/^[kgbo]-/, '')),
    openIdx: (i) => open(Object.keys(APPS)[i] || 'hero'),
    current: () => lastIdx,
    activate(idx = 0) {
      active = true;
      if (![...wins.values()].some((w) => !w.hidden)) open('hero');
      open(Object.keys(APPS)[idx] || 'hero');
      wake();
    },
    deactivate() {
      active = false;
      clearTimeout(idleT);
      closeMenu();
      if (saver) { saver = false; document.body.classList.remove('o-saver'); onSaver?.(false); }
    },
  };
}
