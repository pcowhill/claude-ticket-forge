import { useEffect, useState } from 'react'
import { MODE_LABEL, useApp, type AppMode, type Screen } from '../state/AppStore'
import { fetchAiStatus } from '../lib/api'
import type { AiStatus } from '../../shared/schemas'

const MODES: AppMode[] = ['scripted', 'mock', 'live']

const NAV: { id: Screen; label: string }[] = [
  { id: 'forge', label: 'Forge' },
  { id: 'repo-context', label: 'Repo Context' },
  { id: 'templates', label: 'Templates' },
  { id: 'export', label: 'Export' },
]

export function Sidebar() {
  const app = useApp()
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null)

  useEffect(() => {
    if (app.mode !== 'live') return
    let cancelled = false
    fetchAiStatus().then((s) => {
      if (!cancelled) setAiStatus(s)
    })
    return () => {
      cancelled = true
    }
  }, [app.mode])

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="name">
          TICKET<span>FORGE</span>
        </div>
        <div className="tag">Engineering ticket intake console</div>
      </div>

      <div className="sidebar-section">
        <h3>Mode</h3>
        <div className="mode-list">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              className={`mode-btn ${app.mode === m ? 'active' : ''}`}
              onClick={() => app.setMode(m)}
              data-testid={`mode-${m}`}
            >
              <span className={`mode-dot ${m}`} />
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        {app.mode === 'live' && (
          <div className="sidebar-meta">Keys stay on the backend — never in the browser.</div>
        )}
      </div>

      <div className="sidebar-section">
        <h3>Project Context</h3>
        <select
          value={app.activeBriefId ?? ''}
          onChange={(e) => app.setActiveBriefId(e.target.value || null)}
          data-testid="brief-select"
        >
          <option value="">No repo brief</option>
          {app.briefs.map((b) => (
            <option key={b.projectName} value={b.projectName}>
              {b.projectName}
            </option>
          ))}
        </select>
        <div className="sidebar-meta">
          {app.activeBriefId
            ? 'Domain terms and file hints active.'
            : 'Tickets will be forged without repo context.'}
        </div>
      </div>

      <div className="sidebar-section">
        <h3>Ticket Template</h3>
        <select
          value={app.activeTemplateId}
          onChange={(e) => app.setActiveTemplateId(e.target.value)}
          data-testid="template-select"
        >
          {app.templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="sidebar-section">
        <h3>Navigate</h3>
        <div className="nav-list">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`nav-btn ${app.screen === n.id ? 'active' : ''}`}
              onClick={() => app.setScreen(n.id)}
              data-testid={`nav-${n.id}`}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        {app.mode === 'live' ? (
          <div className="ai-status" data-testid="ai-status">
            <span className={`dot ${aiStatus?.available ? 'ok' : 'bad'}`} />
            {aiStatus
              ? aiStatus.available
                ? `Live: ${aiStatus.provider} · ${aiStatus.model}`
                : aiStatus.detail
              : 'Checking AI availability…'}
          </div>
        ) : (
          <div>
            {app.mode === 'scripted'
              ? 'Deterministic demo — no keys, no network.'
              : 'Local mock engine — no keys, no network.'}
          </div>
        )}
      </div>
    </aside>
  )
}
