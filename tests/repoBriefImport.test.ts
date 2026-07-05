import { describe, expect, it } from 'vitest'
import { extractJsonBlock, parseRepoBrief } from '../src/lib/repoBriefImport'
import { ORBITOPS_BRIEF } from '../src/lib/orbitops'

const briefJson = JSON.stringify(ORBITOPS_BRIEF, null, 2)

describe('repo brief import parsing', () => {
  it('parses raw JSON', () => {
    const result = parseRepoBrief(briefJson)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.brief.projectName).toBe('OrbitOps Readiness Tracker')
  })

  it('parses markdown-fenced JSON with surrounding prose', () => {
    const input = `Here is the Repo Brief you asked for:\n\n\`\`\`json\n${briefJson}\n\`\`\`\n\nLet me know if you need anything else.`
    const result = parseRepoBrief(input)
    expect(result.ok).toBe(true)
  })

  it('parses a fenced block without a language tag', () => {
    const result = parseRepoBrief('```\n' + briefJson + '\n```')
    expect(result.ok).toBe(true)
  })

  it('extracts the outermost object from loose prose', () => {
    const block = extractJsonBlock(`prefix text ${briefJson} suffix`)
    expect(block).not.toBeNull()
    expect(JSON.parse(block!).projectName).toBe('OrbitOps Readiness Tracker')
  })

  it('reports invalid JSON clearly', () => {
    const result = parseRepoBrief('{ "projectName": "Broken", ')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Invalid JSON')
  })

  it('reports schema violations with field paths', () => {
    const invalid = { ...ORBITOPS_BRIEF, stack: 'not-an-array' }
    const result = parseRepoBrief(JSON.stringify(invalid))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('schema validation')
      expect(result.issues?.some((i) => i.startsWith('stack'))).toBe(true)
    }
  })

  it('rejects input with no JSON at all', () => {
    const result = parseRepoBrief('just some notes about the repo')
    expect(result.ok).toBe(false)
  })
})
