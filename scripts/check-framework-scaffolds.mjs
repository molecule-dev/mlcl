#!/usr/bin/env node
/**
 * A fresh app scaffold of one app framework passes its own scripts, as a user runs them.
 *
 *   node scripts/check-framework-scaffolds.mjs <framework> [--no-test] [--keep]
 *   node scripts/check-framework-scaffolds.mjs --list   # the framework names, as JSON
 *
 * It runs this checkout's CLI (`bin/run.js`, so build it first): `mlcl create --type app
 * --framework <framework>`, in a temporary directory outside any workspace, then `npm install`
 * from npm at the pins registry.json writes, then `mlcl inject` (what `create --skip-install` tells
 * the user to run once the packages are installed: with no molecule checkout beside the CLI, as in
 * CI or on a user's machine, create cannot read the packages, so the bond files come from this
 * step), then the app's `typecheck`, `lint`, `format:check`,
 * `test` and `build` scripts (each one the scaffold defines), and checks that eslint read every
 * source file under src/. Each framework renders its own templates (templates/app/<framework>/),
 * so a template or a pin change can break one framework's scaffold while every other passes:
 * on 2026-11-22 the svelte layout kept passing `afterNavigate` after the pin moved to
 * @molecule/app-routing-sveltekit 3.0.0, whose `SvelteKitExports` reads `navigating` instead,
 * and every fresh svelte app failed svelte-check until a local run of the workspace gate saw it.
 *
 * The framework names are registry.json's `appFrameworks` keys; CI runs one job per name.
 * MLCL_SCAFFOLD_TMP names the parent directory for the scaffold (default: the OS temp dir).
 * Exits 1 naming each failed step with the tail of its output.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const MLCL = join(dirname(fileURLToPath(import.meta.url)), '..')
const frameworks = Object.keys(
  JSON.parse(readFileSync(join(MLCL, 'registry.json'), 'utf8')).appFrameworks ?? {},
)
const args = process.argv.slice(2)
if (args.includes('--list')) {
  console.log(JSON.stringify(frameworks))
  process.exit(0)
}
const framework = args.find((arg) => !arg.startsWith('--'))
if (!framework || !frameworks.includes(framework)) {
  console.error(
    `usage: check-framework-scaffolds.mjs <framework> [--no-test] [--keep]; ` +
      `the framework is one of registry.json's appFrameworks: ${frameworks.join(', ')}`,
  )
  process.exit(2)
}
const noTest = args.includes('--no-test')
const keep = args.includes('--keep')

/**
 * Runs a command, returning its status and combined output.
 *
 * @param {string} cmd - The executable.
 * @param {string[]} argv - Its arguments.
 * @param {string} cwd - Working directory.
 * @returns {{ ok: boolean, output: string }} Whether it exited 0, and what it printed.
 */
function run(cmd, argv, cwd) {
  const result = spawnSync(cmd, argv, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? String(result.error) : ''}`
  return { ok: result.status === 0, output }
}

/**
 * The source files under src/ that the app's eslint never opened. ESLint skips a file no config
 * names without a word, so a lint script can exit 0 having read no component at all.
 *
 * @param {string} dir - The installed app.
 * @returns {string[]} Paths relative to the app, empty when eslint read every one.
 */
function unlintedSources(dir) {
  const result = spawnSync('npx', ['eslint', 'src', '--format', 'json'], {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  })
  if (!result.stdout)
    throw new Error(`eslint wrote no report: ${result.stderr || result.error?.message}`)
  const linted = new Set(JSON.parse(result.stdout).map((entry) => entry.filePath))
  return readdirSync(join(dir, 'src'), { recursive: true })
    .filter((file) => /\.(ts|tsx|vue|svelte)$/.test(file))
    .map((file) => join(dir, 'src', file))
    .filter((file) => !linted.has(file))
    .map((file) => relative(dir, file))
}

// The project name is the directory name and must be lowercase; mkdtemp's suffix names the parent.
const parent = mkdtempSync(join(process.env.MLCL_SCAFFOLD_TMP ?? tmpdir(), 'mlcl-scaffold-'))
const dir = join(parent, `app-${framework}`)
const failures = []
const ran = []
try {
  const created = run(
    process.execPath,
    [
      join(MLCL, 'bin', 'run.js'),
      'create',
      dir,
      '--no-interactive',
      '--skip-install',
      '--type',
      'app',
      '--packages',
      '@molecule/app-routing',
      '--framework',
      framework,
    ],
    parent,
  )
  if (!created.ok) failures.push({ step: 'create', output: created.output })
  else {
    const installed = run('npm', ['install', '--no-audit', '--no-fund'], dir)
    const injected = installed.ok
      ? run(
          process.execPath,
          [
            join(MLCL, 'bin', 'run.js'),
            'inject',
            '--force',
            '--no-install',
            '--no-ai',
            '--no-test',
            '-p',
            dir,
          ],
          dir,
        )
      : null
    if (!installed.ok) failures.push({ step: 'install', output: installed.output })
    else if (!injected?.ok) failures.push({ step: 'inject', output: injected?.output ?? '' })
    else {
      const scripts = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts ?? {}
      const steps = ['typecheck', 'lint', 'format:check', ...(noTest ? [] : ['test']), 'build']
      for (const step of steps.filter((name) => scripts[name])) {
        const result = run('npm', ['run', step], dir)
        ran.push(step)
        if (!result.ok) failures.push({ step, output: result.output })
      }
      if (!scripts.build)
        failures.push({ step: 'build', output: 'the scaffold has no build script' })
      if (scripts.lint) {
        const unread = unlintedSources(dir)
        ran.push('lint-coverage')
        if (unread.length)
          failures.push({
            step: 'lint-coverage',
            output: `eslint never read ${unread.length} source file(s):\n${unread.join('\n')}`,
          })
      }
    }
  }
} finally {
  if (keep) console.log(`kept ${dir}`)
  else rmSync(parent, { recursive: true, force: true })
}
for (const { step, output } of failures)
  console.error(`✗ app-${framework} [${step}]\n${output.split('\n').slice(-40).join('\n')}\n`)
if (failures.length) process.exit(1)
console.log(`✓ app-${framework}: a fresh scaffold passes ${ran.join(', ')}`)
