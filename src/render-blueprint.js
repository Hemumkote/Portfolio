// Markup for the blueprint theme: the portfolio as a set of engineering drawing sheets.
// A separate frontend from the others; shares only data.js.
import { PROFILE, CONTACT, STATS, SKILLS, EXPERIENCE, PROJECTS, EDUCATION } from './data.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TOTAL = 6;
const pad = (n) => String(n).padStart(2, '0');

// a sheet border that draws itself in when it enters the viewport
const frame = `<svg class="b-frame" aria-hidden="true"><rect x="0" y="0" width="100%" height="100%" pathLength="1" /></svg>`;

const head = (n, title, fig) => `
  <header class="b-head b-rise">
    <div class="b-head-meta"><span class="b-sheetno">SHEET ${pad(n)} / ${pad(TOTAL)}</span><span>${esc(fig)}</span></div>
    <h2 class="b-write"><span>${esc(title)}</span></h2>
    <div class="b-dim" aria-hidden="true"><i></i><span>FIG. ${n}</span><i></i></div>
  </header>`;

const tags = (list) => `<div class="b-tags">${list.map((s) => `<span>${esc(s)}</span>`).join('')}</div>`;

// small line drawings for the project details, each path draws itself in
const GLYPHS = {
  mobile: `<rect x="34" y="8" width="52" height="94" rx="8" /><rect x="40" y="18" width="40" height="70" rx="2" /><path d="M54 13h12M56 95h8" />
           <path d="M46 30h28M46 38h20M46 50h28M46 58h14" class="thin" />`,
  web: `<rect x="10" y="16" width="100" height="72" rx="4" /><path d="M10 28h100" /><circle cx="18" cy="22" r="2" /><circle cx="25" cy="22" r="2" />
        <path d="M20 40h36M20 48h24M64 40h36v32H64z" class="thin" /><path d="M20 60h36M20 68h28" class="thin" />`,
  data: `<ellipse cx="60" cy="22" rx="34" ry="10" /><path d="M26 22v62c0 6 15 10 34 10s34-4 34-10V22" /><path d="M26 43c0 6 15 10 34 10s34-4 34-10M26 64c0 6 15 10 34 10s34-4 34-10" class="thin" />`,
};
const glyphFor = (p) => (/mobile|app|communication/i.test(p.kind) ? 'mobile' : /internal|full-stack|platform/i.test(p.kind) && /postgres/i.test(p.stack.join()) ? 'data' : 'web');

