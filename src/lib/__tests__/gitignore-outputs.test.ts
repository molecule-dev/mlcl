/**
 * Anchoring regression — a scaffold ignore source must ignore a tool's OUTPUT
 * only at the directory where that command actually writes it.
 *
 * `dist/`, `coverage/`, `test-results/` … were written unanchored, so each
 * pattern matched at EVERY depth below its ignore file. Git therefore dropped a
 * SOURCE folder that happens to share an output's name — `app/src/pages/coverage/`,
 * `app/src/features/test-results/`, a vendored `…/dist/` — out of
 * `git ls-files -o --exclude-standard`, which is the ship set the deploy's build
 * copy copies (`takeDeployBuildSnapshot`). The app then fails `tsc` in the build
 * copy with TS2307, and no deploy rule can rescue the file: git dropped it first
 * (found by the P22 N3-paths source acceptance, finding Q1).
 *
 * Anchors are the same wherever the ignore file lands, because each scaffold
 * writes the ignore file into the PACKAGE whose commands produce the output:
 *
 * - `templates/apps/<app>/.gitignore` is the scaffolded project ROOT
 *   (`TEMPLATE_USER_COPY`), where the workspaces are `app/` and `api/` — the
 *   Vite build writes `app/dist`, the api build `api/dist`, and `--template`
 *   copies `playwright.config.ts` into `app/`, so Playwright's default
 *   `outputDir`/report folders sit in `app/` too;
 * - `templates/apps/<app>/app/.gitignore` and `…/api/.gitignore` are the package
 *   ignore files, so `/dist/` there is that package's own output;
 * - `templates/app/shared/gitignore.tpl` and `templates/app/shared/gitignore-svelte.tpl`
 *   are copied into an app package (`<root>/app/.gitignore` in a full-stack or
 *   static scaffold) and, for an app-only project, onto the project root — which
 *   IS the app package in that shape;
 * - `templates/api/gitignore.tpl` likewise lands in the api package and, for an
 *   api-only project or the root of a full-stack scaffold, on the project root.
 *
 * Two layers, because a text check alone can be satisfied by a pattern that
 * ignores nothing:
 *
 * 1. no scaffold ignore source carries an unanchored output line;
 * 2. `git check-ignore` on a real scaffold shape per source, with BOTH halves:
 *    the output the tool really writes is still ignored, and a source folder
 *    carrying the same name at depth is not.
 *
 * `node_modules/` is deliberately NOT in {@link OUTPUT_DIRECTORIES}: npm writes a
 * dependency tree beside every `package.json` at any depth (including a vendored
 * package below `src/`), so unanchored IS where that tool writes.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createReactNativeAppProject } from '../scaffold.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const TEMPLATES = join(ROOT, 'templates')

/**
 * Every directory pattern these ignore sources exist to drop, and the command
 * that writes it at the ignore file's own directory.
 */
const OUTPUT_DIRECTORIES: ReadonlyArray<{ pattern: string; writer: string }> = [
  { pattern: 'dist/', writer: '`vite build` / `tsc -b` in the package' },
  { pattern: 'coverage/', writer: '`vitest run --coverage` in the package' },
  { pattern: 'test-results/', writer: "Playwright's default `outputDir`, beside its config" },
  { pattern: 'playwright-report/', writer: "Playwright's default HTML report, beside its config" },
  { pattern: 'blob-report/', writer: "Playwright's blob reporter, beside its config" },
  { pattern: 'playwright/.cache/', writer: "Playwright's browser cache, beside its config" },
  { pattern: '.svelte-kit/', writer: '`svelte-kit sync` in the package' },
  { pattern: '.site-dev/', writer: "the static template's dev server build" },
  { pattern: '.expo/', writer: '`expo start` / `prebuild` at the project root' },
  { pattern: 'ios/', writer: '`expo prebuild` at the project root' },
  { pattern: 'android/', writer: '`expo prebuild` at the project root' },
]

/** The output directories whose writer runs at the scaffolded PROJECT ROOT only. */
const PROJECT_ROOT_OUTPUTS: ReadonlyArray<{ pattern: string; writer: string }> = [
  { pattern: 'molecule/', writer: 'the sandbox-vendored `@molecule/*` source tree, at /workspace' },
  { pattern: '.meilisearch/', writer: "the sidecar's index data, at the project root" },
]

const PATTERNS = [...OUTPUT_DIRECTORIES, ...PROJECT_ROOT_OUTPUTS].map((entry) => entry.pattern)

const unanchoredPatterns = (content: string): string[] => {
  const offenders: string[] = []
  content.split('\n').forEach((line, index) => {
    const bare = line.trim()
    if (bare === '' || bare.startsWith('#') || bare.startsWith('!')) return
    if (!PATTERNS.includes(bare) && !PATTERNS.includes(`${bare}/`)) return
    if (!bare.startsWith('/')) offenders.push(`line ${index + 1}: ${bare}`)
  })
  return offenders
}

