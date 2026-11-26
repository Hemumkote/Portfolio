// Markup + behaviour for the notebook theme: the portfolio as a hand-written bullet journal
// on graph paper — habit tracker, hand-plotted line charts, ticks, crosses and spiral binding.
// A separate frontend from the others; shares only data.js.
import { PROFILE, CONTACT, STATS, SKILLS, EXPERIENCE, PROJECTS, EDUCATION } from './data.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const TOTAL = 6;

// deterministic randomness, so the "hand" draws the same marks on every visit
function rng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/* ---------------- hand-drawn marks ---------------- */
const j = (r, n) => (r() - 0.5) * n;
function tick(r) {
  return `M${3 + j(r, 2)} ${11 + j(r, 2)} L${8 + j(r, 1.5)} ${16 + j(r, 1.5)} L${17 + j(r, 2)} ${3.5 + j(r, 2)}`;
}
function cross(r) {
  return `M${4 + j(r, 2)} ${4 + j(r, 2)} L${16 + j(r, 2)} ${16 + j(r, 2)} M${16 + j(r, 2)} ${4 + j(r, 2)} L${4 + j(r, 2)} ${16 + j(r, 2)}`;
}
const mark = (state, r) =>
  state === 0 ? '' : `<svg viewBox="0 0 20 20" class="${state === 1 ? 'ok' : 'no'}" aria-hidden="true"><path pathLength="1" d="${state === 1 ? tick(r) : cross(r)}"/></svg>`;

// a wobbly marker underline for headings
function underline(seed, color = 'red') {
  const r = rng(seed);
  const y = () => 6 + j(r, 3);
  return `<svg class="n-ul ${color}" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M2 ${y()} C 50 ${y()}, 120 ${y()}, 198 ${y()}"/></svg>`;
}
// a loose hand-drawn ring around a number
function ring(seed) {
  const r = rng(seed);
  return `<svg class="n-ring" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M${60 + j(r, 8)} ${5 + j(r, 3)} C ${10 + j(r, 8)} ${2 + j(r, 4)}, ${-2 + j(r, 4)} ${50 + j(r, 6)}, 50 ${56 + j(r, 3)} S ${104 + j(r, 4)} ${18 + j(r, 6)}, ${40 + j(r, 8)} ${8 + j(r, 4)}"/></svg>`;
}

const heading = (title, note, seed) => `
  <h2 class="n-h n-rise"><span class="n-write"><span>${esc(title)}</span></span>${note ? ` <span class="n-note">[${esc(note)}]</span>` : ''}${underline(seed)}</h2>`;

// the spiral binding that sits between two pages
const spiral = `<div class="n-spiral" aria-hidden="true"><svg width="100%" height="64"><defs>
  <pattern id="n-coil" width="34" height="64" patternUnits="userSpaceOnUse">
    <ellipse cx="13" cy="14" rx="4.2" ry="3.2" class="hole"/><ellipse cx="13" cy="50" rx="4.2" ry="3.2" class="hole"/>
    <path d="M13 14 C 1 22, 1 42, 13 50" class="coil"/><path d="M12 16 C 3.5 24, 3.5 40, 12 48" class="shine"/>
  </pattern></defs><rect width="100%" height="64" fill="url(#n-coil)"/></svg></div>`;

/* ---------------- habit tracker data ---------------- */
// [habit, how often it gets ticked]
const HABITS = [
  ['WRITE CLEAN CODE', 0.86],
  ['SHIP A FEATURE', 0.62],
  ['REVIEW A PR', 0.78],
  ['FIX ONE BUG', 0.82],
  ['READ THE DOCS', 0.7],
  ['LEARN SOMETHING NEW', 0.74],
  ['TEST iOS + ANDROID', 0.66],
  ['COMMIT & PUSH', 0.93],
  ['REFACTOR A LITTLE', 0.55],
  ['HELP A TEAMMATE', 0.72],
  ['DRINK WATER', 0.9],
  ['SCREEN TIME < 10 HRS', 0.18],
  ['NO CONSOLE.LOG IN PROD', 0.6],
  ['NO PROCRASTINATION', 0.35],
];
const MOODS = ['NEED COFFEE', 'DEBUGGING', 'OKAY', 'PRODUCTIVE', 'SHIPPED IT'];
const CELL = 24; // px per day column (tracker + chart share it so they line up)
const LABEL = 200; // px for the label column

