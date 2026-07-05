import type { TemplateField, TicketTemplate } from '../../shared/schemas'
import { DEFAULT_TEMPLATES } from './defaultTemplates'

// Pure template-editing helpers. The store persists results to localStorage.

export function cloneDefaults(): TicketTemplate[] {
  return JSON.parse(JSON.stringify(DEFAULT_TEMPLATES)) as TicketTemplate[]
}

export function slugifyFieldId(label: string, existing: TemplateField[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'field'
  let id = base
  let n = 2
  while (existing.some((f) => f.id === id)) {
    id = `${base}_${n}`
    n += 1
  }
  return id
}

export function addField(template: TicketTemplate, label: string, instructions = '', required = false): TicketTemplate {
  const field: TemplateField = {
    id: slugifyFieldId(label, template.fields),
    label: label.trim() || 'New Field',
    instructions,
    required,
  }
  return { ...template, fields: [...template.fields, field] }
}

export function removeField(template: TicketTemplate, fieldId: string): TicketTemplate {
  const field = template.fields.find((f) => f.id === fieldId)
  if (!field) return template
  if (field.required) {
    throw new Error('Required fields cannot be removed. Mark the field optional first.')
  }
  if (template.fields.length <= 1) {
    throw new Error('A template must keep at least one field.')
  }
  return { ...template, fields: template.fields.filter((f) => f.id !== fieldId) }
}

export function renameField(template: TicketTemplate, fieldId: string, label: string): TicketTemplate {
  return updateField(template, fieldId, { label: label.trim() || 'Untitled Field' })
}

export function setFieldInstructions(template: TicketTemplate, fieldId: string, instructions: string): TicketTemplate {
  return updateField(template, fieldId, { instructions })
}

export function setFieldRequired(template: TicketTemplate, fieldId: string, required: boolean): TicketTemplate {
  return updateField(template, fieldId, { required })
}

function updateField(
  template: TicketTemplate,
  fieldId: string,
  patch: Partial<Omit<TemplateField, 'id'>>,
): TicketTemplate {
  return {
    ...template,
    fields: template.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
  }
}

export function replaceTemplate(templates: TicketTemplate[], updated: TicketTemplate): TicketTemplate[] {
  return templates.map((t) => (t.id === updated.id ? updated : t))
}

export function resetTemplateToDefault(templates: TicketTemplate[], templateId: string): TicketTemplate[] {
  const fresh = cloneDefaults().find((t) => t.id === templateId)
  if (!fresh) return templates
  return templates.map((t) => (t.id === templateId ? fresh : t))
}

export function resetAllTemplates(): TicketTemplate[] {
  return cloneDefaults()
}
