// Markup for the "glitch in the matrix" theme — a corrupted-broadcast frontend.
// Completely separate from the hacker and keyboard frontends; shares only data.js.
import { PROFILE, CONTACT, STATS, SKILLS, EXPERIENCE, PROJECTS, EDUCATION } from './data.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// text with an RGB-split, slice-glitching copy of itself
const gl = (text, cls = '') => `<span class="g-gl ${cls}" data-text="${esc(text)}">${esc(text)}</span>`;

const head = (ch, title, status) => `
  <header class="g-head g-rise">
    <div class="g-head-top"><span class="g-ch">CH-${ch}</span><span class="g-status">${esc(status)}</span></div>
    <h2>${gl(title)}</h2>
  </header>`;

const tags = (list) => `<div class="g-tags">${list.map((s) => `<span>[${esc(s)}]</span>`).join('')}</div>`;

const CELLS = 20;
const bar = (v) => `<span class="g-cells" aria-hidden="true">${Array.from({ length: CELLS }, (_, i) => `<i class="${i < Math.round((v / 100) * CELLS) ? 'on' : ''}" style="--i:${i}"></i>`).join('')}</span>`;

export function renderGlitch(root, { touch = false } = {}) {
  const [first, ...rest] = PROFILE.name.split(' ');
  const moduleCount = SKILLS.reduce((n, g) => n + g.items.length, 0);
  const links = [
    CONTACT.email && `<a class="g-btn" href="mailto:${esc(CONTACT.email)}">▶ Transmit email</a>`,
    CONTACT.github && `<a class="g-btn ghost" target="_blank" rel="noopener" href="${esc(CONTACT.github)}">GitHub</a>`,
    CONTACT.linkedin && `<a class="g-btn ghost" target="_blank" rel="noopener" href="${esc(CONTACT.linkedin)}">LinkedIn</a>`,
    `<a class="g-btn ${CONTACT.email ? 'ghost' : ''}" href="${PROFILE.resume}" download>⏏ Eject résumé.pdf</a>`,
  ].filter(Boolean);

  root.innerHTML = `
  <section id="g-hero" class="g-sec g-hero" data-name="SIGNAL" data-path="CH-00">
    <div class="g-hero-inner">
      <div class="g-rec g-rise"><b></b>REC · ${esc(PROFILE.role)} @ ${esc(PROFILE.company)}</div>
      <h1 class="g-name g-rise" aria-label="${esc(PROFILE.name)}">${gl(first)}<br />${gl(rest.join(' '), 'alt')}</h1>
      <p class="g-lede g-rise">${esc(PROFILE.tagline.replace(/\s*\/\/\s*/g, ' / '))}</p>
      <p class="g-deja g-rise" data-text="déjà vu — a glitch usually means something changed.">déjà vu — a glitch usually means something changed.</p>
      <div class="g-cta g-rise">
        <a class="g-btn" href="#g-projects">▶ Play projects</a>
        <a class="g-btn ghost" href="${PROFILE.resume}" download>⏏ Eject résumé</a>
      </div>
      <p class="g-hint g-rise">${touch ? 'tap' : 'click'} anywhere to corrupt reality</p>
    </div>
  </section>

  <section id="g-about" class="g-sec" data-name="SUBJECT" data-path="CH-01">
    ${head('01', 'About', 'SUBJECT: VERIFIED')}
    <div class="g-about">
      <div class="g-block g-rise"><p class="g-summary">${esc(PROFILE.summary)}</p></div>
      <div class="g-stats">
        ${STATS.map((s) => `
          <div class="g-block g-stat g-rise">
            <b>${gl(Number(s.value).toFixed(s.decimals) + s.suffix)}</b>
            <span>${esc(s.label)}</span>
          </div>`).join('')}
      </div>
    </div>
  </section>

  <section id="g-skills" class="g-sec" data-name="MODULES" data-path="CH-02">
    ${head('02', 'Stack', `MODULES: ${moduleCount} LOADED`)}
    <div class="g-skills">
      ${SKILLS.map((g) => `
        <div class="g-block g-group g-rise">
          <div class="g-group-h">/${esc(g.group)}</div>
          <ul>
            ${g.items.map(([n, v]) => `
              <li class="g-skill">
                <span class="n">${esc(n)}</span>
                ${bar(v)}
                <span class="v">${v}</span>
              </li>`).join('')}
          </ul>
        </div>`).join('')}
    </div>
  </section>

  <section id="g-experience" class="g-sec" data-name="TAPES" data-path="CH-03">
    ${head('03', 'Experience', `TIMELINE: ${EXPERIENCE.length} BRANCHES`)}
    <div class="g-tapes">
      ${EXPERIENCE.map((e, i) => `
        <article class="g-block g-tape g-rise">
          <div class="g-tape-top"><span>TAPE 0${EXPERIENCE.length - i}</span><span>${esc(e.period)}</span></div>
          <h3>${gl(e.role)}</h3>
          <div class="g-org">${esc(e.org)} — <em>${esc(e.project)}</em></div>
          <ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          ${tags(e.stack)}
        </article>`).join('')}
    </div>
  </section>

  <section id="g-projects" class="g-sec" data-name="BUILDS" data-path="CH-04">
    ${head('04', 'Projects', `BUILDS: ${PROJECTS.length} STABLE`)}
    <div class="g-rows">
      ${PROJECTS.map((p, i) => `
        <article class="g-block g-row g-rise">
          <span class="g-idx">0${i + 1}</span>
          <div class="g-row-main">
            <h3>${gl(p.name)}</h3>
            <div class="g-kind">${esc(p.kind)} · ${esc(p.org)} · ${esc(p.year)} <span class="g-state">${esc(p.status)}</span></div>
            <p>${esc(p.desc)}</p>
            ${tags(p.stack)}
          </div>
        </article>`).join('')}
    </div>
  </section>

  <section id="g-education" class="g-sec" data-name="TRAINING" data-path="CH-05">
    ${head('05', 'Education', 'TRAINING: COMPLETE')}
    <div class="g-edu">
      ${EDUCATION.map((e) => `
        <div class="g-block g-rise">
          <h3>${gl(e.title)}</h3>
          <div class="g-org">${esc(e.inst)}</div>
          <div class="g-meta">${esc(e.meta)}</div>
        </div>`).join('')}
    </div>
  </section>

  <section id="g-contact" class="g-sec g-contact" data-name="SIGNAL" data-path="CH-06">
    ${head('06', 'Contact', 'SIGNAL: OPEN')}
    <div class="g-rise">
      <p class="g-big">${gl('Reconnect?')}</p>
      <p class="g-lede">The signal is open. Reach out and let’s build something that doesn’t break.</p>
      <div class="g-cta">${links.join('')}</div>
    </div>
    <footer class="g-foot">
      <span>© ${new Date().getFullYear()} ${esc(PROFILE.name)}</span>
      <span>END OF TAPE · rendered live in three.js</span>
    </footer>
  </section>`;
}
