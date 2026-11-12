import { PROFILE, CONTACT, STATS, SKILLS, EXPERIENCE, PROJECTS, EDUCATION } from './data.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const head = (idx, cmd, title) => `
  <div class="sec-head">
    <div class="sec-cmd"><span class="dim">[${idx}]</span> <span class="acc">$</span> <span data-type>${esc(cmd)}</span></div>
    <h2 class="sec-title glitch" data-text="${esc(title)}" data-decode>${esc(title)}</h2>
  </div>`;

export function renderContent(root) {
  root.innerHTML = `
  <section id="hero" data-name="ROOT" data-path="~">
    <div class="hero-inner">
      <div class="hero-pre" data-type>&gt; establishing secure uplink ... OK</div>
      <h1 class="hero-name" aria-label="${esc(PROFILE.name)}">
        ${(() => { const [first, ...rest] = PROFILE.name.split(' '); return `<span class="glitch" data-text="${esc(first)}" data-decode data-speed="1.6">${esc(first)}</span><br /><span class="glitch outline" data-text="${esc(rest.join(' '))}" data-decode data-speed="1.6">${esc(rest.join(' '))}</span>`; })()}
      </h1>
      <div class="hero-role"><span class="acc">&gt;&gt;</span> <span data-decode>${esc(PROFILE.role)}</span></div>
      <div class="hero-tag" data-type>${esc(PROFILE.tagline)}</div>
      <div class="hero-meta">
        <span><i>status</i> <b class="ok">● online</b></span>
        <span><i>node</i> <b>${esc(PROFILE.company)}</b></span>
        <span><i>uptime</i> <b>${esc(PROFILE.experience)}</b></span>
      </div>
      <div class="hero-cta">
        <a class="btn" href="#projects" data-magnetic>./view_projects</a>
        <a class="btn ghost" href="${PROFILE.resume}" download data-magnetic>download resume.pdf</a>
      </div>
    </div>
    <div class="scroll-hint">scroll to decrypt <span>↓</span></div>
  </section>

  <section id="about" data-name="WHOAMI" data-path="~/about">
    ${head('01', 'whoami --verbose', 'IDENTITY')}
    <div class="about-grid">
      <div class="panel term">
        <div class="term-bar"><i></i><i></i><i></i><span>about.md — vim</span></div>
        <p class="scrub" data-scrub>${esc(PROFILE.summary)}</p>
      </div>
      <div class="stats">
        ${STATS.map(
          (s) => `
          <div class="stat panel">
            <div class="stat-v"><span data-count="${s.value}" data-decimals="${s.decimals}">0</span>${s.suffix}</div>
            <div class="stat-l" data-decode>${esc(s.label)}</div>
          </div>`
        ).join('')}
      </div>
    </div>
  </section>

  <section id="skills" data-name="STACK" data-path="~/stack">
    ${head('02', 'ls -la ./stack', 'TECH STACK')}
    <div class="skills-grid">
      ${SKILLS.map(
        (g) => `
        <div class="panel skill-group tilt">
          <div class="sg-head"><span class="acc">drwxr-xr-x</span> <span data-decode>${esc(g.path)}</span></div>
          <ul>
            ${g.items
              .map(
                ([n, v]) => `
              <li>
                <span class="sk-n" data-decode>${esc(n)}</span>
                <span class="sk-bar"><span style="--v:${v}%"></span></span>
                <span class="sk-v">${v}</span>
              </li>`
              )
              .join('')}
          </ul>
        </div>`
      ).join('')}
    </div>
  </section>

  <section id="experience" data-name="GIT LOG" data-path="~/career">
    ${head('03', 'git log --graph --career', 'COMMIT HISTORY')}
    <div class="timeline">
      ${EXPERIENCE.map(
        (e) => `
        <article class="commit">
          <div class="node"></div>
          <div class="panel commit-body">
            <div class="c-line"><span class="warn">commit ${e.hash}</span> <span class="ref">(${esc(e.branch)})</span></div>
            <div class="c-line dim">Date: ${esc(e.period)} &nbsp;·&nbsp; @${esc(e.org)}</div>
            <h3 data-decode>${esc(e.role)}</h3>
            <div class="c-proj">↳ <span data-decode>${esc(e.project)}</span></div>
            <ul>${e.points.map((p) => `<li><span class="acc">+</span> <span data-type>${esc(p)}</span></li>`).join('')}</ul>
            <div class="chips">${e.stack.map((s) => `<span>${esc(s)}</span>`).join('')}</div>
          </div>
        </article>`
      ).join('')}
    </div>
  </section>

  <section id="projects" data-name="PROJECTS" data-path="~/projects">
    ${head('04', './projects --list --verbose', 'DEPLOYED SYSTEMS')}
    <div class="projects">
      ${PROJECTS.map(
        (p, i) => `
        <article class="project panel tilt" data-project="${i}">
          <div class="term-bar"><i></i><i></i><i></i><span>${esc(p.id)}.sys</span></div>
          <div class="p-body">
            <div class="p-top"><span class="p-idx">0${i + 1}</span><span class="p-status"><b></b>${esc(p.status)}</span></div>
            <h3 class="glitch" data-text="${esc(p.name)}" data-decode>${esc(p.name)}</h3>
            <div class="p-kind">${esc(p.kind)} <span class="dim">// ${esc(p.org)} · ${esc(p.year)}</span></div>
            <p class="scrub" data-scrub>${esc(p.desc)}</p>
            <div class="chips">${p.stack.map((s) => `<span>${esc(s)}</span>`).join('')}</div>
          </div>
          <div class="p-scan"></div>
        </article>`
      ).join('')}
    </div>
  </section>

  <section id="education" data-name="EDUCATION" data-path="~/edu">
    ${head('05', 'cat ./education.txt', 'TRAINING DATA')}
    <div class="edu">
      ${EDUCATION.map(
        (e) => `
        <div class="panel edu-item tilt">
          <div class="dim">-rw-r--r--</div>
          <h3 data-decode>${esc(e.title)}</h3>
          <div data-type>${esc(e.inst)}</div>
          <div class="acc">${esc(e.meta)}</div>
        </div>`
      ).join('')}
    </div>
  </section>

  <section id="contact" data-name="SSH" data-path="~/contact">
    ${head('06', `ssh guest@${PROFILE.handle}.dev`, 'OPEN A CHANNEL')}
    <div class="panel term term-live">
      <div class="term-bar"><i></i><i></i><i></i><span>guest@${esc(PROFILE.handle)}: ~ — zsh</span></div>
      <div id="term-out" class="term-out" aria-live="polite"></div>
      <label class="term-in"><span class="acc">guest@${esc(PROFILE.handle)}</span>:<span class="h">~</span>$ <input id="term-input" autocomplete="off" spellcheck="false" aria-label="terminal input" /></label>
    </div>
    <div class="contact-links">
      ${CONTACT.email ? `<a class="btn" data-magnetic href="mailto:${esc(CONTACT.email)}">mail --to ${esc(CONTACT.email)}</a>` : ''}
      ${CONTACT.github ? `<a class="btn ghost" data-magnetic target="_blank" rel="noopener" href="${esc(CONTACT.github)}">github</a>` : ''}
      ${CONTACT.linkedin ? `<a class="btn ghost" data-magnetic target="_blank" rel="noopener" href="${esc(CONTACT.linkedin)}">linkedin</a>` : ''}
      <a class="btn ghost" data-magnetic href="${PROFILE.resume}" download>wget resume.pdf</a>
    </div>
    <footer>
      <span>© ${new Date().getFullYear()} ${esc(PROFILE.name)}</span>
      <span class="dim">built with three.js · rendered in real time</span>
      <span class="dim">[ press <b>~</b> anywhere for terminal ]</span>
    </footer>
  </section>`;
}
