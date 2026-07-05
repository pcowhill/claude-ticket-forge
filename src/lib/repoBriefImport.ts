import { repoBriefSchema, type RepoBrief } from '../../shared/schemas'

export type ImportResult =
  | { ok: true; brief: RepoBrief }
  | { ok: false; error: string; issues?: string[] }

// Accepts raw JSON, or JSON wrapped in markdown code fences / surrounding prose,
// as typically produced when pasting a Claude Code answer.
export function extractJsonBlock(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Prefer a fenced ```json ... ``` block if present.
  const fence = /```(?:json)?\s*\n?([\s\S]*?)```/i.exec(trimmed)
  if (fence && fence[1].trim()) return fence[1].trim()

  // Otherwise take the outermost { ... } span. A missing closing brace is
  // passed through so JSON.parse can report a precise syntax error.
  const start = trimmed.indexOf('{')
  if (start === -1) return null
  const end = trimmed.lastIndexOf('}')
  return end > start ? trimmed.slice(start, end + 1) : trimmed.slice(start)
}

export function parseRepoBrief(input: string): ImportResult {
  const block = extractJsonBlock(input)
  if (!block) {
    return { ok: false, error: 'No JSON object found. Paste the Repo Brief JSON (fenced markdown is fine).' }
  }

  let data: unknown
  try {
    data = JSON.parse(block)
  } catch (err) {
    return { ok: false, error: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}` }
  }

  const result = repoBriefSchema.safeParse(data)
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 8)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    return { ok: false, error: 'Repo Brief failed schema validation.', issues }
  }
  return { ok: true, brief: result.data }
}
