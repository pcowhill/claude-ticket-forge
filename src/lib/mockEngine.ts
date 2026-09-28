import type {
  ForgedTicket,
  RepoBrief,
  RepoContextMatch,
  TicketField,
  TicketTemplate,
} from '../../shared/schemas'
import { computeReadinessScore } from './readiness'

// Deterministic local "Mock AI" engine. No randomness, no network: the same
// intake + repo brief + template always produces the same ticket. It scores
// each template field by lexical relevance against the intake, then grades
// quality/confidence from that score.

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'was',
  'were', 'it', 'its', 'this', 'that', 'be', 'as', 'at', 'by', 'from', 'into', 'after',
  'before', 'when', 'while', 'i', 'we', 'you', 'they', 'he', 'she', 'my', 'our', 'your',
  'even', 'though', 'still', 'came', 'back', 'if', 'not', 'no', 'yes', 'has', 'have', 'had',
  'field', 'fields', 'leave', 'empty', 'e', 'g', 'etc', 'use', 'where', 'possible', 'such',
])

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  )
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let hits = 0
  for (const w of a) if (b.has(w)) hits += 1
  return hits / Math.sqrt(a.size * b.size)
}

function findVocabularyMatches(intake: string, brief: RepoBrief | null): RepoContextMatch[] {
  if (!brief) return []
  const lower = intake.toLowerCase()
  const matches: RepoContextMatch[] = []
  for (const entry of brief.domainVocabulary) {
    if (!lower.includes(entry.term.toLowerCase())) continue
    const termTokens = tokenize(entry.term)
    const area = brief.likelyAffectedAreas.find((a) => {
      const areaTokens = tokenize(a.area)
      for (const t of termTokens) if (areaTokens.has(t)) return true
      return false
    })
    matches.push({
      term: entry.term,
      matchedTo: area?.files[0] ?? entry.meaning,
      note: `Recognized from ${brief.projectName} vocabulary: ${entry.meaning}.`,
    })
  }
  return matches
}

function findAffectedFiles(intake: string, brief: RepoBrief | null): string[] {
  if (!brief) return []
  const intakeTokens = tokenize(intake)
  const files: string[] = []
  for (const area of brief.likelyAffectedAreas) {
    const areaTokens = tokenize(area.area)
    let related = false
    for (const t of areaTokens) if (intakeTokens.has(t)) related = true
    if (related) for (const f of area.files) if (!files.includes(f)) files.push(f)
  }
  return files.slice(0, 5)
}

function suggestLabels(brief: RepoBrief | null, template: TicketTemplate): string[] {
  const labels: string[] = [template.ticketType]
  if (brief) {
    for (const hint of brief.ticketRoutingHints) {
      const m = /labels?:\s*(.+)$/i.exec(hint)
      if (m) {
        for (const raw of m[1].split(/[,;]/)) {
          const label = raw.trim().replace(/\.$/, '')
          if (label && !labels.includes(label)) labels.push(label)
        }
      }
    }
  }
  return labels.slice(0, 6)
}

function buildField(
  fieldDef: TicketTemplate['fields'][number],
  intake: string,
  brief: RepoBrief | null,
): TicketField {
  const fieldTokens = tokenize(`${fieldDef.label} ${fieldDef.instructions}`)
  const sentences = splitSentences(intake)

  let bestSentence = ''
  let bestScore = 0
  for (const sentence of sentences) {
    const score = overlapScore(tokenize(sentence), fieldTokens)
    if (score > bestScore) {
      bestScore = score
      bestSentence = sentence
    }
  }

  const vocabHit =
    brief?.domainVocabulary.some((v) => bestSentence.toLowerCase().includes(v.term.toLowerCase())) ?? false

  if (bestScore >= 0.28) {
    return {
      id: fieldDef.id,
      label: fieldDef.label,
      value: bestSentence,
      required: fieldDef.required,
      confidence: Math.min(0.9, 0.55 + bestScore),
      quality: bestScore >= 0.45 ? 'solid' : 'needs_confirmation',
      reason:
        bestScore >= 0.45
          ? 'Intake states this directly.'
          : 'Partially covered by the intake; confirm details before triage.',
      source: vocabHit ? 'repo_context' : 'raw_intake',
    }
  }

  if (bestScore > 0) {
    return {
      id: fieldDef.id,
      label: fieldDef.label,
      value: `Possibly: ${bestSentence}`,
      required: fieldDef.required,
      confidence: 0.3,
      quality: 'speculative',
      reason: 'Only weak lexical evidence in the intake; treat as a guess.',
      source: 'inferred',
    }
  }

  return {
    id: fieldDef.id,
    label: fieldDef.label,
    value: '',
    required: fieldDef.required,
    confidence: fieldDef.required ? 0.1 : 0.2,
    quality: fieldDef.required ? 'missing' : 'not_applicable',
    reason: fieldDef.required
      ? 'Nothing in the intake addresses this required field.'
      : 'Optional field with no supporting detail; leaving it out.',
    source: 'inferred',
  }
}

