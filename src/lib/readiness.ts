import type { FieldQuality, TicketField } from '../../shared/schemas'

// How much a field in a given quality state contributes toward readiness.
const QUALITY_WEIGHT: Record<FieldQuality, number> = {
  solid: 1,
  needs_confirmation: 0.55,
  speculative: 0.3,
  missing: 0,
  not_applicable: 1, // deliberately N/A fields do not drag readiness down
}

// Readiness = weighted completeness of fields (required fields count 2x),
// blended with average confidence so vague-but-present fields still cost points.
export function computeReadinessScore(fields: TicketField[]): number {
  const scored = fields.filter((f) => !(f.quality === 'not_applicable' && !f.required))
  if (scored.length === 0) return 0

  let weightSum = 0
  let qualitySum = 0
  let confidenceSum = 0
  for (const f of scored) {
    const w = f.required ? 2 : 1
    weightSum += w
    qualitySum += QUALITY_WEIGHT[f.quality] * w
    confidenceSum += f.confidence * w
  }
  const quality = qualitySum / weightSum
  const confidence = confidenceSum / weightSum
  return Math.round((quality * 0.7 + confidence * 0.3) * 100)
}

export type QualityTone = 'red' | 'amber' | 'green' | 'gray'

// Visual grade: red for missing/speculative, amber for needs confirmation,
// green for solid, gray for optional/not-applicable.
export function qualityTone(field: Pick<TicketField, 'quality' | 'required'>): QualityTone {
  if (field.quality === 'not_applicable') return 'gray'
  if (field.quality === 'solid') return 'green'
  if (field.quality === 'needs_confirmation') return 'amber'
  // missing | speculative
  return field.required ? 'red' : 'gray'
}

export const QUALITY_LABEL: Record<FieldQuality, string> = {
  missing: 'Missing',
  speculative: 'Speculative',
  needs_confirmation: 'Needs confirmation',
  solid: 'Solid',
  not_applicable: 'N/A',
}
