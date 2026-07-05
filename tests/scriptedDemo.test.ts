import { describe, expect, it } from 'vitest'
import { SCRIPTED_INITIAL_TICKET, SCRIPTED_REFINED_TICKET } from '../src/lib/scriptedDemo'
import { qualityTone } from '../src/lib/readiness'
import { DEMO_ANSWERS, DEMO_INTAKE } from '../src/lib/orbitops'

describe('scripted demo responses', () => {
  it('initial ticket scores around 62% and needs clarification', () => {
    expect(SCRIPTED_INITIAL_TICKET.readinessScore).toBeGreaterThanOrEqual(58)
    expect(SCRIPTED_INITIAL_TICKET.readinessScore).toBeLessThanOrEqual(66)
    expect(SCRIPTED_INITIAL_TICKET.status).toBe('needs_clarification')
    expect(SCRIPTED_INITIAL_TICKET.readinessBlockers.length).toBeGreaterThan(0)
  })

  it('asks the three scripted clarifying questions', () => {
    expect(SCRIPTED_INITIAL_TICKET.clarifyingQuestions).toEqual([
      'Which subsystem checklist item was blocked?',
      'Did refreshing the page change the board status?',
      'Did this happen after editing an existing checklist item or creating a new one?',
    ])
    expect(DEMO_ANSWERS).toHaveLength(3)
  })

  it('initial ticket mixes strong and uncertain fields', () => {
    const tones = SCRIPTED_INITIAL_TICKET.fields.map((f) => qualityTone(f))
    expect(tones).toContain('green')
    expect(tones).toContain('amber')
    expect(tones).toContain('red')
    expect(tones).toContain('gray')
  })

  it('understands OrbitOps vocabulary from the repo profile', () => {
    const terms = SCRIPTED_INITIAL_TICKET.repoContextMatches.map((m) => m.term)
    expect(terms).toContain('readiness board')
    expect(terms).toContain('subsystem checklist')
    // ...which are exactly the phrases used in the demo intake.
    expect(DEMO_INTAKE).toContain('readiness board')
    expect(DEMO_INTAKE).toContain('subsystem checklist')
  })

  it('refined ticket scores around 88% and becomes a ready ticket', () => {
    expect(SCRIPTED_REFINED_TICKET.readinessScore).toBeGreaterThanOrEqual(84)
    expect(SCRIPTED_REFINED_TICKET.readinessScore).toBeLessThanOrEqual(92)
    expect(SCRIPTED_REFINED_TICKET.status).toBe('ticket')
    expect(SCRIPTED_REFINED_TICKET.clarifyingQuestions).toHaveLength(0)
  })

  it('readiness score increases after clarification', () => {
    expect(SCRIPTED_REFINED_TICKET.readinessScore).toBeGreaterThan(
      SCRIPTED_INITIAL_TICKET.readinessScore,
    )
  })

  it('field quality improves from red/amber toward green', () => {
    const before = new Map(SCRIPTED_INITIAL_TICKET.fields.map((f) => [f.id, f]))
    const rank = { missing: 0, speculative: 1, needs_confirmation: 2, solid: 3, not_applicable: 3 }
    let improvedCount = 0
    for (const after of SCRIPTED_REFINED_TICKET.fields) {
      const prev = before.get(after.id)!
      expect(rank[after.quality]).toBeGreaterThanOrEqual(rank[prev.quality])
      if (rank[after.quality] > rank[prev.quality]) improvedCount += 1
    }
    expect(improvedCount).toBeGreaterThanOrEqual(3)
    // test_plan specifically: missing -> solid
    expect(before.get('test_plan')!.quality).toBe('missing')
    expect(SCRIPTED_REFINED_TICKET.fields.find((f) => f.id === 'test_plan')!.quality).toBe('solid')
  })

  it('explains what improved after clarification', () => {
    expect(SCRIPTED_REFINED_TICKET.whatImproved.length).toBeGreaterThanOrEqual(4)
    const text = SCRIPTED_REFINED_TICKET.whatImproved.join(' ')
    expect(text).toMatch(/reproduction/i)
    expect(text).toMatch(/affected area/i)
    expect(text).toMatch(/test plan/i)
  })

  it('upgrades labels: drops needs-repro, adds high-impact', () => {
    expect(SCRIPTED_INITIAL_TICKET.suggestedLabels).toContain('needs-repro')
    expect(SCRIPTED_REFINED_TICKET.suggestedLabels).not.toContain('needs-repro')
    expect(SCRIPTED_REFINED_TICKET.suggestedLabels).toContain('high-impact')
  })
})
