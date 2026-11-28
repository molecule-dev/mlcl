#!/usr/bin/env node
/**
 * A fresh app scaffold of one app framework passes its own scripts, as a user runs them.
 *
 *   node scripts/check-framework-scaffolds.mjs <framework> [--with-features] [--no-test] [--keep] [--packs <dir>]
 *   node scripts/check-framework-scaffolds.mjs --list   # the framework names, as JSON
 *   node scripts/check-framework-scaffolds.mjs --classes <app dir>   # only the classes step
 *
 * It runs this checkout's CLI (`bin/run.js`, so build it first): `mlcl create --type app
 * --framework <framework>`, in a temporary directory outside any workspace, then `npm install`
 * from npm at the pins registry.json writes, then `mlcl inject` (what `create --skip-install` tells
 * the user to run once the packages are installed: with no molecule checkout beside the CLI, as in
 * CI or on a user's machine, create cannot read the packages, so the bond files come from this
 * step), then the app's `typecheck`, `lint`, `format:check`,
 * `test` and `build` scripts (each one the scaffold defines), checks that eslint read every
 * source file under src/, and checks that every class the app's bonded ClassMap returns gets a
 * style in the app's own build (`classes`, scripts/scaffold-classes.mjs: on a device that is
 * NativeWind's compiler; on the web, the CSS the build wrote). Each framework renders its own templates (templates/app/<framework>/),
 * so a template or a pin change can break one framework's scaffold while every other passes:
 * on 2026-11-22 the svelte layout kept passing `afterNavigate` after the pin moved to
 * @molecule/app-routing-sveltekit 3.0.0, whose `SvelteKitExports` reads `navigating` instead,
 * and every fresh svelte app failed svelte-check until a local run of the workspace gate saw it.
 * Angular also checks what Vite serves for the root component in dev. The plain Angular job
 * runs the same check on the visual showcase and boots its client build in jsdom.
 *
 * The framework names are registry.json's `appFrameworks` keys; CI runs one job per name.
 * --with-features scaffolds a full-stack project instead, with one package for each optional
 * feature the framework's templates gate (registry `optionalFeature`: password reset, two-factor,
 * payments, OAuth, push, the settings page, the footer), and checks its app: without them a
 * scaffold writes none of their pages, so the plain app check never compiles that code. Its API
 * runs the same scripts first (`api typecheck` … `api build`), then starts with its own `start`
 * script and must answer `GET /health` with 200 (`api serve`, scripts/scaffold-api-serve.mjs).
 * MLCL_SCAFFOLD_TMP names the parent directory for the scaffold (default: the OS temp dir).
 * --packs <dir> installs each `npm pack` tarball in <dir> in place of its registry pin (a direct
 * dependency and an `overrides` entry), to check a scaffold change against packages that are not
 * published yet; CI and Release never pass it.
 * Exits 1 naming each failed step with the tail of its output.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkApiServes } from './scaffold-api-serve.mjs'
import { checkScaffoldClasses } from './scaffold-classes.mjs'

const MLCL = join(dirname(fileURLToPath(import.meta.url)), '..')
const frameworks = Object.keys(
  JSON.parse(readFileSync(join(MLCL, 'registry.json'), 'utf8')).appFrameworks ?? {},
)
const args = process.argv.slice(2)
if (args.includes('--list')) {
  console.log(JSON.stringify(frameworks))
  process.exit(0)
}
/**
 * The value after a flag.
 *
 * @param {string} flag - The flag.
 * @returns {string | undefined} Its value, when given.
 */
const flagValue = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined)
const classesOnly = flagValue('--classes')
if (classesOnly) {
  const result = await checkScaffoldClasses(resolve(classesOnly))
  if (!result.ok) {
    console.error(`✗ ${classesOnly} [classes]\n${result.output}`)
    process.exit(1)
  }
  console.log(`✓ ${classesOnly} [classes]: ${result.output}`)
  process.exit(0)
}
const packs = flagValue('--packs')
const flagValues = new Set([packs].filter(Boolean))
const framework = args.find((arg) => !arg.startsWith('--') && !flagValues.has(arg))
if (!framework || !frameworks.includes(framework)) {
  console.error(
    `usage: check-framework-scaffolds.mjs <framework> [--with-features] [--no-test] [--keep] [--packs <dir>]; ` +
      `the framework is one of registry.json's appFrameworks: ${frameworks.join(', ')}`,
  )
  process.exit(2)
}
const noTest = args.includes('--no-test')
const keep = args.includes('--keep')
const withFeatures = args.includes('--with-features')

