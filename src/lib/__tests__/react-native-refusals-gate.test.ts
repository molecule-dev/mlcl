/**
 * The pre-commit check that every React feature still rendering DOM elements (molecule HEAD's
 * `eslint-rules/intrinsic-jsx-pending.json`) is refused in a React Native project by the staged
 * registry: by its own `webOnlyReason`, or through a required peer that has one.
 *
 * @module
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..', '..', '..')
const CANVAS = '@molecule/app-probe-canvas-react'
const MAP = '@molecule/app-probe-map-react'
const CHART = '@molecule/app-probe-chart-react'
let scratch: string
let molecule: string
let mlcl: string

const git = (dir: string, ...args: string[]): string =>
  execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@example.com', ...args], {
    encoding: 'utf8',
  })

/**
 * A registry entry for one probe feature.
 *
 * @param dir - Its directory under packages/app/features/.
 * @param moleculePeers - Its required `@molecule` peers.
 * @param webOnlyReason - Why it renders only in a browser, if it does.
 * @returns The entry.
 */
function entry(dir: string, moleculePeers: string[], webOnlyReason?: string): object {
  return {
    type: 'feature',
    category: dir,
    stack: 'app',
    label: dir,
    description: `The ${dir} probe`,
    path: `packages/app/features/${dir}`,
    exports: [],
    moleculePeers,
    runtimeDependencies: [],
    ...(webOnlyReason ? { webOnlyReason } : {}),
  }
}

/**
 * The registry text: the map requires the canvas, the chart stands alone.
 *
 * @param options - What to leave out.
 * @param options.canvasReason - The canvas's webOnlyReason (none when undefined).
 * @param options.chartReason - The chart's webOnlyReason (none when undefined).
 * @param options.withMap - Whether the map has an entry at all.
 * @returns The registry JSON.
 */
function registry({
  canvasReason = 'a pan-and-zoom surface on a DOM canvas',
  chartReason = 'draws on a DOM canvas',
  withMap = true,
}: { canvasReason?: string; chartReason?: string; withMap?: boolean } = {}): string {
  const packages: Record<string, object> = {
    [CANVAS]: entry('probe-canvas-react', [], canvasReason || undefined),
    [CHART]: entry('probe-chart-react', [], chartReason || undefined),
  }
  if (withMap) packages[MAP] = entry('probe-map-react', [CANVAS])
  return `${JSON.stringify({ version: 1, packages, moleculeVersions: { default: '1.0.0', overrides: {} } }, null, 2)}\n`
}

/**
 * Stages `registryText` in the fixture mlcl and runs the check against the fixture molecule.
 *
 * @param registryText - The registry to stage.
 * @returns The exit status and the combined output.
 */
function stageAndCheck(registryText: string): { status: number | null; output: string } {
  writeFileSync(join(mlcl, 'registry.json'), registryText)
  git(mlcl, 'add', 'registry.json')
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      'scripts/check-react-native-refusals.mjs',
      `--repo=${mlcl}`,
      `--molecule=${molecule}`,
    ],
    { cwd: root, encoding: 'utf8', timeout: 120_000 },
  )
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

/**
 * Writes molecule's pending list (relative to the fixture molecule).
 *
 * @param features - The pending feature directories.
 */
function writePending(features: string[]): void {
  writeFileSync(
    join(molecule, 'eslint-rules/intrinsic-jsx-pending.json'),
    `${JSON.stringify({ features, kitComponents: [] }, null, 2)}\n`,
  )
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'mlcl-rn-refusals-gate-'))
  molecule = join(scratch, 'molecule')
  mlcl = join(scratch, 'mlcl')
  mkdirSync(join(molecule, 'eslint-rules'), { recursive: true })
  mkdirSync(mlcl)
  for (const [dir, name] of [
    ['probe-canvas-react', CANVAS],
    ['probe-map-react', MAP],
    ['probe-chart-react', CHART],
  ] as const) {
    mkdirSync(join(molecule, 'packages/app/features', dir), { recursive: true })
    writeFileSync(
      join(molecule, 'packages/app/features', dir, 'package.json'),
      `${JSON.stringify({ name, version: '1.0.0' }, null, 2)}\n`,
    )
  }
  writePending(['probe-canvas-react', 'probe-map-react', 'probe-chart-react'])
  git(molecule, 'init', '-q')
  git(molecule, 'add', '-A')
  git(molecule, 'commit', '-qm', 'fixture')
  git(mlcl, 'init', '-q')
})

afterEach(() => rmSync(scratch, { recursive: true, force: true }))

describe('react native refusals gate', () => {
  it('passes when every pending feature is refused by its own reason or a web-only peer', () => {
    const { status, output } = stageAndCheck(registry())
    expect(output).toContain('3 DOM-rendering feature(s), each refused in a React Native project')
    expect(status).toBe(0)
  })

  it('known-bad: refuses a staged registry whose web-only peer lost its reason, naming each feature it exposes', () => {
    const { status, output } = stageAndCheck(registry({ canvasReason: '' }))
    expect(status).toBe(1)
    expect(output).toContain(`✗ ${CANVAS} renders DOM elements`)
    expect(output).toContain(`✗ ${MAP} renders DOM elements`)
    expect(output).toContain('give its registry entry a webOnlyReason')
    // The chart keeps its own reason.
    expect(output).not.toContain(`✗ ${CHART}`)
  })

  it('refuses a pending feature that has no registry entry', () => {
    const { status, output } = stageAndCheck(registry({ withMap: false }))
    expect(status).toBe(1)
    expect(output).toContain(`✗ ${MAP} renders DOM elements`)
    expect(output).toContain('has no registry entry')
  })

  it("reads molecule HEAD's pending list, not its working tree", () => {
    // A converted chart, committed: no reason needed any more.
    writePending(['probe-canvas-react', 'probe-map-react'])
    git(molecule, 'commit', '-qam', 'convert the chart')
    // Someone's uncommitted edit puts it back; the commit being checked cannot carry it.
    writePending(['probe-canvas-react', 'probe-map-react', 'probe-chart-react'])
    const { status, output } = stageAndCheck(registry({ chartReason: '' }))
    expect(output).toContain('2 DOM-rendering feature(s)')
    expect(status).toBe(0)
  })

  it('skips with a note when no molecule checkout sits beside mlcl', () => {
    rmSync(join(molecule, '.git'), { recursive: true, force: true })
    const { status, output } = stageAndCheck(registry({ canvasReason: '' }))
    expect(output).toContain('no molecule checkout')
    expect(status).toBe(0)
  })
})
