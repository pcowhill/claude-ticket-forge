import type { ForgeRequest, RefineRequest } from '../shared/schemas'

// Hand-maintained JSON Schema mirroring forgedTicketSchema in shared/schemas.ts.
// Sent to providers as the structured-output contract; responses are still
// validated with Zod before anything reaches the frontend.
export const TICKET_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'status',
    'ticketType',
    'title',
    'summary',
    'fields',
    'assumptions',
    'likelyAffectedFiles',
    'suggestedLabels',
    'clarifyingQuestions',
    'readinessScore',
    'readinessBlockers',
    'whatImproved',
    'repoContextMatches',
  ],
  properties: {
    status: { type: 'string', enum: ['ticket', 'needs_clarification', 'unsupported'] },
    ticketType: { type: 'string' },
    title: { type: 'string' },
    summary: { type: 'string' },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'label', 'value', 'required', 'confidence', 'quality', 'reason', 'source'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          value: { type: 'string' },
          required: { type: 'boolean' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          quality: {
            type: 'string',
            enum: ['missing', 'speculative', 'needs_confirmation', 'solid', 'not_applicable'],
          },
          reason: { type: 'string' },
          source: {
            type: 'string',
            enum: ['raw_intake', 'repo_context', 'clarification', 'inferred', 'manual'],
          },
        },
      },
    },
    assumptions: { type: 'array', items: { type: 'string' } },
    likelyAffectedFiles: { type: 'array', items: { type: 'string' } },
    suggestedLabels: { type: 'array', items: { type: 'string' } },
    clarifyingQuestions: { type: 'array', items: { type: 'string' } },
    readinessScore: { type: 'number', minimum: 0, maximum: 100 },
    readinessBlockers: { type: 'array', items: { type: 'string' } },
    whatImproved: { type: 'array', items: { type: 'string' } },
    repoContextMatches: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['term', 'matchedTo', 'note'],
        properties: {
          term: { type: 'string' },
          matchedTo: { type: 'string' },
          note: { type: 'string' },
        },
      },
    },
  },
} as const

function templateSection(req: ForgeRequest): string {
  const fields = req.template.fields
    .map(
      (f) =>
        `- id: "${f.id}" | label: "${f.label}" | ${f.required ? 'REQUIRED' : 'optional'}\n  instructions: ${f.instructions || '(none)'}`,
    )
    .join('\n')
  return `TICKET TEMPLATE: ${req.template.name} (type: ${req.template.ticketType})\n${req.template.description}\n\nFields (produce exactly these, same ids and labels, in this order):\n${fields}`
}

function briefSection(req: ForgeRequest): string {
  if (!req.repoBrief) {
    return 'REPO CONTEXT: none active. Do not invent repository-specific details, file paths, or vocabulary.'
  }
  return `REPO CONTEXT (Repo Brief for "${req.repoBrief.projectName}"): use this to resolve domain vocabulary, infer affected areas/files, suggest labels from routing hints, and judge readiness against the definition-of-ready hints.\n\n${JSON.stringify(req.repoBrief, null, 2)}`
}

export function buildSystemPrompt(req: ForgeRequest): string {
  return `You are TicketForge, an engineering ticket-intake analyst. You convert messy raw intake into a structured, honestly-graded engineering ticket.

${templateSection(req)}

${briefSection(req)}

GRADING RULES — be strict and honest:
- Every template field becomes one entry in "fields" with the exact field id and label from the template.
- confidence is 0..1. quality is one of: missing, speculative, needs_confirmation, solid, not_applicable.
- Never fabricate details. If the intake does not support a field, leave value empty and mark it missing (required) or not_applicable (optional, irrelevant).
- Mark inferences as speculative or needs_confirmation, with source "inferred" or "repo_context".
- "reason" must explain the grade in one sentence. "source" records where the value came from.
- Only claim repo context matches for terms actually present in the intake AND grounded in the repo brief.
- readinessScore (0-100) reflects how actionable the ticket is against the definition-of-ready hints.
- List concrete readinessBlockers for anything below solid on required fields.
- Ask at most 4 clarifyingQuestions, targeting the weakest required fields; [] if none needed.
- status: "needs_clarification" if clarifying questions exist, "unsupported" if the intake is not an actionable engineering request, otherwise "ticket".
- Respond ONLY with the structured object matching the provided schema. No prose.`
}

export function buildForgeUserPrompt(req: ForgeRequest): string {
  return `RAW INTAKE:\n"""\n${req.rawIntake}\n"""\n\nForge the structured ticket now. Set whatImproved to [] (this is the first pass).`
}

export function buildRefineUserPrompt(req: RefineRequest): string {
  const answers = req.clarificationAnswers
    .map((a, i) => `${i + 1}. Q: ${a.question}\n   A: ${a.answer || '(no answer given)'}`)
    .join('\n')
  return `RAW INTAKE:\n"""\n${req.rawIntake}\n"""\n\nPREVIOUS TICKET (your earlier first pass):\n${JSON.stringify(req.previousTicket, null, 2)}\n\nCLARIFICATION ANSWERS:\n${answers}\n\nRefine the ticket now:
- Merge the answers into the affected fields, upgrading quality/confidence where the answers justify it (source: "clarification").
- Recompute readinessScore; it should rise if the answers resolved blockers.
- Populate whatImproved with concrete statements about what got stronger and why.
- Drop clarifying questions that were answered; keep or add only questions that still block readiness.`
}

export function buildRepairPrompt(rawOutput: string, validationErrors: string): string {
  return `Your previous response failed schema validation and could not be used.

VALIDATION ERRORS:\n${validationErrors}\n\nPREVIOUS RESPONSE:\n${rawOutput.slice(0, 6000)}\n\nReturn the SAME ticket content, corrected to satisfy the schema exactly. Respond only with the structured object.`
}
