import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'

import type { ExtractedExport, ExtractedModule } from '../api-extractor.js'
import { generateMoleculeMd, type GeneratorOptions, type PackageJson } from '../docs-generator.js'
import type { RegistryEntry } from '../schema.js'

// ---------------------------------------------------------------------------
// Temp directory management
// ---------------------------------------------------------------------------
const tempDirs: string[] = []

async function createTempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `docs-gen-test-${prefix}-`))
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
function makeExtracted(overrides: Partial<ExtractedModule> = {}): ExtractedModule {
  return {
    exports: [],
    ...overrides,
  }
}

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
    path: 'packages/api/core/database',
    ...overrides,
  }
}

function makePackageJson(overrides: Partial<PackageJson> = {}): PackageJson {
  return {
    name: '@molecule/api-database',
    version: '1.0.0',
    ...overrides,
  }
}

function makeOptions(overrides: Partial<GeneratorOptions> = {}): GeneratorOptions {
  return {
    moleculeDir: '/tmp/molecule',
    ...overrides,
  }
}

function makeFunctionExport(
  name: string,
  overrides: Partial<ExtractedExport> = {},
): ExtractedExport {
  return {
    name,
    kind: 'function',
    description: `The ${name} function`,
    declaration: `function ${name}(): void`,
    params: [{ name: 'input', type: 'string' }],
    ...overrides,
  }
}

