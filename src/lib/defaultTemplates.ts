import type { TicketTemplate } from '../../shared/schemas'

export const DEFAULT_TEMPLATES: TicketTemplate[] = [
  {
    id: 'bug-report',
    name: 'Bug Report',
    ticketType: 'bug',
    description: 'Defects and regressions. Optimized for fast, confident triage.',
    fields: [
      {
        id: 'user_impact',
        label: 'User Impact',
        instructions: 'Who is affected and what goes wrong for them, in domain terms. State severity honestly.',
        required: true,
      },
      {
        id: 'steps_to_reproduce',
        label: 'Steps to Reproduce',
        instructions: 'Numbered, concrete steps from a clean state. Name exact screens, items, and actions.',
        required: true,
      },
      {
        id: 'expected_behavior',
        label: 'Expected Behavior',
        instructions: 'What should have happened, referencing product rules where possible.',
        required: true,
      },
      {
        id: 'actual_behavior',
        label: 'Actual Behavior',
        instructions: 'What actually happened, including any error text or wrong values observed.',
        required: true,
      },
      {
        id: 'affected_area',
        label: 'Affected Area',
        instructions: 'The feature area, module, or subsystem where the defect lives. Use repo vocabulary.',
        required: true,
      },
      {
        id: 'environment',
        label: 'Environment',
        instructions: 'Browser/OS/build if relevant. Leave empty for internal evergreen tools.',
        required: false,
      },
      {
        id: 'constraints_notes',
        label: 'Constraints & Hypotheses',
        instructions: 'Known constraints, suspected causes, or debugging notes. Mark speculation as such.',
        required: false,
      },
      {
        id: 'test_plan',
        label: 'Test Plan',
        instructions: 'How the fix will be verified: unit coverage plus regression tests for user-visible bugs.',
        required: true,
      },
    ],
  },
  {
    id: 'feature-request',
    name: 'Feature Request',
    ticketType: 'feature',
    description: 'New capability or enhancement with clear acceptance criteria.',
    fields: [
      {
        id: 'problem_statement',
        label: 'Problem Statement',
        instructions: 'The user problem or gap this feature addresses. Not the solution.',
        required: true,
      },
      {
        id: 'proposed_solution',
        label: 'Proposed Solution',
        instructions: 'The intended behavior change, at the level of user-visible outcomes.',
        required: true,
      },
      {
        id: 'acceptance_criteria',
        label: 'Acceptance Criteria',
        instructions: 'Bullet list of verifiable conditions that define done.',
        required: true,
      },
      {
        id: 'affected_area',
        label: 'Affected Area',
        instructions: 'Feature areas and modules this will touch. Use repo vocabulary.',
        required: true,
      },
      {
        id: 'out_of_scope',
        label: 'Out of Scope',
        instructions: 'Explicit non-goals to prevent scope creep.',
        required: false,
      },
      {
        id: 'success_metrics',
        label: 'Success Metrics',
        instructions: 'How we will know the feature worked, if measurable.',
        required: false,
      },
    ],
  },
  {
    id: 'research-spike',
    name: 'Research Spike',
    ticketType: 'spike',
    description: 'Timeboxed investigation producing a decision or document, not shipped code.',
    fields: [
      {
        id: 'research_question',
        label: 'Research Question',
        instructions: 'The single question this spike must answer.',
        required: true,
      },
      {
        id: 'context_motivation',
        label: 'Context & Motivation',
        instructions: 'Why this question matters now and what decision hangs on it.',
        required: true,
      },
      {
        id: 'investigation_plan',
        label: 'Investigation Plan',
        instructions: 'Concrete steps: what to prototype, measure, or read.',
        required: true,
      },
      {
        id: 'timebox',
        label: 'Timebox',
        instructions: 'Maximum time to spend before reporting back, e.g. "2 days".',
        required: true,
      },
      {
        id: 'deliverables',
        label: 'Deliverables',
        instructions: 'What artifact ends the spike: a written recommendation, prototype, or benchmark.',
        required: true,
      },
      {
        id: 'decision_criteria',
        label: 'Decision Criteria',
        instructions: 'How the findings will be judged (thresholds, tradeoffs that matter).',
        required: false,
      },
      {
        id: 'risks',
        label: 'Risks',
        instructions: 'Ways the spike could mislead us or fail to converge.',
        required: false,
      },
    ],
  },
]
