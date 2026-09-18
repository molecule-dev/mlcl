import { describe, expect, it } from 'vitest'

import {
  buildFeatureMenu,
  collectFeaturePackages,
  collectSecrets,
  resolveDefaultProviders,
  resolveFeatureBundledPackages,
  resolveLocalePackages,
  stripFrameworkSuffix,
} from '../features.js'
import type { InferredPackage } from '../schema.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockPackage = (overrides: Partial<InferredPackage>): InferredPackage => ({
  name: '@molecule/test',
  version: '1.0.0',
  dependencies: {},
  peerDependencies: {},
  type: 'core',
  routes: [],
  tables: [],
  exports: [],
  path: '/fake/path',
  ...overrides,
})

// ---------------------------------------------------------------------------
// buildFeatureMenu
// ---------------------------------------------------------------------------

describe('buildFeatureMenu', () => {
  it('separates alwaysInclude packages from features', () => {
    const always = mockPackage({
      name: '@molecule/api-logger',
      molecule: {
        type: 'infrastructure',
        category: 'logging',
        label: 'Logger',
        alwaysInclude: true,
        secrets: [],
        runtimeDependencies: [],
      },
    })
    const feature = mockPackage({
      name: '@molecule/api-database',
      molecule: {
        type: 'core',
        category: 'database',
        label: 'Database',
        ui: { order: 1 },
        secrets: [],
        runtimeDependencies: [],
      },
    })

    const result = buildFeatureMenu([always, feature])

    expect(result.alwaysInclude).toHaveLength(1)
    expect(result.alwaysInclude[0].name).toBe('@molecule/api-logger')
    expect(result.features).toHaveLength(1)
    expect(result.features[0].category).toBe('database')
  })

  it('groups packages by category', () => {
    const core = mockPackage({
      name: '@molecule/api-payments',
      molecule: {
        type: 'core',
        category: 'payments',
        label: 'Payments',
        multiSelect: true,
        ui: { order: 3 },
        secrets: [],
        runtimeDependencies: [],
      },
    })
    const provider = mockPackage({
      name: '@molecule/api-payments-stripe',
      molecule: {
        type: 'provider',
        category: 'payments',
        label: 'Stripe',
        implements: '@molecule/api-payments',
        secrets: [],
        runtimeDependencies: [],
      },
    })

    const result = buildFeatureMenu([core, provider])

    expect(result.features).toHaveLength(1)
    expect(result.features[0].category).toBe('payments')
    expect(result.features[0].providers).toHaveLength(1)
    expect(result.features[0].providers[0].name).toBe('@molecule/api-payments-stripe')
  })

  it('sorts features by ui.order', () => {
    const database = mockPackage({
      name: '@molecule/api-database',
      molecule: {
        type: 'core',
        category: 'database',
        label: 'Database',
        ui: { order: 1 },
        secrets: [],
        runtimeDependencies: [],
      },
    })
    const auth = mockPackage({
      name: '@molecule/api-auth',
      molecule: {
        type: 'core',
        category: 'auth',
        label: 'Authentication',
        ui: { order: 2 },
        secrets: [],
        runtimeDependencies: [],
      },
    })
    const payments = mockPackage({
      name: '@molecule/api-payments',
      molecule: {
        type: 'core',
        category: 'payments',
        label: 'Payments',
        ui: { order: 3 },
        secrets: [],
        runtimeDependencies: [],
      },
    })

    // Pass in reverse order to verify sorting
    const result = buildFeatureMenu([payments, auth, database])

    expect(result.features.map((f) => f.category)).toEqual(['database', 'auth', 'payments'])
  })

  it('identifies primaries (packages with ui.order set)', () => {
    const primary = mockPackage({
      name: '@molecule/api-database',
      molecule: {
        type: 'core',
        category: 'database',
        label: 'Database',
        ui: { order: 1 },
        secrets: [],
        runtimeDependencies: [],
      },
    })

    const result = buildFeatureMenu([primary])

    expect(result.features).toHaveLength(1)
    expect(result.features[0].primary.name).toBe('@molecule/api-database')
  })

  it('identifies bundled packages (featureBundled=true)', () => {
    const primary = mockPackage({
      name: '@molecule/api-database',
      molecule: {
        type: 'core',
        category: 'database',
        label: 'Database',
        ui: { order: 1 },
        secrets: [],
        runtimeDependencies: [],
      },
    })
    const bundled = mockPackage({
      name: '@molecule/api-database-migrations',
      molecule: {
        type: 'utility',
        category: 'database',
        label: 'Migrations',
        featureBundled: true,
        secrets: [],
        runtimeDependencies: [],
      },
    })

    const result = buildFeatureMenu([primary, bundled])

    expect(result.features).toHaveLength(1)
    expect(result.features[0].bundledPackages).toHaveLength(1)
    expect(result.features[0].bundledPackages[0].name).toBe('@molecule/api-database-migrations')
  })

  it('identifies providers (type=provider)', () => {
    const primary = mockPackage({
      name: '@molecule/api-database',
      molecule: {
        type: 'core',
        category: 'database',
        label: 'Database',
        ui: { order: 1 },
        secrets: [],
        runtimeDependencies: [],
      },
    })
    const postgresql = mockPackage({
      name: '@molecule/api-database-postgresql',
      molecule: {
        type: 'provider',
        category: 'database',
        label: 'PostgreSQL',
        implements: '@molecule/api-database',
        secrets: [],
        runtimeDependencies: [],
      },
    })
    const mysql = mockPackage({
      name: '@molecule/api-database-mysql',
      molecule: {
        type: 'provider',
        category: 'database',
        label: 'MySQL',
        implements: '@molecule/api-database',
        secrets: [],
        runtimeDependencies: [],
      },
    })

    const result = buildFeatureMenu([primary, postgresql, mysql])

    expect(result.features[0].providers).toHaveLength(2)
    expect(result.features[0].providers.map((p) => p.name)).toContain(
      '@molecule/api-database-postgresql',
    )
    expect(result.features[0].providers.map((p) => p.name)).toContain(
      '@molecule/api-database-mysql',
    )
  })

  it('determines multiSelect from core interface packages', () => {
    const paymentsCore = mockPackage({
      name: '@molecule/api-payments',
      molecule: {
        type: 'core',
        category: 'payments',
        label: 'Payments',
        multiSelect: true,
        ui: { order: 3 },
        secrets: [],
        runtimeDependencies: [],
      },
    })
    const stripe = mockPackage({
      name: '@molecule/api-payments-stripe',
      molecule: {
        type: 'provider',
        category: 'payments',
        label: 'Stripe',
        implements: '@molecule/api-payments',
        secrets: [],
        runtimeDependencies: [],
      },
    })

    const result = buildFeatureMenu([paymentsCore, stripe])

    expect(result.features[0].multiSelect).toBe(true)
  })

  it('excludes categories with no visible primary', () => {
    // Package has molecule metadata but no ui.order set
    const noPrimary = mockPackage({
      name: '@molecule/api-internal-tool',
      molecule: {
        type: 'utility',
        category: 'internal',
        label: 'Internal Tool',
        secrets: [],
        runtimeDependencies: [],
      },
    })

    const result = buildFeatureMenu([noPrimary])

    expect(result.features).toHaveLength(0)
  })

  it('returns empty features for packages with no molecule metadata', () => {
    const plain1 = mockPackage({ name: '@molecule/no-meta-1' })
    const plain2 = mockPackage({ name: '@molecule/no-meta-2' })

    const result = buildFeatureMenu([plain1, plain2])

    expect(result.alwaysInclude).toHaveLength(0)
    expect(result.features).toHaveLength(0)
  })

  it('handles hidden packages (ui.hidden=true) - they should not be primary', () => {
    const hidden = mockPackage({
      name: '@molecule/api-oauth',
      molecule: {
        type: 'core',
        category: 'oauth',
        label: 'OAuth',
        ui: { order: 5, hidden: true },
        secrets: [],
        runtimeDependencies: [],
      },
    })
    const provider = mockPackage({
      name: '@molecule/api-oauth-github',
      molecule: {
        type: 'provider',
        category: 'oauth',
        label: 'GitHub',
        implements: '@molecule/api-oauth',
        secrets: [],
        runtimeDependencies: [],
      },
    })

    const result = buildFeatureMenu([hidden, provider])

    // The hidden package has ui.order, but also ui.hidden=true, so it
    // should NOT become primary and the category should be excluded.
    expect(result.features).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// collectFeaturePackages
// ---------------------------------------------------------------------------

describe('collectFeaturePackages', () => {
  const corePkg = mockPackage({
    name: '@molecule/api-payments',
    molecule: {
      type: 'core',
      category: 'payments',
      label: 'Payments',
      multiSelect: true,
      ui: { order: 3 },
      secrets: [],
      runtimeDependencies: [],
    },
  })
  const bundledPkg = mockPackage({
    name: '@molecule/api-payments-webhook',
    molecule: {
      type: 'utility',
      category: 'payments',
      label: 'Webhook Handler',
      featureBundled: true,
      secrets: [],
      runtimeDependencies: [],
    },
  })
  const stripePkg = mockPackage({
    name: '@molecule/api-payments-stripe',
    molecule: {
      type: 'provider',
      category: 'payments',
      label: 'Stripe',
      implements: '@molecule/api-payments',
      secrets: [],
      runtimeDependencies: [],
    },
  })
  const applePkg = mockPackage({
    name: '@molecule/api-payments-apple',
    molecule: {
      type: 'provider',
      category: 'payments',
      label: 'Apple',
      implements: '@molecule/api-payments',
      secrets: [],
      runtimeDependencies: [],
    },
  })

  const allPackages = [corePkg, bundledPkg, stripePkg, applePkg]

  const feature = buildFeatureMenu(allPackages).features[0]

  it('returns primary + bundled packages when no providers selected', () => {
    const result = collectFeaturePackages(feature, [], allPackages)

    expect(result).toHaveLength(2)
    expect(result.map((p) => p.name)).toContain('@molecule/api-payments')
    expect(result.map((p) => p.name)).toContain('@molecule/api-payments-webhook')
  })

  it('includes selected providers when provider names given', () => {
    const result = collectFeaturePackages(feature, ['@molecule/api-payments-stripe'], allPackages)

    expect(result.map((p) => p.name)).toContain('@molecule/api-payments-stripe')
  })

  it('includes core interface packages that selected providers implement', () => {
    // stripe implements @molecule/api-payments, which is already primary
    // but if there were a separate core pkg, it would be included
    const separateCoreInterface = mockPackage({
      name: '@molecule/api-payments-core',
      molecule: {
        type: 'core',
        category: 'payments-base',
        label: 'Payments Core',
        secrets: [],
        runtimeDependencies: [],
      },
    })
    const providerImplementing = mockPackage({
      name: '@molecule/api-payments-stripe-v2',
      molecule: {
        type: 'provider',
        category: 'payments',
        label: 'Stripe v2',
        implements: '@molecule/api-payments-core',
        secrets: [],
        runtimeDependencies: [],
      },
    })

    // Build a feature that contains this provider
    const featureWithExtra = {
      ...feature,
      providers: [...feature.providers, providerImplementing],
    }

    const extendedAll = [...allPackages, separateCoreInterface, providerImplementing]
    const result = collectFeaturePackages(
      featureWithExtra,
      ['@molecule/api-payments-stripe-v2'],
      extendedAll,
    )

    expect(result.map((p) => p.name)).toContain('@molecule/api-payments-core')
  })

  it('does not duplicate packages', () => {
    // Select stripe -- stripe implements @molecule/api-payments which is already primary
    const result = collectFeaturePackages(feature, ['@molecule/api-payments-stripe'], allPackages)

    const names = result.map((p) => p.name)
    const unique = [...new Set(names)]
    expect(names).toEqual(unique)
  })
})

// ---------------------------------------------------------------------------
// collectSecrets
// ---------------------------------------------------------------------------

describe('collectSecrets', () => {
  it('collects secrets from packages with molecule.secrets', () => {
    const pkg = mockPackage({
      name: '@molecule/api-payments-stripe',
      molecule: {
        type: 'provider',
        category: 'payments',
        label: 'Stripe',
        secrets: [
          { name: 'STRIPE_SECRET_KEY', required: true },
          { name: 'STRIPE_WEBHOOK_SECRET', required: true },
        ],
        runtimeDependencies: [],
      },
    })

    const result = collectSecrets([pkg])

    expect(result).toHaveLength(2)
    expect(result.map((s) => s.name)).toContain('STRIPE_SECRET_KEY')
    expect(result.map((s) => s.name)).toContain('STRIPE_WEBHOOK_SECRET')
  })

  it('deduplicates by name (keeps first occurrence)', () => {
    const pkg1 = mockPackage({
      name: '@molecule/api-payments-stripe',
      molecule: {
        type: 'provider',
        category: 'payments',
        label: 'Stripe',
        secrets: [{ name: 'DATABASE_URL', required: true, default: 'postgres://stripe' }],
        runtimeDependencies: [],
      },
    })
    const pkg2 = mockPackage({
      name: '@molecule/api-database-postgresql',
      molecule: {
        type: 'provider',
        category: 'database',
        label: 'PostgreSQL',
        secrets: [{ name: 'DATABASE_URL', required: true, default: 'postgres://local' }],
        runtimeDependencies: [],
      },
    })

    const result = collectSecrets([pkg1, pkg2])

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('DATABASE_URL')
    // Should keep the first occurrence (from pkg1)
    expect(result[0].default).toBe('postgres://stripe')
  })

  it('returns empty array when no packages have secrets', () => {
    const pkg = mockPackage({
      name: '@molecule/api-logger',
      molecule: {
        type: 'infrastructure',
        category: 'logging',
        label: 'Logger',
        secrets: [],
        runtimeDependencies: [],
      },
    })

    const result = collectSecrets([pkg])

    expect(result).toHaveLength(0)
  })

  it('handles packages without molecule field', () => {
    const pkg1 = mockPackage({ name: '@molecule/no-meta' })
    const pkg2 = mockPackage({
      name: '@molecule/api-stripe',
      molecule: {
        type: 'provider',
        category: 'payments',
        label: 'Stripe',
        secrets: [{ name: 'STRIPE_KEY', required: true }],
        runtimeDependencies: [],
      },
    })

    const result = collectSecrets([pkg1, pkg2])

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('STRIPE_KEY')
  })
})

// ---------------------------------------------------------------------------
// resolveDefaultProviders
// ---------------------------------------------------------------------------

describe('resolveDefaultProviders', () => {
  const iconsCore = mockPackage({
    name: '@molecule/app-icons',
    molecule: {
      type: 'core',
      category: 'icons',
      label: 'Icons',
      defaultProvider: '@molecule/app-icons-lucide',
      secrets: [],
      runtimeDependencies: [],
    },
  })
  const iconsLucide = mockPackage({
    name: '@molecule/app-icons-lucide',
    molecule: {
      type: 'provider',
      category: 'icons',
      label: 'Lucide',
      implements: '@molecule/app-icons',
      secrets: [],
      runtimeDependencies: [],
    },
  })
  const iconsHeroicons = mockPackage({
    name: '@molecule/app-icons-heroicons',
    molecule: {
      type: 'provider',
      category: 'icons',
      label: 'Heroicons',
      implements: '@molecule/app-icons',
      secrets: [],
      runtimeDependencies: [],
    },
  })
  const uiReact = mockPackage({
    name: '@molecule/app-ui-react',
    type: 'framework',
    peerDependencies: { '@molecule/app-icons': '^1.0.0', '@molecule/app-ui': '^1.0.0' },
    molecule: {
      type: 'framework',
      category: 'ui',
      label: 'React UI',
      implements: '@molecule/app-ui',
      secrets: [],
      runtimeDependencies: [],
    },
  })
  const uiCore = mockPackage({
    name: '@molecule/app-ui',
    molecule: {
      type: 'core',
      category: 'ui',
      label: 'UI',
      defaultProvider: '@molecule/app-ui-tailwind',
      secrets: [],
      runtimeDependencies: [],
    },
  })
  const uiTailwind = mockPackage({
    name: '@molecule/app-ui-tailwind',
    molecule: {
      type: 'provider',
      category: 'ui',
      label: 'Tailwind UI',
      implements: '@molecule/app-ui',
      secrets: [],
      runtimeDependencies: [],
    },
  })

  const allPackages = [iconsCore, iconsLucide, iconsHeroicons, uiReact, uiCore, uiTailwind]

  it('adds default providers when core is pulled in via peer dep and no provider selected', () => {
    // app-ui-react has app-icons + app-ui as peer deps, no providers selected
    // Framework packages (app-ui-react) don't count as providers
    const result = resolveDefaultProviders(['@molecule/app-ui-react'], allPackages)

    expect(result).toContain('@molecule/app-icons-lucide')
    expect(result).toContain('@molecule/app-ui-tailwind')
  })

  it('does not add default provider when explicit provider already selected', () => {
    const result = resolveDefaultProviders(
      ['@molecule/app-ui-react', '@molecule/app-icons-heroicons', '@molecule/app-ui-tailwind'],
      allPackages,
    )

    expect(result).toEqual([])
  })

  it('does not add default provider when actual provider already selected', () => {
    const result = resolveDefaultProviders(
      ['@molecule/app-ui-react', '@molecule/app-ui-tailwind'],
      allPackages,
    )

    // ui-tailwind already selected, icons still needs default
    expect(result).toEqual(['@molecule/app-icons-lucide'])
  })

  it('does not duplicate when default provider is already in selection', () => {
    const result = resolveDefaultProviders(
      ['@molecule/app-ui-react', '@molecule/app-icons-lucide', '@molecule/app-ui-tailwind'],
      allPackages,
    )

    expect(result).toEqual([])
  })

  it('resolves transitive peer deps', () => {
    // Package A has peer dep B, B has peer dep to icons core
    const pkgA = mockPackage({
      name: '@molecule/app-widget',
      peerDependencies: { '@molecule/app-ui-react': '^1.0.0' },
      molecule: {
        type: 'feature',
        category: 'widget',
        label: 'Widget',
        secrets: [],
        runtimeDependencies: [],
      },
    })

    const result = resolveDefaultProviders(['@molecule/app-widget'], [...allPackages, pkgA])

    expect(result).toContain('@molecule/app-icons-lucide')
    expect(result).toContain('@molecule/app-ui-tailwind')
  })

  it('returns empty array for empty selection', () => {
    const result = resolveDefaultProviders([], allPackages)

    expect(result).toEqual([])
  })

  // Framework-aware provider resolution
  // -----------------------------------------------------------------------

  const uiNativewind = mockPackage({
    name: '@molecule/app-ui-nativewind',
    molecule: {
      type: 'provider',
      category: 'ui',
      label: 'NativeWind',
      implements: '@molecule/app-ui',
      framework: 'react-native',
      secrets: [],
      runtimeDependencies: [],
    },
  })
  const reactNativeFramework = mockPackage({
    name: '@molecule/app-react-native',
    peerDependencies: { '@molecule/app-ui': '^1.0.0', '@molecule/app-icons': '^1.0.0' },
    molecule: {
      type: 'framework',
      category: 'framework',
      label: 'React Native',
      framework: 'react-native',
      secrets: [],
      runtimeDependencies: [],
    },
  })
  const uiReactNative = mockPackage({
    name: '@molecule/app-ui-react-native',
    peerDependencies: { '@molecule/app-ui': '^1.0.0', '@molecule/app-icons': '^1.0.0' },
    molecule: {
      type: 'framework',
      category: 'ui',
      label: 'React Native UI',
      implements: '@molecule/app-ui',
      framework: 'react-native',
      secrets: [],
      runtimeDependencies: [],
    },
  })

  const rnPackages = [...allPackages, uiNativewind, reactNativeFramework, uiReactNative]

  it('prefers framework-specific provider over generic default for RN projects', () => {
    // RN project selects the framework package — should get nativewind, not tailwind
    const result = resolveDefaultProviders(
      ['@molecule/app-react-native', '@molecule/app-ui-react-native'],
      rnPackages,
    )

    expect(result).toContain('@molecule/app-ui-nativewind')
    expect(result).not.toContain('@molecule/app-ui-tailwind')
    expect(result).toContain('@molecule/app-icons-lucide') // icons has no framework-specific alt
  })

  it('uses generic default when no framework-specific provider exists', () => {
    // Web React project — no framework-specific UI provider, falls back to tailwind
    const result = resolveDefaultProviders(['@molecule/app-ui-react'], rnPackages)

    expect(result).toContain('@molecule/app-ui-tailwind')
    expect(result).not.toContain('@molecule/app-ui-nativewind')
  })

  it('does not add framework-specific provider when explicit provider already selected', () => {
    const result = resolveDefaultProviders(
      ['@molecule/app-react-native', '@molecule/app-ui-react-native', '@molecule/app-ui-tailwind'],
      rnPackages,
    )

    // tailwind already selected as provider — should not also add nativewind
    expect(result).not.toContain('@molecule/app-ui-nativewind')
    expect(result).not.toContain('@molecule/app-ui-tailwind')
  })
})

// ---------------------------------------------------------------------------
// resolveFeatureBundledPackages
// ---------------------------------------------------------------------------

describe('resolveFeatureBundledPackages', () => {
  it('auto-includes featureBundled packages from the same category', () => {
    const userResource = mockPackage({
      name: '@molecule/api-resource-user',
      molecule: {
        type: 'resource',
        category: 'auth',
        label: 'Authentication',
        secrets: [],
        runtimeDependencies: [],
      },
    })
    const deviceResource = mockPackage({
      name: '@molecule/api-resource-device',
      molecule: {
        type: 'resource',
        category: 'auth',
        label: 'Device Sessions',
        featureBundled: true,
        secrets: [],
        runtimeDependencies: [],
      },
    })
    const unrelatedResource = mockPackage({
      name: '@molecule/api-resource-comment',
      molecule: {
        type: 'resource',
        category: 'content',
        label: 'Comments',
        featureBundled: true,
        secrets: [],
        runtimeDependencies: [],
      },
    })

    const result = resolveFeatureBundledPackages(
      ['@molecule/api-resource-user'],
      [userResource, deviceResource, unrelatedResource],
    )

    expect(result).toContain('@molecule/api-resource-device')
    expect(result).not.toContain('@molecule/api-resource-comment')
  })

  it('does not duplicate already-selected packages', () => {
    const userResource = mockPackage({
      name: '@molecule/api-resource-user',
      molecule: {
        type: 'resource',
        category: 'auth',
        label: 'Authentication',
        secrets: [],
        runtimeDependencies: [],
      },
    })
    const deviceResource = mockPackage({
      name: '@molecule/api-resource-device',
      molecule: {
        type: 'resource',
        category: 'auth',
        label: 'Device Sessions',
        featureBundled: true,
        secrets: [],
        runtimeDependencies: [],
      },
    })

    const result = resolveFeatureBundledPackages(
      ['@molecule/api-resource-user', '@molecule/api-resource-device'],
      [userResource, deviceResource],
    )

    expect(result).toHaveLength(0)
  })

  it('returns empty array when no featureBundled packages match', () => {
    const dbPackage = mockPackage({
      name: '@molecule/api-database-postgresql',
      molecule: {
        type: 'provider',
        category: 'database',
        label: 'PostgreSQL',
        secrets: [],
        runtimeDependencies: [],
      },
    })

    const result = resolveFeatureBundledPackages(['@molecule/api-database-postgresql'], [dbPackage])

    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// stripFrameworkSuffix
// ---------------------------------------------------------------------------

const FW = ['react', 'vue', 'svelte', 'solid', 'angular', 'react-native', 'react-native-web']

describe('stripFrameworkSuffix', () => {
  it('strips a trailing -react', () => {
    expect(stripFrameworkSuffix('oauth-buttons-react', FW)).toBe('oauth-buttons')
  })

  it('strips the longest matching framework suffix (-react-native, not -react)', () => {
    expect(stripFrameworkSuffix('clipboard-react-native', FW)).toBe('clipboard')
  })

  it('returns undefined when there is no framework suffix', () => {
    expect(stripFrameworkSuffix('oauth-buttons', FW)).toBeUndefined()
    expect(stripFrameworkSuffix('database-postgresql', FW)).toBeUndefined()
  })

  it('returns undefined when the suffix IS the whole remainder (no base)', () => {
    // `app-react` → rest "react" → stripping leaves nothing, not "".
    expect(stripFrameworkSuffix('react', FW)).toBeUndefined()
  })

  it('strips other frameworks too (-vue, -svelte)', () => {
    expect(stripFrameworkSuffix('data-table-vue', FW)).toBe('data-table')
    expect(stripFrameworkSuffix('chart-svelte', FW)).toBe('chart')
  })
})

// ---------------------------------------------------------------------------
// resolveLocalePackages
// ---------------------------------------------------------------------------

describe('resolveLocalePackages', () => {
  const locale = (name: string): InferredPackage =>
    mockPackage({ name, molecule: { type: 'locales', category: 'i18n', label: name, secrets: [] } })

  it('resolves a -react feature to its framework-agnostic companion locale', () => {
    // The regression that shipped npm 404s: app-oauth-buttons-react must map to
    // @molecule/app-locales-oauth-buttons (NOT a phantom -react locale).
    const all = [locale('@molecule/app-locales-oauth-buttons')]
    const result = resolveLocalePackages(['@molecule/app-oauth-buttons-react'], all, FW)
    expect(result).toEqual(['@molecule/app-locales-oauth-buttons'])
  })

  it('resolves a direct (non-framework) feature to its locale', () => {
    const all = [locale('@molecule/app-locales-auth')]
    expect(resolveLocalePackages(['@molecule/app-auth'], all, FW)).toEqual([
      '@molecule/app-locales-auth',
    ])
  })

  it('resolves a resource package to its locale (strips resource- prefix)', () => {
    const all = [locale('@molecule/api-locales-user')]
    expect(resolveLocalePackages(['@molecule/api-resource-user'], all, FW)).toEqual([
      '@molecule/api-locales-user',
    ])
  })

  it('does not resolve a locale for an unrelated package', () => {
    const all = [locale('@molecule/app-locales-oauth-buttons')]
    expect(resolveLocalePackages(['@molecule/app-data-table-react'], all, FW)).toEqual([])
  })

  it('does not double-add an already-selected locale', () => {
    const all = [locale('@molecule/app-locales-oauth-buttons')]
    const result = resolveLocalePackages(
      ['@molecule/app-oauth-buttons-react', '@molecule/app-locales-oauth-buttons'],
      all,
      FW,
    )
    expect(result).toEqual([])
  })
})