// ============================================================================
// Standard package generation
// ============================================================================
describe('generateMoleculeMd — standard packages', () => {
  it('generates title from package name', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry(),
      makePackageJson({ name: '@molecule/api-database' }),
      makeOptions(),
    )
    expect(result).toContain('# @molecule/api-database')
  })

  it('includes description from extracted module', () => {
    const result = generateMoleculeMd(
      makeExtracted({ description: 'A powerful database layer' }),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('A powerful database layer')
  })

  it('falls back to registry description when extracted description is absent', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({ description: 'Registry description' }),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('Registry description')
  })

  it('generates Type section', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({ type: 'provider' }),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('## Type')
    expect(result).toContain('`provider`')
  })

  it('generates Installation section with package name', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry(),
      makePackageJson({ name: '@molecule/api-database' }),
      makeOptions(),
    )
    expect(result).toContain('## Installation')
    expect(result).toContain('npm install @molecule/api-database')
  })

  it('includes runtime dependencies in install command', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({ runtimeDependencies: ['pg', 'pg-pool'] }),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('npm install @molecule/api-database pg pg-pool')
  })

  it('generates Quick Start section from examples', () => {
    const result = generateMoleculeMd(
      makeExtracted({ examples: ['const db = connect()'] }),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('## Quick Start')
    expect(result).toContain('const db = connect()')
  })

  it('places Quick Start before Installation and API', () => {
    const result = generateMoleculeMd(
      makeExtracted({
        examples: ['const db = connect()'],
        exports: [{ name: 'connect', kind: 'function', declaration: 'function connect()' }],
      }),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions(),
    )
    const qsIdx = result.indexOf('## Quick Start')
    const installIdx = result.indexOf('## Installation')
    const apiIdx = result.indexOf('## API')
    expect(qsIdx).toBeGreaterThan(0)
    expect(qsIdx).toBeLessThan(installIdx)
    expect(qsIdx).toBeLessThan(apiIdx)
  })

  it('generates API section grouped by kind', () => {
    const result = generateMoleculeMd(
      makeExtracted({
        exports: [
          { name: 'Config', kind: 'interface', declaration: 'interface Config {}' },
          { name: 'Status', kind: 'type', declaration: 'type Status = string' },
          makeFunctionExport('query'),
          { name: 'MAX_RETRIES', kind: 'const', declaration: 'const MAX_RETRIES: 3' },
        ],
      }),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('## API')
    expect(result).toContain('### Interfaces')
    expect(result).toContain('### Types')
    expect(result).toContain('### Functions')
    expect(result).toContain('### Constants')
  })

  it('collapses destructured-member params in the compact function heading', () => {
    const result = generateMoleculeMd(
      makeExtracted({
        exports: [
          makeFunctionExport('ToastProvider', {
            declaration: 'function ToastProvider(props: ToastProviderProps): React.JSX.Element',
            params: [
              { name: 'props', type: 'unknown', description: 'The component props.' },
              { name: 'props.children', type: 'unknown', description: 'The children to render.' },
              { name: 'props.position', type: 'unknown', description: 'The default position.' },
            ],
          }),
        ],
      }),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions(),
    )
    // Heading shows only the single top-level param, never the dotted members
    // (and never the eslint `root0` placeholder they were normalized from).
    expect(result).toContain('#### `ToastProvider(props)`')
    expect(result).not.toContain('ToastProvider(props, props.children')
    expect(result).not.toContain('root0')
    // The members still appear in the param list below, described.
    expect(result).toContain('`props.children` — The children to render.')
  })

  it('generates Available Providers table for core packages', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({ type: 'core' }),
      makePackageJson(),
      makeOptions({
        providers: [
          {
            name: '@molecule/api-database-postgresql',
            entry: makeRegistryEntry({ type: 'provider', label: 'PostgreSQL' }),
          },
        ],
      }),
    )
    expect(result).toContain('## Available Providers')
    expect(result).toContain('PostgreSQL')
    expect(result).toContain('@molecule/api-database-postgresql')
  })

  it('generates Available Providers for non-core abstractions with providers', () => {
    // feature/middleware/native packages that provider bonds implement get the
    // same table as cores — the section keys off providers existing, not type.
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({ type: 'feature' }),
      makePackageJson(),
      makeOptions({
        providers: [
          {
            name: '@molecule/app-charts-chartjs',
            entry: makeRegistryEntry({ type: 'provider', label: 'Chart.js' }),
          },
        ],
      }),
    )
    expect(result).toContain('## Available Providers')
    expect(result).toContain('Chart.js')
    expect(result).toContain('@molecule/app-charts-chartjs')
  })

  it('generates Core Interface section for provider packages', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({ type: 'provider', implements: '@molecule/api-database' }),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('## Core Interface')
    expect(result).toContain('@molecule/api-database')
  })

  it('generates Injection Notes with peer deps', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry(),
      makePackageJson({ peerDependencies: { pg: '^8.0.0' } }),
      makeOptions(),
    )
    expect(result).toContain('## Injection Notes')
    expect(result).toContain('### Requirements')
    expect(result).toContain('`pg` ^8.0.0')
  })

  it('generates Injection Notes with secrets', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({
        secrets: [
          { name: 'DATABASE_URL', required: true },
          { name: 'DB_POOL_SIZE', required: false, default: '10' },
        ],
      }),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('### Environment Variables')
    expect(result).toContain('`DATABASE_URL` *(required)*')
    expect(result).toContain('`DB_POOL_SIZE` *(optional)* — default: `10`')
  })

  it('renders enriched secret metadata (label, instructions, setup link, example)', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({
        secrets: [
          {
            name: 'STRIPE_SECRET_KEY',
            required: true,
            label: 'Stripe secret key',
            setupUrl: 'https://dashboard.stripe.com/apikeys',
            instructions: 'Stripe Dashboard → Developers → API keys; use the sk_test_ key.',
            example: 'sk_test_...',
          },
        ],
      }),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('- `STRIPE_SECRET_KEY` *(required)* — Stripe secret key')
    expect(result).toContain(
      '  - Setup: Stripe Dashboard → Developers → API keys; use the sk_test_ key.',
    )
    expect(result).toContain(
      '  - Get it here: [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)',
    )
    expect(result).toContain('  - Example: `sk_test_...`')
  })

  it('marks generate secrets as auto-generated and suppresses setup guidance', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({
        secrets: [
          {
            name: 'VAPID_PUBLIC_KEY',
            required: true,
            label: 'Web Push VAPID public key',
            instructions: 'VAPID public key for Web Push. Auto-generated at scaffold.',
            generate: 'vapid-public',
          },
        ],
      }),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('- `VAPID_PUBLIC_KEY` *(required)* — Web Push VAPID public key')
    expect(result).toContain('  - **Auto-generated at scaffold — no manual setup.**')
    // No credential hunt for auto-generated values
    expect(result).not.toContain('Get it here:')
    expect(result).not.toContain('  - Setup:')
  })

  it('marks provisioned secrets while keeping setup guidance for other environments', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({
        secrets: [
          {
            name: 'DATABASE_URL',
            required: true,
            default: 'postgres://molecule:molecule@127.0.0.1:5432/myapp',
            label: 'PostgreSQL connection URL',
            instructions: 'Postgres connection string.',
            example: 'postgres://user:pass@localhost:5432/myapp',
            provisioned: true,
          },
        ],
      }),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain(
      '- `DATABASE_URL` *(required)* — PostgreSQL connection URL — default: `postgres://molecule:molecule@127.0.0.1:5432/myapp`',
    )
    expect(result).toContain(
      '  - **Provisioned automatically in molecule.dev sandboxes** — manual setup only needed outside the platform.',
    )
    expect(result).toContain('  - Setup: Postgres connection string.')
    expect(result).toContain('  - Example: `postgres://user:pass@localhost:5432/myapp`')
  })

  it('generates Translations section when companion locale exists', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions({ companionLocale: '@molecule/api-locales-database' }),
    )
    expect(result).toContain('## Translations')
    expect(result).toContain('@molecule/api-locales-database')
  })

  it('omits optional sections when data is absent', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({ secrets: [], runtimeDependencies: [] }),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).not.toContain('## Quick Start')
    expect(result).not.toContain('## Available Providers')
    expect(result).not.toContain('## Core Interface')
    expect(result).not.toContain('## Translations')
  })

  it('includes @remarks in injection notes', () => {
    const result = generateMoleculeMd(
      makeExtracted({ remarks: 'Requires PostgreSQL 14+.' }),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('## Injection Notes')
    expect(result).toContain('Requires PostgreSQL 14+.')
  })

  it('renders an E2E Tests section from module-level @e2e', () => {
    const result = generateMoleculeMd(
      makeExtracted({ e2e: 'Verify a user can sign up, log out, and log back in.' }),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('## E2E Tests')
    expect(result).toContain('Verify a user can sign up, log out, and log back in.')
  })

  it('omits the E2E Tests section when neither @e2e nor coreE2e exists', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).not.toContain('## E2E Tests')
  })

  it('provider packages inherit the core interface @e2e via coreE2e', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({ type: 'provider', implements: '@molecule/api-emails' }),
      makePackageJson({ name: '@molecule/api-emails-mailgun' }),
      makeOptions({ coreE2e: 'Verify the password-reset email flow completes.' }),
    )
    expect(result).toContain('## E2E Tests')
    expect(result).toContain('Verify the password-reset email flow completes.')
  })

  it('a package-authored @e2e wins over inherited coreE2e', () => {
    const result = generateMoleculeMd(
      makeExtracted({ e2e: 'Provider-specific flow.' }),
      makeRegistryEntry({ type: 'provider', implements: '@molecule/api-emails' }),
      makePackageJson({ name: '@molecule/api-emails-mailgun' }),
      makeOptions({ coreE2e: 'Core flow.' }),
    )
    expect(result).toContain('Provider-specific flow.')
    expect(result).not.toContain('Core flow.')
  })

  it('ends with newline', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions(),
    )
    expect(result.endsWith('\n')).toBe(true)
  })
})

