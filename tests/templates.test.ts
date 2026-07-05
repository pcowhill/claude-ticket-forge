import { describe, expect, it } from 'vitest'
import {
  addField,
  cloneDefaults,
  removeField,
  renameField,
  replaceTemplate,
  resetAllTemplates,
  resetTemplateToDefault,
  setFieldInstructions,
  setFieldRequired,
  slugifyFieldId,
} from '../src/lib/templates'
import { DEFAULT_TEMPLATES } from '../src/lib/defaultTemplates'

const bug = () => cloneDefaults().find((t) => t.id === 'bug-report')!

describe('template editing', () => {
  it('adds a field with a slugified unique id', () => {
    const t = addField(bug(), 'Customer Impact Zone', 'Where it hurts', false)
    const added = t.fields[t.fields.length - 1]
    expect(added.id).toBe('customer_impact_zone')
    expect(added.required).toBe(false)
    // Adding a colliding label gets a suffixed id.
    const t2 = addField(t, 'Customer Impact Zone')
    expect(t2.fields[t2.fields.length - 1].id).toBe('customer_impact_zone_2')
  })

  it('slugify falls back for symbol-only labels', () => {
    expect(slugifyFieldId('!!!', [])).toBe('field')
  })

  it('renames a field without touching its id', () => {
    const t = renameField(bug(), 'user_impact', 'Mission Impact')
    const f = t.fields.find((f) => f.id === 'user_impact')!
    expect(f.label).toBe('Mission Impact')
  })

  it('edits field instructions', () => {
    const t = setFieldInstructions(bug(), 'test_plan', 'Always include an E2E test.')
    expect(t.fields.find((f) => f.id === 'test_plan')!.instructions).toBe('Always include an E2E test.')
  })

  it('toggles required/optional', () => {
    const t = setFieldRequired(bug(), 'environment', true)
    expect(t.fields.find((f) => f.id === 'environment')!.required).toBe(true)
  })

  it('removes optional fields', () => {
    const t = removeField(bug(), 'environment')
    expect(t.fields.some((f) => f.id === 'environment')).toBe(false)
  })

  it('refuses to remove required fields', () => {
    expect(() => removeField(bug(), 'user_impact')).toThrow(/required/i)
  })

  it('resets a single template to its default', () => {
    const edited = replaceTemplate(cloneDefaults(), renameField(bug(), 'user_impact', 'X'))
    const reset = resetTemplateToDefault(edited, 'bug-report')
    const f = reset.find((t) => t.id === 'bug-report')!.fields.find((f) => f.id === 'user_impact')!
    expect(f.label).toBe('User Impact')
  })

  it('resets all templates to defaults', () => {
    const reset = resetAllTemplates()
    expect(reset).toEqual(DEFAULT_TEMPLATES)
    // and is a deep copy, not shared references
    expect(reset[0]).not.toBe(DEFAULT_TEMPLATES[0])
  })
})
