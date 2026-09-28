import type { ForgedTicket } from '../../shared/schemas'

// Export-only handoff formats. No live integrations — these produce text a
// user pastes into Jira, GitHub, or Linear.

function fieldLines(ticket: ForgedTicket, heading: (label: string) => string): string {
  return ticket.fields
    .filter((f) => f.value.trim().length > 0)
    .map((f) => `${heading(f.label)}\n${f.value.trim()}`)
    .join('\n\n')
}

function bulletList(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n')
}

export function toJiraMarkdown(ticket: ForgedTicket): string {
  const parts = [
    `h1. ${ticket.title}`,
    `*Type:* ${ticket.ticketType}  |  *Readiness:* ${ticket.readinessScore}%`,
    `*Labels:* ${ticket.suggestedLabels.join(', ') || '—'}`,
    '',
    `h2. Summary`,
    ticket.summary,
    '',
    fieldLines(ticket, (l) => `h2. ${l}`),
  ]
  if (ticket.likelyAffectedFiles.length) {
    parts.push('', 'h2. Likely Affected Files', ticket.likelyAffectedFiles.map((f) => `* {{${f}}}`).join('\n'))
  }
  if (ticket.assumptions.length) {
    parts.push('', 'h2. Assumptions', ticket.assumptions.map((a) => `* ${a}`).join('\n'))
  }
  if (ticket.readinessBlockers.length) {
    parts.push('', 'h2. Open Blockers', ticket.readinessBlockers.map((b) => `* ${b}`).join('\n'))
  }
  return parts.join('\n')
}

export function toGithubMarkdown(ticket: ForgedTicket): string {
  const parts = [
    `# ${ticket.title}`,
    '',
    `> **Type:** ${ticket.ticketType} · **Readiness:** ${ticket.readinessScore}% · **Labels:** ${
      ticket.suggestedLabels.join(', ') || '—'
    }`,
    '',
    `## Summary`,
    ticket.summary,
    '',
    fieldLines(ticket, (l) => `## ${l}`),
  ]
  if (ticket.likelyAffectedFiles.length) {
    parts.push('', '## Likely Affected Files', ticket.likelyAffectedFiles.map((f) => `- \`${f}\``).join('\n'))
  }
  if (ticket.assumptions.length) {
    parts.push('', '## Assumptions', bulletList(ticket.assumptions))
  }
  if (ticket.readinessBlockers.length) {
    parts.push('', '## Open Blockers', bulletList(ticket.readinessBlockers))
  }
  return parts.join('\n')
}

export function toLinearText(ticket: ForgedTicket): string {
  const parts = [
    ticket.title,
    '',
    `Type: ${ticket.ticketType} · Readiness: ${ticket.readinessScore}%`,
    `Labels: ${ticket.suggestedLabels.join(', ') || '—'}`,
    '',
    ticket.summary,
    '',
    fieldLines(ticket, (l) => `**${l}**`),
  ]
  if (ticket.likelyAffectedFiles.length) {
    parts.push('', '**Likely Affected Files**', ticket.likelyAffectedFiles.map((f) => `- ${f}`).join('\n'))
  }
  if (ticket.readinessBlockers.length) {
    parts.push('', '**Open Blockers**', bulletList(ticket.readinessBlockers))
  }
  return parts.join('\n')
}

export function toJsonExport(ticket: ForgedTicket): string {
  return JSON.stringify(ticket, null, 2)
}

export type ExportFormat = 'jira' | 'github' | 'linear' | 'json'

export const EXPORTERS: Record<ExportFormat, { label: string; render: (t: ForgedTicket) => string }> = {
  jira: { label: 'Jira Markdown', render: toJiraMarkdown },
  github: { label: 'GitHub Issue', render: toGithubMarkdown },
  linear: { label: 'Linear Issue', render: toLinearText },
  json: { label: 'JSON', render: toJsonExport },
}
