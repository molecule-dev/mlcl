#!/usr/bin/env node
/**
 * Keep the HOST copies of a shared skill byte-identical to the ONE authored
 * source.
 *
 * The shared workflow guidance (`capability-first`) is authored once, in
 * `templates/.agents/skills/<name>/SKILL.md` — the file the molecule-dev
 * scaffold reads at scaffold time and writes into every sandbox
 * (`loadTemplateSkills` in `molecule-dev/api/src/ai/agents-dir-template.ts`).
 * Harnesses that never run that scaffold read a checked-in copy instead:
 *
 *   - `integrations/claude-code/plugins/molecule/skills/<name>/SKILL.md`
 *     (the Claude Code plugin users install)
 *   - `.agents/skills/<name>/SKILL.md`
 *     (agents working in this repo; `.claude` → `.agents` is a symlink)
 *
 * A copy that is edited on its own is exactly the drift this script exists to
 * end: the sandbox and the host would teach different orders. Run it after
 * editing the canonical file; `src/lib/__tests__/shared-skills.test.ts` fails
 * the suite until you do (and `--check` is the same comparison outside vitest).
 *
 * Usage:
 *   node scripts/sync-shared-skills.mjs           # write the copies
 *   node scripts/sync-shared-skills.mjs --check   # exit 1 on drift, write nothing
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MLCL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * The shared skills, and the destinations to keep in lockstep with each one.
 * Add a skill here only when it genuinely belongs on every surface; a skill
 * that names VM operations, credentials or release steps stays host-only and
 * must NOT be added (the sandbox copies are read by an execution agent in a
 * user's project).
 */
export const SHARED_SKILLS = [
  {
    name: 'capability-first',
    copies: [
      'integrations/claude-code/plugins/molecule/skills/capability-first/SKILL.md',
      '.agents/skills/capability-first/SKILL.md',
    ],
  },
]

const check = process.argv.includes('--check')
let drifted = 0

for (const skill of SHARED_SKILLS) {
  const source = join(MLCL_ROOT, 'templates', '.agents', 'skills', skill.name, 'SKILL.md')
  if (!existsSync(source)) {
    console.error(`missing canonical skill: ${source}`)
    process.exitCode = 1
    continue
  }
  const canonical = readFileSync(source, 'utf8')
  for (const relative of skill.copies) {
    const target = join(MLCL_ROOT, relative)
    if (existsSync(target) && readFileSync(target, 'utf8') === canonical) continue
    drifted++
    if (check) {
      console.error(`drifted: ${relative} — regenerate with node scripts/sync-shared-skills.mjs`)
      continue
    }
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, canonical)
    console.log(`synced ${relative}`)
  }
}

if (check && drifted > 0) process.exitCode = 1
else if (!check && drifted === 0) console.log('shared skills already in sync')
