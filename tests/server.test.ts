import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Server } from 'node:http'
import { createApp } from '../server/app'
import { aiStatus, resolveProvider } from '../server/providers'
import { DEFAULT_TEMPLATES } from '../src/lib/defaultTemplates'
import { ORBITOPS_BRIEF, DEMO_INTAKE } from '../src/lib/orbitops'

let server: Server
let base: string

beforeAll(async () => {
  // Ensure key-dependent behavior is deterministic in CI.
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.OPENAI_API_KEY
  const app = createApp()
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve)
  })
  const address = server.address()
  if (typeof address === 'object' && address) base = `http://127.0.0.1:${address.port}`
})

afterAll(() => {
  server?.close()
})

describe('provider resolution', () => {
  it('prefers Anthropic over OpenAI when both keys exist', () => {
    const env = { ANTHROPIC_API_KEY: 'a', OPENAI_API_KEY: 'b' } as NodeJS.ProcessEnv
    expect(resolveProvider(env)?.provider).toBe('anthropic')
  })

  it('falls back to OpenAI when only its key exists', () => {
    const env = { OPENAI_API_KEY: 'b' } as NodeJS.ProcessEnv
    expect(resolveProvider(env)?.provider).toBe('openai')
  })

  it('honors model overrides from env', () => {
    const env = { ANTHROPIC_API_KEY: 'a', ANTHROPIC_MODEL: 'custom-model' } as NodeJS.ProcessEnv
    expect(resolveProvider(env)?.model).toBe('custom-model')
  })

  it('reports unavailable status without keys', () => {
    const status = aiStatus({} as NodeJS.ProcessEnv)
    expect(status.available).toBe(false)
    expect(status.detail).toMatch(/no api key/i)
  })
})

describe('api endpoints (no keys configured)', () => {
  it('GET /api/health responds ok', async () => {
    const res = await fetch(`${base}/api/health`)
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('GET /api/ai/status reports live AI unavailable', async () => {
    const res = await fetch(`${base}/api/ai/status`)
    const body = await res.json()
    expect(body.available).toBe(false)
    expect(body.provider).toBeNull()
  })

  it('POST /api/forge-ticket returns actionable no_api_key error', async () => {
    const res = await fetch(`${base}/api/forge-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        rawIntake: DEMO_INTAKE,
        repoBrief: ORBITOPS_BRIEF,
        template: DEFAULT_TEMPLATES[0],
      }),
    })
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBe('no_api_key')
    expect(body.error).toMatch(/mock ai/i)
  })

  it('POST /api/forge-ticket rejects malformed payloads with field issues', async () => {
    const res = await fetch(`${base}/api/forge-ticket`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rawIntake: '' }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('bad_request')
    expect(Array.isArray(body.issues)).toBe(true)
  })
})