/** Every committed ignore source a scaffold can emit, minus the generated RN one. */
const ignoreSources = (dir = TEMPLATES): string[] => {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      found.push(...ignoreSources(full))
      continue
    }
    if (entry === '.gitignore' || /^gitignore.*\.tpl$/.test(entry)) found.push(full)
  }
  return found.sort()
}

/**
 * Write `files` (dir-relative path → content) into a fresh directory and report
 * what real `git check-ignore` says about every candidate path.
 */
const checkIgnore = async (
  files: Record<string, string>,
  candidates: readonly string[],
): Promise<Record<string, boolean>> => {
  const repo = mkdtempSync(join(workdir, 'repo-'))
  execFileSync('git', ['init', '-q'], { cwd: repo })
  for (const [rel, content] of Object.entries(files)) {
    const target = join(repo, rel)
    await mkdir(join(target, '..'), { recursive: true })
    await writeFile(target, content)
  }
  const result: Record<string, boolean> = {}
  for (const candidate of candidates) {
    try {
      execFileSync('git', ['check-ignore', '-q', '--', candidate], { cwd: repo })
      result[candidate] = true
    } catch (_error) {
      // Non-zero exit is git's "not ignored" answer — the expected path for source.
      result[candidate] = false
    }
  }
  return result
}

const expectShape = async (
  label: string,
  files: Record<string, string>,
  expectations: { ignored: readonly string[]; source: readonly string[] },
): Promise<void> => {
  const status = await checkIgnore(files, [...expectations.ignored, ...expectations.source])
  for (const path of expectations.ignored) {
    expect(status[path], `${label}: the real output ${path} must stay ignored`).toBe(true)
  }
  for (const path of expectations.source) {
    expect(status[path], `${label}: the source folder ${path} must NOT be ignored`).toBe(false)
  }
}

let workdir: string
let flagship: string

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), 'mlcl-gitignore-outputs-'))
  flagship = readdirSync(join(TEMPLATES, 'apps'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) =>
      ['.gitignore', 'app/.gitignore', 'api/.gitignore'].every((rel) =>
        statSync(join(TEMPLATES, 'apps', name, rel), { throwIfNoEntry: false }),
      ),
    )
    .sort()[0]!
})

afterAll(() => {
  rmSync(workdir, { recursive: true, force: true })
})

