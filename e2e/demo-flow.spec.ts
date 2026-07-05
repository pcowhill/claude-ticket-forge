import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'

const SCREENSHOT_DIR = 'e2e/__screenshots__'

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
})

async function readScore(page: Page): Promise<number> {
  const text = await page.getByTestId('readiness-score').innerText()
  return Number(text.replace('%', ''))
}

async function toneCounts(page: Page): Promise<Record<string, number>> {
  const counts: Record<string, number> = { red: 0, amber: 0, green: 0, gray: 0 }
  const rows = page.locator('[data-testid="ticket-fields"] .field-row')
  const n = await rows.count()
  for (let i = 0; i < n; i += 1) {
    const tone = await rows.nth(i).getAttribute('data-tone')
    if (tone && tone in counts) counts[tone] += 1
  }
  return counts
}

test('scripted OrbitOps demo: forge, clarify, refine, export', async ({ page }) => {
  await page.goto('/')

  // --- desktop layout sanity (1080p) ---
  const sidebar = page.locator('.sidebar')
  await expect(sidebar).toBeVisible()
  const sidebarBox = await sidebar.boundingBox()
  expect(sidebarBox!.width).toBeGreaterThan(200)
  expect(sidebarBox!.width).toBeLessThan(320)
  // no horizontal overflow
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)

  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-initial.png`, fullPage: false })

  // --- load the OrbitOps demo ---
  await page.getByTestId('load-demo-button').click()
  await expect(page.getByTestId('raw-intake')).toHaveValue(/readiness board says everything is green/)
  await expect(page.getByTestId('brief-select')).toHaveValue('OrbitOps Readiness Tracker')
  await expect(page.getByTestId('template-select')).toHaveValue('bug-report')

  // --- forge the initial ticket ---
  await page.getByTestId('forge-button').click()
  await expect(page.getByTestId('progress-steps')).toBeVisible()
  await expect(page.getByTestId('progress-steps')).toContainText('Applying repo context')
  await expect(page.getByTestId('ticket-title')).toBeVisible({ timeout: 15_000 })

  // readiness score around 62
  const initialScore = await readScore(page)
  expect(initialScore).toBeGreaterThanOrEqual(58)
  expect(initialScore).toBeLessThanOrEqual(66)

  await expect(page.getByTestId('ticket-status')).toContainText('needs clarification')

  // repo context understood: board + checklist matched via the active repo profile
  const matches = page.getByTestId('context-matches')
  await expect(matches).toContainText('readiness board')
  await expect(matches).toContainText('subsystem checklist')
  await expect(matches).toContainText('ReadinessBoard.tsx')

  // field quality mix before refinement
  const beforeTones = await toneCounts(page)
  expect(beforeTones.red).toBeGreaterThan(0)
  expect(beforeTones.amber).toBeGreaterThan(0)

  // clarifying questions present
  await expect(page.getByText('Which subsystem checklist item was blocked?')).toBeVisible()

  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-initial-ticket.png`, fullPage: false })

  // --- second pass: demo answers + refine ---
  await page.getByTestId('demo-answers-button').click()
  await expect(page.getByTestId('answer-0')).toHaveValue(/Thermal Control > Valve Calibration/)

  await page.getByTestId('refine-button').click()
  await expect(page.getByTestId('progress-steps')).toBeVisible()
  await expect(page.getByTestId('ticket-title')).toBeVisible({ timeout: 15_000 })

  // readiness score visibly increases, around 88
  const refinedScore = await readScore(page)
  expect(refinedScore).toBeGreaterThan(initialScore)
  expect(refinedScore).toBeGreaterThanOrEqual(84)
  expect(refinedScore).toBeLessThanOrEqual(92)

  // quality indicators improved: no red left, more green than before
  const afterTones = await toneCounts(page)
  expect(afterTones.red).toBe(0)
  expect(afterTones.green).toBeGreaterThan(beforeTones.green)

  // "what improved" summary is shown
  const improved = page.getByTestId('what-improved')
  await expect(improved).toBeVisible()
  await expect(improved).toContainText(/Reproduction is now exact/i)
  await expect(page.getByTestId('ticket-status')).toContainText('ticket')

  await page.screenshot({ path: `${SCREENSHOT_DIR}/03-refined-ticket.png`, fullPage: false })

  // --- export ---
  await page.getByTestId('nav-export').click()
  await page.getByTestId('export-tab-github').click()
  const output = page.getByTestId('export-output')
  await expect(output).toContainText('# Readiness Board rollup shows stale all-green')
  await expect(output).toContainText('## Steps to Reproduce')
  await expect(output).toContainText('Thermal Control > Valve Calibration')

  await page.getByTestId('export-tab-jira').click()
  await expect(output).toContainText('h1. Readiness Board rollup')

  await page.getByTestId('export-tab-json').click()
  await expect(output).toContainText('"readinessScore": 88')

  await page.screenshot({ path: `${SCREENSHOT_DIR}/04-export.png`, fullPage: false })
})

