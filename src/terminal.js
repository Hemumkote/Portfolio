import { PROFILE, CONTACT, SKILLS, EXPERIENCE, PROJECTS, EDUCATION } from './data.js';

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function initTerminal({ onTheme, onMatrix, onGlitch }) {
  const out = document.getElementById('term-out');
  const input = document.getElementById('term-input');
  const history = [];
  let hIdx = 0;

  const printNow = (html, cls = '') => {
    const line = document.createElement('div');
    line.className = `tl ${cls}`;
    line.innerHTML = html;
    out.append(line);
    out.scrollTop = out.scrollHeight;
  };
  // stream multiple lines with a small delay, feels like real output
  const print = (html, cls = '') => stream([html], cls);
  // queued so output from back-to-back commands never interleaves
  let queue = Promise.resolve();
  const stream = (lines, cls = '') =>
    (queue = queue.then(async () => {
      for (const l of lines) {
        printNow(l, cls);
        await new Promise((r) => setTimeout(r, 28));
      }
    }));

  const links = Object.entries(CONTACT).filter(([, v]) => v);

  const COMMANDS = {
    help: () =>
      stream([
        '<span class="acc">available commands:</span>',
        ...[
          ['whoami', 'who is behind this terminal'],
          ['about', 'professional summary'],
          ['skills', 'list the tech stack'],
          ['experience', 'career commit log'],
          ['projects', 'deployed systems'],
          ['education', 'training data'],
          ['contact', 'open a channel'],
          ['resume', 'download resume.pdf'],
          ['goto &lt;section&gt;', 'jump to a section'],
          ['theme [name]', 'matrix | cyber | amber | neon'],
          ['matrix', 'toggle overdrive rain'],
          ['clear', 'clear the screen'],
        ].map(([c, d]) => `  <b>${c.padEnd(18, ' ').replace(/ /g, '&nbsp;')}</b><span class="dim">${d}</span>`),
      ]),
    whoami: () => stream([`<b>${esc(PROFILE.name)}</b> — ${esc(PROFILE.role)}`, `<span class="dim">${esc(PROFILE.tagline)}</span>`]),
    about: () => stream([esc(PROFILE.summary)]),
    skills: () =>
      stream(SKILLS.map((g) => `<span class="acc">${esc(g.path)}/</span> ${g.items.map(([n]) => esc(n)).join(' · ')}`)),
    experience: () =>
      stream(
        EXPERIENCE.flatMap((e) => [
          `<span class="warn">* ${e.hash}</span> <b>${esc(e.role)}</b> @ ${esc(e.org)} <span class="dim">(${esc(e.period)})</span>`,
          `<span class="dim">|  ${esc(e.project)}</span>`,
        ])
      ),
    projects: () =>
      stream(PROJECTS.map((p) => `<span class="acc">[${esc(p.status)}]</span> <b>${esc(p.name)}</b> — ${esc(p.kind)} <span class="dim">{${p.stack.map(esc).join(', ')}}</span>`)),
    education: () => stream(EDUCATION.map((e) => `<b>${esc(e.title)}</b> — ${esc(e.inst)} <span class="dim">${esc(e.meta)}</span>`)),
    contact: () =>
      stream([
        ...(links.length
          ? links.map(([k, v]) => `${k.padEnd(9, ' ').replace(/ /g, '&nbsp;')}→ <a href="${k === 'email' ? 'mailto:' + esc(v) : esc(v)}" target="_blank" rel="noopener">${esc(v)}</a>`)
          : ['<span class="dim">contact links not configured yet — grab the resume below.</span>']),
        `resume&nbsp;&nbsp;&nbsp;→ <a href="${PROFILE.resume}" download>resume.pdf</a>`,
      ]),
    resume: () => {
      const a = document.createElement('a');
      a.href = PROFILE.resume;
      a.download = '';
      a.click();
      return stream(['<span class="ok">downloading resume.pdf ... done</span>']);
    },
    goto: (arg) => {
      const map = { about: 'about', whoami: 'about', skills: 'skills', stack: 'skills', experience: 'experience', log: 'experience', projects: 'projects', education: 'education', edu: 'education', contact: 'contact', home: 'hero', top: 'hero' };
      const id = map[(arg || '').toLowerCase()];
      if (!id) return print(`goto: unknown section '${esc(arg || '')}'`, 'err');
      document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
      print(`<span class="dim">jumping to /${id} ...</span>`);
    },
    theme: (arg) => {
      const name = onTheme(arg);
      print(name ? `theme → <span class="acc">${name}</span>` : `theme: unknown '${esc(arg)}'`, name ? '' : 'err');
    },
    matrix: () => print(onMatrix() ? '<span class="acc">overdrive engaged. wake up...</span>' : 'overdrive disengaged.'),
    clear: () => (queue = queue.then(() => (out.innerHTML = ''))),
    ls: () => print('about.md&nbsp;&nbsp;stack/&nbsp;&nbsp;career.log&nbsp;&nbsp;projects/&nbsp;&nbsp;education.txt&nbsp;&nbsp;<span class="acc">resume.pdf</span>'),
    pwd: () => print('/home/hemantha/portfolio'),
    date: () => print(new Date().toString()),
    echo: (...a) => print(esc(a.join(' '))),
    sudo: () => {
      onGlitch();
      print('<span class="err">[sudo] nice try. this incident will be reported.</span>');
    },
    hire: () => COMMANDS.contact(),
    exit: () => print('<span class="dim">there is no exit. only scroll.</span>'),
  };
  COMMANDS.cat = (f) => {
    if (!f) return print('cat: missing operand', 'err');
    if (/about/.test(f)) return COMMANDS.about();
    if (/edu/.test(f)) return COMMANDS.education();
    if (/career|log/.test(f)) return COMMANDS.experience();
    if (/resume/.test(f)) return print('<span class="dim">binary file. try `resume` instead.</span>');
    print(`cat: ${esc(f)}: No such file or directory`, 'err');
  };

  const run = (raw) => {
    const line = raw.trim();
    print(`<span class="acc">guest@${PROFILE.handle}</span>:<span class="h">~</span>$ ${esc(line)}`, 'cmd');
    if (!line) return;
    history.push(line);
    hIdx = history.length;
    const [cmd, ...args] = line.split(/\s+/);
    const fn = COMMANDS[cmd.toLowerCase()];
    if (fn) fn(...args);
    else print(`zsh: command not found: ${esc(cmd)} <span class="dim">— try 'help'</span>`, 'err');
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      run(input.value);
      input.value = '';
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hIdx > 0) input.value = history[--hIdx];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hIdx = Math.min(history.length, hIdx + 1);
      input.value = history[hIdx] || '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const v = input.value.toLowerCase();
      const m = Object.keys(COMMANDS).filter((c) => c.startsWith(v));
      if (m.length === 1) input.value = m[0] + ' ';
      else if (m.length > 1) print(m.join('&nbsp;&nbsp;'), 'dim');
    }
  });
  out.closest('.term-live').addEventListener('click', () => input.focus({ preventScroll: true }));

  // greeting is streamed when the terminal scrolls into view
  let greeted = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !greeted) {
      greeted = true;
      stream([
        `<span class="dim">Last login: ${new Date().toUTCString()} on ttys001</span>`,
        `connection established → <span class="acc">${PROFILE.handle}.dev</span> <span class="ok">[encrypted]</span>`,
        `type <b>help</b> to list commands. <span class="dim">(tab completes, ↑ ↓ history)</span>`,
      ]);
    }
  }, { threshold: 0.4 }).observe(out);

  return { focus: () => input.focus() };
}
