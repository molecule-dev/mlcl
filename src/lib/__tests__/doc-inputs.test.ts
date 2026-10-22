import { describe, expect, it } from 'vitest'

import type { ExtractedModule } from '../api-extractor.js'
import { manifestChangeAffectsDocs, registryChangeAffectsDocs } from '../doc-inputs.js'
import { generateMoleculeMd, stripGeneratedTimestamp } from '../docs-generator.js'
import type { RegistryEntry } from '../schema.js'

/** A representative package.json, indented the way the fleet writes it. */
function manifest(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify(
    {
      name: '@molecule/api-ai-deepseek',
      version: '1.0.11',
      description: 'DeepSeek provider',
      dependencies: { '@molecule/api-ai': '1.0.1' },
      peerDependencies: { '@molecule/api-bond': '^1.0.1' },
      devDependencies: { typescript: '6.0.3', vitest: '4.1.11' },
      scripts: { test: 'vitest run' },
      ...overrides,
    },
    null,
    2,
  )
}

/** A manifest whose only difference is the vitest pin. */
const VITEST_BUMPED = manifest({
  devDependencies: { typescript: '6.0.3', vitest: '4.1.12' },
})

const EXTRACTED: ExtractedModule = {
  description: 'DeepSeek provider for the molecule ai core.',
  examples: ["import { provider } from '@molecule/api-ai-deepseek'"],
  exports: [
    {
      name: 'provider',
      kind: 'const',
      description: 'The DeepSeek provider.',
      declaration: 'const provider: AIProvider',
    },
  ],
}

const ENTRY: RegistryEntry = {
  language: 'typescript',
  runtime: 'node',
  type: 'provider',
  category: 'ai',
  label: 'DeepSeek',
  description: 'DeepSeek provider',
  stack: 'api',
  exports: ['provider'],
  secrets: [],
  path: 'packages/api/bonds/ai/deepseek',
  implements: '@molecule/api-ai',
}

describe('manifestChangeAffectsDocs — test-tool-only edits are not doc inputs', () => {
  it('ignores an exact vitest version bump', () => {
    expect(manifestChangeAffectsDocs(manifest(), VITEST_BUMPED)).toBe(false)
  })

  it('ignores adding or removing a vitest pin', () => {
    const withoutVitest = manifest({ devDependencies: { typescript: '6.0.3' } })
    expect(manifestChangeAffectsDocs(withoutVitest, manifest())).toBe(false)
    expect(manifestChangeAffectsDocs(manifest(), withoutVitest)).toBe(false)
    const noDevDependencies = manifest({ devDependencies: undefined })
    expect(
      manifestChangeAffectsDocs(
        noDevDependencies,
        manifest({ devDependencies: { vitest: '4.1.12' } }),
      ),
    ).toBe(false)
  })

  it('ignores a coupled @vitest/* package bump', () => {
    const before = manifest({
      devDependencies: { vitest: '4.1.12', '@vitest/coverage-v8': '4.1.11' },
    })
    const after = manifest({
      devDependencies: { vitest: '4.1.12', '@vitest/coverage-v8': '4.1.12' },
    })
    expect(manifestChangeAffectsDocs(before, after)).toBe(false)
  })

  it('keeps a formatting-only manifest edit out of scope', () => {
    const compact = JSON.stringify(JSON.parse(manifest()))
    expect(manifestChangeAffectsDocs(manifest(), compact)).toBe(false)
  })

  it('does not let a test-tool skip hide a REAL edit in the same manifest', () => {
    const bumpedPeer = manifest({
      peerDependencies: { '@molecule/api-bond': '^2.0.0' },
      devDependencies: { typescript: '6.0.3', vitest: '4.1.12' },
    })
    expect(manifestChangeAffectsDocs(manifest(), bumpedPeer)).toBe(true)
  })
})

describe('manifestChangeAffectsDocs — every other change stays in scope', () => {
  it('selects a peer dependency change', () => {
    expect(
      manifestChangeAffectsDocs(
        manifest(),
        manifest({ peerDependencies: { '@molecule/api-bond': '^1.0.2' } }),
      ),
    ).toBe(true)
  })

  it('selects a runtime dependency change', () => {
    expect(
      manifestChangeAffectsDocs(
        manifest(),
        manifest({ dependencies: { '@molecule/api-ai': '1.0.2' } }),
      ),
    ).toBe(true)
  })

  it('selects a moved type dependency, even one that mirrors a test tool', () => {
    const before = manifest({ devDependencies: { typescript: '6.0.3', vitest: '4.1.12' } })
    const moved = manifest({
      devDependencies: { typescript: '6.0.3', vitest: '4.1.12', '@types/node': '24.0.0' },
    })
    expect(manifestChangeAffectsDocs(before, moved)).toBe(true)
    expect(
      manifestChangeAffectsDocs(
        before,
        manifest({
          devDependencies: { typescript: '6.0.3', vitest: '4.1.12', '@types/node': '24.0.1' },
        }),
      ),
    ).toBe(true)
  })

  it('selects any other devDependency change — a package may provide types', () => {
    expect(
      manifestChangeAffectsDocs(
        manifest(),
        manifest({ devDependencies: { typescript: '6.0.3', vitest: '4.1.12', react: '19.2.4' } }),
      ),
    ).toBe(true)
  })

  it('selects a name change', () => {
    expect(
      manifestChangeAffectsDocs(manifest(), manifest({ name: '@molecule/api-ai-other' })),
    ).toBe(true)
  })

  it('selects a version bump or script edit (conservative: not proven inputs, so not skipped)', () => {
    expect(manifestChangeAffectsDocs(manifest(), manifest({ version: '1.0.12' }))).toBe(true)
    expect(manifestChangeAffectsDocs(manifest(), manifest({ scripts: { test: 'vitest' } }))).toBe(
      true,
    )
  })
})

