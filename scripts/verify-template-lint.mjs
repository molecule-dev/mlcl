#!/usr/bin/env node
/**
 * Fleet template lint gate.
 *
 * Runs each flagship template's OWN `eslint` (and, with `--fix`, its autofix)
 * over its `app/` and `api/` workspaces. The companion to
 * `verify-template-types.mjs`: that one proves a template type-checks, this one
 * proves it lints.
 *
 * Why this cannot be folded into mlcl's root `npm run lint`: every template
 * workspace is a self-contained project with its OWN `eslint.config.js` and
 * `tsconfig.json`. Linting them from mlcl's root config makes typescript-eslint
 * see several candidate TSConfig roots and refuse to parse — 28,485 fatal
 * "No tsconfigRootDir was set" errors, one per file, which is also enough output
 * to crash ESLint's own formatter. `templates/apps/**` is therefore excluded
 * from the root config, and lint coverage comes from here instead.
 *
 * Why it matters: `mlcl create` copies these files out verbatim, so whatever
 * lints dirty here lints dirty in the user's brand-new project the first time
 * they run `npm run lint` — before they have written a line.
 *
 * Exit 0 if every workspace is clean; exit 1 (with the failing list) otherwise.
 *
 * Usage:
 *   node scripts/verify-template-lint.mjs             # all templates, app + api
 *   node scripts/verify-template-lint.mjs --app-only  # skip api/
 *   node scripts/verify-template-lint.mjs --fix       # apply eslint --fix
 *   node scripts/verify-template-lint.mjs <slug> ...  # only the named templates
 */
import { execFile } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const MLCL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const APPS_DIR = join(MLCL_ROOT, 'templates', 'apps')

// mlcl is a root workspace member, so npm hoists its deps (and their .bin
// shims) to the workspace root — mlcl's own node_modules/.bin usually holds
// only what can't dedupe (or nothing at all after a root install reifies the
// tree; a local eslint shim that survives that is residue of an older
// `cd mlcl && npm install`, which reinstates the fsChild shadow — see the
// workspace AGENTS.md). Resolve local-first so a standalone mlcl clone still
// works, then fall back to the hoisted root bin.
const ESLINT_BIN = [
  join(MLCL_ROOT, 'node_modules', '.bin', 'eslint'),
  join(MLCL_ROOT, '..', 'node_modules', '.bin', 'eslint'),
].find((p) => existsSync(p))
if (!ESLINT_BIN) {
  console.error(
    '✗ eslint binary not found in mlcl/node_modules/.bin or the workspace root — ' +
      'run `npm install` from the workspace root. (This is a tooling error, not lint dirt: ' +
      'every workspace below would otherwise be reported failing with 0 problems.)',
  )
  process.exit(1)
}

const args = process.argv.slice(2)
const appOnly = args.includes('--app-only')
const fix = args.includes('--fix')
const slugs = args.filter((a) => !a.startsWith('--'))

const apps = (
  slugs.length
    ? slugs
    : readdirSync(APPS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
).filter((slug) => existsSync(join(APPS_DIR, slug)))

/** Every workspace to lint, as `{ slug, ws, dir }`. */
const targets = []
for (const slug of apps) {
  for (const ws of appOnly ? ['app'] : ['app', 'api']) {
    const dir = join(APPS_DIR, slug, ws)
    if (existsSync(join(dir, 'eslint.config.js')) && existsSync(join(dir, 'src'))) {
      targets.push({ slug, ws, dir })
    }
  }
}

// Every committed template eslint.config.js must be byte-identical to the shared
// .tpl. `mlcl create` OVERWRITES each workspace's config with the .tpl (see
// scaffold.ts "eslint.config is shared INFRA"), precisely because these copies
// have drifted before — the comment there cites configs that predated the
// snake_case-variable allowance. So if a copy differs, this gate is linting a
// config the USER will never get, and its verdict means nothing. Checked first:
// a stale copy invalidates every result below it.
const tplPath = join(MLCL_ROOT, 'templates', 'shared', 'eslint.config.js.tpl')
if (existsSync(tplPath)) {
  const tpl = readFileSync(tplPath, 'utf8')
  const stale = targets
    .map((t) => join(t.dir, 'eslint.config.js'))
    .filter((p) => readFileSync(p, 'utf8') !== tpl)
  if (stale.length > 0) {
    console.error(
      `\n✗ ${stale.length} template eslint.config.js differ from templates/shared/eslint.config.js.tpl:\n`,
    )
    for (const p of stale.slice(0, 10)) console.error(`  ${p}`)
    if (stale.length > 10) console.error(`  … and ${stale.length - 10} more`)
    console.error(
      `\n\`mlcl create\` overwrites these with the .tpl, so a drifted copy means this gate ` +
        `lints a config no user ever receives. Re-sync them from the .tpl.`,
    )
    process.exit(1)
  }
}

const failures = []
let checked = 0

/**
 * Lint one workspace with its own config.
 *
 * `--max-warnings 0` matches what each scaffolded project's `npm run lint`
 * enforces, so a green run here means a green run for the user.
 *
 * @param target - The workspace to lint.
 */
async function lintOne(target) {
  const flags = ['src', '--max-warnings', '0', ...(fix ? ['--fix'] : [])]
  try {
    await execFileAsync(ESLINT_BIN, flags, { cwd: target.dir, timeout: 300_000, maxBuffer: 32e6 })
  } catch (e) {
    const out = `${e.stdout || ''}${e.stderr || ''}`
    const lines = out
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^\d+:\d+/.test(l))
    // Zero problem lines but a non-zero exit is a TOOLING failure (eslint
    // crash, config error, ENOENT), not lint dirt — keep the raw head so the
    // report shows what actually broke instead of an empty detail list.
    const head = out
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 3)
    failures.push({ ...target, lines, head })
  }
  checked++
  process.stdout.write(`\r[${checked}/${targets.length}] linted — ${failures.length} failing   `)
}

// Bounded concurrency: each eslint run is its own process with a typed program,
// so this is CPU- and memory-bound, not IO-bound.
const CONCURRENCY = Math.max(2, Math.min(8, cpus().length - 2))
const queue = [...targets]
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) await lintOne(next)
  }),
)

process.stdout.write('\n')
if (failures.length === 0) {
  console.log(`✓ template lint clean — ${checked} workspaces, 0 problems`)
  process.exit(0)
}

const total = failures.reduce((n, f) => n + f.lines.length, 0)
console.error(`\n✗ ${failures.length} template workspace(s) with lint problems (${total} total):\n`)
for (const f of failures.slice(0, 40)) {
  console.error(`  ${f.slug}/${f.ws}  (${f.lines.length})`)
  for (const l of f.lines.slice(0, 3)) console.error(`    ${l}`)
  if (f.lines.length === 0) for (const l of f.head) console.error(`    ⚠ ${l}`)
}
if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`)
console.error(
  `\nFix these — \`mlcl create\` copies templates out verbatim, so a dirty template ` +
    `means the user's brand-new project fails \`npm run lint\` before they write a line. ` +
    `Re-run with --fix to apply the autofixable ones.`,
)
process.exit(1)