export function renderBlueprint(root, { touch = false } = {}) {
  const [first, ...rest] = PROFILE.name.split(' ');
  const title = (w) => (w.length > 2 ? w[0] + w.slice(1).toLowerCase() : w);
  const year = new Date().getFullYear();
  const moduleCount = SKILLS.reduce((n, g) => n + g.items.length, 0);
  let item = 0;
  const links = [
    CONTACT.email && `<a class="b-btn" href="mailto:${esc(CONTACT.email)}">Send for approval →</a>`,
    CONTACT.github && `<a class="b-btn ghost" target="_blank" rel="noopener" href="${esc(CONTACT.github)}">GitHub</a>`,
    CONTACT.linkedin && `<a class="b-btn ghost" target="_blank" rel="noopener" href="${esc(CONTACT.linkedin)}">LinkedIn</a>`,
    `<a class="b-btn ${CONTACT.email ? 'ghost' : ''}" href="${PROFILE.resume}" download>Download résumé.pdf ⇣</a>`,
  ].filter(Boolean);

  root.innerHTML = `
  <section id="b-hero" class="b-sec b-hero" data-name="GENERAL ARRANGEMENT" data-path="SHEET 00">
    <div class="b-hero-inner">
      <div class="b-tag b-rise">DWG HM-001 · REV C · ${esc(PROFILE.role)} @ ${esc(PROFILE.company)}</div>
      <h1 class="b-name b-rise" aria-label="${esc(PROFILE.name)}">
        <span class="b-write"><span>${esc(title(first))}</span></span>
        <span class="b-write alt"><span>${esc(rest.join(' '))}</span></span>
      </h1>
      <div class="b-dim wide b-rise" aria-hidden="true"><i></i><span>${esc(PROFILE.experience)} · ${STATS[1].value} products</span><i></i></div>
      <p class="b-lede b-rise">${esc(PROFILE.tagline.replace(/\s*\/\/\s*/g, ' — '))}. Drafted, dimensioned and shipped to production.</p>
      <div class="b-cta b-rise">
        <a class="b-btn" href="#b-projects">View detail drawings →</a>
        <a class="b-btn ghost" href="${PROFILE.resume}" download>Résumé.pdf</a>
      </div>
      <p class="b-hint b-rise">Three pens are drafting this sheet live. ${touch ? 'Tap' : 'Click'} anywhere on the paper to call out a detail.</p>
    </div>
  </section>

  <section id="b-about" class="b-sec" data-name="SPECIFICATION" data-path="SHEET 01">
    ${head(1, 'About', 'GENERAL SPECIFICATION')}
    <div class="b-about">
      <div class="b-sheet b-rise">${frame}
        <div class="b-label">DESCRIPTION</div>
        <p class="b-summary">${esc(PROFILE.summary)}</p>
      </div>
      <div class="b-sheet b-rise">${frame}
        <div class="b-label">PERFORMANCE DATA</div>
        <table class="b-table">
          <thead><tr><th>PARAM</th><th>VALUE</th></tr></thead>
          <tbody>
            ${STATS.map((s) => `<tr><td>${esc(s.label.replace(/\s*\/\/\s*/g, ' · '))}</td><td class="b-val">${Number(s.value).toFixed(s.decimals)}${esc(s.suffix)}</td></tr>`).join('')}
            <tr><td>based in</td><td class="b-val">${esc(PROFILE.location)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section id="b-skills" class="b-sec" data-name="BILL OF MATERIALS" data-path="SHEET 02">
    ${head(2, 'Stack', `BILL OF MATERIALS — ${moduleCount} PARTS`)}
    <div class="b-bom">
      ${SKILLS.map((g, gi) => `
        <div class="b-sheet b-rise">${frame}
          <div class="b-label">ASSY ${String.fromCharCode(65 + gi)} — ${esc(g.group.toUpperCase())}</div>
          <table class="b-table">
            <thead><tr><th>ITEM</th><th>PART</th><th class="b-sc-h">TOLERANCE</th></tr></thead>
            <tbody>
              ${g.items.map(([n, v]) => `
                <tr>
                  <td class="b-item">${pad(++item)}</td>
                  <td>${esc(n)}</td>
                  <td><span class="b-scale" style="--v:${v}"><i></i><b>${v}</b></span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`).join('')}
    </div>
  </section>

  <section id="b-experience" class="b-sec" data-name="REVISION HISTORY" data-path="SHEET 03">
    ${head(3, 'Experience', 'REVISION HISTORY')}
    <div class="b-revs">
      ${EXPERIENCE.map((e, i) => `
        <article class="b-sheet b-rev b-rise">${frame}
          <div class="b-rev-id"><span>REV</span><b>${String.fromCharCode(65 + EXPERIENCE.length - 1 - i)}</b></div>
          <div class="b-rev-main">
            <div class="b-rev-top"><span>${esc(e.period)}</span><span>${i === 0 ? 'CURRENT' : 'SUPERSEDED'}</span></div>
            <h3>${esc(e.role)}</h3>
            <div class="b-org">${esc(e.org)} — <em>${esc(e.project)}</em></div>
            <ul>${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
            <div class="b-matl"><span>MATL:</span>${tags(e.stack)}</div>
          </div>
        </article>`).join('')}
    </div>
  </section>

  <section id="b-projects" class="b-sec" data-name="DETAIL DRAWINGS" data-path="SHEET 04">
    ${head(4, 'Projects', `DETAIL DRAWINGS — ${PROJECTS.length} OFF`)}
    <div class="b-details">
      ${PROJECTS.map((p, i) => `
        <article class="b-sheet b-detail b-rise">${frame}
          <div class="b-detail-top"><span class="b-balloon">${String.fromCharCode(65 + i)}</span><span>DETAIL ${String.fromCharCode(65 + i)} · SCALE 2:1</span></div>
          <svg class="b-glyph" viewBox="0 0 120 110" aria-hidden="true">${GLYPHS[glyphFor(p)].replace(/<(rect|path|circle|ellipse) /g, '<$1 pathLength="1" ')}</svg>
          <h3>${esc(p.name)}</h3>
          <div class="b-kind">${esc(p.kind)} · ${esc(p.org)} · ${esc(p.year)}</div>
          <p>${esc(p.desc)}</p>
          ${tags(p.stack)}
          <span class="b-stamp">${esc(p.status.split('//')[0].trim())}</span>
        </article>`).join('')}
    </div>
  </section>

  <section id="b-education" class="b-sec" data-name="MATERIAL CERTS" data-path="SHEET 05">
    ${head(5, 'Education', 'MATERIAL CERTIFICATES')}
    <div class="b-edu">
      ${EDUCATION.map((e, i) => `
        <div class="b-sheet b-rise">${frame}
          <div class="b-label">CERT ${pad(i + 1)}</div>
          <h3>${esc(e.title)}</h3>
          <div class="b-org">${esc(e.inst)}</div>
          <div class="b-meta">${esc(e.meta)}</div>
        </div>`).join('')}
    </div>
  </section>

  <section id="b-contact" class="b-sec b-contact" data-name="APPROVALS" data-path="SHEET 06">
    ${head(6, 'Contact', 'APPROVALS')}
    <div class="b-rise">
      <p class="b-big b-write"><span>Let’s build it.</span></p>
      <p class="b-lede">Drawings are ready for review. Send it over and let’s take the next one from sketch to production.</p>
      <div class="b-cta">${links.join('')}</div>
    </div>
    <table class="b-titleblock b-rise">
      <tr><td colspan="2" class="b-tb-name">${esc(PROFILE.name)}</td><td>DWG<b>HM-001</b></td></tr>
      <tr><td>TITLE<b>${esc(PROFILE.role)}</b></td><td>SCALE<b>1:1</b></td><td>REV<b>C</b></td></tr>
      <tr><td>DRAWN<b>H.M.M</b></td><td>SHEET<b>${pad(TOTAL)} / ${pad(TOTAL)}</b></td><td>DATE<b>${year}</b></td></tr>
    </table>
  </section>`;
}
