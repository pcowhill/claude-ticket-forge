import type { RepoBrief } from '../../shared/schemas'

// Preloaded scripted repo brief for the fictional internal engineering tool
// "OrbitOps Readiness Tracker". This is the context the scripted demo leans on.
export const ORBITOPS_BRIEF: RepoBrief = {
  projectName: 'OrbitOps Readiness Tracker',
  stack: ['Vite', 'React', 'TypeScript', 'Node.js', 'Express', 'Vitest', 'Playwright'],
  architectureSummary:
    'Internal engineering tool for tracking mission/readiness tasks. A Vite + React + TypeScript ' +
    'frontend renders a Readiness Board fed by a client-side readiness store; a Node/Express API ' +
    'persists subsystem checklists and signoffs. Board status is a rollup computed from subsystem ' +
    'checklist item states.',
  keyDirectories: [
    { path: 'src/features/readiness/', purpose: 'Readiness Board UI and rollup rendering' },
    { path: 'src/features/checklists/', purpose: 'Subsystem Checklist editing views' },
    { path: 'src/state/', purpose: 'Client stores, including readinessStore rollup logic' },
    { path: 'src/api/', purpose: 'Express API client wrappers' },
    { path: 'tests/e2e/', purpose: 'Playwright end-to-end coverage' },
  ],
  mainUserWorkflows: [
    'Review overall mission status on the Readiness Board',
    'Work through Subsystem Checklist items and update their state',
    'File anomalies through the Anomaly Intake Panel',
    'Approve readiness via the Review Signoff Flow',
  ],
  domainVocabulary: [
    { term: 'readiness board', meaning: 'Dashboard rolling up subsystem states into a mission-level status' },
    { term: 'subsystem checklist', meaning: 'Per-subsystem list of readiness items (e.g. Thermal Control)' },
    { term: 'blocked item', meaning: 'A checklist item that prevents its subsystem from going green' },
    { term: 'rollup', meaning: 'Derived board status computed from all checklist item states' },
    { term: 'signoff', meaning: 'Reviewer approval recorded in the Review Signoff Flow' },
    { term: 'anomaly', meaning: 'An unexpected condition filed via the Anomaly Intake Panel' },
    { term: 'dashboard', meaning: 'Colloquial name for the Readiness Board' },
  ],
  ticketRoutingHints: [
    'Board/rollup display issues route to the frontend readiness feature team',
    'Checklist state persistence issues route to the API team',
    'Use labels: bug, frontend, state-management, mission-readiness, needs-repro, high-impact',
  ],
  testCommands: ['npm run test (Vitest)', 'npm run e2e (Playwright)'],
  buildCommands: ['npm run build'],
  definitionOfReadyHints: [
    'States user impact in mission terms',
    'Includes concrete reproduction steps',
    'Includes expected vs. actual behavior',
    'Names the affected area/subsystem',
    'Notes constraints or environment factors',
    'Includes a test plan covering regression risk',
  ],
  definitionOfDoneHints: [
    'Fix verified against reproduction steps',
    'Unit coverage added for rollup/state logic changes',
    'Playwright regression added for board-visible bugs',
  ],
  commonRiskAreas: [
    'Stale frontend state after checklist edits',
    'Incorrect rollup logic on the Readiness Board',
    'Misleading readiness status shown to mission reviewers',
    'Missed regression coverage for board state transitions',
  ],
  notableConstraints: [
    'Board must never show green while any checklist item is blocked',
    'Internal tool: desktop-first, evergreen Chromium only',
  ],
  likelyAffectedAreas: [
    {
      area: 'Readiness Board',
      files: ['src/features/readiness/ReadinessBoard.tsx', 'src/state/readinessStore.ts'],
    },
    {
      area: 'Subsystem Checklist',
      files: ['src/features/checklists/SubsystemChecklist.tsx', 'src/state/readinessStore.ts'],
    },
    { area: 'Readiness API', files: ['src/api/readiness.ts'] },
    { area: 'E2E coverage', files: ['tests/e2e/readiness-board.spec.ts'] },
  ],
}

export const ORBITOPS_LABELS = [
  'bug',
  'frontend',
  'state-management',
  'mission-readiness',
  'needs-repro',
  'high-impact',
]

export const DEMO_INTAKE =
  'The readiness board says everything is green even though one of the subsystem checklist ' +
  'items is still blocked. It happened after I edited the checklist and came back to the dashboard.'

export const DEMO_ANSWERS = [
  'Thermal Control > Valve Calibration remained blocked.',
  'Refreshing the page made the board show blocked correctly.',
  "It happened after editing an existing checklist item's notes and returning to the dashboard.",
]
