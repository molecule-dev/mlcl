import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { extractPackageApi } from '../api-extractor.js'
import { generateDocs } from '../docs-sync.js'
import type { Registry } from '../schema.js'

vi.mock('../api-extractor.js', async (importOriginal) => {
  const actual = await importOriginal<{ extractPackageApi: typeof extractPackageApi }>()
  return { ...actual, extractPackageApi: vi.fn(actual.extractPackageApi) }
})

const roots: string[] = []
const coreName = '@molecule/api-fixture'
const bondName = '@molecule/api-fixture-default'
const corePath = 'packages/api/core/fixture'
const bondPath = 'packages/api/bonds/fixture/default'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T00:00:00.000Z'))
})

afterEach(async () => {
  vi.useRealTimers()
  vi.resetAllMocks()
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

async function fixture(coreFirst = true): Promise<{ root: string; registry: Registry }> {
  const root = await mkdtemp(join(tmpdir(), 'docs-sync-extraction-'))
  roots.push(root)
  for (const [name, path] of [
    [coreName, corePath],
    [bondName, bondPath],
  ]) {
    await mkdir(join(root, path, 'src'), { recursive: true })
    await writeFile(join(root, path, 'package.json'), JSON.stringify({ name, version: '1.0.0' }))
  }
  await writeCore(root, 'initial')
  await writeFile(
    join(root, bondPath, 'src/index.ts'),
    '/** Default fixture. @module */\nexport const value = 1\n',
  )
  const core = [coreName, { path: corePath, type: 'core', stack: 'api', category: 'fixture' }]
  const bond = [
    bondName,
    { path: bondPath, type: 'bond', stack: 'api', category: 'fixture', implements: coreName },
  ]
  return {
    root,
    registry: { packages: Object.fromEntries(coreFirst ? [core, bond] : [bond, core]) } as Registry,
  }
}

async function writeCore(root: string, text: string): Promise<void> {
  await writeFile(
    join(root, corePath, 'src/index.ts'),
    `/**
 * Fixture ${text}.
 * @module
 * @e2e Verify ${text} fixture behavior.
 */
export interface Provider { value: string }
`,
  )
}

describe('README extraction within one generation', () => {
  it.each([true, false])('extracts a core only once when coreFirst=%s', async (coreFirst) => {
    const { root, registry } = await fixture(coreFirst)
    const docs = await generateDocs(registry, root)
    expect(docs).toHaveLength(2)
    expect(docs.find((doc) => doc.name === bondName)?.md).toContain(
      'Verify initial fixture behavior.',
    )
    const coreCalls = vi
      .mocked(extractPackageApi)
      .mock.calls.filter(([path]) => path === join(root, corePath))
    expect(coreCalls).toHaveLength(1)
  })

  it('keeps scoped output identical and observes changed source on the next generation', async () => {
    const { root, registry } = await fixture()
    const full = await generateDocs(registry, root)
    const scoped = await generateDocs(registry, root, [bondName])
    expect(scoped).toHaveLength(1)
    expect(scoped[0].md).toBe(full.find((doc) => doc.name === bondName)?.md)
    await writeCore(root, 'updated')
    const updated = await generateDocs(registry, root, [bondName])
    expect(updated[0].md).toContain('Verify updated fixture behavior.')
    expect(updated[0].md).not.toContain('Verify initial fixture behavior.')
  })
})