describe('a scaffold ignore source ignores each output only where its command writes it', () => {
  it('no ignore source carries an unanchored output pattern', async () => {
    const sources = ignoreSources()

    // Sanity: the fleet the rule is about is actually present (not a vacuous pass).
    expect(sources.length).toBeGreaterThan(400)

    const offenders = (
      await Promise.all(
        sources.map(async (file) =>
          unanchoredPatterns(await readFile(file, 'utf-8')).map(
            (offence) => `${relative(ROOT, file)} ${offence}`,
          ),
        ),
      )
    ).flat()

    expect(
      offenders,
      'anchor each output to the directory its command writes (prefix the line with "/"):\n' +
        offenders.join('\n'),
    ).toEqual([])
  })

  it('the React Native scaffold ignores its outputs at the project root only', async () => {
    const projectPath = join(workdir, 'rn-app')
    await createReactNativeAppProject(projectPath, 'rn-app')
    const content = await readFile(join(projectPath, '.gitignore'), 'utf-8')
    expect(unanchoredPatterns(content)).toEqual([])
    await expectShape(
      'react-native scaffold',
      { '.gitignore': content },
      {
        ignored: [
          'dist/index.js',
          'node_modules/x/index.js',
          '.expo/devices.json',
          'ios/Podfile',
          'android/build.gradle',
        ],
        source: ['src/dist/index.ts', 'src/ios/setup.ts', 'src/android/setup.ts'],
      },
    )
  })

  it('a flagship scaffold keeps every real output ignored and every source folder shipped', async () => {
    const dir = join(TEMPLATES, 'apps', flagship)
    const files: Record<string, string> = {
      '.gitignore': await readFile(join(dir, '.gitignore'), 'utf-8'),
      'app/.gitignore': await readFile(join(dir, 'app', '.gitignore'), 'utf-8'),
      'api/.gitignore': await readFile(join(dir, 'api', '.gitignore'), 'utf-8'),
    }
    await expectShape(`flagship ${flagship}`, files, {
      // `--template` copies playwright.config.ts into app/, and each workspace
      // build writes beside its own package.json.
      ignored: [
        'app/dist/assets/index.js',
        'api/dist/server.js',
        'app/coverage/index.html',
        'api/coverage/lcov.info',
        // A root-level run of the same tools writes these, and the deploy refuses both at the
        // project root: the root keeps them ignored beside each workspace’s.
        'dist/index.js',
        'coverage/lcov.info',
        // The template repo keeps its own runner config at the template root, so
        // that shape's output stays ignored too.
        'test-results/.last-run.json',
        'playwright-report/index.html',
        'app/test-results/.last-run.json',
        'app/playwright-report/index.html',
        'app/blob-report/report.zip',
        'app/playwright/.cache/chromium/x',
        'app/node_modules/pkg/index.js',
        'api/node_modules/pkg/index.js',
        '.mol-install-x.pending',
        '.env.staging',
      ],
      source: [
        'app/src/pages/coverage/CoveragePage.tsx',
        'app/src/features/test-results/TestResultsPage.tsx',
        'app/src/charts/blob-report/data.ts',
        'app/src/vendor/chart/dist/chart.js',
        'api/src/uploads/limits.ts',
        'api/src/dist/legacy.ts',
      ],
    })
  })

  it('the app template ignore source is anchored whether it lands in app/ or on the root', async () => {
    const content = await readFile(join(TEMPLATES, 'app', 'shared', 'gitignore.tpl'), 'utf-8')
    // Full-stack/static: `<root>/app/.gitignore`.
    await expectShape(
      'app package',
      { 'app/.gitignore': content },
      {
        ignored: [
          'app/dist/assets/index.js',
          'app/coverage/index.html',
          'app/test-results/.last-run.json',
          'app/playwright-report/index.html',
          'app/blob-report/report.zip',
          'app/playwright/.cache/chromium/x',
          'app/.env.staging',
          'app/.mol-boot-timeline.log',
        ],
        source: [
          'app/src/pages/coverage/CoveragePage.tsx',
          'app/src/features/test-results/TestResultsPage.tsx',
          'app/src/vendor/chart/dist/chart.js',
          'app/public/coverage/terms.html',
        ],
      },
    )
    // App-only project: the same file IS the project root's ignore file.
    await expectShape(
      'app-only project',
      { '.gitignore': content },
      {
        ignored: [
          'dist/assets/index.js',
          'coverage/index.html',
          'test-results/.last-run.json',
          'playwright-report/index.html',
          'blob-report/report.zip',
          'playwright/.cache/chromium/x',
          '.meilisearch/data.ms',
        ],
        source: [
          'src/pages/coverage/CoveragePage.tsx',
          'src/features/test-results/TestResultsPage.tsx',
        ],
      },
    )
  })

  it('the svelte app template ignore source is anchored', async () => {
    const content = await readFile(
      join(TEMPLATES, 'app', 'shared', 'gitignore-svelte.tpl'),
      'utf-8',
    )
    await expectShape(
      'svelte app package',
      { 'app/.gitignore': content },
      {
        ignored: [
          'app/.svelte-kit/output/server.js',
          'app/dist/index.js',
          'app/coverage/index.html',
        ],
        source: ['app/src/.svelte-kit/kept.ts', 'app/src/routes/coverage/+page.svelte'],
      },
    )
  })

  it('the api template ignore source is anchored whether it lands in api/ or on the root', async () => {
    const content = await readFile(join(TEMPLATES, 'api', 'gitignore.tpl'), 'utf-8')
    await expectShape(
      'api package',
      { 'api/.gitignore': content },
      {
        ignored: [
          'api/dist/server.js',
          'api/coverage/lcov.info',
          'api/node_modules/pkg/index.js',
          'api/.env.staging',
          'api/.mol-install-x.log',
        ],
        source: ['api/src/uploads/limits.ts', 'api/src/dist/legacy.ts', 'api/src/molecule/kept.ts'],
      },
    )
    await expectShape(
      'api-only project',
      { '.gitignore': content },
      {
        ignored: [
          'dist/server.js',
          'coverage/lcov.info',
          'molecule/packages/x/index.ts',
          'node_modules/x/index.js',
          '.meilisearch/data.ms',
        ],
        source: ['src/uploads/limits.ts', 'src/dist/legacy.ts'],
      },
    )
  })

  it('the static-site-thin app ignore source is anchored', async () => {
    const content = await readFile(
      join(TEMPLATES, 'apps', 'static-site-thin', 'app', '.gitignore'),
      'utf-8',
    )
    await expectShape(
      'static-site-thin app package',
      { 'app/.gitignore': content },
      {
        ignored: [
          'app/.site-dev/server.js',
          'app/build.building-1/index.html',
          'app/test-results/.last-run.json',
          'app/playwright-report/index.html',
        ],
        source: ['app/src/.site-dev/kept.ts', 'app/src/pages/test-results/TestResultsPage.tsx'],
      },
    )
  })
})
