import { forgedTicketSchema, type AiStatus, type ForgedTicket } from '../shared/schemas'
import { TICKET_JSON_SCHEMA, buildRepairPrompt } from './prompts'

// Provider adapters for Live AI Mode. Anthropic is preferred when its key is
// present; OpenAI is the fallback. Keys are read from the environment only —
// they never appear in responses or logs.

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5'
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'no_api_key'
      | 'provider_unavailable'
      | 'refusal'
      | 'incomplete_response'
      | 'schema_validation',
    public readonly status = 502,
  ) {
    super(message)
  }
}

export interface ProviderConfig {
  provider: 'anthropic' | 'openai'
  model: string
  apiKey: string
}

export function resolveProvider(env: NodeJS.ProcessEnv = process.env): ProviderConfig | null {
  if (env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      model: env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
      apiKey: env.ANTHROPIC_API_KEY,
    }
  }
  if (env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      model: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      apiKey: env.OPENAI_API_KEY,
    }
  }
  return null
}

export function aiStatus(env: NodeJS.ProcessEnv = process.env): AiStatus {
  const config = resolveProvider(env)
  if (!config) {
    return {
      available: false,
      provider: null,
      model: null,
      detail: 'No API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY (see .env.example).',
    }
  }
  return {
    available: true,
    provider: config.provider,
    model: config.model,
    detail: `Using ${config.provider} (${config.model}). Preference: Anthropic first, OpenAI fallback.`,
  }
}

interface RawCompletion {
  /** Parsed JSON candidate from the provider (already an object) or raw text. */
  data: unknown
  rawText: string
}

async function callAnthropic(
  config: ProviderConfig,
  system: string,
  userPrompt: string,
): Promise<RawCompletion> {
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: userPrompt }],
        // Structured output via forced tool use: the tool's input schema is
        // our ticket schema, so the model must emit a conforming object.
        tools: [
          {
            name: 'emit_ticket',
            description: 'Emit the structured engineering ticket.',
            input_schema: TICKET_JSON_SCHEMA,
          },
        ],
        tool_choice: { type: 'tool', name: 'emit_ticket' },
      }),
    })
  } catch {
    throw new ProviderError('Could not reach the Anthropic API (network error).', 'provider_unavailable', 503)
  }

  if (res.status === 401 || res.status === 403) {
    throw new ProviderError('Anthropic rejected the API key.', 'no_api_key', 502)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ProviderError(
      `Anthropic API error (HTTP ${res.status}): ${body.slice(0, 300)}`,
      'provider_unavailable',
      502,
    )
  }

  const payload = (await res.json()) as {
    stop_reason?: string
    content?: { type: string; input?: unknown; text?: string }[]
  }
  if (payload.stop_reason === 'refusal') {
    throw new ProviderError('The model declined to process this intake (safety refusal).', 'refusal', 422)
  }
  const toolUse = payload.content?.find((b) => b.type === 'tool_use')
  if (!toolUse?.input) {
    throw new ProviderError(
      'Anthropic returned no structured ticket (incomplete response).',
      'incomplete_response',
      502,
    )
  }
  return { data: toolUse.input, rawText: JSON.stringify(toolUse.input) }
}

async function callOpenAI(
  config: ProviderConfig,
  system: string,
  userPrompt: string,
): Promise<RawCompletion> {
  let res: Response
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'forged_ticket', schema: TICKET_JSON_SCHEMA, strict: false },
        },
      }),
    })
  } catch {
    throw new ProviderError('Could not reach the OpenAI API (network error).', 'provider_unavailable', 503)
  }

  if (res.status === 401 || res.status === 403) {
    throw new ProviderError('OpenAI rejected the API key.', 'no_api_key', 502)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ProviderError(
      `OpenAI API error (HTTP ${res.status}): ${body.slice(0, 300)}`,
      'provider_unavailable',
      502,
    )
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string | null; refusal?: string | null } }[]
  }
  const message = payload.choices?.[0]?.message
  if (message?.refusal) {
    throw new ProviderError('The model declined to process this intake (safety refusal).', 'refusal', 422)
  }
  const content = message?.content
  if (!content) {
    throw new ProviderError('OpenAI returned an empty response.', 'incomplete_response', 502)
  }
  try {
    return { data: JSON.parse(content), rawText: content }
  } catch {
    return { data: content, rawText: content }
  }
}

function normalizeCandidate(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) return data
  const obj = { ...(data as Record<string, unknown>) }
  // Clamp numeric ranges — models occasionally emit 101 or -0.01.
  if (typeof obj.readinessScore === 'number') {
    obj.readinessScore = Math.min(100, Math.max(0, obj.readinessScore))
  }
  if (Array.isArray(obj.fields)) {
    obj.fields = obj.fields.map((f) => {
      if (typeof f !== 'object' || f === null) return f
      const field = { ...(f as Record<string, unknown>) }
      if (typeof field.confidence === 'number') {
        field.confidence = Math.min(1, Math.max(0, field.confidence))
      }
      return field
    })
  }
  return obj
}

export async function generateTicket(
  config: ProviderConfig,
  system: string,
  userPrompt: string,
): Promise<ForgedTicket> {
  const call = config.provider === 'anthropic' ? callAnthropic : callOpenAI

  const first = await call(config, system, userPrompt)
  const firstParsed = forgedTicketSchema.safeParse(normalizeCandidate(first.data))
  if (firstParsed.success) return firstParsed.data

  // One repair attempt: feed the validation errors back to the model.
  const errors = firstParsed.error.issues
    .slice(0, 10)
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n')
  const repair = await call(config, system, buildRepairPrompt(first.rawText, errors))
  const repairParsed = forgedTicketSchema.safeParse(normalizeCandidate(repair.data))
  if (repairParsed.success) return repairParsed.data

  throw new ProviderError(
    'The provider response failed schema validation twice. Your raw intake is preserved — try again or switch modes.',
    'schema_validation',
    502,
  )
}