export function renderNotebook(root, { touch = false } = {}) {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' }).toUpperCase();
  const year = now.getFullYear();
  const days = new Date(year, now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  const [first, ...rest] = PROFILE.name.split(' ');

  // tracker state: 0 empty, 1 tick, 2 cross — filled in up to today
  const state = HABITS.map(([name, p]) => {
    const r = rng(`${name}${year}${now.getMonth()}`);
    return Array.from({ length: days }, (_, d) => (d < today ? (r() < p ? 1 : 2) : 0));
  });
  const cellR = (ri, d) => rng(`${ri}:${d}:${state[ri][d]}`);

  const tracker = `
    <div class="n-scroll n-rise"><table class="n-track" style="--days:${days}" aria-label="Daily tasks tracker for ${esc(month)} ${year}. Click a box to tick it.">
      <thead><tr><th class="n-tl">DAILY TASKS</th>${Array.from({ length: days }, (_, d) => `<th class="${d + 1 === today ? 'today' : ''}">${d + 1}</th>`).join('')}</tr></thead>
      <tbody>${HABITS.map(([name], ri) => `
        <tr><th class="n-tl">${esc(name)}</th>${state[ri].map((s, d) => `<td data-r="${ri}" data-d="${d}" style="--c:${d}">${mark(s, cellR(ri, d))}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table></div>`;

  // productivity chart: y = share of ticks on that day, plotted under the tracker
  const ROW = 34, TOP = 18, H = TOP + ROW * (MOODS.length - 1) + 22;
  const W = LABEL + days * CELL + 20;
  const moodChart = `
    <div class="n-scroll n-rise"><svg class="n-chart" id="n-mood" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-label="Mood tracker, plotted from the ticks above">
      ${MOODS.map((m, i) => `<text x="${LABEL - 22}" y="${TOP + ROW * (MOODS.length - 1 - i) + 6}" text-anchor="end">${m}</text>`).join('')}
      <path class="axis" pathLength="1" d="M${LABEL - 6} ${TOP - 12} V${H - 10} H${W - 4}"/>
      <path class="arrow" d="M${LABEL - 11} ${TOP - 4} L${LABEL - 6} ${TOP - 13} L${LABEL - 1} ${TOP - 4} M${W - 12} ${H - 15} L${W - 3} ${H - 10} L${W - 12} ${H - 5}"/>
      <path class="line" pathLength="1" d=""/><g class="dots"></g>
    </svg></div>`;

  // career chart: role held each month, from the first job to now
  const parse = (s) => { const m = s.match(/(\d{2})\/(\d{4})/); return m ? +m[2] * 12 + (+m[1] - 1) : null; };
  const nowM = year * 12 + now.getMonth();
  const jobs = EXPERIENCE.map((e, i) => {
    const [a, b] = e.period.split('—');
    return { lvl: EXPERIENCE.length - 1 - i, from: parse(a), to: parse(b ?? '') ?? nowM, e };
  });
  const start = Math.min(...jobs.map((x) => x.from));
  const months = nowM - start + 1;
  const MW = Math.max(16, Math.min(26, Math.floor(760 / months)));
  const CL = 210, CR = 22, CT = 22;
  const CW = CL + months * MW + CR, CH = CT + ROW * (jobs.length - 1) + 46;
  const pts = [];
  for (let m = 0; m < months; m++) {
    const held = jobs.filter((x) => start + m >= x.from && start + m <= x.to);
    if (held.length) pts.push([CL + m * MW + MW / 2, CT + ROW * (jobs.length - 1 - Math.max(...held.map((x) => x.lvl)))]);
  }
  const shortRole = (e) => e.role.replace(/Associate Software Engineer/i, 'ASSOC. ENGINEER').replace(/Software Engineer/i, 'SOFTWARE ENGINEER').toUpperCase();
  const careerChart = `
    <div class="n-scroll n-rise"><svg class="n-chart drawn" width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}" aria-label="Career tracker: role held each month">
      ${[...jobs].sort((a, b) => a.lvl - b.lvl).map((x) => `<text x="${CL - 18}" y="${CT + ROW * (jobs.length - 1 - x.lvl) + 6}" text-anchor="end">${esc(shortRole(x.e))}</text>`).join('')}
      <path class="axis" pathLength="1" d="M${CL - 6} ${CT - 14} V${CH - 26} H${CW - 4}"/>
      <path class="arrow" d="M${CL - 11} ${CT - 6} L${CL - 6} ${CT - 15} L${CL - 1} ${CT - 6} M${CW - 12} ${CH - 31} L${CW - 3} ${CH - 26} L${CW - 12} ${CH - 21}"/>
      ${Array.from({ length: months }, (_, m) => (start + m) % 12 === 0 || m === 0 ? `<text class="x" x="${CL + m * MW + MW / 2}" y="${CH - 6}" text-anchor="middle">${(start + m) % 12 === 0 ? Math.floor((start + m) / 12) : `${pad(((start + m) % 12) + 1)}/${String(Math.floor((start + m) / 12)).slice(2)}`}</text>` : '').join('')}
      <path class="line" pathLength="1" d="M${pts.map((p) => p.join(' ')).join(' L')}"/>
      <g class="dots">${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2.6" style="--i:${i}"/>`).join('')}</g>
    </svg></div>`;

  const links = [
    CONTACT.email && { href: `mailto:${CONTACT.email}`, label: `Say hello — ${CONTACT.email}` },
    CONTACT.github && { href: CONTACT.github, label: 'Check out my GitHub', ext: true },
    CONTACT.linkedin && { href: CONTACT.linkedin, label: 'Connect on LinkedIn', ext: true },
    { href: PROFILE.resume, label: 'Download my résumé (PDF)', dl: true },
    { href: '#n-projects', label: 'Flip back to the projects page' },
  ].filter(Boolean);

  root.innerHTML = `
  <section id="n-hero" class="n-sec n-hero" data-name="${esc(month)} ${year}" data-path="PG 00">
    <h1 class="n-title n-rise" aria-label="${esc(PROFILE.name)} — ${esc(PROFILE.role)}">
      <span class="n-write"><span>${esc(month)} ${year}</span>${underline('t1')}</span>
      <span class="n-br">[</span><span class="n-write blue" style="--wd:500ms"><span>${esc(first)} ${esc(rest.join(' '))}</span>${underline('t2')}</span>
      <span class="n-sep">—</span><span class="n-write blue" style="--wd:900ms"><span>TRYING TO BE 1% BETTER</span>${underline('t3')}</span><span class="n-br">]</span>
    </h1>
    <div class="n-intro n-rise">
      <p>${esc(PROFILE.role)} @ ${esc(PROFILE.company)} · ${esc(PROFILE.tagline.replace(/\s*\/\/\s*/g, ' — '))}.</p>
      <p class="n-hint">✎ ${touch ? 'Tap' : 'Click'} any box to tick ✓ or cross ✗ it — the mood chart below re-plots itself.</p>
    </div>
    ${tracker}
    <div class="n-sub n-rise">MOOD TRACKER <span class="n-note">[PLOTTED FROM ↑]</span></div>
    ${moodChart}
    <div class="n-cta n-rise">
      <a class="n-btn" href="#n-projects">See my projects →</a>
      <a class="n-btn ghost" href="${PROFILE.resume}" download>Résumé.pdf</a>
    </div>
  </section>
  ${spiral}
  <section id="n-about" class="n-sec" data-name="ABOUT ME" data-path="PG 01">
    ${heading('ABOUT ME', 'DEAR DIARY', 'h1')}
    <div class="n-about">
      <p class="n-para n-rise">${esc(PROFILE.summary)}</p>
      <div class="n-stats n-rise">
        <div class="n-sub">KEY NUMBERS</div>
        ${STATS.map((s, i) => `<div class="n-stat"><b>${Number(s.value).toFixed(s.decimals)}${esc(s.suffix)}${ring(`s${i}`)}</b><span>${esc(s.label.replace(/\s*\/\/\s*/g, ' · ').toUpperCase())}</span></div>`).join('')}
        <div class="n-stat"><b class="pin">📍</b><span>BASED IN ${esc(PROFILE.location.toUpperCase())}</span></div>
      </div>
    </div>
  </section>
  ${spiral}
  <section id="n-skills" class="n-sec" data-name="SKILL TRACKER" data-path="PG 02">
    ${heading('SKILL TRACKER', 'OUT OF 10', 'h2')}
    <div class="n-skills">
      ${SKILLS.map((g, gi) => `
        <div class="n-scroll n-rise"><table class="n-track n-skill">
          <thead><tr><th class="n-tl">${esc(g.group.toUpperCase())}</th>${Array.from({ length: 10 }, (_, k) => `<th>${k + 1}</th>`).join('')}</tr></thead>
          <tbody>${g.items.map(([n, v], ii) => {
            const got = Math.round(v / 10);
            return `<tr><th class="n-tl">${esc(n.toUpperCase())}</th>${Array.from({ length: 10 }, (_, k) => `<td style="--c:${k}">${k < got ? mark(1, rng(`sk${gi}${ii}${k}`)) : ''}</td>`).join('')}</tr>`;
          }).join('')}</tbody>
        </table></div>`).join('')}
    </div>
  </section>
  ${spiral}
  <section id="n-experience" class="n-sec" data-name="CAREER LOG" data-path="PG 03">
    ${heading('CAREER TRACKER', 'ROLE BY MONTH', 'h3')}
    ${careerChart}
    <div class="n-log">
      ${EXPERIENCE.map((e, i) => `
        <article class="n-entry n-rise">
          <div class="n-date">${esc(e.period.replace('present', 'NOW').toUpperCase())}</div>
          <h3>${esc(e.role.toUpperCase())} <span>@ ${esc(e.org.toUpperCase())}</span></h3>
          <div class="n-proj">${esc(e.project)}</div>
          <ul>${e.points.map((p, k) => `<li>${mark(1, rng(`ex${i}${k}`))}<span>${esc(p)}</span></li>`).join('')}</ul>
          <div class="n-tools">TOOLS: ${e.stack.map((s) => `<u>${esc(s)}</u>`).join(' · ')}</div>
        </article>`).join('')}
    </div>
  </section>
  ${spiral}
  <section id="n-projects" class="n-sec" data-name="PROJECT LOG" data-path="PG 04">
    ${heading('PROJECT LOG', `${PROJECTS.length} BUILDS`, 'h4')}
    <div class="n-cards">
      ${PROJECTS.map((p, i) => `
        <article class="n-card n-rise" style="--rot:${[-1.2, 0.9, -0.6][i % 3]}deg">
          <i class="n-tape" aria-hidden="true"></i>
          <div class="n-date">${esc(p.year)} · ${esc(p.org.toUpperCase())}</div>
          <h3>${esc(p.name.toUpperCase())}</h3>
          <div class="n-proj">${esc(p.kind)}</div>
          <p>${esc(p.desc)}</p>
          <div class="n-tools">BUILT WITH: ${p.stack.map((s) => `<u>${esc(s)}</u>`).join(' · ')}</div>
          <span class="n-stamp">${esc(p.status.split('//')[0].trim())}</span>
        </article>`).join('')}
    </div>
  </section>
  ${spiral}
  <section id="n-education" class="n-sec" data-name="SCHOOL NOTES" data-path="PG 05">
    ${heading('SCHOOL NOTES', 'EDUCATION', 'h5')}
    <div class="n-edu">
      ${EDUCATION.map((e, i) => `
        <div class="n-entry n-rise">
          <div class="n-date">${esc(e.meta.replace(/\s*\/\/\s*/g, ' · ').toUpperCase())}</div>
          <h3>${i === 0 ? '★ ' : '✎ '}${esc(e.title.toUpperCase())}</h3>
          <div class="n-proj">${esc(e.inst)}</div>
        </div>`).join('')}
    </div>
  </section>
  ${spiral}
  <section id="n-contact" class="n-sec n-contact" data-name="TO-DO" data-path="PG 06">
    ${heading('TO-DO', 'FOR YOU', 'h6')}
    <ul class="n-todo n-rise">
      ${links.map((l) => `<li><a href="${esc(l.href)}"${l.ext ? ' target="_blank" rel="noopener"' : ''}${l.dl ? ' download' : ''}><span class="n-box" aria-hidden="true"></span>${esc(l.label)}</a></li>`).join('')}
    </ul>
    <p class="n-sign n-rise"><span class="n-write"><span>— ${esc(PROFILE.name.split(' ').map((w) => w[0]).join('.'))}.</span></span><small>p.s. still trying to be 1% better every day.</small></p>
  </section>`;

  /* ---------------- behaviour ---------------- */
  const mood = root.querySelector('#n-mood');
  const plot = () => {
    const P = [];
    for (let d = 0; d < days; d++) {
      let ok = 0, no = 0;
      state.forEach((row) => (row[d] === 1 ? ok++ : row[d] === 2 ? no++ : 0));
      if (ok + no === 0) continue;
      const lvl = Math.round((ok / (ok + no)) * (MOODS.length - 1));
      P.push([LABEL + d * CELL + CELL / 2, TOP + ROW * (MOODS.length - 1 - lvl)]);
    }
    mood.querySelector('.line').setAttribute('d', P.length ? `M${P.map((p) => p.join(' ')).join(' L')}` : '');
    mood.querySelector('.dots').innerHTML = P.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2.6" style="--i:${i}"/>`).join('');
  };
  plot();

  // tick → cross → empty, then re-plot the mood chart
  root.querySelector('.n-track').addEventListener('click', (e) => {
    const td = e.target.closest('td[data-r]');
    if (!td) return;
    const ri = +td.dataset.r, d = +td.dataset.d;
    state[ri][d] = (state[ri][d] + 1) % 3;
    td.innerHTML = mark(state[ri][d], cellR(ri, d));
    td.classList.add('fresh');
    mood.classList.add('drawn', 'live');
    plot();
  });

  // on narrow screens: scroll the tracker so today is in view, and keep the mood chart in step with it
  const [trackBox, moodBox] = [root.querySelector('.n-track').parentElement, mood.parentElement];
  let synced = false;
  new ResizeObserver(() => {
    if (synced || !trackBox.clientWidth) return;
    synced = true;
    trackBox.scrollLeft = Math.max(0, LABEL + today * CELL + CELL * 2 - trackBox.clientWidth);
    moodBox.scrollLeft = trackBox.scrollLeft;
  }).observe(trackBox);
  trackBox.addEventListener('scroll', () => (moodBox.scrollLeft = trackBox.scrollLeft), { passive: true });
  moodBox.addEventListener('scroll', () => (trackBox.scrollLeft = moodBox.scrollLeft), { passive: true });

  // to-do items get ticked before the link is followed
  root.querySelectorAll('.n-todo a').forEach((a) =>
    a.addEventListener('click', () => {
      const box = a.querySelector('.n-box');
      if (!box.innerHTML) box.innerHTML = mark(1, rng(a.href));
    }));
}
