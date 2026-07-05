// Thin localStorage wrapper with an in-memory fallback so the same code paths
// run inside Vitest (node environment) without a DOM.

const memory = new Map<string, string>()

function backing(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  if (typeof localStorage !== 'undefined') return localStorage
  return {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  }
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = backing().getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    backing().setItem(key, JSON.stringify(value))
  } catch {
    // Quota errors are non-fatal for a demo tool.
  }
}

export function removeKey(key: string): void {
  backing().removeItem(key)
}

export const STORAGE_KEYS = {
  mode: 'ticketforge.mode',
  briefs: 'ticketforge.briefs',
  activeBriefId: 'ticketforge.activeBriefId',
  templates: 'ticketforge.templates',
  activeTemplateId: 'ticketforge.activeTemplateId',
  session: 'ticketforge.session',
} as const
