import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it, vi } from 'vitest'

import {
  fixLanguageCount,
  fixLanguageList,
  fixTranslationKeys,
  validateDocs,
} from '../docs-validator.js'
import type { Registry, RegistryEntry } from '../schema.js'

// Mock scanExports used by validateExportDoc
vi.mock('../scanner.js', () => ({
  scanExports: vi.fn().mockResolvedValue([]),
}))

import { scanExports } from '../scanner.js'
const mockScanExports = vi.mocked(scanExports)

// ---------------------------------------------------------------------------
// Temp directory management
// ---------------------------------------------------------------------------
const tempDirs: string[] = []

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `docs-val-test-${prefix}-`))
  tempDirs.push(dir)
  return dir
}

afterAll(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// Helpers
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
    exports: [],
    secrets: [],
    runtimeDependencies: [],
    path: 'pkg',
    ...overrides,
  }
}

function makeRegistry(
  moleculeDir: string,
  packages: Record<string, Partial<RegistryEntry>>,
): Registry {
  const resolved: Record<string, RegistryEntry> = {}
  for (const [name, overrides] of Object.entries(packages)) {
    resolved[name] = makeRegistryEntry(overrides)
  }
  return { version: 1 as const, packages: resolved }
}

// ============================================================================
// fixLanguageCount
// ============================================================================
describe('fixLanguageCount', () => {
  it('replaces language count in markdown text', () => {
    const md = '5 languages supported: en, fr, de, es, it.'
    const result = fixLanguageCount(md, 3)
    expect(result).toContain('3 languages')
  })

  it('handles singular form', () => {
    const md = '1 language supported: en.'
    const result = fixLanguageCount(md, 5)
    expect(result).toContain('5 language')
  })
})

// ============================================================================
// fixLanguageList
// ============================================================================
describe('fixLanguageList', () => {
  it('replaces language list and sorts alphabetically', () => {
    const md = '3 languages supported: en, fr, de.'
    const result = fixLanguageList(md, ['fr', 'de', 'en', 'es'])
    expect(result).toContain('languages supported: de, en, es, fr.')
  })
})

// ============================================================================
// fixTranslationKeys
// ============================================================================
describe('fixTranslationKeys', () => {
  it('replaces translation keys table with correct data', () => {
    const md = [
      '## Translation Keys',
      '',
      '| Key | English |',
      '|-----|---------|',
      '| `old.key` | Old Value |',
      '',
      '## Other Section',
    ].join('\n')

    const result = fixTranslationKeys(md, {
      'new.key': 'New Value',
      'another.key': 'Another Value',
    })

    expect(result).toContain('`new.key`')
    expect(result).toContain('New Value')
    expect(result).toContain('`another.key`')
    expect(result).toContain('Another Value')
    expect(result).not.toContain('old.key')
  })

  it('replaces section when no table format exists', () => {
    const md = [
      '## Translation Keys',
      '',
      '### `old.key`',
      'Old description',
      '',
      '## Other Section',
    ].join('\n')

    const result = fixTranslationKeys(md, { 'new.key': 'New Value' })
    expect(result).toContain('`new.key`')
    expect(result).toContain('## Other Section')
  })
})