describe('manifestChangeAffectsDocs — unknown inputs widen the scope', () => {
  it('selects an added or deleted manifest', () => {
    expect(manifestChangeAffectsDocs(null, manifest())).toBe(true)
    expect(manifestChangeAffectsDocs(manifest(), null)).toBe(true)
    expect(manifestChangeAffectsDocs(undefined, undefined)).toBe(true)
  })

  it('selects malformed JSON', () => {
    expect(manifestChangeAffectsDocs('{ not json', VITEST_BUMPED)).toBe(true)
    expect(manifestChangeAffectsDocs(manifest(), '{ not json')).toBe(true)
  })

  it('selects a malformed devDependencies value rather than assuming it is inert', () => {
    expect(manifestChangeAffectsDocs(manifest(), manifest({ devDependencies: [] }))).toBe(true)
    expect(manifestChangeAffectsDocs(manifest(), manifest({ devDependencies: 'vitest' }))).toBe(
      true,
    )
  })
})

describe('the generator output is a fixed point across a vitest-only manifest edit', () => {
  it('produces byte-identical README content for both pins', () => {
    const readme = (raw: string): string =>
      generateMoleculeMd(EXTRACTED, ENTRY, JSON.parse(raw), {
        moleculeDir: '/tmp/molecule',
        knownPackages: new Set([ENTRY.implements ?? '', '@molecule/api-ai']),
      })

    // Both reach the generator: it parses the manifest it is handed. Only the
    // generation timestamp differs, and every comparison strips it.
    expect(stripGeneratedTimestamp(readme(manifest()))).toBe(
      stripGeneratedTimestamp(readme(VITEST_BUMPED)),
    )
  })
})

/** A minimal registry document with all four top-level sections. */
function registry(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify(
    {
      version: 1,
      apiFrameworks: { express: { dependencies: { express: '5.2.1' } } },
      appFrameworks: { react: { dependencies: { react: '19.2.4' } } },
      toolchain: { moleculePackage: { vitest: '4.1.11' } },
      packages: { '@molecule/api-ai': { type: 'core', category: 'ai', stack: 'api' } },
      moleculeVersions: { '@molecule/api-ai': '1.0.1' },
      ...overrides,
    },
    null,
    2,
  )
}

describe('registryChangeAffectsDocs — version pins are not doc inputs', () => {
  it('ignores a toolchain-only change (a test-tool pin sync)', () => {
    const bumped = registry({ toolchain: { moleculePackage: { vitest: '4.1.12' } } })
    expect(registryChangeAffectsDocs(registry(), bumped)).toBe(false)
  })

  it('ignores a moleculeVersions-only change (a release pin bump)', () => {
    const bumped = registry({ moleculeVersions: { '@molecule/api-ai': '1.0.2' } })
    expect(registryChangeAffectsDocs(registry(), bumped)).toBe(false)
  })

  it('ignores a formatting-only registry edit', () => {
    expect(registryChangeAffectsDocs(registry(), JSON.stringify(JSON.parse(registry())))).toBe(
      false,
    )
  })

  it('selects a package metadata change', () => {
    const changed = registry({
      packages: { '@molecule/api-ai': { type: 'core', category: 'ai', stack: 'api', secrets: [] } },
    })
    expect(registryChangeAffectsDocs(registry(), changed)).toBe(true)
  })

  it('selects an app-framework token change', () => {
    const changed = registry({ appFrameworks: { vue: { dependencies: {} } } })
    expect(registryChangeAffectsDocs(registry(), changed)).toBe(true)
  })

  it('does not let a pin bump hide a metadata change in the same edit', () => {
    const changed = registry({
      toolchain: { moleculePackage: { vitest: '4.1.12' } },
      packages: { '@molecule/api-ai': { type: 'provider', category: 'ai', stack: 'api' } },
    })
    expect(registryChangeAffectsDocs(registry(), changed)).toBe(true)
  })

  it('selects missing or malformed documents', () => {
    expect(registryChangeAffectsDocs(null, registry())).toBe(true)
    expect(registryChangeAffectsDocs(registry(), null)).toBe(true)
    expect(registryChangeAffectsDocs('{ not json', registry())).toBe(true)
  })
})

describe('main acceptance: malformed document shapes stay in scope', () => {
  it.each([
    '[]',
    '"string"',
    '1',
    'true',
    '{"devDependencies":[]}',
    '{"devDependencies":null}',
    '{"devDependencies":{"vitest":1}}',
  ])('refuses to skip %s', (before) => {
    expect(manifestChangeAffectsDocs(before, ' ' + before)).toBe(true)
  })
})
