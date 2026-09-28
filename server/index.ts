import path from 'node:path'
import fs from 'node:fs'
import express from 'express'
import { createApp } from './app'
import { aiStatus } from './providers'

// Load .env if present (Node 21.7+ builtin; no dotenv dependency needed).
try {
  process.loadEnvFile()
} catch {
  // No .env file — Scripted Demo and Mock AI modes work without one.
}

const app = createApp()
const port = Number(process.env.PORT || 8787)

// In production (or for E2E), serve the built frontend from dist/.
const distDir = path.resolve(import.meta.dirname, '../dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(port, () => {
  const status = aiStatus()
  console.log(`[ticketforge] API listening on http://localhost:${port}`)
  console.log(`[ticketforge] static frontend: ${fs.existsSync(distDir) ? distDir : 'not built (use vite dev)'}`)
  console.log(`[ticketforge] live AI: ${status.available ? `${status.provider} (${status.model})` : 'not configured'}`)
})
