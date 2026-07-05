import { z } from 'zod'

// ---------------------------------------------------------------------------
// Ticket field metadata
// ---------------------------------------------------------------------------

export const fieldQualitySchema = z.enum([
  'missing',
  'speculative',
  'needs_confirmation',
  'solid',
  'not_applicable',
])
export type FieldQuality = z.infer<typeof fieldQualitySchema>

export const fieldSourceSchema = z.enum([
  'raw_intake',
  'repo_context',
  'clarification',
  'inferred',
  'manual',
])
export type FieldSource = z.infer<typeof fieldSourceSchema>

export const ticketFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.string(),
  required: z.boolean(),
  confidence: z.number().min(0).max(1),
  quality: fieldQualitySchema,
  reason: z.string(),
  source: fieldSourceSchema,
})
export type TicketField = z.infer<typeof ticketFieldSchema>

// ---------------------------------------------------------------------------
// Forged ticket
// ---------------------------------------------------------------------------

export const ticketStatusSchema = z.enum(['ticket', 'needs_clarification', 'unsupported'])
export type TicketStatus = z.infer<typeof ticketStatusSchema>

export const repoContextMatchSchema = z.object({
  term: z.string(),
  matchedTo: z.string(),
  note: z.string(),
})
export type RepoContextMatch = z.infer<typeof repoContextMatchSchema>

export const forgedTicketSchema = z.object({
  status: ticketStatusSchema,
  ticketType: z.string(),
  title: z.string(),
  summary: z.string(),
  fields: z.array(ticketFieldSchema),
  assumptions: z.array(z.string()),
  likelyAffectedFiles: z.array(z.string()),
  suggestedLabels: z.array(z.string()),
  clarifyingQuestions: z.array(z.string()),
  readinessScore: z.number().min(0).max(100),
  readinessBlockers: z.array(z.string()),
  whatImproved: z.array(z.string()),
  repoContextMatches: z.array(repoContextMatchSchema),
})
export type ForgedTicket = z.infer<typeof forgedTicketSchema>

// ---------------------------------------------------------------------------
// Repo Brief — reusable repository context produced by a Claude Code scan
// ---------------------------------------------------------------------------

export const keyDirectorySchema = z.object({
  path: z.string(),
  purpose: z.string(),
})

export const vocabularyEntrySchema = z.object({
  term: z.string(),
  meaning: z.string(),
})

export const affectedAreaSchema = z.object({
  area: z.string(),
  files: z.array(z.string()),
})

export const repoBriefSchema = z.object({
  projectName: z.string().min(1),
  stack: z.array(z.string()),
  architectureSummary: z.string(),
  keyDirectories: z.array(keyDirectorySchema),
  mainUserWorkflows: z.array(z.string()),
  domainVocabulary: z.array(vocabularyEntrySchema),
  ticketRoutingHints: z.array(z.string()),
  testCommands: z.array(z.string()),
  buildCommands: z.array(z.string()),
  definitionOfReadyHints: z.array(z.string()),
  definitionOfDoneHints: z.array(z.string()),
  commonRiskAreas: z.array(z.string()),
  notableConstraints: z.array(z.string()),
  likelyAffectedAreas: z.array(affectedAreaSchema),
})
export type RepoBrief = z.infer<typeof repoBriefSchema>

// ---------------------------------------------------------------------------
// Ticket templates
// ---------------------------------------------------------------------------

export const templateFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  instructions: z.string(),
  required: z.boolean(),
})
export type TemplateField = z.infer<typeof templateFieldSchema>

export const ticketTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ticketType: z.string().min(1),
  description: z.string(),
  fields: z.array(templateFieldSchema).min(1),
})
export type TicketTemplate = z.infer<typeof ticketTemplateSchema>

// ---------------------------------------------------------------------------
// API payloads
// ---------------------------------------------------------------------------

export const forgeRequestSchema = z.object({
  rawIntake: z.string().min(1, 'Raw intake is required'),
  repoBrief: repoBriefSchema.nullable(),
  template: ticketTemplateSchema,
})
export type ForgeRequest = z.infer<typeof forgeRequestSchema>

export const refineRequestSchema = forgeRequestSchema.extend({
  previousTicket: forgedTicketSchema,
  clarificationAnswers: z.array(
    z.object({ question: z.string(), answer: z.string() }),
  ),
})
export type RefineRequest = z.infer<typeof refineRequestSchema>

export const aiStatusSchema = z.object({
  available: z.boolean(),
  provider: z.enum(['anthropic', 'openai']).nullable(),
  model: z.string().nullable(),
  detail: z.string(),
})
export type AiStatus = z.infer<typeof aiStatusSchema>