// ============================================================================
// Bond Wiring section
// ============================================================================
describe('generateMoleculeMd — Bond Wiring section', () => {
  it('emits the generic setProvider(provider) template for a normal singleton provider', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({
        type: 'provider',
        stack: 'api',
        implements: '@molecule/api-database',
        exports: ['provider', 'createProvider'],
        secrets: [{ name: 'DATABASE_URL', required: true }],
      }),
      makePackageJson({ name: '@molecule/api-database-postgresql' }),
      makeOptions({
        coreInterfaceEntry: makeRegistryEntry({ exports: ['setProvider', 'getProvider'] }),
        coreInterfaceName: '@molecule/api-database',
      }),
    )
    expect(result).toContain('## Bond Wiring')
    expect(result).toContain('setProvider(provider)')
  })

  // Regression test for the app-analytics doc-drift finding: the auto-generated
  // Bond Wiring section used to teach `setProvider(provider)` for app-side
  // bonds whose provider cannot self-configure (app bonds never read env
  // internally), directly contradicting the module's own Quick Start
  // `@example` — an executor following Bond Wiring literally shipped a no-op
  // analytics setup even with the token correctly set in `.env`.
  it('does NOT emit the generic setProvider(provider) template for an app-side provider that cannot self-configure', () => {
    const quickStartExample =
      '```typescript\n' +
      "import { setProvider } from '@molecule/app-analytics'\n" +
      "import { createProvider } from '@molecule/app-analytics-mixpanel'\n\n" +
      'const token = VITE_MIXPANEL_TOKEN as string | undefined\n' +
      'if (token) {\n' +
      '  setProvider(createProvider({ token }))\n' +
      '}\n' +
      '```'
    const result = generateMoleculeMd(
      makeExtracted({ examples: [quickStartExample] }),
      makeRegistryEntry({
        type: 'provider',
        stack: 'app',
        implements: '@molecule/app-analytics',
        exports: ['MixpanelOptions', 'createProvider', 'provider'],
        secrets: [{ name: 'VITE_MIXPANEL_TOKEN', required: true }],
      }),
      makePackageJson({ name: '@molecule/app-analytics-mixpanel' }),
      makeOptions({
        coreInterfaceEntry: makeRegistryEntry({ exports: ['setProvider', 'hasProvider'] }),
        coreInterfaceName: '@molecule/app-analytics',
      }),
    )
    expect(result).toContain('## Bond Wiring')
    // The old generic template's fixed boilerplate intro — only the
    // generic (buggy, for this package shape) path ever emits this text.
    expect(result).not.toContain(
      'Setup function to register this provider with the core interface:',
    )
    // The section must name the secret that can never reach the bare
    // provider, and must redirect to the createProvider(options) pattern.
    expect(result).toContain('VITE_MIXPANEL_TOKEN')
    expect(result).toContain('createProvider(options)')
    // The corrected snippet (verbatim from the module's own Quick Start
    // @example) must be present so a weak model reading only this section
    // still lands on working code.
    expect(result).toContain('setProvider(createProvider({ token }))')
  })

  it('falls back to a config warning without a code block when the module has no @example', () => {
    const result = generateMoleculeMd(
      makeExtracted(), // no examples
      makeRegistryEntry({
        type: 'provider',
        stack: 'app',
        implements: '@molecule/app-analytics',
        exports: ['createProvider', 'provider'],
        secrets: [{ name: 'VITE_POSTHOG_KEY', required: true }],
      }),
      makePackageJson({ name: '@molecule/app-analytics-posthog' }),
      makeOptions({
        coreInterfaceEntry: makeRegistryEntry({ exports: ['setProvider'] }),
        coreInterfaceName: '@molecule/app-analytics',
      }),
    )
    expect(result).toContain('## Bond Wiring')
    expect(result).not.toContain(
      'Setup function to register this provider with the core interface:',
    )
    expect(result).toContain('VITE_POSTHOG_KEY')
  })

  it('still uses the generic template for an app-side provider with only OPTIONAL secrets', () => {
    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({
        type: 'provider',
        stack: 'app',
        implements: '@molecule/app-push',
        exports: ['provider', 'createProvider'],
        secrets: [{ name: 'VITE_VAPID_PUBLIC_KEY', required: false }],
      }),
      makePackageJson({ name: '@molecule/app-push-web' }),
      makeOptions({
        coreInterfaceEntry: makeRegistryEntry({ exports: ['setProvider'] }),
        coreInterfaceName: '@molecule/app-push',
      }),
    )
    expect(result).toContain('setProvider(provider)')
  })
})

