import { useState, type ReactNode } from 'react'
import type { TicketField } from '../../shared/schemas'
import { QUALITY_LABEL, qualityTone, type QualityTone } from '../lib/readiness'

export function QualityBadge({ field }: { field: Pick<TicketField, 'quality' | 'required'> }) {
  const tone = qualityTone(field)
  return (
    <span className={`badge ${tone}`} data-quality={field.quality} data-tone={tone}>
      {QUALITY_LABEL[field.quality]}
    </span>
  )
}

export function ConfidenceBar({ confidence, tone }: { confidence: number; tone: QualityTone }) {
  const pct = Math.round(confidence * 100)
  return (
    <span className="conf-bar" title={`Confidence ${pct}%`} data-confidence={pct}>
      <span className={`fill ${tone}`} style={{ width: `${pct}%` }} />
    </span>
  )
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API can be unavailable (http, permissions) — fall back.
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button className="btn small" onClick={copy} type="button">
      {copied ? <span className="copy-feedback">Copied ✓</span> : label}
    </button>
  )
}

export function EmptyState({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <p>{children}</p>
    </div>
  )
}

export function ProgressSteps({ steps, activeIndex }: { steps: readonly string[]; activeIndex: number }) {
  return (
    <div className="progress-steps" data-testid="progress-steps">
      {steps.map((step, i) => {
        const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : ''
        return (
          <div key={step} className={`progress-step ${state}`}>
            <span className="marker">{i < activeIndex ? '✓' : ''}</span>
            {step}
          </div>
        )
      })}
    </div>
  )
}

export function scoreTone(score: number): QualityTone {
  if (score >= 80) return 'green'
  if (score >= 55) return 'amber'
  return 'red'
}
