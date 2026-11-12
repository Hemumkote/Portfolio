// All portfolio content lives here — sourced from Hemantha_MM_CV.pdf.
// Edit this file to update the site.

export const PROFILE = {
  name: 'HEMANTHA M M',
  handle: 'hemantha',
  role: 'Software Engineer',
  tagline: 'Full-Stack // Mobile & Web Application Development',
  location: 'India',
  company: 'Brigosha',
  experience: '2 years 8 months',
  summary:
    'Full-Stack Developer with 2+ years of experience building mobile (React Native) and web (Next.js / React.js) applications. ' +
    'I architect mobile frontends, wire up state with Redux and Context API, ship backend APIs with FastAPI and PostgreSQL, ' +
    'and bring products to life in real time with WebSockets. Currently engineering the Aulas education platform at Brigosha — ' +
    'previously delivered a neighbourhood communication app and an internal employee benefits platform at Infanion, from concept to deployment.',
  resume: `${import.meta.env.BASE_URL}Hemantha_MM_CV.pdf`,
};

// Fill these in to show them on the site & in the terminal `contact` command.
// Empty values are hidden automatically.
export const CONTACT = {
  email: '',
  github: '',
  linkedin: '',
};

export const STATS = [
  { value: 2.8, suffix: '+', label: 'years shipping', decimals: 1 },
  { value: 3, suffix: '', label: 'products delivered', decimals: 0 },
  { value: 2, suffix: '', label: 'platforms // iOS + Android', decimals: 0 },
  { value: 8.1, suffix: '', label: 'CGPA // B.E. CSE', decimals: 1 },
];

export const SKILLS = [
  {
    group: 'frontend',
    path: '~/stack/frontend',
    items: [
      ['React Native', 92],
      ['Next.js', 85],
      ['React.js', 90],
      ['TypeScript', 84],
      ['JavaScript ES6+', 92],
      ['HTML5 / CSS3', 88],
    ],
  },
  {
    group: 'mobile',
    path: '~/stack/mobile',
    items: [
      ['iOS / Android', 88],
      ['React Navigation', 90],
      ['Axios', 90],
      ['Firebase', 80],
    ],
  },
  {
    group: 'state-ui',
    path: '~/stack/state-ui',
    items: [
      ['Redux', 88],
      ['Context API', 90],
      ['Tailwind CSS', 86],
      ['Responsive Design', 88],
    ],
  },
  {
    group: 'backend',
    path: '~/stack/backend',
    items: [
      ['FastAPI', 75],
      ['PostgreSQL', 74],
      ['SQL', 76],
      ['RESTful APIs', 88],
    ],
  },
  {
    group: 'realtime',
    path: '~/stack/realtime',
    items: [
      ['WebSockets', 84],
      ['Socket.io', 84],
      ['REST Integration', 92],
    ],
  },
  {
    group: 'tools',
    path: '~/stack/tools',
    items: [
      ['Git', 88],
      ['Agile', 85],
      ['Deployment Lifecycle', 82],
    ],
  },
];

// Flat list used for the orbiting 3D labels
export const SKILL_CLOUD = [
  'React Native', 'Next.js', 'React', 'TypeScript', 'JavaScript', 'Redux',
  'FastAPI', 'PostgreSQL', 'WebSockets', 'Socket.io', 'Firebase', 'Tailwind',
  'REST', 'Git', 'Context API', 'SQL', 'HTML5', 'CSS3',
];

export const EXPERIENCE = [
  {
    hash: 'a7f3c21',
    branch: 'HEAD -> main',
    role: 'Software Engineer',
    org: 'Brigosha',
    period: '05/2026 — present',
    project: 'Aulas — Education Platform',
    points: [
      'Building the Aulas education platform for digital learning and education workflows.',
      'Shipping mobile application features, UI implementation and API integration.',
      'Improving usability, maintainability and application performance on a live platform.',
    ],
    stack: ['React Native', 'React.js', 'TypeScript', 'REST'],
  },
  {
    hash: '4e19b0d',
    branch: 'feature/full-stack',
    role: 'Associate Software Engineer — Full Stack',
    org: 'Infanion Software Solutions',
    period: '11/2025 — 04/2026',
    project: 'Internal Employee Benefits Platform',
    points: [
      'Led development of the platform as development lead.',
      'Designed & engineered the end-to-end points management and redemption system.',
      'Defined the PostgreSQL data model for scalability and reliable transaction handling.',
    ],
    stack: ['Next.js', 'FastAPI', 'PostgreSQL', 'REST'],
  },
  {
    hash: '0c82d5e',
    branch: 'feature/mobile',
    role: 'Associate Software Engineer — Mobile',
    org: 'Infanion Software Solutions',
    period: '03/2024 — 11/2025',
    project: 'Mymmo — Neighbourhood Communication',
    points: [
      'Architected the mobile frontend for a cross-platform iOS / Android app.',
      'Implemented a real-time notification system using WebSockets.',
      'Owned the lifecycle from concept & design through deployment and maintenance.',
    ],
    stack: ['React Native', 'WebSockets', 'Redux', 'Firebase'],
  },
];

