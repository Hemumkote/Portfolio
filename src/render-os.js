// Markup for the OS desktop theme ("HM/OS"): a retro desktop where every portfolio
// section is an application window. A separate frontend; shares only data.js.
import { PROFILE, CONTACT, STATS, SKILLS, EXPERIENCE, PROJECTS, EDUCATION } from './data.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* 32×32 pixel icons — flat shapes on a pixel grid */
const svg = (body) => `<svg viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges" aria-hidden="true">${body}</svg>`;
export const ICONS = {
  pc: svg(`<rect x="3" y="4" width="26" height="18" fill="#d9d9d9"/><rect x="5" y="6" width="22" height="14" fill="var(--o-a)"/><rect x="7" y="8" width="10" height="2" fill="#fff"/><rect x="7" y="12" width="14" height="2" fill="#9cc3ff"/><rect x="12" y="22" width="8" height="3" fill="#a8a8a8"/><rect x="7" y="25" width="18" height="3" fill="#d9d9d9"/><rect x="3" y="4" width="26" height="1" fill="#fff"/><rect x="28" y="4" width="1" height="18" fill="#555"/>`),
  txt: svg(`<path d="M6 3h14l6 6v20H6z" fill="#fff"/><path d="M20 3v6h6" fill="#cfcfcf"/><rect x="9" y="12" width="14" height="2" fill="#2a2a2a"/><rect x="9" y="16" width="12" height="2" fill="#2a2a2a"/><rect x="9" y="20" width="14" height="2" fill="#2a2a2a"/><rect x="9" y="24" width="8" height="2" fill="#2a2a2a"/><rect x="5" y="3" width="1" height="26" fill="#555"/><rect x="6" y="28" width="20" height="1" fill="#555"/>`),
  chip: svg(`<rect x="8" y="8" width="16" height="16" fill="#3a3a3a"/><rect x="11" y="11" width="10" height="10" fill="var(--o-b)"/><g fill="#d4b14a"><rect x="10" y="4" width="2" height="4"/><rect x="15" y="4" width="2" height="4"/><rect x="20" y="4" width="2" height="4"/><rect x="10" y="24" width="2" height="4"/><rect x="15" y="24" width="2" height="4"/><rect x="20" y="24" width="2" height="4"/><rect x="4" y="10" width="4" height="2"/><rect x="4" y="15" width="4" height="2"/><rect x="4" y="20" width="4" height="2"/><rect x="24" y="10" width="4" height="2"/><rect x="24" y="15" width="4" height="2"/><rect x="24" y="20" width="4" height="2"/></g>`),
  log: svg(`<rect x="5" y="4" width="20" height="24" fill="#f4e7c3"/><rect x="5" y="4" width="4" height="24" fill="var(--o-a)"/><rect x="12" y="9" width="10" height="2" fill="#6b5a3a"/><rect x="12" y="13" width="8" height="2" fill="#6b5a3a"/><rect x="12" y="17" width="10" height="2" fill="#6b5a3a"/><rect x="25" y="4" width="2" height="24" fill="#c8b98f"/><rect x="5" y="28" width="22" height="1" fill="#555"/>`),
  folder: svg(`<path d="M3 8h10l2 3h14v16H3z" fill="#e8c14f"/><rect x="3" y="13" width="26" height="14" fill="#f6d872"/><rect x="3" y="13" width="26" height="1" fill="#fff3b8"/><rect x="3" y="27" width="26" height="1" fill="#9a7a1f"/><rect x="28" y="13" width="1" height="14" fill="#9a7a1f"/>`),
  cap: svg(`<path d="M2 12 16 6l14 6-14 6z" fill="#2a2a2a"/><path d="M8 15v7c0 2 4 4 8 4s8-2 8-4v-7l-8 3z" fill="#444"/><rect x="26" y="12" width="2" height="9" fill="var(--o-b)"/><rect x="25" y="21" width="4" height="3" fill="var(--o-b)"/>`),
  mail: svg(`<rect x="3" y="8" width="26" height="17" fill="#fff"/><path d="M3 8l13 10L29 8" fill="none" stroke="#9a9a9a" stroke-width="2"/><rect x="3" y="24" width="26" height="1" fill="#555"/><rect x="28" y="8" width="1" height="17" fill="#555"/><rect x="20" y="3" width="9" height="7" fill="var(--o-a)"/>`),
  pdf: svg(`<path d="M6 3h14l6 6v20H6z" fill="#fff"/><path d="M20 3v6h6" fill="#cfcfcf"/><rect x="4" y="14" width="18" height="9" fill="#c8281e"/><rect x="6" y="16" width="2" height="5" fill="#fff"/><rect x="8" y="16" width="2" height="2" fill="#fff"/><rect x="11" y="16" width="2" height="5" fill="#fff"/><rect x="13" y="17" width="1" height="3" fill="#fff"/><rect x="16" y="16" width="2" height="5" fill="#fff"/><rect x="18" y="16" width="3" height="1" fill="#fff"/><rect x="18" y="18" width="2" height="1" fill="#fff"/>`),
  trash: svg(`<rect x="8" y="9" width="16" height="19" fill="#bfc7cf"/><rect x="6" y="6" width="20" height="3" fill="#8a949e"/><rect x="13" y="3" width="6" height="3" fill="#8a949e"/><rect x="11" y="12" width="2" height="13" fill="#7a848e"/><rect x="15" y="12" width="2" height="13" fill="#7a848e"/><rect x="19" y="12" width="2" height="13" fill="#7a848e"/>`),
  info: svg(`<rect x="6" y="6" width="20" height="20" fill="#2f6fde"/><rect x="4" y="10" width="2" height="12" fill="#2f6fde"/><rect x="26" y="10" width="2" height="12" fill="#2f6fde"/><rect x="10" y="4" width="12" height="2" fill="#2f6fde"/><rect x="10" y="26" width="12" height="2" fill="#2f6fde"/><rect x="15" y="9" width="3" height="3" fill="#fff"/><rect x="15" y="14" width="3" height="9" fill="#fff"/><rect x="13" y="14" width="2" height="2" fill="#fff"/>`),
  tip: svg(`<rect x="11" y="4" width="10" height="2" fill="#e8c14f"/><rect x="8" y="6" width="16" height="12" fill="#ffe27a"/><rect x="11" y="18" width="10" height="3" fill="#e8c14f"/><rect x="12" y="21" width="8" height="5" fill="#9aa3ad"/><rect x="14" y="26" width="4" height="2" fill="#6b737c"/>`),
};

