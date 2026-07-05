import { useState } from 'react'
import { useApp } from '../state/AppStore'
import {
  addField,
  removeField,
  renameField,
  replaceTemplate,
  resetAllTemplates,
  resetTemplateToDefault,
  setFieldInstructions,
  setFieldRequired,
} from '../lib/templates'
import type { TicketTemplate } from '../../shared/schemas'

function FieldEditor({
  template,
  onChange,
}: {
  template: TicketTemplate
  onChange: (t: TicketTemplate) => void
}) {
  const [error, setError] = useState<string | null>(null)

  const apply = (fn: () => TicketTemplate) => {
    try {
      onChange(fn())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div>
      {error && (
        <div className="banner warn" style={{ margin: '0 0 10px' }}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}
      {template.fields.map((f) => (
        <div className="template-field-row" key={f.id} data-testid={`template-field-${f.id}`}>
          <div className="row">
            <input
              type="text"
              value={f.label}
              aria-label="Field label"
              onChange={(e) => apply(() => renameField(template, f.id, e.target.value))}
            />
            <label className="check">
              <input
                type="checkbox"
                checked={f.required}
                onChange={(e) => apply(() => setFieldRequired(template, f.id, e.target.checked))}
              />
              required
            </label>
            <button
              className="btn small danger"
              type="button"
              disabled={f.required}
              title={f.required ? 'Mark optional before removing' : 'Remove field'}
              onClick={() => apply(() => removeField(template, f.id))}
            >
              Remove
            </button>
          </div>
          <div className="row">
            <textarea
              rows={2}
              value={f.instructions}
              aria-label="Field instructions"
              placeholder="Instructions the AI follows when filling this field…"
              onChange={(e) => apply(() => setFieldInstructions(template, f.id, e.target.value))}
            />
          </div>
          <div className="row">
            <span className="source-tag">id: {f.id}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TemplatesScreen() {
  const app = useApp()
  const [selectedId, setSelectedId] = useState(app.activeTemplateId)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const selected = app.templates.find((t) => t.id === selectedId) ?? app.templates[0]

  const updateTemplate = (t: TicketTemplate) => {
    app.setTemplates(replaceTemplate(app.templates, t))
  }

  const handleAddField = () => {
    if (!newFieldLabel.trim()) return
    updateTemplate(addField(selected, newFieldLabel.trim()))
    setNewFieldLabel('')
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h1>Templates</h1>
        <span className="sub">Team-defined ticket shapes — edits persist locally</span>
      </div>
      <div className="two-col" style={{ gridTemplateColumns: '300px minmax(0,1fr)' }}>
        <div>
          <div className="panel">
            <div className="panel-title">Templates</div>
            <div className="panel-body">
              <div className="template-list">
                {app.templates.map((t) => (
                  <div
                    key={t.id}
                    className={`item ${t.id === selected.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(t.id)}
                    data-testid={`template-item-${t.id}`}
                  >
                    <div>
                      <div className="name">{t.name}</div>
                      <div className="desc">
                        {t.fields.length} fields · {t.fields.filter((f) => f.required).length} required
                      </div>
                    </div>
                    <span className="badge cyan">{t.ticketType}</span>
                  </div>
                ))}
              </div>
              <div className="btn-row">
                <button
                  className="btn ghost"
                  type="button"
                  data-testid="reset-all-templates"
                  onClick={() => app.setTemplates(resetAllTemplates())}
                >
                  Reset All to Defaults
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            Edit · {selected.name}
            <button
              className="btn small ghost"
              type="button"
              data-testid="reset-template"
              onClick={() => app.setTemplates(resetTemplateToDefault(app.templates, selected.id))}
            >
              Reset This Template
            </button>
          </div>
          <div className="panel-body">
            <p className="dim" style={{ marginBottom: 10 }}>
              {selected.description}
            </p>
            <FieldEditor template={selected} onChange={updateTemplate} />
            <div className="row" style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                type="text"
                placeholder="New field label…"
                value={newFieldLabel}
                data-testid="new-field-label"
                onChange={(e) => setNewFieldLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
              />
              <button
                className="btn"
                type="button"
                data-testid="add-field-button"
                onClick={handleAddField}
                disabled={!newFieldLabel.trim()}
              >
                Add Field
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
