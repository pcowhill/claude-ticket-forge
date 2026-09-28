import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  repoBriefSchema,
  ticketTemplateSchema,
  type ForgedTicket,
  type RepoBrief,
  type TicketTemplate,
} from '../../shared/schemas'
import { loadJSON, saveJSON, STORAGE_KEYS } from '../lib/storage'
import { DEFAULT_TEMPLATES } from '../lib/defaultTemplates'
import { cloneDefaults } from '../lib/templates'
import { DEMO_ANSWERS, DEMO_INTAKE, ORBITOPS_BRIEF } from '../lib/orbitops'
import {
  FORGE_PROGRESS_STEPS,
  REFINE_PROGRESS_STEPS,
  SCRIPTED_INITIAL_TICKET,
  SCRIPTED_REFINED_TICKET,
} from '../lib/scriptedDemo'
import { forgeMockTicket, refineMockTicket } from '../lib/mockEngine'
import { computeReadinessScore } from '../lib/readiness'
import { ApiError, forgeTicketLive, refineTicketLive } from '../lib/api'

export type AppMode = 'scripted' | 'mock' | 'live'
export type Screen = 'forge' | 'repo-context' | 'templates' | 'export'
export type ForgePhase = 'idle' | 'working' | 'done'

export const MODE_LABEL: Record<AppMode, string> = {
  scripted: 'Scripted Demo',
  mock: 'Mock AI',
  live: 'Live AI',
}

const STEP_DELAY_MS = 420

interface AppState {
  mode: AppMode
  screen: Screen
  briefs: RepoBrief[]
  activeBriefId: string | null
  templates: TicketTemplate[]
  activeTemplateId: string
  rawIntake: string
  ticket: ForgedTicket | null
  hasRefined: boolean
  answers: string[]
  phase: ForgePhase
  progressSteps: readonly string[]
  progressIndex: number
  changedFieldIds: string[]
  refineNonce: number
  error: string | null
}

interface AppActions {
  setMode: (mode: AppMode) => void
  setScreen: (screen: Screen) => void
  setActiveBriefId: (id: string | null) => void
  addBrief: (brief: RepoBrief) => void
  removeBrief: (id: string) => void
  setTemplates: (templates: TicketTemplate[]) => void
  setActiveTemplateId: (id: string) => void
  setRawIntake: (text: string) => void
  setAnswer: (index: number, value: string) => void
  useDemoAnswers: () => void
  loadOrbitOpsDemo: () => void
  forgeTicket: () => Promise<void>
  refineTicket: () => Promise<void>
  updateFieldValue: (fieldId: string, value: string) => void
  clearTicket: () => void
  dismissError: () => void
}

export type AppStore = AppState & AppActions

const AppContext = createContext<AppStore | null>(null)

function loadBriefs(): RepoBrief[] {
  const raw = loadJSON<unknown[]>(STORAGE_KEYS.briefs, [])
  const briefs: RepoBrief[] = []
  for (const item of raw) {
    const parsed = repoBriefSchema.safeParse(item)
    if (parsed.success) briefs.push(parsed.data)
  }
  if (!briefs.some((b) => b.projectName === ORBITOPS_BRIEF.projectName)) {
    briefs.unshift(ORBITOPS_BRIEF)
  }
  return briefs
}

function loadTemplates(): TicketTemplate[] {
  const raw = loadJSON<unknown[]>(STORAGE_KEYS.templates, [])
  const templates: TicketTemplate[] = []
  for (const item of raw) {
    const parsed = ticketTemplateSchema.safeParse(item)
    if (parsed.success) templates.push(parsed.data)
  }
  if (templates.length === 0) return cloneDefaults()
  // Ensure the three shipped templates always exist, even if storage was partial.
  for (const def of DEFAULT_TEMPLATES) {
    if (!templates.some((t) => t.id === def.id)) templates.push(JSON.parse(JSON.stringify(def)))
  }
  return templates
}

