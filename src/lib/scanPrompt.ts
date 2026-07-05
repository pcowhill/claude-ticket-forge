// Generates the prompt a user copies into Claude Code while inside a target
// repository, asking it to produce a Repo Brief JSON object.

export const SCAN_PROMPT = `You are helping me build reusable ticket-writing context for this repository.

Inspect this codebase (directory layout, package manifests, key modules, tests, docs) and return a single JSON object called a Repo Brief. Do not modify any files.

STRICT RULES:
- Output ONLY one fenced \`\`\`json code block containing the object. No prose before or after.
- NEVER include secrets, API keys, tokens, credentials, .env values, or internal URLs.
- Keep every string concise and factual. Prefer terms an engineer on this team actually uses.
- If something is unknown, use an empty array or a short honest placeholder — do not invent details.

The JSON object must match exactly this shape:

{
  "projectName": string,                     // human name of the project
  "stack": string[],                         // languages, frameworks, key tooling
  "architectureSummary": string,             // 2-4 sentences on how the system fits together
  "keyDirectories": [{ "path": string, "purpose": string }],
  "mainUserWorkflows": string[],             // what users actually do with this software
  "domainVocabulary": [{ "term": string, "meaning": string }],  // team/domain terms a ticket writer should know
  "ticketRoutingHints": string[],            // which kinds of issues go where; common labels
  "testCommands": string[],
  "buildCommands": string[],
  "definitionOfReadyHints": string[],        // what a well-formed ticket for this repo must include
  "definitionOfDoneHints": string[],         // what closing a ticket typically requires
  "commonRiskAreas": string[],               // where bugs tend to cluster or regress
  "notableConstraints": string[],            // invariants, compliance rules, performance budgets
  "likelyAffectedAreas": [{ "area": string, "files": string[] }]  // feature areas mapped to representative files
}

Aim for 4-8 entries per array where the repository supports it. When done, print the fenced JSON block and nothing else.`