// ============================================================================
// Locale package generation
// ============================================================================
describe('generateMoleculeMd — locale packages', () => {
  it('generates locale-specific format when entry.type is locales', async () => {
    const moleculeDir = await createTempDir('locale-gen')
    const pkgDir = join(moleculeDir, 'packages', 'api', 'locales', 'database')
    const srcDir = join(pkgDir, 'src')
    await mkdir(srcDir, { recursive: true })
    await writeFile(join(srcDir, 'en.ts'), `export default {\n  'db.connected': 'Connected',\n}\n`)
    await writeFile(join(srcDir, 'fr.ts'), `export default {\n  'db.connected': 'Connecté',\n}\n`)
    await writeFile(join(srcDir, 'index.ts'), `export { default as en } from './en.js'\n`)
    await writeFile(join(srcDir, 'types.ts'), `export type Translations = Record<string, string>\n`)

    const result = generateMoleculeMd(
      makeExtracted({ exports: [{ name: 'Translations', kind: 'type' }] }),
      makeRegistryEntry({
        type: 'locales',
        category: 'database',
        label: 'Database Locales',
        path: 'packages/api/locales/database',
      }),
      makePackageJson({ name: '@molecule/api-locales-database' }),
      makeOptions({ moleculeDir }),
    )

    expect(result).toContain('# @molecule/api-locales-database')
    expect(result).toContain('## Languages')
    expect(result).toContain('2 languages')
    expect(result).toContain('en, fr')
    expect(result).toContain('## Metadata')
    expect(result).toContain('**Type:** locales')
  })

  it('includes translation keys table when en.ts exists', async () => {
    const moleculeDir = await createTempDir('locale-keys')
    const pkgDir = join(moleculeDir, 'packages', 'api', 'locales', 'auth')
    const srcDir = join(pkgDir, 'src')
    await mkdir(srcDir, { recursive: true })
    await writeFile(
      join(srcDir, 'en.ts'),
      `export default {\n  'auth.login': 'Log In',\n  'auth.logout': 'Log Out',\n}\n`,
    )
    await writeFile(join(srcDir, 'index.ts'), '')

    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({
        type: 'locales',
        category: 'auth',
        label: 'Auth Locales',
        path: 'packages/api/locales/auth',
      }),
      makePackageJson({ name: '@molecule/api-locales-auth' }),
      makeOptions({ moleculeDir }),
    )

    expect(result).toContain('## Translation Keys')
    expect(result).toContain('`auth.login`')
    expect(result).toContain('Log In')
    expect(result).toContain('`auth.logout`')
    expect(result).toContain('Log Out')
  })

  it('infers translated package name from locale package name', async () => {
    const moleculeDir = await createTempDir('locale-purpose')
    const pkgDir = join(moleculeDir, 'packages', 'api', 'locales', 'database')
    const srcDir = join(pkgDir, 'src')
    await mkdir(srcDir, { recursive: true })
    await writeFile(join(srcDir, 'index.ts'), '')

    const result = generateMoleculeMd(
      makeExtracted(),
      makeRegistryEntry({
        type: 'locales',
        category: 'database',
        label: 'Database Locales',
        path: 'packages/api/locales/database',
      }),
      makePackageJson({ name: '@molecule/api-locales-database' }),
      makeOptions({ moleculeDir }),
    )

    expect(result).toContain('## Purpose')
    expect(result).toContain('`@molecule/api-database`')
  })
})