// app id → [icon, desktop label, window title]
export const APPS = {
  hero: ['pc', 'Welcome', 'welcome.exe'],
  about: ['txt', 'about.txt', 'about.txt — Notepad'],
  skills: ['chip', 'Stack', 'System Properties — Stack'],
  experience: ['log', 'experience.log', 'experience.log — Viewer'],
  projects: ['folder', 'Projects', 'C:\\Projects'],
  education: ['cap', 'Education', 'Certificates'],
  contact: ['mail', 'Contact', 'New Message'],
};
const ORDER = Object.keys(APPS);

const win = (app, idx, body, { menu = true, status = '', cls = '', section = true } = {}) => {
  const [icon, , title] = APPS[app] || ['trash', '', 'Trash'];
  const tag = section ? 'section' : 'div';
  return `
  <${tag} ${section ? `id="o-${app}"` : ''} class="o-win ${cls}" data-app="${app}" ${idx != null ? `data-idx="${idx}"` : ''} data-name="${esc(title.toUpperCase())}" data-path="C:\\${app}" role="dialog" aria-label="${esc(title)}" hidden>
    <header class="o-title">
      <span class="o-ico">${ICONS[icon]}</span><b>${esc(title)}</b>
      <span class="o-ctl">
        <button type="button" data-act="min" aria-label="Minimize"><i class="m"></i></button>
        <button type="button" data-act="max" aria-label="Maximize"><i class="x"></i></button>
        <button type="button" data-act="close" aria-label="Close"><i class="c"></i></button>
      </span>
    </header>
    ${menu ? `<nav class="o-menu" aria-hidden="true"><span><u>F</u>ile</span><span><u>E</u>dit</span><span><u>V</u>iew</span><span><u>H</u>elp</span></nav>` : ''}
    <div class="o-body">${body}</div>
    ${status ? `<footer class="o-status">${status}</footer>` : ''}
    <i class="o-grip" aria-hidden="true"></i>
  </${tag}>`;
};

const TIPS = [
  'Double-click a desktop icon to open it. Windows can be dragged, resized and maximized.',
  'The tray in the bottom-right corner switches between all five themes.',
  'Press ◐ in the tray to change the colour scheme.',
  'Leave the desktop alone for a minute and the screensaver kicks in.',
  'The Start menu has every section, plus a shortcut back to the terminal.',
];