/**
 * The packages that turn on every optional feature this framework's templates gate (a feature an
 * API provider brings, this framework's own package such as the settings panel, or the package
 * `features.json` says selects it), as `mlcl create` derives them.
 *
 * @returns {Promise<string[]>} The package names.
 */
async function featurePackages() {
  const { templateFeaturePackages } = await import('../dist/lib/optional-features.js')
  const { loadRegistry } = await import('../dist/lib/registry.js')
  return templateFeaturePackages(join(MLCL, 'templates', 'app'), framework, loadRegistry())
}

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
  const result = spawnSync('npx', ['--loglevel=notice', 'eslint', 'src', '--format', 'json'], {
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

/**
 * Points the app's package.json at the tarballs in a directory: each one replaces the pin of the
 * package it holds, as a direct dependency (when the app has one) and in `overrides`, so every
 * package that depends on it gets the same copy.
 *
 * @param {string} dir - The app.
 * @param {string} packDir - The directory of `npm pack` tarballs.
 * @returns {string[]} The packages replaced.
 */
function usePacks(dir, packDir) {
  const file = join(dir, 'package.json')
  const pkg = JSON.parse(readFileSync(file, 'utf8'))
  const names = []
  for (const tarball of readdirSync(packDir).filter((name) => name.endsWith('.tgz'))) {
    const path = resolve(packDir, tarball)
    const manifest = JSON.parse(
      execFileSync('tar', ['-xOzf', path, 'package/package.json'], { encoding: 'utf8' }),
    )
    const spec = `file:${path}`
    for (const field of ['dependencies', 'devDependencies'])
      if (pkg[field]?.[manifest.name]) pkg[field][manifest.name] = spec
    pkg.overrides = { ...pkg.overrides, [manifest.name]: spec }
    names.push(manifest.name)
  }
  writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n')
  return names
}

/**
 * Checks the installed project's client transform without starting a listener.
 *
 * @param {string} dir - The project directory.
 * @param {string} url - The root component's module URL.
 * @param {string} component - The exported component class name.
 * @returns {{ ok: boolean, output: string }} The dev AOT check result.
 */
function checkAngularDevAot(dir, url, component) {
  return run(
    process.execPath,
    [join(MLCL, 'scripts', 'check-angular-dev-aot.mjs'), url, component],
    dir,
  )
}

/**
 * Checks the generated visual showcase in the standalone CI checkout.
 *
 * @param {string} parent - The temporary directory for the scaffold gate.
 * @returns {Promise<{ step: string, ok: boolean, output: string }[]>} The showcase check results.
 */
async function checkAngularShowcase(parent) {
  const { createShowcaseProject } = await import('../dist/lib/visual-test.js')
  const { getMoleculeVersion } = await import('../dist/lib/registry.js')
  const { npmInstallArgs } = await import('../dist/lib/npm-install.js')
  const dir = await createShowcaseProject('angular', parent)
  // The visual runner links the local fleet. CI installs the showcase's imports from npm.
  const packages = [
    '@molecule/app-angular',
    '@molecule/app-icons',
    '@molecule/app-icons-molecule',
    '@molecule/app-theme',
    '@molecule/app-theme-css-variables',
    '@molecule/app-ui',
    '@molecule/app-ui-angular',
    '@molecule/app-ui-showcase',
    '@molecule/app-ui-tailwind',
  ]
  const file = join(dir, 'package.json')
  const manifest = JSON.parse(readFileSync(file, 'utf8'))
  for (const name of packages) manifest.dependencies[name] = getMoleculeVersion(name)
  writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n')
  if (packs) usePacks(dir, packs)
  const install = run('npm', [...npmInstallArgs({ preferOffline: true }), '--ignore-scripts'], dir)
  if (!install.ok) return [{ step: 'showcase-install', ...install }]
  return [
    {
      step: 'showcase-dev-aot',
      ...checkAngularDevAot(dir, '/src/Showcase.ts', 'ShowcaseComponent'),
    },
    {
      step: 'showcase-render',
      ...run(process.execPath, [join(MLCL, 'scripts', 'check-angular-showcase-render.mjs')], dir),
    },
  ]
}

// The project name is the directory name and must be lowercase; mkdtemp's suffix names the parent.
const parent = mkdtempSync(join(process.env.MLCL_SCAFFOLD_TMP ?? tmpdir(), 'mlcl-scaffold-'))
const name = `${withFeatures ? 'features' : 'app'}-${framework}`
const dir = join(parent, name)
// A full-stack project keeps its app under app/; npm installs both halves from the root.
const appDir = withFeatures ? join(dir, 'app') : dir
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
      withFeatures ? 'full-stack' : 'app',
      '--packages',
      ['@molecule/app-routing', ...(withFeatures ? await featurePackages() : [])].join(','),
      '--framework',
      framework,
    ],
    parent,
  )
  if (!created.ok) failures.push({ step: 'create', output: created.output })
  else {
    if (packs) console.log(`packs in place of their pins: ${usePacks(dir, packs).join(', ')}`)
    const installed = run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=notice'], dir)
    const inject = (workspace) =>
      run(
        process.execPath,
        [
          join(MLCL, 'bin', 'run.js'),
          'inject',
          '--force',
          '--no-install',
          '--no-ai',
          '--no-test',
          '-p',
          workspace,
        ],
        dir,
      )
    let injected = null
    if (installed.ok)
      for (const workspace of withFeatures ? [join(dir, 'api'), appDir] : [dir]) {
        injected = inject(workspace)
        if (!injected.ok) break
      }
    if (!installed.ok) failures.push({ step: 'install', output: installed.output })
    else if (!injected?.ok) failures.push({ step: 'inject', output: injected?.output ?? '' })
    else {
      // A full-stack project's API runs the same scripts first, then starts and answers /health.
      for (const workspace of withFeatures ? [join(dir, 'api'), appDir] : [appDir]) {
        const label = (step) => (workspace === appDir ? step : `api ${step}`)
        const ws = JSON.parse(readFileSync(join(workspace, 'package.json'), 'utf8')).scripts ?? {}
        const steps = ['typecheck', 'lint', 'format:check', ...(noTest ? [] : ['test']), 'build']
        for (const step of steps.filter((name) => ws[name])) {
          // A fresh scaffold lints with no warning: the platform's build check runs ESLint with
          // --max-warnings 0, so a warning there fails the user's first build.
          const extra = step === 'lint' ? ['--', '--max-warnings', '0'] : []
          const result = run('npm', ['run', step, '--loglevel=notice', ...extra], workspace)
          // A fresh scaffold has no unit tests yet. Vitest says so and exits 0, or 1 under a
          // config that predates passWithNoTests; either is "0 unit tests", never a pass or a
          // failure.
          if (
            step === 'test' &&
            /^\s*No test files found, exiting with code [01]\s*$/m.test(result.output)
          ) {
            ran.push(label('test (0 unit tests)'))
            continue
          }
          ran.push(label(step))
          if (!result.ok) failures.push({ step: label(step), output: result.output })
        }
        if (!ws.build)
          failures.push({ step: label('build'), output: 'the scaffold has no build script' })
        if (workspace !== appDir && !failures.some((failure) => failure.step === label('build'))) {
          const served = await checkApiServes(workspace)
          ran.push(label('serve'))
          if (!served.ok) failures.push({ step: label('serve'), output: served.output })
        }
      }
      const scripts = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf8')).scripts ?? {}
      // A web app is judged on the CSS its build wrote, so a failed build has nothing to judge.
      if (!failures.some((failure) => failure.step === 'build')) {
        const classes = await checkScaffoldClasses(appDir)
        ran.push('classes')
        if (!classes.ok) failures.push({ step: 'classes', output: classes.output })
      }
      if (scripts.lint) {
        const unread = unlintedSources(appDir)
        ran.push('lint-coverage')
        if (unread.length)
          failures.push({
            step: 'lint-coverage',
            output: `eslint never read ${unread.length} source file(s):\n${unread.join('\n')}`,
          })
      }
      if (framework === 'angular') {
        const dev = checkAngularDevAot(appDir, '/src/app.component.ts', 'AppComponent')
        ran.push('dev-aot')
        if (!dev.ok) failures.push({ step: 'dev-aot', output: dev.output })
        if (!withFeatures) {
          for (const { step, ok, output } of await checkAngularShowcase(parent)) {
            ran.push(step)
            if (!ok) failures.push({ step, output })
          }
        }
      }
    }
  }
} finally {
  if (keep) console.log(`kept ${dir}`)
  else rmSync(parent, { recursive: true, force: true })
}
for (const { step, output } of failures)
  console.error(`✗ ${name} [${step}]\n${output.split('\n').slice(-40).join('\n')}\n`)
if (failures.length) process.exit(1)
console.log(`✓ ${name}: a fresh scaffold passes ${ran.join(', ')}`)
