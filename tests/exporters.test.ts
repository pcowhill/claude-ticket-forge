import { describe, expect, it } from 'vitest'
import { toGithubMarkdown, toJiraMarkdown, toJsonExport, toLinearText } from '../src/lib/exporters'
import { SCRIPTED_REFINED_TICKET } from '../src/lib/scriptedDemo'
import { forgedTicketSchema } from '../shared/schemas'

const t = SCRIPTED_REFINED_TICKET

describe('export formatting', () => {
  it('renders Jira-style markdown with h-headings and labels', () => {
    const out = toJiraMarkdown(t)
    expect(out).toContain(`h1. ${t.title}`)
    expect(out).toContain('h2. Summary')
    expect(out).toContain('h2. Steps to Reproduce')
    expect(out).toContain('*Labels:* bug, frontend')
    expect(out).toContain('{{src/state/readinessStore.ts}}')
  })

  it('renders GitHub issue markdown with #-headings and code spans', () => {
    const out = toGithubMarkdown(t)
    expect(out).toContain(`# ${t.title}`)
    expect(out).toContain('## Summary')
    expect(out).toContain('- `src/state/readinessStore.ts`')
    expect(out).toContain('**Readiness:** 88%')
  })

  it('renders Linear-style text with bold section names', () => {
    const out = toLinearText(t)
    expect(out.startsWith(t.title)).toBe(true)
    expect(out).toContain('**Steps to Reproduce**')
    expect(out).toContain('Readiness: 88%')
  })

  it('omits empty fields from text exports', () => {
    // environment is intentionally empty in the demo ticket
    expect(toGithubMarkdown(t)).not.toContain('## Environment')
    expect(toJiraMarkdown(t)).not.toContain('h2. Environment')
  })

  it('JSON export round-trips through the schema', () => {
    const parsed = forgedTicketSchema.parse(JSON.parse(toJsonExport(t)))
    expect(parsed.title).toBe(t.title)
    expect(parsed.fields.length).toBe(t.fields.length)
  })
})
