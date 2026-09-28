import { describe, expect, it } from 'vitest'
import { forgeMockTicket, refineMockTicket } from '../src/lib/mockEngine'
import { ORBITOPS_BRIEF, DEMO_INTAKE } from '../src/lib/orbitops'
import { DEFAULT_TEMPLATES } from '../src/lib/defaultTemplates'
import { forgedTicketSchema } from '../shared/schemas'

const bugTemplate = DEFAULT_TEMPLATES.find((t) => t.id === 'bug-report')!

describe('mock AI engine', () => {
  it('is deterministic: same input, same ticket', () => {
    const a = forgeMockTicket(DEMO_INTAKE, ORBITOPS_BRIEF, bugTemplate)
    const b = forgeMockTicket(DEMO_INTAKE, ORBITOPS_BRIEF, bugTemplate)
    expect(a).toEqual(b)
  })

  it('produces a schema-valid ticket with one entry per template field', () => {
    const t = forgeMockTicket(DEMO_INTAKE, ORBITOPS_BRIEF, bugTemplate)
    expect(forgedTicketSchema.safeParse(t).success).toBe(true)
    expect(t.fields.map((f) => f.id)).toEqual(bugTemplate.fields.map((f) => f.id))
  })

  it('uses the repo brief for context matches and affected files', () => {
    const t = forgeMockTicket(DEMO_INTAKE, ORBITOPS_BRIEF, bugTemplate)
    expect(t.repoContextMatches.length).toBeGreaterThan(0)
    expect(t.repoContextMatches.some((m) => m.term === 'readiness board')).toBe(true)
    expect(t.likelyAffectedFiles.length).toBeGreaterThan(0)
    expect(t.suggestedLabels).toContain('bug')
  })

  it('marks unsupported when intake is effectively empty', () => {
    const t = forgeMockTicket('help', ORBITOPS_BRIEF, bugTemplate)
    expect(t.status).toBe('unsupported')
  })

  it('asks clarifying questions for weak required fields', () => {
    const t = forgeMockTicket(DEMO_INTAKE, ORBITOPS_BRIEF, bugTemplate)
    expect(t.status).toBe('needs_clarification')
    expect(t.clarifyingQuestions.length).toBeGreaterThan(0)
    expect(t.readinessBlockers.length).toBeGreaterThan(0)
  })

  it('readiness score increases after clarification answers', () => {
    const initial = forgeMockTicket(DEMO_INTAKE, ORBITOPS_BRIEF, bugTemplate)
    const answers = initial.clarifyingQuestions.map((q) => ({
      question: q,
      answer:
        'Thermal Control > Valve Calibration remained blocked; refreshing fixed the board; it was an edit to an existing item.',
    }))
    const refined = refineMockTicket(initial, answers, ORBITOPS_BRIEF, bugTemplate)
    expect(refined.readinessScore).toBeGreaterThan(initial.readinessScore)
    expect(refined.whatImproved.length).toBeGreaterThan(0)
    // answered fields become solid with clarification source
    const upgraded = refined.fields.filter((f) => f.source === 'clarification')
    expect(upgraded.length).toBeGreaterThan(0)
    for (const f of upgraded) expect(f.quality).toBe('solid')
  })

  it('handles refinement with no usable answers gracefully', () => {
    const initial = forgeMockTicket(DEMO_INTAKE, ORBITOPS_BRIEF, bugTemplate)
    const refined = refineMockTicket(
      initial,
      initial.clarifyingQuestions.map((q) => ({ question: q, answer: '   ' })),
      ORBITOPS_BRIEF,
      bugTemplate,
    )
    expect(refined.readinessScore).toBeGreaterThanOrEqual(initial.readinessScore)
    expect(refined.whatImproved[0]).toMatch(/unchanged/i)
  })

  it('works without any repo brief', () => {
    const t = forgeMockTicket(DEMO_INTAKE, null, bugTemplate)
    expect(forgedTicketSchema.safeParse(t).success).toBe(true)
    expect(t.repoContextMatches).toHaveLength(0)
    expect(t.assumptions[0]).toMatch(/no repo brief/i)
  })
})