// ============================================================================
// validateDocs
// ============================================================================
describe('validateDocs', () => {
  it('detects title mismatch', async () => {
    const moleculeDir = await createTempDir('title-mismatch')
    const pkgDir = join(moleculeDir, 'pkg')
    await mkdir(pkgDir, { recursive: true })
    await writeFile(join(pkgDir, 'README.md'), '# @molecule/wrong-name\n\nSome docs.')

    const registry = makeRegistry(moleculeDir, {
      '@molecule/api-database': { path: 'pkg' },
    })

    const issues = await validateDocs(moleculeDir, registry)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.some((i) => i.type === 'title')).toBe(true)
    expect(issues[0].message).toContain('@molecule/wrong-name')
  })

  it('reports missing README.md files', async () => {
    const moleculeDir = await createTempDir('no-md')
    const pkgDir = join(moleculeDir, 'pkg')
    await mkdir(pkgDir, { recursive: true })
    // No README.md created

    const registry = makeRegistry(moleculeDir, {
      '@molecule/api-database': { path: 'pkg' },
    })

    const issues = await validateDocs(moleculeDir, registry)
    expect(issues.length).toBe(1)
    expect(issues[0].type).toBe('missing')
    expect(issues[0].message).toContain('--generate')
  })

  it('respects filterPackage parameter', async () => {
    const moleculeDir = await createTempDir('filter')
    const pkg1Dir = join(moleculeDir, 'pkg1')
    const pkg2Dir = join(moleculeDir, 'pkg2')
    await mkdir(pkg1Dir, { recursive: true })
    await mkdir(pkg2Dir, { recursive: true })
    await writeFile(join(pkg1Dir, 'README.md'), '# @molecule/wrong-name\n')
    await writeFile(join(pkg2Dir, 'README.md'), '# @molecule/also-wrong\n')

    const registry = makeRegistry(moleculeDir, {
      '@molecule/pkg1': { path: 'pkg1' },
      '@molecule/pkg2': { path: 'pkg2' },
    })

    const issues = await validateDocs(moleculeDir, registry, '@molecule/pkg1')
    // Should only have issues for pkg1, not pkg2
    expect(issues.every((i) => i.file.startsWith('pkg1/'))).toBe(true)
  })

  it('detects language count mismatch in locale package', async () => {
    const moleculeDir = await createTempDir('locale-count')
    const pkgDir = join(moleculeDir, 'pkg')
    const srcDir = join(pkgDir, 'src')
    await mkdir(srcDir, { recursive: true })
    await writeFile(join(srcDir, 'en.ts'), `export default { 'key': 'value' }\n`)
    await writeFile(join(srcDir, 'fr.ts'), `export default { 'key': 'valeur' }\n`)
    await writeFile(join(srcDir, 'index.ts'), '')
    await writeFile(join(srcDir, 'types.ts'), '')
    // Docs say 5 languages but only 2 exist
    await writeFile(
      join(pkgDir, 'README.md'),
      '# @molecule/api-locales-db\n\n5 languages supported: en, fr, de, es, it.\n',
    )

    const registry = makeRegistry(moleculeDir, {
      '@molecule/api-locales-db': { type: 'locales', path: 'pkg' },
    })

    const issues = await validateDocs(moleculeDir, registry)
    expect(issues.some((i) => i.type === 'language_count')).toBe(true)
  })

  it('detects missing language in language list', async () => {
    const moleculeDir = await createTempDir('locale-list')
    const pkgDir = join(moleculeDir, 'pkg')
    const srcDir = join(pkgDir, 'src')
    await mkdir(srcDir, { recursive: true })
    await writeFile(join(srcDir, 'en.ts'), `export default {}\n`)
    await writeFile(join(srcDir, 'fr.ts'), `export default {}\n`)
    await writeFile(join(srcDir, 'de.ts'), `export default {}\n`)
    await writeFile(join(srcDir, 'index.ts'), '')
    await writeFile(join(srcDir, 'types.ts'), '')
    // Docs list only en and fr, missing de
    await writeFile(
      join(pkgDir, 'README.md'),
      '# @molecule/api-locales-db\n\n3 languages supported: en, fr.\n',
    )

    const registry = makeRegistry(moleculeDir, {
      '@molecule/api-locales-db': { type: 'locales', path: 'pkg' },
    })

    const issues = await validateDocs(moleculeDir, registry)
    expect(issues.some((i) => i.type === 'language_list' && i.message.includes('de'))).toBe(true)
  })

  it('detects missing translation key', async () => {
    const moleculeDir = await createTempDir('locale-missing-key')
    const pkgDir = join(moleculeDir, 'pkg')
    const srcDir = join(pkgDir, 'src')
    await mkdir(srcDir, { recursive: true })
    await writeFile(
      join(srcDir, 'en.ts'),
      `export default {\n  'auth.login': 'Log In',\n  'auth.logout': 'Log Out',\n}\n`,
    )
    await writeFile(join(srcDir, 'index.ts'), '')
    // Docs only mention auth.login, missing auth.logout
    await writeFile(
      join(pkgDir, 'README.md'),
      [
        '# @molecule/api-locales-auth',
        '',
        '## Translation Keys',
        '',
        '| Key | English |',
        '|-----|---------|',
        '| `auth.login` | Log In |',
      ].join('\n'),
    )

    const registry = makeRegistry(moleculeDir, {
      '@molecule/api-locales-auth': { type: 'locales', path: 'pkg' },
    })

    const issues = await validateDocs(moleculeDir, registry)
    expect(
      issues.some((i) => i.type === 'translation_keys' && i.message.includes('auth.logout')),
    ).toBe(true)
  })

  it('detects phantom translation key in docs', async () => {
    const moleculeDir = await createTempDir('locale-phantom-key')
    const pkgDir = join(moleculeDir, 'pkg')
    const srcDir = join(pkgDir, 'src')
    await mkdir(srcDir, { recursive: true })
    await writeFile(join(srcDir, 'en.ts'), `export default {\n  'auth.login': 'Log In',\n}\n`)
    await writeFile(join(srcDir, 'index.ts'), '')
    // Docs mention a key that doesn't exist in source
    await writeFile(
      join(pkgDir, 'README.md'),
      [
        '# @molecule/api-locales-auth',
        '',
        '## Translation Keys',
        '',
        '| Key | English |',
        '|-----|---------|',
        '| `auth.login` | Log In |',
        '| `auth.phantom` | Ghost |',
      ].join('\n'),
    )

    const registry = makeRegistry(moleculeDir, {
      '@molecule/api-locales-auth': { type: 'locales', path: 'pkg' },
    })

    const issues = await validateDocs(moleculeDir, registry)
    expect(issues.some((i) => i.type === 'translation_keys' && i.message.includes('phantom'))).toBe(
      true,
    )
  })

  it('excludes .d.ts declaration files from language count', async () => {
    const moleculeDir = await createTempDir('locale-dts')
    const pkgDir = join(moleculeDir, 'pkg')
    const srcDir = join(pkgDir, 'src')
    await mkdir(srcDir, { recursive: true })
    await writeFile(join(srcDir, 'en.ts'), `export default { 'key': 'value' }\n`)
    await writeFile(join(srcDir, 'en.d.ts'), 'export declare const locale: object\n')
    await writeFile(join(srcDir, 'fr.ts'), `export default { 'key': 'valeur' }\n`)
    await writeFile(join(srcDir, 'fr.d.ts'), 'export declare const locale: object\n')
    await writeFile(join(srcDir, 'index.ts'), '')
    await writeFile(join(srcDir, 'index.d.ts'), '')
    await writeFile(join(srcDir, 'types.ts'), '')
    await writeFile(join(srcDir, 'types.d.ts'), '')
    // Docs correctly say 2 languages — .d.ts files should NOT be counted
    await writeFile(
      join(pkgDir, 'README.md'),
      '# @molecule/api-locales-db\n\n2 languages supported: en, fr.\n',
    )

    const registry = makeRegistry(moleculeDir, {
      '@molecule/api-locales-db': { type: 'locales', path: 'pkg' },
    })

    const issues = await validateDocs(moleculeDir, registry)
    expect(issues.filter((i) => i.type === 'language_count').length).toBe(0)
    expect(issues.filter((i) => i.type === 'language_list').length).toBe(0)
  })

  it('detects phantom class exports in non-locale packages', async () => {
    const moleculeDir = await createTempDir('phantom-class')
    const pkgDir = join(moleculeDir, 'pkg')
    const srcDir = join(pkgDir, 'src')
    await mkdir(srcDir, { recursive: true })
    await writeFile(join(srcDir, 'index.ts'), `export const foo = 1\n`)
    await writeFile(
      join(pkgDir, 'README.md'),
      '# @molecule/api-database\n\n| `FakeClass` | `class` |\n',
    )

    mockScanExports.mockResolvedValueOnce(['foo'])

    const registry = makeRegistry(moleculeDir, {
      '@molecule/api-database': { type: 'core', path: 'pkg' },
    })

    const issues = await validateDocs(moleculeDir, registry)
    expect(issues.some((i) => i.type === 'phantom_class' && i.message.includes('FakeClass'))).toBe(
      true,
    )
  })
})
