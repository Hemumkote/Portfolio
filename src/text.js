import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ01<>/\\{}[]#$%&*+=_?!;:アカサタナハマヤラワ';
const rnd = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
const scrambleStr = (s) => s.replace(/\S/g, rnd);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1. DECODE: scramble → resolve once in view ---------- */
function prepDecode(el) {
  const text = el.textContent;
  el.dataset.final = text;
  el.setAttribute('aria-label', text);
  if (reduced) return;
  el.textContent = scrambleStr(text);
  el.classList.add('enc');
}

export function decode(el, { speed = 1 } = {}) {
  const text = el.dataset.final ?? el.textContent;
  if (reduced) { el.textContent = text; return; }
  el.classList.remove('enc');
  el.classList.add('decoding');
  const dur = Math.min(1400, 350 + text.length * 28) * speed;
  const reveal = [...text].map((_, i) => (i / text.length) * dur * 0.65 + Math.random() * dur * 0.35);
  const t0 = performance.now();
  let last = 0;
  const step = (now) => {
    const t = now - t0;
    if (now - last > 40) {
      last = now;
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        out += t >= reveal[i] || c === ' ' ? c : rnd();
      }
      el.textContent = out;
    }
    if (t < dur) requestAnimationFrame(step);
    else { el.textContent = text; el.classList.remove('decoding'); }
  };
  requestAnimationFrame(step);
}

/* ---------- 2. TYPE: typewriter with layout-stable ghost ---------- */
function prepType(el) {
  const text = el.textContent;
  el.dataset.final = text;
  el.setAttribute('aria-label', text);
  if (reduced) return;
  el.innerHTML = `<span class="typed"></span><span class="caret"></span><span class="ghost"></span>`;
  el.querySelector('.ghost').textContent = text;
}

function type(el) {
  const text = el.dataset.final;
  if (reduced) return;
  const typed = el.querySelector('.typed');
  const ghost = el.querySelector('.ghost');
  const caret = el.querySelector('.caret');
  let i = 0;
  const cps = Math.max(45, text.length * 1.4); // chars / second, long lines type faster
  const t0 = performance.now();
  const step = (now) => {
    const n = Math.min(text.length, Math.floor(((now - t0) / 1000) * cps));
    if (n !== i) {
      i = n;
      typed.textContent = text.slice(0, i);
      ghost.textContent = text.slice(i);
    }
    if (i < text.length) requestAnimationFrame(step);
    else setTimeout(() => caret.remove(), 900);
  };
  requestAnimationFrame(step);
}

/* ---------- 3. SCRUB: characters render as you scroll ---------- */
const scrubbers = [];
function prepScrub(el) {
  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.textContent = '';
  const chars = [];
  text.split(/(\s+)/).forEach((word) => {
    if (/^\s+$/.test(word)) { el.append(' '); return; }
    const w = document.createElement('span');
    w.className = 'w';
    w.setAttribute('aria-hidden', 'true');
    for (const c of word) {
      const s = document.createElement('span');
      s.className = 'c off';
      s.dataset.c = c;
      s.textContent = reduced ? c : rnd();
      w.append(s);
      chars.push(s);
    }
    el.append(w);
  });
  const st = { el, chars, count: -1, head: 10 };
  scrubbers.push(st);
  const apply = (p) => {
    const n = Math.round(p * chars.length);
    if (n === st.count) return;
    const prev = st.count < 0 ? 0 : st.count;
    st.count = n;
    // only touch the span of characters whose state changed (works both scroll directions)
    for (let i = Math.min(prev, n); i < Math.max(prev, n) + st.head && i < chars.length; i++) {
      const s = chars[i];
      if (i < n) { s.className = 'c on'; s.textContent = s.dataset.c; }
      else if (i < n + st.head) { s.className = 'c head'; }
      else { s.className = 'c off'; s.textContent = rnd(); }
    }
  };
  if (reduced) { chars.forEach((s) => (s.className = 'c on')); return; }
  ScrollTrigger.create({
    trigger: el,
    start: 'top 88%',
    end: 'bottom 60%',
    scrub: true,
    onUpdate: (self) => apply(self.progress),
    onRefresh: (self) => apply(self.progress),
  });
}

// shimmer the "render head" glyphs
let lastShimmer = 0;
function shimmer(now) {
  if (now - lastShimmer > 55) {
    lastShimmer = now;
    for (const st of scrubbers) {
      const start = Math.max(0, st.count);
      for (let i = start; i < start + st.head && i < st.chars.length; i++) st.chars[i].textContent = rnd();
    }
  }
  requestAnimationFrame(shimmer);
}

/* ---------- 4. COUNTERS ---------- */
function count(el) {
  const target = parseFloat(el.dataset.count);
  const dec = parseInt(el.dataset.decimals || '0', 10);
  const o = { v: 0 };
  gsap.to(o, {
    v: target, duration: 1.8, ease: 'power3.out',
    onUpdate: () => (el.textContent = o.v.toFixed(dec)),
  });
}

/* ---------- wire up ---------- */
export function initText(root = document) {
  root.querySelectorAll('[data-decode]').forEach(prepDecode);
  root.querySelectorAll('[data-type]').forEach(prepType);
  root.querySelectorAll('[data-scrub]').forEach(prepScrub);

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        io.unobserve(el);
        // stagger by vertical order a little so lines feel "streamed"
        const delay = Math.min(600, Math.max(0, e.boundingClientRect.top - window.innerHeight * 0.5) * 0.4);
        setTimeout(() => {
          if (el.hasAttribute('data-decode')) decode(el, { speed: parseFloat(el.dataset.speed || '1') });
          if (el.hasAttribute('data-type')) type(el);
          if (el.hasAttribute('data-count')) count(el);
        }, delay);
      });
    },
    { threshold: 0.6, rootMargin: '0px 0px -8% 0px' }
  );
  root.querySelectorAll('[data-decode],[data-type],[data-count]').forEach((el) => io.observe(el));
  requestAnimationFrame(shimmer);
}
