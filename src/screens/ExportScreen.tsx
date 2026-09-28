import { useState } from 'react'
import { useApp } from '../state/AppStore'
import { EXPORTERS, type ExportFormat } from '../lib/exporters'
import { CopyButton, EmptyState } from '../components/common'

const FORMATS: ExportFormat[] = ['jira', 'github', 'linear', 'json']

export function ExportScreen() {
  const app = useApp()
  const [format, setFormat] = useState<ExportFormat>('github')

  const ticket = app.ticket
  const rendered = ticket && ticket.status !== 'unsupported' ? EXPORTERS[format].render(ticket) : null

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>Export</h1>
        <span className="sub">Export-only handoff — paste into Jira, GitHub, or Linear</span>
      </div>
      <div style={{ padding: '12px 16px 24px' }}>
        <div className="panel">
          <div className="tabs">
            {FORMATS.map((f) => (
              <button
                key={f}
                type="button"
                className={`tab ${format === f ? 'active' : ''}`}
                onClick={() => setFormat(f)}
                data-testid={`export-tab-${f}`}
              >
                {EXPORTERS[f].label}
              </button>
            ))}
          </div>
          {rendered ? (
            <div className="panel-body">
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <CopyButton text={rendered} label={`Copy ${EXPORTERS[format].label}`} />
              </div>
              <pre className="code-block" style={{ maxHeight: 720 }} data-testid="export-output">
                {rendered}
              </pre>
            </div>
          ) : (
            <EmptyState icon="→]">
              Nothing to export yet. Forge a ticket on the Forge screen first — the export formats
              render the structured ticket, including field grades and blockers.
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  )
}
