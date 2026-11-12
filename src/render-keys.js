// Markup for the keyboard theme — a completely separate frontend from the hacker one.
// Shares only the content in data.js.
import { PROFILE, CONTACT, STATS, SKILLS, EXPERIENCE, PROJECTS, EDUCATION } from './data.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const GROUP_TITLES = { frontend: 'Frontend', mobile: 'Mobile', 'state-ui': 'State & UI', backend: 'Backend', realtime: 'Realtime', tools: 'Tools & Process' };

const head = (fkey, title, sub) => `
  <header class="k-head k-rise">
    <kbd class="cap sm">${fkey}</kbd>
    <h2>${esc(title)}</h2>
    ${sub ? `<p>${esc(sub)}</p>` : ''}
  </header>`;

const chips = (list) => `<div class="k-chips">${list.map((s) => `<span class="cap xs">${esc(s)}</span>`).join('')}</div>`;

export function renderKeys(root, { touch = false } = {}) {
  const [first, ...rest] = PROFILE.name.split(' ');
  const title = (w) => (w.length > 2 ? w[0] + w.slice(1).toLowerCase() : w); // HEMANTHA → Hemantha, keep initials
  const fmt = (v, d) => Number(v).toFixed(d);
  const links = [
    CONTACT.email && `<a class="cap lg acc" href="mailto:${esc(CONTACT.email)}">Email me <kbd>↵</kbd></a>`,
    CONTACT.github && `<a class="cap lg" target="_blank" rel="noopener" href="${esc(CONTACT.github)}">GitHub</a>`,
    CONTACT.linkedin && `<a class="cap lg" target="_blank" rel="noopener" href="${esc(CONTACT.linkedin)}">LinkedIn</a>`,
    `<a class="cap lg ${CONTACT.email ? '' : 'acc'}" href="${PROFILE.resume}" download>Download résumé <kbd>⇣</kbd></a>`,
  ].filter(Boolean);

  root.innerHTML = `
  <section id="k-hero" class="k-sec k-hero" data-name="HOME" data-path="~">
    <div class="k-hero-inner">
      <div class="k-eyebrow k-rise"><span class="k-dot"></span>${esc(PROFILE.role)} at ${esc(PROFILE.company)}</div>
      <h1 class="k-name k-rise">${esc(title(first))}<br /><span>${esc(rest.join(' '))}</span></h1>
      <p class="k-lede k-rise">${esc(PROFILE.tagline.replace(/\s*\/\/\s*/g, ' — '))}. ${esc(PROFILE.experience)} of shipping mobile and web products.</p>
      <div class="k-cta k-rise">
        <a class="cap lg acc" href="#k-projects">View projects <kbd>↵</kbd></a>
        <a class="cap lg" href="${PROFILE.resume}" download>Résumé.pdf</a>
      </div>
      <p class="k-hint k-rise">${touch ? '<span class="cap xs">tap</span> a floating key to see what I do with it' : '<span class="cap xs">click</span> a floating key — or just start typing'}</p>
    </div>
    <a class="k-scroll" href="#k-about" aria-label="scroll to about"><span class="cap xs">↓</span></a>
  </section>

  <section id="k-about" class="k-sec" data-name="ABOUT" data-path="~/about">
    ${head('F1', 'About', 'A quick hello.')}
    <div class="k-about">
      <div class="k-card k-rise"><p class="k-summary">${esc(PROFILE.summary)}</p></div>
      <div class="k-stats">
        ${STATS.map((s) => `
          <div class="k-stat cap k-rise">
            <b>${fmt(s.value, s.decimals)}${esc(s.suffix)}</b>
            <span>${esc(s.label)}</span>
          </div>`).join('')}
      </div>
    </div>
  </section>

  <section id="k-skills" class="k-sec" data-name="STACK" data-path="~/stack">
    ${head('F2', 'Stack', 'Every key is something I work with. Press one.')}
    <div class="k-skills">
      ${SKILLS.map((g) => `
        <div class="k-card k-group k-rise">
          <h3>${esc(GROUP_TITLES[g.group] || g.group)}</h3>
          <div class="k-keys">
            ${g.items.map(([n, v]) => `
              <button type="button" class="cap skill" data-skill="${esc(n)}" style="--v:${v}%">
                <span class="n">${esc(n)}</span>
                <span class="lv"><i></i>${v}</span>
              </button>`).join('')}
          </div>
        </div>`).join('')}
    </div>
  </section>

  <section id="k-experience" class="k-sec" data-name="EXPERIENCE" data-path="~/career">
    ${head('F3', 'Experience', 'Where I have shipped.')}
    <ol class="k-timeline">
      ${EXPERIENCE.map((e, i) => `
        <li class="k-card k-job k-rise">
          <div class="k-job-top">
            <kbd class="cap xs ${i === 0 ? 'acc' : ''}">${esc(e.period)}</kbd>
            <span class="k-org">${esc(e.org)}</span>
          </div>
          <h3>${esc(e.role)}</h3>
          <div class="k-proj">${esc(e.project)}</div>
          <ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          ${chips(e.stack)}
        </li>`).join('')}
    </ol>
  </section>

  <section id="k-projects" class="k-sec" data-name="PROJECTS" data-path="~/projects">
    ${head('F4', 'Projects', 'Selected work.')}
    <div class="k-projects">
      ${PROJECTS.map((p, i) => `
        <article class="k-card k-project k-rise">
          <div class="k-p-top"><kbd class="cap sm">${i + 1}</kbd><span class="k-status">${esc(p.status)}</span></div>
          <h3>${esc(p.name)}</h3>
          <div class="k-kind">${esc(p.kind)} · ${esc(p.org)} · ${esc(p.year)}</div>
          <p>${esc(p.desc)}</p>
          ${chips(p.stack)}
        </article>`).join('')}
    </div>
  </section>

  <section id="k-education" class="k-sec" data-name="EDUCATION" data-path="~/edu">
    ${head('F5', 'Education', '')}
    <div class="k-edu">
      ${EDUCATION.map((e) => `
        <div class="k-card k-rise">
          <h3>${esc(e.title)}</h3>
          <div class="k-inst">${esc(e.inst)}</div>
          <div class="k-meta">${esc(e.meta)}</div>
        </div>`).join('')}
    </div>
  </section>

  <section id="k-contact" class="k-sec k-contact" data-name="CONTACT" data-path="~/contact">
    ${head('F6', 'Contact', '')}
    <div class="k-contact-inner k-rise">
      <p class="k-big">Let’s build something<br />people <span>love to use.</span></p>
      <div class="k-cta">${links.join('')}</div>
    </div>
    <footer class="k-foot">
      <span>© ${new Date().getFullYear()} ${esc(PROFILE.name)}</span>
      <span>Built with three.js · every key is real-time 3D</span>
    </footer>
  </section>`;
}
