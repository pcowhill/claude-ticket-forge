import type { ForgedTicket } from '../../shared/schemas'

// Fully deterministic, hand-authored OrbitOps demo payloads.
// These are what "Scripted Demo Mode" returns regardless of exact input,
// so the presentation path can never break.

export const SCRIPTED_INITIAL_TICKET: ForgedTicket = {
  status: 'needs_clarification',
  ticketType: 'bug',
  title: 'Readiness Board shows all-green after checklist edit despite a blocked subsystem item',
  summary:
    'After editing a subsystem checklist and returning to the Readiness Board, the board rolls up ' +
    'to green even though at least one checklist item is still blocked. Mission reviewers could ' +
    'sign off on a false all-green status.',
  fields: [
    {
      id: 'user_impact',
      label: 'User Impact',
      value:
        'Mission reviewers see a green Readiness Board while a subsystem item is actually blocked, ' +
        'risking a signoff against misleading readiness status. High impact for readiness reviews.',
      required: true,
      confidence: 0.85,
      quality: 'solid',
      reason: 'Impact is explicit in the intake and matches a known OrbitOps risk (misleading readiness status).',
      source: 'raw_intake',
    },
    {
      id: 'steps_to_reproduce',
      label: 'Steps to Reproduce',
      value:
        '1. Open a Subsystem Checklist and edit it (exact item and edit type unknown).\n' +
        '2. Navigate back to the Readiness Board.\n' +
        '3. Board shows green despite a blocked checklist item.',
      required: true,
      confidence: 0.45,
      quality: 'needs_confirmation',
      reason: 'Sequence is described, but the blocked item, the kind of edit, and refresh behavior are unknown.',
      source: 'raw_intake',
    },
    {
      id: 'expected_behavior',
      label: 'Expected Behavior',
      value:
        'The Readiness Board must never roll up to green while any subsystem checklist item is blocked ' +
        '(OrbitOps invariant).',
      required: true,
      confidence: 0.9,
      quality: 'solid',
      reason: 'Directly backed by a notable constraint in the OrbitOps repo brief.',
      source: 'repo_context',
    },
    {
      id: 'actual_behavior',
      label: 'Actual Behavior',
      value: 'Board displays all-green after returning from a checklist edit while one item remains blocked.',
      required: true,
      confidence: 0.8,
      quality: 'solid',
      reason: 'Stated plainly in the raw intake.',
      source: 'raw_intake',
    },
    {
      id: 'affected_area',
      label: 'Affected Area',
      value:
        'Readiness Board rollup, likely the client readiness store after a Subsystem Checklist edit. ' +
        'Could also be the readiness API returning stale data.',
      required: true,
      confidence: 0.55,
      quality: 'needs_confirmation',
      reason: 'Repo context maps the terms to the readiness feature, but client-state vs. server-data is unresolved.',
      source: 'repo_context',
    },
    {
      id: 'environment',
      label: 'Environment',
      value: '',
      required: false,
      confidence: 0.2,
      quality: 'not_applicable',
      reason: 'Internal evergreen-Chromium tool; environment is unlikely to matter unless repro says otherwise.',
      source: 'inferred',
    },
    {
      id: 'constraints_notes',
      label: 'Constraints & Hypotheses',
      value:
        'Speculation: readiness store rollup may not be invalidated after checklist edits, ' +
        'leaving stale state when navigating back to the board.',
      required: false,
      confidence: 0.35,
      quality: 'speculative',
      reason: 'Matches the "stale frontend state" risk area, but no evidence yet distinguishes it from an API issue.',
      source: 'inferred',
    },
    {
      id: 'test_plan',
      label: 'Test Plan',
      value: '',
      required: true,
      confidence: 0.1,
      quality: 'missing',
      reason: 'Cannot write a meaningful regression plan until the trigger and affected item are confirmed.',
      source: 'inferred',
    },
  ],
  assumptions: [
    'The blocked item was blocked before the edit and never actually cleared.',
    '"Dashboard" in the intake refers to the Readiness Board.',
    'Single-user scenario; no concurrent checklist edits involved.',
  ],
  likelyAffectedFiles: [
    'src/features/readiness/ReadinessBoard.tsx',
    'src/state/readinessStore.ts',
    'src/features/checklists/SubsystemChecklist.tsx',
  ],
  suggestedLabels: ['bug', 'frontend', 'state-management', 'mission-readiness', 'needs-repro'],
  clarifyingQuestions: [
    'Which subsystem checklist item was blocked?',
    'Did refreshing the page change the board status?',
    'Did this happen after editing an existing checklist item or creating a new one?',
  ],
  readinessScore: 62,
  readinessBlockers: [
    'Reproduction steps are incomplete: exact item and edit type unknown.',
    'Affected area unresolved between stale client state and stale API data.',
    'No test plan yet — regression coverage undefined.',
  ],
  whatImproved: [],
  repoContextMatches: [
    {
      term: 'readiness board',
      matchedTo: 'src/features/readiness/ReadinessBoard.tsx',
      note: 'Recognized from OrbitOps domain vocabulary as the mission-level rollup dashboard.',
    },
    {
      term: 'subsystem checklist',
      matchedTo: 'src/features/checklists/SubsystemChecklist.tsx',
      note: 'Mapped to the checklist editing feature; edits feed the board rollup.',
    },
    {
      term: 'dashboard',
      matchedTo: 'Readiness Board',
      note: 'Repo vocabulary marks "dashboard" as the colloquial name for the Readiness Board.',
    },
    {
      term: 'green / blocked status',
      matchedTo: 'src/state/readinessStore.ts',
      note: 'Rollup status derives from the readiness store — a known stale-state risk area.',
    },
  ],
}

