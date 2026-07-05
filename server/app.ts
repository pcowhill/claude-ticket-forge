import express, { type Express } from 'express'
import { forgeRequestSchema, refineRequestSchema } from '../shared/schemas'
import {
  aiStatus,
  generateTicket,
  ProviderError,
  resolveProvider,
} from './providers'
import { buildForgeUserPrompt, buildRefineUserPrompt, buildSystemPrompt } from './prompts'

export function createApp(): Express {
  const app = express()
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'ticketforge', time: new Date().toISOString() })
  })

  app.get('/api/ai/status', (_req, res) => {
    res.json(aiStatus())
  })

  app.post('/api/forge-ticket', async (req, res) => {
    const parsed = forgeRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid forge request.',
        code: 'bad_request',
        issues: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join('.')}: ${i.message}`),
      })
      return
    }
    const config = resolveProvider()
    if (!config) {
      res.status(503).json({
        error: 'Live AI is not configured: no API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY, or use Scripted Demo / Mock AI mode.',
        code: 'no_api_key',
      })
      return
    }
    try {
      const ticket = await generateTicket(
        config,
        buildSystemPrompt(parsed.data),
        buildForgeUserPrompt(parsed.data),
      )
      res.json(ticket)
    } catch (err) {
      handleProviderError(err, res)
    }
  })

  app.post('/api/refine-ticket', async (req, res) => {
    const parsed = refineRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid refine request.',
        code: 'bad_request',
        issues: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join('.')}: ${i.message}`),
      })
      return
    }
    const config = resolveProvider()
    if (!config) {
      res.status(503).json({
        error: 'Live AI is not configured: no API key found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY, or use Scripted Demo / Mock AI mode.',
        code: 'no_api_key',
      })
      return
    }
    try {
      const ticket = await generateTicket(
        config,
        buildSystemPrompt(parsed.data),
        buildRefineUserPrompt(parsed.data),
      )
      res.json(ticket)
    } catch (err) {
      handleProviderError(err, res)
    }
  })

  return app
}

function handleProviderError(err: unknown, res: express.Response): void {
  if (err instanceof ProviderError) {
    // Log the category only — never request/response bodies or keys.
    console.error(`[ticketforge] provider error (${err.code}): ${err.message}`)
    res.status(err.status).json({ error: err.message, code: err.code })
    return
  }
  console.error('[ticketforge] unexpected error:', err instanceof Error ? err.message : err)
  res.status(500).json({ error: 'Unexpected server error.', code: 'server_error' })
}
