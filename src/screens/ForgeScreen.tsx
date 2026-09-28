import { useApp, useActiveBrief, useActiveTemplate, MODE_LABEL } from '../state/AppStore'
import {
  ConfidenceBar,
  EmptyState,
  ProgressSteps,
  QualityBadge,
  scoreTone,
} from '../components/common'
import { qualityTone } from '../lib/readiness'
import type { TicketField } from '../../shared/schemas'

function FieldRow({ field, changed, nonce }: { field: TicketField; changed: boolean; nonce: number }) {
  const app = useApp()
  const tone = qualityTone(field)
  return (
    <div
      key={changed ? `${field.id}-${nonce}` : field.id}
      className={`field-row ${changed ? 'changed' : ''}`}
      data-testid={`field-${field.id}`}
      data-tone={tone}
    >
      <div className="field-head">
        <span className="field-label">
          {field.label}
          {field.required && <span className="req">*</span>}
        </span>
        <span className="spacer" />
        <span className="source-tag">{field.source}</span>
        <ConfidenceBar confidence={field.confidence} tone={tone} />
        <QualityBadge field={field} />
      </div>
      <div className="field-value">
        <textarea
          value={field.value}
          rows={Math.min(6, Math.max(2, field.value.split('\n').length))}
          placeholder={field.required ? 'Required — currently empty' : 'Optional'}
          onChange={(e) => app.updateFieldValue(field.id, e.target.value)}
        />
      </div>
      <div className="field-reason">{field.reason}</div>
    </div>
  )
}

