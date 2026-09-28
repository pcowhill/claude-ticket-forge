import {
  aiStatusSchema,
  forgedTicketSchema,
  type AiStatus,
  type ForgedTicket,
  type ForgeRequest,
  type RefineRequest,
} from '../../shared/schemas'

// Frontend client for the Express backend (Live AI Mode only).

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'unknown',
  ) {
    super(message)
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Backend unreachable. Is the API server running? (npm run dev)', 'network')
  }
  const data = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
  if (!res.ok) {
    throw new ApiError(data?.error ?? `Request failed with status ${res.status}`, data?.code ?? 'server_error')
  }
  return data as T
}

export async function fetchAiStatus(): Promise<AiStatus> {
  try {
    const res = await fetch('/api/ai/status')
    if (!res.ok) throw new Error()
    return aiStatusSchema.parse(await res.json())
  } catch {
    return {
      available: false,
      provider: null,
      model: null,
      detail: 'Backend unreachable. Live AI needs the API server (npm run dev).',
    }
  }
}

export async function forgeTicketLive(req: ForgeRequest): Promise<ForgedTicket> {
  const data = await post<unknown>('/api/forge-ticket', req)
  const parsed = forgedTicketSchema.safeParse(data)
  if (!parsed.success) throw new ApiError('Backend returned a malformed ticket.', 'schema_validation')
  return parsed.data
}

export async function refineTicketLive(req: RefineRequest): Promise<ForgedTicket> {
  const data = await post<unknown>('/api/refine-ticket', req)
  const parsed = forgedTicketSchema.safeParse(data)
  if (!parsed.success) throw new ApiError('Backend returned a malformed ticket.', 'schema_validation')
  return parsed.data
}
