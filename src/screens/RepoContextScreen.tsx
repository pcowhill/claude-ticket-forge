import { useState } from 'react'
import type { RepoBrief } from '../../shared/schemas'
import { useApp, useActiveBrief } from '../state/AppStore'
import { SCAN_PROMPT } from '../lib/scanPrompt'
import { parseRepoBrief } from '../lib/repoBriefImport'
import { CopyButton, EmptyState } from '../components/common'

function BriefSummary({ brief }: { brief: RepoBrief }) {
  return (
    <div data-testid="brief-summary">
      <div className="brief-section">
        <h4 className="side-h4">Project</h4>
        <dl className="kv-grid">
          <dt>Name</dt>
          <dd>{brief.projectName}</dd>
          <dt>Stack</dt>
          <dd>{brief.stack.join(', ')}</dd>
          <dt>Architecture</dt>
          <dd>{brief.architectureSummary}</dd>
        </dl>
      </div>
      <div className="brief-section">
        <h4 className="side-h4">Domain Vocabulary ({brief.domainVocabulary.length})</h4>
        {brief.domainVocabulary.map((v) => (
          <div key={v.term} className="match-item">
            <span className="term">{v.term}</span>
            <div className="note">{v.meaning}</div>
          </div>
        ))}
      </div>
      <div className="brief-section">
        <h4 className="side-h4">Key Directories</h4>
        <ul className="file-list">
          {brief.keyDirectories.map((d) => (
            <li key={d.path}>
              {d.path} <span className="faint">— {d.purpose}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="brief-section">
        <h4 className="side-h4">Likely Affected Areas</h4>
        {brief.likelyAffectedAreas.map((a) => (
          <div key={a.area} className="match-item">
            <span className="term">{a.area}</span>
            <div className="note mono">{a.files.join(' · ')}</div>
          </div>
        ))}
      </div>
      <div className="brief-section">
        <h4 className="side-h4">Definition of Ready</h4>
        <ul className="mini-list">
          {brief.definitionOfReadyHints.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>
      <div className="brief-section">
        <h4 className="side-h4">Common Risk Areas</h4>
        <ul className="mini-list">
          {brief.commonRiskAreas.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      <div className="brief-section">
        <h4 className="side-h4">Commands</h4>
        <dl className="kv-grid">
          <dt>Test</dt>
          <dd className="mono">{brief.testCommands.join(' · ') || '—'}</dd>
          <dt>Build</dt>
          <dd className="mono">{brief.buildCommands.join(' · ') || '—'}</dd>
        </dl>
      </div>
    </div>
  )
}

export function RepoContextScreen() {
  const app = useApp()
  const activeBrief = useActiveBrief()
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<{ error: string; issues?: string[] } | null>(null)
  const [importedName, setImportedName] = useState<string | null>(null)

  const handleImport = () => {
    setImportedName(null)
    const result = parseRepoBrief(importText)
    if (!result.ok) {
      setImportError({ error: result.error, issues: result.issues })
      return
    }
    setImportError(null)
    app.addBrief(result.brief)
    setImportedName(result.brief.projectName)
    setImportText('')
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>Repo Context</h1>
        <span className="sub">
          Scan a repository once with Claude Code, import the brief, reuse it for every ticket
        </span>
      </div>
      <div className="two-col">
        <div>
          <div className="panel">
            <div className="panel-title">
              1 · Generate Scan Prompt
              <CopyButton text={SCAN_PROMPT} label="Copy Prompt" />
            </div>
            <div className="panel-body">
              <p className="dim" style={{ marginBottom: 8 }}>
                Run Claude Code inside the target repository and paste this prompt. It returns a Repo
                Brief JSON object — structured context TicketForge uses to resolve domain terms, route
                tickets, and suggest affected files. The prompt explicitly forbids including secrets.
              </p>
              <pre className="code-block" data-testid="scan-prompt">
                {SCAN_PROMPT}
              </pre>
            </div>
          </div>

          <div className="panel section-gap">
            <div className="panel-title">2 · Import Repo Brief</div>
            <div className="panel-body">
              <textarea
                className="intake"
                data-testid="brief-import-input"
                placeholder={'Paste the Repo Brief here — raw JSON or a ```json fenced block from a Claude Code answer.'}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="btn-row">
                <button
                  className="btn primary"
                  type="button"
                  data-testid="brief-import-button"
                  onClick={handleImport}
                  disabled={!importText.trim()}
                >
                  Validate &amp; Import
                </button>
              </div>
              {importError && (
                <div className="banner error" style={{ margin: '10px 0 0' }} data-testid="brief-import-error">
                  <div>
                    {importError.error}
                    {importError.issues && (
                      <ul className="mini-list" style={{ marginTop: 6 }}>
                        {importError.issues.map((i) => (
                          <li key={i} className="mono">
                            {i}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
              {importedName && (
                <div className="hint copy-feedback" data-testid="brief-import-success">
                  Imported “{importedName}” and set it as the active project context. ✓
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            Active Project Context
            {activeBrief && (
              <button
                className="btn small danger"
                type="button"
                onClick={() => app.removeBrief(activeBrief.projectName)}
              >
                Remove
              </button>
            )}
          </div>
          <div className="panel-body">
            {activeBrief ? (
              <BriefSummary brief={activeBrief} />
            ) : (
              <EmptyState icon="{ }">
                No repo brief active. Import one on the left, or pick a stored brief from the sidebar.
                Tickets forged without context lose domain-term resolution and file hints.
              </EmptyState>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