export const SCRIPTED_REFINED_TICKET: ForgedTicket = {
  status: 'ticket',
  ticketType: 'bug',
  title:
    'Readiness Board rollup shows stale all-green after editing notes on a blocked checklist item',
  summary:
    'Editing the notes of an existing, still-blocked checklist item (Thermal Control > Valve Calibration) ' +
    'and navigating back to the Readiness Board leaves the board showing all-green. A hard refresh shows ' +
    'blocked correctly, isolating the fault to stale client-side rollup state rather than API data.',
  fields: [
    {
      id: 'user_impact',
      label: 'User Impact',
      value:
        'Mission reviewers see a green Readiness Board while Thermal Control > Valve Calibration is blocked, ' +
        'risking a signoff against misleading readiness status. High impact for readiness reviews.',
      required: true,
      confidence: 0.92,
      quality: 'solid',
      reason: 'Impact confirmed and now tied to a specific blocked subsystem item.',
      source: 'clarification',
    },
    {
      id: 'steps_to_reproduce',
      label: 'Steps to Reproduce',
      value:
        '1. Ensure "Thermal Control > Valve Calibration" is in the Blocked state.\n' +
        '2. Open the Subsystem Checklist and edit that existing item’s notes (no state change).\n' +
        '3. Navigate back to the Readiness Board without refreshing.\n' +
        '4. Observe the board rolls up to all-green.\n' +
        '5. Hard-refresh the page — the board now correctly shows blocked.',
      required: true,
      confidence: 0.9,
      quality: 'solid',
      reason: 'Clarification pinned the exact item, the edit type (notes on an existing item), and refresh behavior.',
      source: 'clarification',
    },
    {
      id: 'expected_behavior',
      label: 'Expected Behavior',
      value:
        'The Readiness Board must never roll up to green while any subsystem checklist item is blocked ' +
        '(OrbitOps invariant).',
      required: true,
      confidence: 0.9,
      quality: 'solid',
      reason: 'Directly backed by a notable constraint in the OrbitOps repo brief.',
      source: 'repo_context',
    },
    {
      id: 'actual_behavior',
      label: 'Actual Behavior',
      value:
        'After the notes edit, the board displays all-green until a full page refresh, which restores the ' +
        'correct blocked status.',
      required: true,
      confidence: 0.92,
      quality: 'solid',
      reason: 'Refresh behavior confirmed via clarification; before/after states are now precise.',
      source: 'clarification',
    },
    {
      id: 'affected_area',
      label: 'Affected Area',
      value:
        'Client-side readiness rollup: readinessStore state consumed by ReadinessBoard. Refresh correcting the ' +
        'board rules out stale API data — the server has the right state.',
      required: true,
      confidence: 0.88,
      quality: 'solid',
      reason: 'The refresh experiment discriminates client state from server data, resolving the earlier ambiguity.',
      source: 'clarification',
    },
    {
      id: 'environment',
      label: 'Environment',
      value: '',
      required: false,
      confidence: 0.2,
      quality: 'not_applicable',
      reason: 'Internal evergreen-Chromium tool; client-state bug is environment-independent.',
      source: 'inferred',
    },
    {
      id: 'constraints_notes',
      label: 'Constraints & Hypotheses',
      value:
        'Editing an existing item’s notes likely triggers a store update path that rebuilds or overwrites ' +
        'rollup state without re-reading item block status. Board must never show green while an item is ' +
        'blocked — treat as high-impact.',
      required: false,
      confidence: 0.75,
      quality: 'solid',
      reason: 'Hypothesis is now grounded: refresh-corrects behavior plus the known stale-frontend-state risk area.',
      source: 'inferred',
    },
    {
      id: 'test_plan',
      label: 'Test Plan',
      value:
        '- Vitest: unit-test readinessStore rollup after a notes-only edit to a blocked item (must stay blocked).\n' +
        '- Vitest: rollup recomputes when returning to the board after any checklist mutation.\n' +
        '- Playwright: extend tests/e2e/readiness-board.spec.ts — block an item, edit its notes, return to the ' +
        'board without refresh, assert board shows blocked.',
      required: true,
      confidence: 0.85,
      quality: 'solid',
      reason: 'Confirmed repro makes a concrete regression plan possible across unit and E2E layers.',
      source: 'clarification',
    },
  ],
  assumptions: [
    'The Valve Calibration item stayed blocked server-side throughout (supported by refresh showing blocked).',
    'Notes-only edits are representative; other no-state-change edits likely share the same path.',
  ],
  likelyAffectedFiles: [
    'src/state/readinessStore.ts',
    'src/features/readiness/ReadinessBoard.tsx',
    'src/features/checklists/SubsystemChecklist.tsx',
    'tests/e2e/readiness-board.spec.ts',
  ],
  suggestedLabels: ['bug', 'frontend', 'state-management', 'mission-readiness', 'high-impact'],
  clarifyingQuestions: [],
  readinessScore: 88,
  readinessBlockers: [
    'Exact store action that skips rollup invalidation still needs identification during fix investigation.',
  ],
  whatImproved: [
    'Reproduction is now exact: blocked item (Thermal Control > Valve Calibration), edit type (notes on an existing item), and navigation path are all pinned down.',
    'Affected area narrowed to client-side readinessStore rollup — the refresh experiment ruled out stale API data.',
    'Likely files sharpened: readinessStore.ts promoted to primary suspect; E2E spec added for regression coverage.',
    'Test plan went from missing to a concrete Vitest + Playwright regression plan.',
    'Labels upgraded: needs-repro dropped, high-impact added now that the invariant violation is confirmed.',
  ],
  repoContextMatches: [
    {
      term: 'readiness board',
      matchedTo: 'src/features/readiness/ReadinessBoard.tsx',
      note: 'Recognized from OrbitOps domain vocabulary as the mission-level rollup dashboard.',
    },
    {
      term: 'subsystem checklist',
      matchedTo: 'src/features/checklists/SubsystemChecklist.tsx',
      note: 'Mapped to the checklist editing feature; edits feed the board rollup.',
    },
    {
      term: 'Thermal Control > Valve Calibration',
      matchedTo: 'Subsystem Checklist item',
      note: 'Clarified blocked item; anchors the reproduction steps.',
    },
    {
      term: 'refresh corrects the board',
      matchedTo: 'src/state/readinessStore.ts',
      note: 'Matches the "stale frontend state after checklist edits" risk area from the repo brief.',
    },
  ],
}

// Progress steps shown while "forging" in scripted and mock modes.
export const FORGE_PROGRESS_STEPS = [
  'Interpreting rough request',
  'Applying repo context',
  'Mapping to ticket template',
  'Checking readiness',
] as const

export const REFINE_PROGRESS_STEPS = [
  'Merging clarification answers',
  'Re-checking repo context',
  'Upgrading field confidence',
  'Re-scoring readiness',
] as const
