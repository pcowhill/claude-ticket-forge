import { describe, expect, it } from 'vitest'
import {
  forgedTicketSchema,
  forgeRequestSchema,
  repoBriefSchema,
  ticketTemplateSchema,
} from '../shared/schemas'
import { ORBITOPS_BRIEF } from '../src/lib/orbitops'
import { DEFAULT_TEMPLATES } from '../src/lib/defaultTemplates'
import { SCRIPTED_INITIAL_TICKET, SCRIPTED_REFINED_TICKET } from '../src/lib/scriptedDemo'

describe('schema validation', () => {
  it('accepts the shipped OrbitOps repo brief', () => {
    expect(repoBriefSchema.safeParse(ORBITOPS_BRIEF).success).toBe(true)
  })

  it('accepts all default templates', () => {
    for (const t of DEFAULT_TEMPLATES) {
      expect(ticketTemplateSchema.safeParse(t).success).toBe(true)
    }
  })

  it('accepts both scripted demo tickets', () => {
    expect(forgedTicketSchema.safeParse(SCRIPTED_INITIAL_TICKET).success).toBe(true)
    expect(forgedTicketSchema.safeParse(SCRIPTED_REFINED_TICKET).success).toBe(true)
  })

  it('rejects a ticket with out-of-range confidence', () => {
    const bad = JSON.parse(JSON.stringify(SCRIPTED_INITIAL_TICKET))
    bad.fields[0].confidence = 1.4
    expect(forgedTicketSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a ticket with an unknown quality state', () => {
    const bad = JSON.parse(JSON.stringify(SCRIPTED_INITIAL_TICKET))
    bad.fields[0].quality = 'excellent'
    expect(forgedTicketSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a readiness score above 100', () => {
    const bad = { ...SCRIPTED_INITIAL_TICKET, readinessScore: 130 }
    expect(forgedTicketSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a forge request with empty intake', () => {
    const result = forgeRequestSchema.safeParse({
      rawIntake: '',
      repoBrief: null,
      template: DEFAULT_TEMPLATES[0],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a repo brief missing required keys', () => {
    const { projectName: _omit, ...partial } = ORBITOPS_BRIEF
    expect(repoBriefSchema.safeParse(partial).success).toBe(false)
  })
})