// ============================================================================
// Function export formatting
// ============================================================================
describe('generateMoleculeMd — function formatting', () => {
  it('includes param names in function heading', () => {
    const result = generateMoleculeMd(
      makeExtracted({
        exports: [
          {
            name: 'query',
            kind: 'function',
            params: [
              { name: 'sql', type: 'string' },
              { name: 'params', type: 'unknown[]', optional: true },
            ],
            declaration: 'function query(sql: string, params?: unknown[]): Promise<Row[]>',
          },
        ],
      }),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('`query(sql, params?)`')
  })

  it('includes param descriptions from JSDoc', () => {
    const result = generateMoleculeMd(
      makeExtracted({
        exports: [
          {
            name: 'connect',
            kind: 'function',
            params: [{ name: 'url', type: 'string', description: 'Connection string' }],
            declaration: 'function connect(url: string): void',
          },
        ],
      }),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('`url` — Connection string')
  })

  it('includes return description when present', () => {
    const result = generateMoleculeMd(
      makeExtracted({
        exports: [
          {
            name: 'count',
            kind: 'function',
            returnDescription: 'Total number of rows',
            declaration: 'function count(): number',
          },
        ],
      }),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('**Returns:** Total number of rows')
  })

  it('marks deprecated exports', () => {
    const result = generateMoleculeMd(
      makeExtracted({
        exports: [{ name: 'OldConfig', kind: 'interface', deprecated: true }],
      }),
      makeRegistryEntry(),
      makePackageJson(),
      makeOptions(),
    )
    expect(result).toContain('*(deprecated)*')
  })
})