function IntakePanel() {
  const app = useApp()
  const brief = useActiveBrief()
  const template = useActiveTemplate()
  const working = app.phase === 'working'

  return (
    <div className="panel">
      <div className="panel-title">
        Raw Intake
        <span className="faint mono">{MODE_LABEL[app.mode]}</span>
      </div>
      <div className="panel-body">
        <textarea
          className="intake"
          data-testid="raw-intake"
          placeholder={
            'Paste the messy report as you received it.\n\nExample: "the dashboard is green but a checklist item is still blocked after I edited it…"'
          }
          value={app.rawIntake}
          onChange={(e) => app.setRawIntake(e.target.value)}
          disabled={working}
        />
        <div className="hint">
          Context: {brief ? brief.projectName : 'no repo brief'} · Template: {template.name}
        </div>
        <div className="btn-row">
          <button
            className="btn primary"
            type="button"
            data-testid="forge-button"
            onClick={() => void app.forgeTicket()}
            disabled={working || !app.rawIntake.trim()}
          >
            {working ? 'Working…' : 'Forge Ticket'}
          </button>
          <button
            className="btn ghost"
            type="button"
            data-testid="load-demo-button"
            onClick={app.loadOrbitOpsDemo}
            disabled={working}
          >
            Load OrbitOps Demo
          </button>
          {app.ticket && (
            <button className="btn ghost" type="button" onClick={app.clearTicket} disabled={working}>
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function TicketPanel() {
  const app = useApp()
  const t = app.ticket

  return (
    <div className="panel">
      <div className="panel-title">
        Structured Ticket
        {t && (
          <span
            className={`badge ${t.status === 'ticket' ? 'green' : t.status === 'needs_clarification' ? 'amber' : 'red'}`}
            data-testid="ticket-status"
          >
            {t.status.replace('_', ' ')}
          </span>
        )}
      </div>

      {app.phase === 'working' && (
        <div className="panel-body">
          <ProgressSteps steps={app.progressSteps} activeIndex={app.progressIndex} />
        </div>
      )}

      {app.phase !== 'working' && !t && (
        <EmptyState icon="[ ]">
          No ticket forged yet. Describe the problem in Raw Intake — or hit “Load OrbitOps Demo” for the
          scripted walkthrough — then press Forge Ticket.
        </EmptyState>
      )}

      {app.phase !== 'working' && t && t.status === 'unsupported' && (
        <EmptyState icon="!">
          {t.summary} The raw intake has been preserved — add detail and forge again.
        </EmptyState>
      )}

      {app.phase !== 'working' && t && t.status !== 'unsupported' && (
        <>
          <div className="ticket-head">
            <div className="ticket-title" data-testid="ticket-title">
              {t.title}
            </div>
            <div className="ticket-summary">{t.summary}</div>
            <div className="ticket-meta-row">
              <span className="badge cyan">{t.ticketType}</span>
              {t.suggestedLabels.map((l) => (
                <span key={l} className="chip">
                  {l}
                </span>
              ))}
            </div>
          </div>
          <div data-testid="ticket-fields">
            {t.fields.map((f) => (
              <FieldRow
                key={f.id}
                field={f}
                changed={app.changedFieldIds.includes(f.id)}
                nonce={app.refineNonce}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ReadinessPanel() {
  const app = useApp()
  const t = app.ticket
  const working = app.phase === 'working'

  if (!t || t.status === 'unsupported') {
    return (
      <div className="panel">
        <div className="panel-title">Readiness Review</div>
        <EmptyState icon="%">
          Readiness scoring, blockers, and clarifying questions appear here once a ticket is forged.
        </EmptyState>
      </div>
    )
  }

  const tone = scoreTone(t.readinessScore)
  const unanswered = t.clarifyingQuestions.length > 0

  return (
    <div className="panel">
      <div className="panel-title">Readiness Review</div>
      <div className="panel-body">
        <div className="score-block">
          <span className={`score-num ${tone}`} data-testid="readiness-score">
            {Math.round(t.readinessScore)}%
          </span>
          <span className="score-track">
            <span className={`fill ${tone}`} style={{ width: `${t.readinessScore}%` }} />
          </span>
        </div>
        {app.hasRefined && (
          <div className="score-delta section-gap" data-testid="score-delta">
            ↑ refined from initial pass
          </div>
        )}

        {t.readinessBlockers.length > 0 && (
          <div className="section-gap">
            <h4 className="side-h4">Blockers</h4>
            <ul className="mini-list blockers" data-testid="blockers">
              {t.readinessBlockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        {app.hasRefined && t.whatImproved.length > 0 && (
          <div className="section-gap">
            <h4 className="side-h4">What Improved</h4>
            <ul className="mini-list improved" data-testid="what-improved">
              {t.whatImproved.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {unanswered && (
          <div className="section-gap">
            <h4 className="side-h4">Clarifying Questions</h4>
            {t.clarifyingQuestions.map((q, i) => (
              <div className="question-block" key={q}>
                <div className="q">{q}</div>
                <input
                  type="text"
                  placeholder="Answer…"
                  value={app.answers[i] ?? ''}
                  onChange={(e) => app.setAnswer(i, e.target.value)}
                  disabled={working}
                  data-testid={`answer-${i}`}
                />
              </div>
            ))}
            <div className="btn-row">
              <button
                className="btn"
                type="button"
                data-testid="demo-answers-button"
                onClick={app.useDemoAnswers}
                disabled={working}
              >
                Use Demo Answers
              </button>
              <button
                className="btn primary"
                type="button"
                data-testid="refine-button"
                onClick={() => void app.refineTicket()}
                disabled={working || !app.answers.some((a) => a.trim())}
              >
                {working ? 'Working…' : 'Refine Ticket'}
              </button>
            </div>
          </div>
        )}

        {t.repoContextMatches.length > 0 && (
          <div className="section-gap">
            <h4 className="side-h4">Repo Context Matches</h4>
            <div data-testid="context-matches">
              {t.repoContextMatches.map((m) => (
                <div className="match-item" key={m.term}>
                  <span className="term">{m.term}</span> <span className="faint">→</span>{' '}
                  <span className="target">{m.matchedTo}</span>
                  <div className="note">{m.note}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {t.likelyAffectedFiles.length > 0 && (
          <div className="section-gap">
            <h4 className="side-h4">Likely Affected Files</h4>
            <ul className="file-list">
              {t.likelyAffectedFiles.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {t.assumptions.length > 0 && (
          <div className="section-gap">
            <h4 className="side-h4">Assumptions</h4>
            <ul className="mini-list">
              {t.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export function ForgeScreen() {
  const app = useApp()
  return (
    <div className="screen">
      <div className="screen-header">
        <h1>Forge</h1>
        <span className="sub">Messy intake + repo context + template → structured, validated ticket</span>
      </div>
      {app.error && (
        <div className="banner error" data-testid="error-banner">
          <span>{app.error}</span>
          <button type="button" onClick={app.dismissError} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      <div className="forge-grid">
        <IntakePanel />
        <TicketPanel />
        <ReadinessPanel />
      </div>
    </div>
  )
}
