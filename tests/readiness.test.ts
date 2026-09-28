import { describe, expect, it } from 'vitest'
import { computeReadinessScore, qualityTone } from '../src/lib/readiness'
import type { TicketField } from '../shared/schemas'

function field(partial: Partial<TicketField>): TicketField {
  return {
    id: 'f',
    label: 'F',
    value: 'v',
    required: true,
    confidence: 0.5,
    quality: 'solid',
    reason: '',
    source: 'raw_intake',
    ...partial,
  }
}

describe('readiness scoring', () => {
  it('scores 100 for all-solid, full-confidence fields', () => {
    const fields = [field({ confidence: 1 }), field({ id: 'g', confidence: 1 })]
    expect(computeReadinessScore(fields)).toBe(100)
  })

  it('scores 0 for empty input', () => {
    expect(computeReadinessScore([])).toBe(0)
  })

  it('penalizes missing required fields more than optional ones', () => {
    const base = [field({ confidence: 0.9 }), field({ id: 'g', confidence: 0.9 })]
    const withMissingRequired = [...base, field({ id: 'h', quality: 'missing', confidence: 0.1, required: true })]
    const withMissingOptional = [...base, field({ id: 'h', quality: 'missing', confidence: 0.1, required: false })]
    expect(computeReadinessScore(withMissingRequired)).toBeLessThan(
      computeReadinessScore(withMissingOptional),
    )
  })

  it('ignores optional not-applicable fields', () => {
    const base = [field({ confidence: 1 })]
    const withNA = [...base, field({ id: 'g', quality: 'not_applicable', required: false, confidence: 0.2 })]
    expect(computeReadinessScore(withNA)).toBe(computeReadinessScore(base))
  })

  it('monotonically increases as quality improves', () => {
    const make = (q: TicketField['quality'], c: number) => [
      field({ quality: q, confidence: c }),
      field({ id: 'g', confidence: 0.8 }),
    ]
    const missing = computeReadinessScore(make('missing', 0.1))
    const speculative = computeReadinessScore(make('speculative', 0.3))
    const needsConf = computeReadinessScore(make('needs_confirmation', 0.5))
    const solid = computeReadinessScore(make('solid', 0.9))
    expect(missing).toBeLessThan(speculative)
    expect(speculative).toBeLessThan(needsConf)
    expect(needsConf).toBeLessThan(solid)
  })
})

describe('quality tones', () => {
  it('maps qualities to the documented colors', () => {
    expect(qualityTone({ quality: 'missing', required: true })).toBe('red')
    expect(qualityTone({ quality: 'speculative', required: true })).toBe('red')
    expect(qualityTone({ quality: 'needs_confirmation', required: true })).toBe('amber')
    expect(qualityTone({ quality: 'solid', required: true })).toBe('green')
    expect(qualityTone({ quality: 'not_applicable', required: false })).toBe('gray')
    // optional-and-empty renders gray, not red
    expect(qualityTone({ quality: 'missing', required: false })).toBe('gray')
  })
})