export function renderOS(root, { touch = false } = {}) {
  const [first, ...rest] = PROFILE.name.split(' ');
  const title = (w) => (w.length > 2 ? w[0] + w.slice(1).toLowerCase() : w);
  const fullName = `${title(first)} ${rest.join(' ')}`;
  const moduleCount = SKILLS.reduce((n, g) => n + g.items.length, 0);
  const open = touch ? 'Tap' : 'Double-click';
  const contactLinks = [
    CONTACT.email && `<a class="o-btn def" href="mailto:${esc(CONTACT.email)}">Send email…</a>`,
    CONTACT.github && `<a class="o-btn" target="_blank" rel="noopener" href="${esc(CONTACT.github)}">GitHub</a>`,
    CONTACT.linkedin && `<a class="o-btn" target="_blank" rel="noopener" href="${esc(CONTACT.linkedin)}">LinkedIn</a>`,
    `<a class="o-btn ${CONTACT.email ? '' : 'def'}" href="${PROFILE.resume}" download>Download résumé.pdf</a>`,
  ].filter(Boolean);
  const segs = (v) => `<span class="o-prog" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100"><span style="--v:${v}"></span></span>`;

  const icons = [
    ...ORDER.map((a) => `<button type="button" class="o-icon" data-open="${a}">${ICONS[APPS[a][0]]}<span>${esc(APPS[a][1])}</span></button>`),
    `<a class="o-icon" href="${PROFILE.resume}" download>${ICONS.pdf}<span>résumé.pdf</span></a>`,
    `<button type="button" class="o-icon" data-open="trash">${ICONS.trash}<span>Trash</span></button>`,
  ].join('');

  root.innerHTML = `
  <div class="o-desk">
    <div class="o-icons" role="toolbar" aria-label="Desktop">${icons}</div>

    ${win('hero', 0, `
      <div class="o-welcome">
        <div class="o-side" aria-hidden="true"><b>HM</b><span>/OS</span></div>
        <div class="o-wmain">
          <p class="o-kicker">Welcome to</p>
          <h1 class="o-hello">${esc(fullName)}</h1>
          <p class="o-role">${esc(PROFILE.role)} @ ${esc(PROFILE.company)}</p>
          <p>${esc(PROFILE.tagline.replace(/\s*\/\/\s*/g, ' — '))}. ${esc(PROFILE.experience)} of shipping mobile and web products.</p>
          <div class="o-tipbox">
            <span class="o-ico">${ICONS.tip}</span>
            <div><b>Did you know…</b><p class="o-tip" data-tips='${esc(JSON.stringify(TIPS))}'>${esc(TIPS[0])}</p></div>
          </div>
          <div class="o-row">
            <button type="button" class="o-btn def" data-open="projects">Open Projects</button>
            <button type="button" class="o-btn" data-open="about">About me</button>
            <button type="button" class="o-btn" data-next-tip>Next tip</button>
          </div>
        </div>
      </div>`, { menu: false })}

    ${win('about', 1, `
      <div class="o-paper">
        <p>${esc(PROFILE.summary)}</p>
        <p class="o-pre">----------------------------------------
${STATS.map((s) => `${(s.label.split('//')[0].trim() + ' ').padEnd(22, '.')} ${Number(s.value).toFixed(s.decimals)}${s.suffix}`).join('\n')}
${'location '.padEnd(22, '.')} ${esc(PROFILE.location)}
----------------------------------------</p>
      </div>`, { status: `<span>Ln 1, Col 1</span><span>UTF-8</span>` })}

    ${win('skills', 2, `
      <div class="o-tabs" role="tablist"><span class="on">Device Manager</span><span>General</span></div>
      <div class="o-panel o-tree">
        <div class="o-tree-root">${ICONS.pc}<b>${esc(PROFILE.handle)}-workstation</b></div>
        ${SKILLS.map((g, i) => `
          <details ${i < 3 ? 'open' : ''}>
            <summary>${ICONS.chip}<span>${esc(g.group)}</span><em>${g.items.length}</em></summary>
            <ul>${g.items.map(([n, v]) => `<li><span class="n">${esc(n)}</span>${segs(v)}<span class="v">${v}%</span></li>`).join('')}</ul>
          </details>`).join('')}
      </div>`, { status: `<span>${moduleCount} devices</span><span>All devices working properly.</span>` })}

    ${win('experience', 3, `
      <div class="o-tabs" role="tablist">
        ${EXPERIENCE.map((e, i) => `<button type="button" role="tab" data-tab="${i}" aria-selected="${i === 0}" class="${i === 0 ? 'on' : ''}">${esc(e.org.split(' ')[0])} · ${esc(e.period.slice(3, 7))}</button>`).join('')}
      </div>
      ${EXPERIENCE.map((e, i) => `
        <div class="o-panel o-job" data-panel="${i}" ${i ? 'hidden' : ''}>
          <h3>${esc(e.role)}</h3>
          <p class="o-sub">${esc(e.org)} — <b>${esc(e.project)}</b></p>
          <p class="o-sub dim">${esc(e.period)}</p>
          <ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          <div class="o-chips">${e.stack.map((s) => `<span>${esc(s)}</span>`).join('')}</div>
        </div>`).join('')}`, { status: `<span>${EXPERIENCE.length} entries</span><span>Read-only</span>` })}

    ${win('projects', 4, `
      <div class="o-addr"><span>Address</span><div>C:\\Projects</div></div>
      <div class="o-explorer">
        <aside class="o-pane">
          ${PROJECTS.map((p, i) => `
            <div class="o-proj" data-pane="${i}" ${i ? 'hidden' : ''}>
              ${ICONS.folder}
              <h3>${esc(p.name)}</h3>
              <p class="o-sub">${esc(p.kind)}</p>
              <p class="o-sub dim">${esc(p.org)} · ${esc(p.year)} · ${esc(p.status)}</p>
              <p>${esc(p.desc)}</p>
              <div class="o-chips">${p.stack.map((s) => `<span>${esc(s)}</span>`).join('')}</div>
            </div>`).join('')}
        </aside>
        <div class="o-files" role="listbox" aria-label="Projects">
          ${PROJECTS.map((p, i) => `<button type="button" class="o-icon dark" role="option" data-proj="${i}" aria-selected="${i === 0}">${ICONS.folder}<span>${esc(p.name)}</span></button>`).join('')}
        </div>
      </div>`, { status: `<span>${PROJECTS.length} object(s)</span><span>${open === 'Tap' ? 'Tap' : 'Click'} a folder for details</span>` })}

    ${win('education', 5, `
      <div class="o-certs">
        ${EDUCATION.map((e) => `
          <div class="o-cert">
            <div class="o-seal" aria-hidden="true">${ICONS.cap}</div>
            <h3>${esc(e.title)}</h3>
            <p class="o-sub">${esc(e.inst)}</p>
            <p class="o-sub dim">${esc(e.meta)}</p>
          </div>`).join('')}
      </div>`, { menu: false })}

    ${win('contact', 6, `
      <div class="o-msg">
        <span class="o-ico big">${ICONS.info}</span>
        <div>
          <h3>Let’s build something.</h3>
          <p>Thanks for stopping by ${esc(PROFILE.handle)}’s desktop. Reach out, or grab the résumé to keep a copy.</p>
        </div>
      </div>
      <div class="o-row end">${contactLinks.join('')}</div>`, { menu: false })}

    ${win('trash', null, `
      <div class="o-msg">
        <span class="o-ico big">${ICONS.trash}</span>
        <div><h3>Trash is empty.</h3><p>Bugs here get fixed, not binned.</p></div>
      </div>
      <div class="o-row end"><button type="button" class="o-btn def" data-act="close">OK</button></div>`, { menu: false, section: false, cls: 'o-small' })}
  </div>

  <nav class="o-startmenu" hidden aria-label="Start menu">
    <div class="o-banner" aria-hidden="true"><b>HM</b>/OS</div>
    <ul>
      ${ORDER.map((a) => `<li><button type="button" data-open="${a}">${ICONS[APPS[a][0]]}<span>${esc(APPS[a][1])}</span></button></li>`).join('')}
      <li class="sep"></li>
      <li><a href="${PROFILE.resume}" download>${ICONS.pdf}<span>Résumé.pdf</span></a></li>
      <li><button type="button" data-exit>${ICONS.pc}<span>Exit to terminal…</span></button></li>
    </ul>
  </nav>

  <footer class="o-taskbar">
    <button type="button" class="o-start" aria-expanded="false"><b>HM</b>Start</button>
    <div class="o-tasks"></div>
    <div class="o-tray"><span class="o-tray-slot"></span><span class="o-clock">--:--</span></div>
  </footer>`;
}
