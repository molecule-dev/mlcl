import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import {
  buildPackageContext,
  buildRegistryContext,
  loadMoleculeMd,
  loadMoleculeMdBatch,
} from '../ai-context.js'
import type { InferredPackage, Registry, RegistryEntry } from '../schema.js'

// ---------------------------------------------------------------------------
// Temp directory management
// ---------------------------------------------------------------------------
const tempDirs: string[] = []

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `ai-context-test-${prefix}-`))
  tempDirs.push(dir)
  return dir
}

afterAll(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
function makeRegistryEntry(overrides: Partial<RegistryEntry> = {}): RegistryEntry {
  return {
    language: 'typescript',
    runtime: 'node',
    type: 'core',
    category: 'database',
    label: 'Database',
    description: 'Database abstraction layer',
    stack: 'api',
    exports: ['query', 'connect'],
    secrets: [],
    runtimeDependencies: [],
    path: 'packages/api/core/database',
    ...overrides,
  }
}

function makeRegistry(packages: Record<string, RegistryEntry>): Registry {
  return { version: 1 as const, packages }
}

function makeInferredPackage(overrides: Partial<InferredPackage> = {}): InferredPackage {
  return {
    name: '@molecule/api-database',
    version: '1.0.0',
    type: 'core',
    routes: [],
    tables: [],
    exports: ['query', 'connect'],
    path: '/tmp/fake-package',
    dependencies: {},
    peerDependencies: {},
    ...overrides,
  }
}

// ============================================================================
// buildRegistryContext
// ============================================================================
describe('buildRegistryContext', () => {
  it('includes package names, types, and labels', () => {
    const registry = makeRegistry({
      '@molecule/api-database': makeRegistryEntry(),
    })
    const result = buildRegistryContext(registry)
    expect(result).toContain('@molecule/api-database')
    expect(result).toContain('[core]')
    expect(result).toContain('Database')
  })

  it('includes optional fields when present', () => {
    const registry = makeRegistry({
      '@molecule/api-database-postgresql': makeRegistryEntry({
        type: 'provider',
        implements: '@molecule/api-database',
        stack: 'api',
        exports: ['provider'],
        secrets: [{ name: 'DATABASE_URL', required: true }],
      }),
    })
    const result = buildRegistryContext(registry)
    expect(result).toContain('implements: @molecule/api-database')
    expect(result).toContain('stack: api')
    expect(result).toContain('exports: [provider]')
    expect(result).toContain('secrets: [DATABASE_URL]')
  })

  it('includes description when present', () => {
    const registry = makeRegistry({
      '@molecule/api-database': makeRegistryEntry({ description: 'SQL database support' }),
    })
    const result = buildRegistryContext(registry)
    expect(result).toContain('SQL database support')
  })

  it('includes multiSelect flag when true', () => {
    const registry = makeRegistry({
      '@molecule/api-oauth': makeRegistryEntry({ multiSelect: true }),
    })
    const result = buildRegistryContext(registry)
    expect(result).toContain('multiSelect: true')
  })

  it('handles minimal registry with no optional fields', () => {
    const entry = makeRegistryEntry({
      description: undefined,
      implements: undefined,
      defaultProvider: undefined,
      multiSelect: undefined,
      exports: [],
      secrets: [],
    })
    const registry = makeRegistry({ '@molecule/test': entry })
    const result = buildRegistryContext(registry)
    expect(result).toContain('@molecule/test')
    expect(result).toContain('category: database')
  })

  it('separates multiple packages with blank lines', () => {
    const registry = makeRegistry({
      '@molecule/api-database': makeRegistryEntry(),
      '@molecule/api-cache': makeRegistryEntry({ category: 'cache', label: 'Cache' }),
    })
    const result = buildRegistryContext(registry)
    expect(result).toContain('\n\n')
  })
})

// ============================================================================
// buildPackageContext
// ============================================================================
describe('buildPackageContext', () => {
  it('returns empty string for empty array', () => {
    expect(buildPackageContext([])).toBe('')
  })

  it('includes package name as heading', () => {
    const pkg = makeInferredPackage()
    const result = buildPackageContext([pkg])
    expect(result).toContain('# @molecule/api-database')
  })

  it('includes README.md content when present', () => {
    const pkg = makeInferredPackage({ moleculeMd: '## Usage\nSome usage docs' })
    const result = buildPackageContext([pkg])
    expect(result).toContain('## Usage\nSome usage docs')
  })

  it('includes exports section', () => {
    const pkg = makeInferredPackage({ exports: ['query', 'connect', 'end'] })
    const result = buildPackageContext([pkg])
    expect(result).toContain('## Exports')
    expect(result).toContain('query, connect, end')
  })

  it('includes implements and secrets from molecule metadata', () => {
    const pkg = makeInferredPackage({
      molecule: {
        type: 'provider',
        category: 'database',
        label: 'PostgreSQL',
        description: 'PostgreSQL provider',
        stack: 'api',
        language: 'typescript',
        runtime: 'node',
        implements: '@molecule/api-database',
        secrets: [{ name: 'DATABASE_URL', required: true }],
        exports: [],
        runtimeDependencies: [],
        path: 'packages/api/bonds/database/postgresql',
      } as RegistryEntry,
    })
    const result = buildPackageContext([pkg])
    expect(result).toContain('## Implements')
    expect(result).toContain('@molecule/api-database')
    expect(result).toContain('## Secrets')
    expect(result).toContain('DATABASE_URL')
  })

  it('separates multiple packages with --- dividers', () => {
    const packages = [
      makeInferredPackage({ name: '@molecule/api-database' }),
      makeInferredPackage({ name: '@molecule/api-cache' }),
    ]
    const result = buildPackageContext(packages)
    expect(result).toContain('---')
    expect(result).toContain('# @molecule/api-database')
    expect(result).toContain('# @molecule/api-cache')
  })
})

// ============================================================================
// loadMoleculeMd
// ============================================================================
describe('loadMoleculeMd', () => {
  it('returns file content when README.md exists', async () => {
    const dir = await createTempDir('load-md')
    await writeFile(join(dir, 'README.md'), '# Test Package\n\nSome docs.')
    const pkg = makeInferredPackage({ path: dir })
    const result = await loadMoleculeMd(pkg)
    expect(result).toBe('# Test Package\n\nSome docs.')
  })

  it('returns undefined when README.md does not exist', async () => {
    const dir = await createTempDir('load-md-missing')
    const pkg = makeInferredPackage({ path: dir })
    const result = await loadMoleculeMd(pkg)
    expect(result).toBeUndefined()
  })
})

// ============================================================================
// loadMoleculeMdBatch
// ============================================================================
describe('loadMoleculeMdBatch', () => {
  it('sets moleculeMd on packages that have README.md files', async () => {
    const dir1 = await createTempDir('batch-1')
    const dir2 = await createTempDir('batch-2')
    await writeFile(join(dir1, 'README.md'), 'docs for pkg1')

    const packages = [
      makeInferredPackage({ name: '@molecule/pkg1', path: dir1 }),
      makeInferredPackage({ name: '@molecule/pkg2', path: dir2 }),
    ]

    await loadMoleculeMdBatch(packages)

    expect(packages[0].moleculeMd).toBe('docs for pkg1')
    expect(packages[1].moleculeMd).toBeUndefined()
  })

  it('skips packages that already have moleculeMd', async () => {
    const dir = await createTempDir('batch-skip')
    await writeFile(join(dir, 'README.md'), 'new content')

    const packages = [makeInferredPackage({ path: dir, moleculeMd: 'existing content' })]

    await loadMoleculeMdBatch(packages)

    expect(packages[0].moleculeMd).toBe('existing content')
  })
})