function buildTitle(intake: string, template: TicketTemplate): string {
  const first = splitSentences(intake)[0] ?? intake
  const trimmed = first.replace(/[.!?]+$/, '')
  const title = trimmed.length > 96 ? `${trimmed.slice(0, 93)}...` : trimmed
  return `${title.charAt(0).toUpperCase()}${title.slice(1)}` || `Untitled ${template.name}`
}

function clarifyingQuestionsFor(fields: TicketField[]): string[] {
  const questions: string[] = []
  for (const f of fields) {
    if (!f.required) continue
    if (f.quality === 'solid' || f.quality === 'not_applicable') continue
    questions.push(`Can you provide ${f.label.toLowerCase()}? (${f.reason})`)
  }
  return questions.slice(0, 4)
}

function blockersFor(fields: TicketField[]): string[] {
  const blockers: string[] = []
  for (const f of fields) {
    if (!f.required) continue
    if (f.quality === 'missing') blockers.push(`${f.label} is missing.`)
    else if (f.quality === 'speculative') blockers.push(`${f.label} is speculative and unverified.`)
    else if (f.quality === 'needs_confirmation') blockers.push(`${f.label} needs confirmation.`)
  }
  return blockers
}

export function forgeMockTicket(
  rawIntake: string,
  brief: RepoBrief | null,
  template: TicketTemplate,
): ForgedTicket {
  const intake = rawIntake.trim()
  if (intake.length < 12) {
    return {
      status: 'unsupported',
      ticketType: template.ticketType,
      title: 'Intake too thin to forge',
      summary: 'The raw intake does not contain enough signal to draft a ticket. Add a description of what happened.',
      fields: [],
      assumptions: [],
      likelyAffectedFiles: [],
      suggestedLabels: [],
      clarifyingQuestions: ['What happened, where in the product, and what did you expect instead?'],
      readinessScore: 0,
      readinessBlockers: ['Raw intake is effectively empty.'],
      whatImproved: [],
      repoContextMatches: [],
    }
  }

  const fields = template.fields.map((f) => buildField(f, intake, brief))
  const questions = clarifyingQuestionsFor(fields)
  const blockers = blockersFor(fields)
  const sentences = splitSentences(intake)

  return {
    status: questions.length > 0 ? 'needs_clarification' : 'ticket',
    ticketType: template.ticketType,
    title: buildTitle(intake, template),
    summary:
      sentences.slice(0, 2).join(' ') +
      (brief ? ` (Interpreted against the ${brief.projectName} repo brief.)` : ''),
    fields,
    assumptions: brief
      ? [
          `Domain terms were resolved using the ${brief.projectName} repo brief.`,
          'Unstated details were left blank rather than invented.',
        ]
      : ['No repo brief active; ticket drafted from intake text alone.'],
    likelyAffectedFiles: findAffectedFiles(intake, brief),
    suggestedLabels: suggestLabels(brief, template),
    clarifyingQuestions: questions,
    readinessScore: computeReadinessScore(fields),
    readinessBlockers: blockers,
    whatImproved: [],
    repoContextMatches: findVocabularyMatches(intake, brief),
  }
}

export function refineMockTicket(
  previous: ForgedTicket,
  clarificationAnswers: { question: string; answer: string }[],
  brief: RepoBrief | null,
  template: TicketTemplate,
): ForgedTicket {
  void template
  const answered = clarificationAnswers.filter((a) => a.answer.trim().length > 0)

  // Map answers to the weak required fields in the same order the questions
  // were generated (clarifyingQuestionsFor walks fields in template order).
  const weakFields = previous.fields.filter(
    (f) => f.required && f.quality !== 'solid' && f.quality !== 'not_applicable',
  )
  const improvedLabels: string[] = []

  const fields: TicketField[] = previous.fields.map((f) => {
    const weakIndex = weakFields.findIndex((w) => w.id === f.id)
    const answer = weakIndex >= 0 ? answered[weakIndex] : undefined
    if (!answer) return f
    improvedLabels.push(f.label)
    return {
      ...f,
      value: f.value ? `${f.value}\n${answer.answer.trim()}` : answer.answer.trim(),
      confidence: Math.min(0.95, Math.max(f.confidence, 0.85)),
      quality: 'solid',
      reason: 'Confirmed directly by a clarification answer.',
      source: 'clarification',
    }
  })

  const questions = clarifyingQuestionsFor(fields)
  const blockers = blockersFor(fields)
  const score = computeReadinessScore(fields)

  return {
    ...previous,
    status: blockers.length > 0 ? 'needs_clarification' : 'ticket',
    fields,
    clarifyingQuestions: questions,
    readinessScore: Math.max(score, previous.readinessScore),
    readinessBlockers: blockers,
    whatImproved:
      improvedLabels.length > 0
        ? improvedLabels.map((l) => `${l} upgraded to solid via clarification.`)
        : ['No clarification answers were usable; ticket unchanged.'],
    repoContextMatches: previous.repoContextMatches.length
      ? previous.repoContextMatches
      : findVocabularyMatches(previous.summary, brief),
  }
}
