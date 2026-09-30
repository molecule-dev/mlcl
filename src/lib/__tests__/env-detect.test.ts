import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import {
  classifyLocalEnvVars,
  detectLocalEnvVars,
  isToolingPath,
  localEnvState,
  readIsGuarded,
  scanEnvRefs,
  variableIsGuarded,
} from '../env-detect.js'

// ---------------------------------------------------------------------------
// Temp directory management
// ---------------------------------------------------------------------------
const tempDirs: string[] = []

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mlcl-test-env-detect-'))
  tempDirs.push(dir)
  return dir
}

afterAll(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// Pure guard detection (mirrors the IDE scan's semantics)
// ---------------------------------------------------------------------------
describe('readIsGuarded', () => {
  it('recognizes inline fallbacks and captures the literal', () => {
    expect(readIsGuarded(` || '3000')`)).toEqual({ guarded: true, defaultValue: '3000' })
    expect(readIsGuarded(` ?? 5`)).toEqual({ guarded: true, defaultValue: '5' })
  })

  it('recognizes a bare read as unguarded', () => {
    expect(readIsGuarded('')).toEqual({ guarded: false })
    expect(readIsGuarded('.trim()')).toEqual({ guarded: false })
  })

  it('counts comparisons and ternaries as handled absence', () => {
    expect(readIsGuarded(` === undefined`).guarded).toBe(true)
    expect(readIsGuarded(` ? a : b`).guarded).toBe(true)
  })
})

describe('variableIsGuarded', () => {
  it('sees a default applied a line down', () => {
    expect(variableIsGuarded(`if (raw === undefined) return 'x'`, 'raw').guarded).toBe(true)
    expect(variableIsGuarded(`const v = raw ?? 'y'`, 'raw').guarded).toBe(true)
  })

  it('does NOT credit a plain truthiness branch — it supplies no fallback', () => {
    expect(variableIsGuarded(`if (raw) { useIt() }`, 'raw').guarded).toBe(false)
  })
})

describe('isToolingPath', () => {
  it('drops tests, e2e, and root build config', () => {
    expect(isToolingPath('app/src/x.test.ts')).toBe(true)
    expect(isToolingPath('app/e2e/login.spec.ts')).toBe(true)
    expect(isToolingPath('app/vite.config.ts')).toBe(true)
    expect(isToolingPath('scripts/seed.ts')).toBe(true)
  })

  it('keeps app code, including src/scripts (the migration runner ships)', () => {
    expect(isToolingPath('api/src/config.ts')).toBe(false)
    expect(isToolingPath('api/src/scripts/migrate.ts')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// scanEnvRefs over a real directory tree
// ---------------------------------------------------------------------------
describe('scanEnvRefs', () => {
  it('collects reads from source, skipping node_modules and dot-dirs', async () => {
    const dir = await createTempDir()
    await mkdir(join(dir, 'src'), { recursive: true })
    await mkdir(join(dir, 'node_modules', 'pkg'), { recursive: true })
    await writeFile(join(dir, 'src', 'a.ts'), `export const k = process.env.MY_KEY\n`)
    await writeFile(join(dir, 'node_modules', 'pkg', 'i.js'), `process.env.SHOULD_NOT_APPEAR\n`)

    const refs = scanEnvRefs(dir)
    expect(refs.has('MY_KEY')).toBe(true)
    expect(refs.has('SHOULD_NOT_APPEAR')).toBe(false)
    expect(refs.get('MY_KEY')?.[0]?.file).toBe('src/a.ts')
  })
})

// ---------------------------------------------------------------------------
// localEnvState
// ---------------------------------------------------------------------------
describe('localEnvState', () => {
  it('counts a non-empty value as set and an EMPTY value as missing (scaffold stubs)', async () => {
    const dir = await createTempDir()
    await writeFile(join(dir, '.env'), 'FILLED=yes\nEMPTY=\n# COMMENTED=no\n')
    const state = localEnvState(dir)
    expect(state.keys.get('FILLED')).toBe('.env')
    expect(state.keys.has('EMPTY')).toBe(false)
    expect(state.keys.has('COMMENTED')).toBe(false)
  })

  it('reads api/.env and app/.env in a full-stack workspace', async () => {
    const dir = await createTempDir()
    await mkdir(join(dir, 'api'), { recursive: true })
    await mkdir(join(dir, 'app'), { recursive: true })
    await writeFile(join(dir, 'api', '.env'), 'PORT=4000\n')
    await writeFile(join(dir, 'app', '.env'), 'VITE_API_URL=http://x\n')
    const state = localEnvState(dir)
    expect(state.keys.get('PORT')).toBe('api/.env')
    expect(state.keys.get('VITE_API_URL')).toBe('app/.env')
  })
})

// ---------------------------------------------------------------------------
// classifyLocalEnvVars — the report contract
// ---------------------------------------------------------------------------
describe('classifyLocalEnvVars', () => {
  const noRefs = new Map()

  it('registry-declared required + unset → attention; provisioned → platform', () => {
    const registry = new Map(
      [
        {
          name: 'NEEDED_KEY',
          required: true,
          label: 'Needed',
          setupUrl: 'https://example.com',
        },
        { name: 'PROVIDED_KEY', required: false, provisioned: true },
      ].map((s) => [s.name, s]),
    )
    const report = classifyLocalEnvVars(noRefs, registry, new Map(), '/x', [], [])
    const needed = report.vars.find((v) => v.key === 'NEEDED_KEY')
    const provided = report.vars.find((v) => v.key === 'PROVIDED_KEY')
    expect(needed?.group).toBe('attention')
    expect(needed?.fix).toBe('declare')
    expect(needed?.setupUrl).toBe('https://example.com')
    expect(provided?.group).toBe('platform')
    expect(report.missingCount).toBe(1)
  })

  it('a set key wins over everything else', () => {
    const registry = new Map([['NEEDED_KEY', { name: 'NEEDED_KEY', required: true }]])
    const report = classifyLocalEnvVars(
      noRefs,
      registry,
      new Map([['NEEDED_KEY', '.env']]),
      '/x',
      [],
      ['.env'],
    )
    expect(report.vars[0]?.group).toBe('set')
    expect(report.missingCount).toBe(0)
  })

  it('a code-only read with a fallback is optional; without one is attention', () => {
    const refs = new Map([
      [
        'HAS_FALLBACK',
        [
          {
            key: 'HAS_FALLBACK',
            file: 'src/a.ts',
            line: 1,
            tooling: false,
            guarded: true,
            defaultValue: 'x',
          },
        ],
      ],
      [
        'NO_FALLBACK',
        [{ key: 'NO_FALLBACK', file: 'src/a.ts', line: 2, tooling: false, guarded: false }],
      ],
      [
        'TEST_ONLY',
        [{ key: 'TEST_ONLY', file: 'src/a.test.ts', line: 3, tooling: true, guarded: false }],
      ],
    ])
    const report = classifyLocalEnvVars(refs, new Map(), new Map(), '/x', [], [])
    const byKey = Object.fromEntries(report.vars.map((v) => [v.key, v]))
    expect(byKey.HAS_FALLBACK.group).toBe('optional')
    expect(byKey.HAS_FALLBACK.defaultValue).toBe('x')
    expect(byKey.NO_FALLBACK.group).toBe('attention')
    expect(byKey.NO_FALLBACK.files).toEqual(['src/a.ts:2'])
    expect(byKey.TEST_ONLY).toBeUndefined()
    expect(report.hiddenCount).toBe(1)
  })

  it('a code fallback makes a declared-required key optional', () => {
    const refs = new Map([
      [
        'CODE_DEFAULTED',
        [{ key: 'CODE_DEFAULTED', file: 'src/a.ts', line: 1, tooling: false, guarded: true }],
      ],
    ])
    const registry = new Map([['CODE_DEFAULTED', { name: 'CODE_DEFAULTED', required: true }]])
    const report = classifyLocalEnvVars(refs, registry, new Map(), '/x', [], [])
    expect(report.vars[0]?.group).toBe('optional')
  })
})

// ---------------------------------------------------------------------------
// detectLocalEnvVars — the orchestration over a fixture project
// ---------------------------------------------------------------------------
describe('detectLocalEnvVars', () => {
  it('unions code reads with registry declarations against .env state', async () => {
    const dir = await createTempDir()
    await mkdir(join(dir, 'src'), { recursive: true })
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { '@molecule/api-ai-anthropic': '1.0.0' } }),
    )
    await writeFile(
      join(dir, 'src', 'cfg.ts'),
      `export const port = parseInt(process.env.PORT || '3000')\nexport const t = process.env.CUSTOM_TOKEN\n`,
    )
    await writeFile(join(dir, '.env'), 'ANTHROPIC_API_KEY=sk-test\nPORT=4000\n')

    const report = detectLocalEnvVars(dir)
    const byKey = Object.fromEntries(report.vars.map((v) => [v.key, v]))
    expect(byKey.ANTHROPIC_API_KEY.group).toBe('set')
    expect(byKey.PORT.group).toBe('set')
    expect(byKey.CUSTOM_TOKEN.group).toBe('attention')
    expect(report.packages).toContain('@molecule/api-ai-anthropic')
    expect(report.envFiles).toEqual(['.env'])
    // The registry declaration (required, unset) counts.
    expect(report.missingCount).toBeGreaterThanOrEqual(1)
  })
})