interface StoredSession {
  rawIntake: string
  ticket: ForgedTicket | null
  hasRefined: boolean
  answers: string[]
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function diffFieldIds(prev: ForgedTicket | null, next: ForgedTicket): string[] {
  if (!prev) return []
  const changed: string[] = []
  for (const f of next.fields) {
    const old = prev.fields.find((p) => p.id === f.id)
    if (!old || old.value !== f.value || old.quality !== f.quality || old.confidence !== f.confidence) {
      changed.push(f.id)
    }
  }
  return changed
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    const stored = loadJSON<string>(STORAGE_KEYS.mode, 'scripted')
    return stored === 'mock' || stored === 'live' ? stored : 'scripted'
  })
  const [screen, setScreen] = useState<Screen>('forge')
  const [briefs, setBriefs] = useState<RepoBrief[]>(loadBriefs)
  const [activeBriefId, setActiveBriefIdState] = useState<string | null>(() =>
    loadJSON<string | null>(STORAGE_KEYS.activeBriefId, ORBITOPS_BRIEF.projectName),
  )
  const [templates, setTemplatesState] = useState<TicketTemplate[]>(loadTemplates)
  const [activeTemplateId, setActiveTemplateIdState] = useState<string>(() =>
    loadJSON<string>(STORAGE_KEYS.activeTemplateId, DEFAULT_TEMPLATES[0].id),
  )

  const storedSession = useMemo(
    () => loadJSON<StoredSession>(STORAGE_KEYS.session, { rawIntake: '', ticket: null, hasRefined: false, answers: [] }),
    [],
  )
  const [rawIntake, setRawIntake] = useState(storedSession.rawIntake)
  const [ticket, setTicket] = useState<ForgedTicket | null>(storedSession.ticket)
  const [hasRefined, setHasRefined] = useState(storedSession.hasRefined)
  const [answers, setAnswers] = useState<string[]>(storedSession.answers)
  const [phase, setPhase] = useState<ForgePhase>(storedSession.ticket ? 'done' : 'idle')
  const [progressSteps, setProgressSteps] = useState<readonly string[]>(FORGE_PROGRESS_STEPS)
  const [progressIndex, setProgressIndex] = useState(0)
  const [changedFieldIds, setChangedFieldIds] = useState<string[]>([])
  const [refineNonce, setRefineNonce] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const workingRef = useRef(false)

  // --- persistence ---
  useEffect(() => saveJSON(STORAGE_KEYS.mode, mode), [mode])
  useEffect(() => saveJSON(STORAGE_KEYS.briefs, briefs), [briefs])
  useEffect(() => saveJSON(STORAGE_KEYS.activeBriefId, activeBriefId), [activeBriefId])
  useEffect(() => saveJSON(STORAGE_KEYS.templates, templates), [templates])
  useEffect(() => saveJSON(STORAGE_KEYS.activeTemplateId, activeTemplateId), [activeTemplateId])
  useEffect(
    () => saveJSON(STORAGE_KEYS.session, { rawIntake, ticket, hasRefined, answers } satisfies StoredSession),
    [rawIntake, ticket, hasRefined, answers],
  )

  const activeBrief = briefs.find((b) => b.projectName === activeBriefId) ?? null
  const activeTemplate = templates.find((t) => t.id === activeTemplateId) ?? templates[0]

  const runProgress = useCallback(async (steps: readonly string[]) => {
    setProgressSteps(steps)
    for (let i = 0; i < steps.length; i += 1) {
      setProgressIndex(i)
      await delay(STEP_DELAY_MS)
    }
  }, [])

  const forgeTicket = useCallback(async () => {
    if (workingRef.current) return
    if (!rawIntake.trim()) {
      setError('Raw intake is empty. Describe the problem or paste the report you received.')
      return
    }
    workingRef.current = true
    setError(null)
    setPhase('working')
    setChangedFieldIds([])
    setAnswers([])
    setHasRefined(false)
    try {
      let result: ForgedTicket
      if (mode === 'scripted') {
        await runProgress(FORGE_PROGRESS_STEPS)
        result = SCRIPTED_INITIAL_TICKET
      } else if (mode === 'mock') {
        await runProgress(FORGE_PROGRESS_STEPS)
        result = forgeMockTicket(rawIntake, activeBrief, activeTemplate)
      } else {
        const pending = forgeTicketLive({ rawIntake, repoBrief: activeBrief, template: activeTemplate })
        await runProgress(FORGE_PROGRESS_STEPS)
        result = await pending
      }
      setTicket(result)
      setAnswers(result.clarifyingQuestions.map(() => ''))
      setPhase('done')
    } catch (err) {
      setPhase(ticket ? 'done' : 'idle')
      setError(err instanceof ApiError ? err.message : `Forge failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      workingRef.current = false
    }
  }, [mode, rawIntake, activeBrief, activeTemplate, runProgress, ticket])

  const refineTicket = useCallback(async () => {
    if (workingRef.current || !ticket) return
    const pairs = ticket.clarifyingQuestions.map((q, i) => ({ question: q, answer: answers[i] ?? '' }))
    if (!pairs.some((p) => p.answer.trim())) {
      setError('Answer at least one clarifying question (or use the demo answers) before refining.')
      return
    }
    workingRef.current = true
    setError(null)
    setPhase('working')
    try {
      let result: ForgedTicket
      if (mode === 'scripted') {
        await runProgress(REFINE_PROGRESS_STEPS)
        result = SCRIPTED_REFINED_TICKET
      } else if (mode === 'mock') {
        await runProgress(REFINE_PROGRESS_STEPS)
        result = refineMockTicket(ticket, pairs, activeBrief, activeTemplate)
      } else {
        const pending = refineTicketLive({
          rawIntake,
          repoBrief: activeBrief,
          template: activeTemplate,
          previousTicket: ticket,
          clarificationAnswers: pairs,
        })
        await runProgress(REFINE_PROGRESS_STEPS)
        result = await pending
      }
      setChangedFieldIds(diffFieldIds(ticket, result))
      setRefineNonce((n) => n + 1)
      setTicket(result)
      setHasRefined(true)
      setAnswers(result.clarifyingQuestions.map(() => ''))
      setPhase('done')
    } catch (err) {
      setPhase('done')
      setError(err instanceof ApiError ? err.message : `Refine failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      workingRef.current = false
    }
  }, [mode, ticket, answers, rawIntake, activeBrief, activeTemplate, runProgress])

  const updateFieldValue = useCallback((fieldId: string, value: string) => {
    setTicket((prev) => {
      if (!prev) return prev
      const fields = prev.fields.map((f) =>
        f.id === fieldId
          ? {
              ...f,
              value,
              source: 'manual' as const,
              quality: value.trim() ? ('solid' as const) : ('missing' as const),
              confidence: value.trim() ? 0.95 : 0.1,
              reason: value.trim() ? 'Manually edited by the user.' : 'Cleared by the user.',
            }
          : f,
      )
      return { ...prev, fields, readinessScore: computeReadinessScore(fields) }
    })
  }, [])

  const loadOrbitOpsDemo = useCallback(() => {
    setModeState('scripted')
    setBriefs((prev) =>
      prev.some((b) => b.projectName === ORBITOPS_BRIEF.projectName) ? prev : [ORBITOPS_BRIEF, ...prev],
    )
    setActiveBriefIdState(ORBITOPS_BRIEF.projectName)
    setActiveTemplateIdState('bug-report')
    setRawIntake(DEMO_INTAKE)
    setTicket(null)
    setAnswers([])
    setHasRefined(false)
    setChangedFieldIds([])
    setPhase('idle')
    setError(null)
    setScreen('forge')
  }, [])

  const store: AppStore = {
    mode,
    screen,
    briefs,
    activeBriefId,
    templates,
    activeTemplateId,
    rawIntake,
    ticket,
    hasRefined,
    answers,
    phase,
    progressSteps,
    progressIndex,
    changedFieldIds,
    refineNonce,
    error,
    setMode: (m) => {
      setModeState(m)
      setError(null)
    },
    setScreen,
    setActiveBriefId: setActiveBriefIdState,
    addBrief: (brief) => {
      setBriefs((prev) => {
        const others = prev.filter((b) => b.projectName !== brief.projectName)
        return [brief, ...others]
      })
      setActiveBriefIdState(brief.projectName)
    },
    removeBrief: (id) => {
      setBriefs((prev) => prev.filter((b) => b.projectName !== id))
      setActiveBriefIdState((prev) => (prev === id ? null : prev))
    },
    setTemplates: setTemplatesState,
    setActiveTemplateId: setActiveTemplateIdState,
    setRawIntake,
    setAnswer: (index, value) =>
      setAnswers((prev) => {
        const next = [...prev]
        next[index] = value
        return next
      }),
    useDemoAnswers: () => {
      if (!ticket) return
      setAnswers(ticket.clarifyingQuestions.map((_, i) => DEMO_ANSWERS[i] ?? ''))
    },
    loadOrbitOpsDemo,
    forgeTicket,
    refineTicket,
    updateFieldValue,
    clearTicket: () => {
      setTicket(null)
      setAnswers([])
      setHasRefined(false)
      setChangedFieldIds([])
      setPhase('idle')
      setError(null)
    },
    dismissError: () => setError(null),
  }

  return <AppContext.Provider value={store}>{children}</AppContext.Provider>
}

export function useApp(): AppStore {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function useActiveBrief(): RepoBrief | null {
  const { briefs, activeBriefId } = useApp()
  return briefs.find((b) => b.projectName === activeBriefId) ?? null
}

export function useActiveTemplate(): TicketTemplate {
  const { templates, activeTemplateId } = useApp()
  return templates.find((t) => t.id === activeTemplateId) ?? templates[0]
}