export const PROJECTS = [
  {
    id: 'aulas',
    name: 'Aulas',
    kind: 'Education Platform',
    org: 'Brigosha',
    status: 'RUNNING',
    year: '2026',
    desc: 'An education platform application powering digital learning and education-related workflows. Contributing mobile features, UI and API integrations to a live product.',
    stack: ['React Native', 'React.js', 'TypeScript', 'REST'],
  },
  {
    id: 'benefits',
    name: 'Benefits Core',
    kind: 'Internal Full-Stack Platform',
    org: 'Infanion',
    status: 'DEPLOYED',
    year: '2025—26',
    desc: 'Employee benefit points management & redemption. Led the build: complex API endpoints, backend logic and a PostgreSQL model designed for reliable transactions — streamlining admin workflows.',
    stack: ['Next.js', 'FastAPI', 'PostgreSQL', 'REST'],
  },
  {
    id: 'mymmo',
    name: 'Mymmo',
    kind: 'Neighbourhood Communication App',
    org: 'Infanion',
    status: 'SHIPPED // iOS + ANDROID',
    year: '2024—25',
    desc: 'Cross-platform app enabling information exchange across communities. Architected the mobile frontend and built real-time notifications over WebSockets, from concept to the stores.',
    stack: ['React Native', 'WebSockets', 'Redux', 'Firebase'],
  },
];

export const EDUCATION = [
  {
    title: 'B.E. — Computer Science',
    inst: 'Channabasaveshwara Institute of Technology',
    meta: '2023 // CGPA 8.1 / 10',
  },
  {
    title: 'Java Full Stack Certification',
    inst: 'Pentagon Space',
    meta: 'Full-Stack Java Development',
  },
];

// Keyboard theme: which physical key carries which technology.
// `code` is the KeyboardEvent.code, `skill` must match a name in SKILLS,
// `tag` (optional) is the name used in PROJECTS[].stack when it differs.
export const KEYCAPS = [
  { code: 'Space', short: 'React Native', skill: 'React Native' },
  { code: 'Enter', short: 'FastAPI', skill: 'FastAPI' },
  { code: 'KeyR', short: 'React', skill: 'React.js' },
  { code: 'KeyN', short: 'Next', skill: 'Next.js' },
  { code: 'KeyT', short: 'TS', skill: 'TypeScript' },
  { code: 'KeyJ', short: 'JS', skill: 'JavaScript ES6+' },
  { code: 'KeyH', short: 'HTML', skill: 'HTML5 / CSS3' },
  { code: 'KeyC', short: 'CSS', skill: 'HTML5 / CSS3' },
  { code: 'KeyI', short: 'iOS', skill: 'iOS / Android' },
  { code: 'KeyD', short: 'Droid', skill: 'iOS / Android' },
  { code: 'KeyV', short: 'Nav', skill: 'React Navigation' },
  { code: 'KeyA', short: 'Axios', skill: 'Axios' },
  { code: 'KeyF', short: 'Firebase', skill: 'Firebase' },
  { code: 'KeyX', short: 'Redux', skill: 'Redux' },
  { code: 'KeyK', short: 'Ctx', skill: 'Context API' },
  { code: 'KeyL', short: 'TW', skill: 'Tailwind CSS' },
  { code: 'KeyU', short: 'RWD', skill: 'Responsive Design' },
  { code: 'KeyP', short: 'PG', skill: 'PostgreSQL' },
  { code: 'KeyQ', short: 'SQL', skill: 'SQL' },
  { code: 'KeyE', short: 'REST', skill: 'RESTful APIs', tag: 'REST' },
  { code: 'KeyW', short: 'WS', skill: 'WebSockets' },
  { code: 'KeyS', short: 'S.io', skill: 'Socket.io' },
  { code: 'KeyG', short: 'Git', skill: 'Git' },
  { code: 'KeyY', short: 'Agile', skill: 'Agile' },
  { code: 'KeyO', short: 'Ops', skill: 'Deployment Lifecycle' },
];