test('templates screen: edit fields and reset to defaults', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nav-templates').click()

  // add a custom field to the bug report
  await page.getByTestId('template-item-bug-report').click()
  await page.getByTestId('new-field-label').fill('Rollback Plan')
  await page.getByTestId('add-field-button').click()
  const newField = page.getByTestId('template-field-rollback_plan')
  await expect(newField).toBeVisible()

  // rename it and mark it required
  await newField.getByLabel('Field label').fill('Rollback / Mitigation Plan')
  await newField.getByRole('checkbox').check()
  // required fields cannot be removed
  await expect(newField.getByRole('button', { name: 'Remove' })).toBeDisabled()

  // survives reload (localStorage persistence)
  await page.reload()
  await page.getByTestId('nav-templates').click()
  await expect(page.getByTestId('template-field-rollback_plan')).toBeVisible()

  await page.screenshot({ path: `${SCREENSHOT_DIR}/06-templates.png`, fullPage: false })

  // reset restores the shipped default
  await page.getByTestId('reset-template').click()
  await expect(page.getByTestId('template-field-rollback_plan')).toHaveCount(0)
})

test('repo context screen: scan prompt and brief import validation', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nav-repo-context').click()

  // scan prompt is rendered and forbids secrets
  const prompt = page.getByTestId('scan-prompt')
  await expect(prompt).toContainText('Repo Brief')
  await expect(prompt).toContainText('NEVER include secrets')

  // invalid import shows a schema error
  await page.getByTestId('brief-import-input').fill('{"projectName": "X"}')
  await page.getByTestId('brief-import-button').click()
  await expect(page.getByTestId('brief-import-error')).toContainText('schema validation')

  // valid markdown-wrapped import succeeds and becomes active context
  const brief = {
    projectName: 'Imported Demo Project',
    stack: ['TypeScript'],
    architectureSummary: 'A small demo service.',
    keyDirectories: [{ path: 'src/', purpose: 'source' }],
    mainUserWorkflows: ['do things'],
    domainVocabulary: [{ term: 'widget', meaning: 'a demo unit' }],
    ticketRoutingHints: ['labels: bug, demo'],
    testCommands: ['npm test'],
    buildCommands: ['npm run build'],
    definitionOfReadyHints: ['has repro'],
    definitionOfDoneHints: ['tests pass'],
    commonRiskAreas: ['none'],
    notableConstraints: ['none'],
    likelyAffectedAreas: [{ area: 'core', files: ['src/index.ts'] }],
  }
  await page
    .getByTestId('brief-import-input')
    .fill('Here you go:\n```json\n' + JSON.stringify(brief, null, 2) + '\n```')
  await page.getByTestId('brief-import-button').click()
  await expect(page.getByTestId('brief-import-success')).toContainText('Imported “Imported Demo Project”')
  await expect(page.getByTestId('brief-select')).toHaveValue('Imported Demo Project')
  await expect(page.getByTestId('brief-summary')).toContainText('widget')

  await page.screenshot({ path: `${SCREENSHOT_DIR}/05-repo-context.png`, fullPage: false })
})
