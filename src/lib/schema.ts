/**
 * mlcl schema definitions using Zod
 *
 * Uses inference from conventions rather than explicit manifests.
 * Edge cases documented in README.md files.
 *
 * @module
 */

import { z } from 'zod'

// ============================================================================
// Inferred Package Info (from scanning molecule packages)
// ============================================================================

/**
 * Package type inferred from directory location
 */
export const PackageType = z.enum([
  'core', // packages/{api,app}/core/* - abstract interfaces
  'bond', // packages/{api,app}/bonds/*/* - provider implementations
  'infrastructure', // packages/api/infrastructure/* - foundational
  'resource', // packages/api/resources/* - business logic
  'middleware', // packages/api/middleware/* - Express middleware
  'utility', // packages/api/utilities/* - helpers
  'framework', // packages/app/frameworks/* - framework bindings (React, Vue, etc.)
  'feature', // packages/app/features/* - optional feature modules
  'native', // packages/app/native/* - native device capabilities
  'locales', // packages/{api,app}/locales/* - i18n translation bundles
])

export type PackageType = z.infer<typeof PackageType>

/**
 * Route definition inferred from source
 */
export const InferredRoute = z.object({
  method: z.enum(['get', 'post', 'put', 'patch', 'delete', 'all']),
  path: z.string(),
  handler: z.string().describe('Export name of the handler'),
  middlewares: z.array(z.string()).default([]),
  optional: z
    .string()
    .optional()
    .describe('Feature flag required for this route (e.g. oauth, stripe, apple, google)'),
})

export type InferredRoute = z.infer<typeof InferredRoute>

/**
 * Database table inferred from SQL setup files
 */
export const InferredTable = z.object({
  name: z.string(),
  sqlFile: z.string().describe('Path to SQL file'),
})

export type InferredTable = z.infer<typeof InferredTable>

// ============================================================================
// Molecule Metadata (from centralized registry)
// ============================================================================

/**
 * Secret/env var required by a package
 */
export const MoleculeSecret = z.object({
  name: z.string(),
  required: z.boolean().default(true),
  default: z.string().optional().describe('Default value for .env generation'),
  label: z.string().optional().describe('Human-readable credential name for setup UIs'),
  setupUrl: z
    .string()
    .optional()
    .describe('URL where the user obtains this credential (provider console/dashboard)'),
  instructions: z
    .string()
    .optional()
    .describe('One-line guidance: which console page, which value to copy, gotchas'),
  example: z
    .string()
    .optional()
    .describe('Format hint shown as an input placeholder, e.g. sk_test_...'),
  generate: z
    .enum([
      'rsa-keypair-private',
      'rsa-keypair-public',
      'vapid-private',
      'vapid-public',
      'random-hex-32',
    ])
    .optional()
    .describe(
      'Auto-generatable at scaffold time — never ask the user for these. Keypair kinds sharing a prefix are generated together.',
    ),
  provisioned: z
    .boolean()
    .optional()
    .describe(
      'Provisioned automatically by the molecule.dev platform in sandboxes — setup UIs show it as managed instead of asking the user',
    ),
})

export type MoleculeSecret = z.infer<typeof MoleculeSecret>

/**
 * Package metadata from the centralized registry (registry.json).
 * This is the authoritative source — the CLI reads it, never hardcodes it.
 */
export const MoleculeMetadata = z.object({
  type: z.enum([
    'core',
    'provider',
    'resource',
    'middleware',
    'utility',
    'infrastructure',
    'framework',
    'feature',
    'native',
    'locales',
  ]),
  category: z
    .string()
    .describe('Feature category: database, auth, payments, email, cache, storage, etc.'),
  label: z.string().describe('Human-readable name for UI'),
  description: z.string().optional().describe('Short description for UI hint text'),
  implements: z
    .string()
    .optional()
    .describe('Core interface this provider implements (e.g. @molecule/api-payments)'),
  defaultProvider: z
    .string()
    .optional()
    .describe('Default provider package to auto-include when no explicit provider is selected'),
  multiSelect: z
    .boolean()
    .optional()
    .describe('Whether users can pick multiple providers (core interfaces only)'),
  alwaysInclude: z.boolean().optional().describe('Auto-included in every project'),
  featureBundled: z.boolean().optional().describe('Auto-included when parent category is selected'),
  secrets: z.array(MoleculeSecret).default([]),
  runtimeDependencies: z
    .array(z.string())
    .default([])
    .describe('Non-molecule npm packages needed at runtime'),
  moleculePeers: z
    .array(z.string())
    .optional()
    .describe(
      'REQUIRED @molecule peerDependencies (optional peers excluded). Scaffolding' +
        ' expands the selection through these so an imported peer (oauth-buttons ->' +
        ' oauth-logos) is always installed; kept in the registry so no molecule' +
        ' source checkout is needed at scaffold time (prod has none).',
    ),
  stack: z
    .enum(['api', 'app'])
    .optional()
    .describe('Which stack this package belongs to (api = backend, app = frontend)'),
  framework: z
    .enum(['react', 'vue', 'svelte', 'solid', 'angular', 'react-native'])
    .optional()
    .describe('Framework-specific package (filters in feature menu)'),
  ui: z
    .object({
      order: z.number().optional().describe('Sort order in feature menu (lower = higher)'),
      hidden: z.boolean().optional().describe('Hide from create UI'),
    })
    .optional(),

  // Pre-computed metadata (replaces source scanning when present)
  routes: z
    .array(InferredRoute)
    .optional()
    .describe('Route definitions (pre-computed from routes.ts)'),
  tables: z
    .array(
      z.object({
        name: z.string(),
        sqlFile: z
          .string()
          .describe('Relative path within package, e.g. "src/__setup__/users.sql"'),
      }),
    )
    .optional()
    .describe('SQL table setup files (pre-computed from __setup__/)'),
  exports: z.array(z.string()).optional().describe('Named exports from index.ts (pre-computed)'),
  font: z
    .object({
      role: z.string().describe('Font role: sans, serif, mono, or icon'),
      family: z.string().describe('CSS font-family name'),
      source: z.string().describe('Source type: google, bunny, local, system, custom'),
      utilityCss: z
        .string()
        .optional()
        .describe('Extra CSS injected after @font-face (icon fonts: the utility class)'),
      url: z.string().optional().describe('Font CSS stylesheet URL (CDN fonts)'),
      preconnect: z.array(z.string()).optional().describe('Preconnect origins (CDN fonts)'),
      fontsDir: z
        .string()
        .optional()
        .describe('Directory within package containing font files (local fonts)'),
      faces: z
        .array(
          z.object({
            file: z.string().describe('Font filename within fontsDir'),
            weight: z.union([z.number(), z.string()]).describe('CSS font-weight (number or range)'),
            style: z.string().optional().describe('CSS font-style (default: normal)'),
            variable: z.boolean().optional().describe('Variable font — wrap in @supports'),
          }),
        )
        .optional()
        .describe('@font-face declarations (local fonts)'),
    })
    .optional()
    .describe('Font metadata for CLI font style generation (font provider packages only)'),

  // Build tooling metadata for project scaffolding (styling providers, etc.)
  buildTooling: z
    .object({
      devDependencies: z
        .record(z.string(), z.string())
        .optional()
        .describe('NPM devDependencies to add to the generated project'),
      vitePlugin: z
        .object({
          import: z.string().describe('Import statement for the Vite plugin'),
          usage: z.string().describe('Plugin call for the plugins array'),
        })
        .optional()
        .describe('Vite plugin configuration'),
      cssTemplate: z
        .string()
        .optional()
        .describe('Template file name for CSS entry (e.g. "app/shared/index-tailwind.css.tpl")'),
    })
    .optional()
    .describe('Build tooling metadata for project scaffolding'),
  generates: z
    .array(z.string())
    .optional()
    .describe(
      'What this package generates during injection (e.g. "service-worker", "service-worker-push")',
    ),

  // Self-describing bond wiring metadata (provider bonds)
  bondWiring: z
    .object({
      type: z
        .enum(['singleton', 'named', 'none'])
        .describe(
          'Bond registration type (none: the project wires it itself, e.g. test tooling — never into src/bonds/)',
        ),
      bondCategory: z.string().describe('Bond registry category (e.g. oauth, payments)'),
      nameExport: z.string().optional().describe('Export that provides the named bond key'),
      providerExports: z.array(z.string()).optional().describe('Exports to import for the bond'),
    })
    .optional()
    .describe('How the CLI should wire this provider bond'),

  // Route-set middleware mount path (e.g. "/api/billing" for billing-routes).
  // When set, the generated server mounts the middleware at this path AFTER
  // the /api router instead of bare app.use().
  middlewareMountPath: z
    .string()
    .optional()
    .describe('Express mount path for route-set middleware (e.g. /api/billing)'),

  // Wiring for create* middleware factories that require arguments: the exact
  // call expression plus a scaffolded companion config module holding the
  // app-specific data (e.g. billing tiers) the CLI cannot know.
  middlewareSetup: z
    .object({
      configFile: z
        .string()
        .optional()
        .describe('Project-relative config module to scaffold (e.g. src/tiers.ts)'),
      configImport: z
        .string()
        .optional()
        .describe('Import line pulling the config into the middleware file'),
      expression: z.string().describe('Call expression assigned to the middleware export'),
      configTemplate: z
        .string()
        .optional()
        .describe('Full content scaffolded into configFile when absent'),
    })
    .optional()
    .describe('How to wire a create* middleware factory that takes options'),

  // App-side bond setup metadata for framework template integration
  appBondSetup: z
    .object({
      exportName: z
        .string()
        .describe(
          'Variable name exported from the bond setup file (e.g. themeProvider, i18nProvider, authClient)',
        ),
      reExport: z
        .boolean()
        .optional()
        .describe('Whether bonds/index.js should re-export this for framework templates'),
      generatorType: z
        .enum(['theme', 'i18n', 'generic'])
        .optional()
        .describe('Which code generator to use. Omit for default bond setup pattern.'),
    })
    .optional()
    .describe('App-side bond setup metadata for framework template integration'),

  // API-side bond setup metadata (server-wiring variants)
  bondSetup: z
    .object({
      generatorType: z
        .enum(['realtime-deferred'])
        .optional()
        .describe(
          'API bond stub variant. realtime-deferred: emit createProvider({ deferAttach: true }) — the provider binds no port of its own; the scaffolded server attaches it to the API HTTP server via attachHttpServer.',
        ),
    })
    .optional()
    .describe('API-side bond setup metadata (provider/server wiring variants)'),

  // Override export name for legacy providers that don't export "provider"
  providerExportName: z
    .string()
    .optional()
    .describe('Override export name for the provider (when not "provider")'),

  // The setter a provider bond for this package must call to register itself —
  // e.g. app-http's `setClient`, api-logger's `setLogger`, api-emails'
  // `setTransport`. Scanned from source by `sync-registry --scan-exports`
  // (`scanBondSetter`): it is the exported set*/register* function that ACCEPTS
  // the provider interface (the object-typed parameter, never the function-typed
  // one such as app-http's `setAuthGate`, nor a primitive/closed-union one such
  // as api-logger's `setLevel`). Never guess it from export order — the bond
  // wiring and the generated README both used to, and picked `setAuthGate` for
  // every scaffold shipping `@molecule/app-http-axios` (TS2345 in the scaffold's
  // own `app/src/bonds/app-http-axios.ts`).
  bondSetter: z
    .string()
    .optional()
    .describe(
      'The setter a provider bond calls to register itself (e.g. setClient) — scanned from source',
    ),

  // Self-describing service registration metadata (resource packages)
  services: z
    .array(
      z.object({
        export: z.string().describe('Export name of the service (e.g. deviceService)'),
        bondCategory: z.string().describe('Bond category to register under (e.g. device, plans)'),
        bondType: z
          .enum(['singleton', 'custom'])
          .optional()
          .describe('Bond type (default: singleton)'),
      }),
    )
    .optional()
    .describe('Services this package registers with the bond system'),

  // Self-describing middleware metadata
  middleware: z
    .object({
      exportName: z.string().describe('Exported middleware function name'),
      setupOrder: z.number().describe('Order in middleware chain (lower = earlier)'),
    })
    .optional()
    .describe('How the CLI should wire this middleware'),

  // Self-describing framework template requirements
  templateRequires: z
    .array(z.string())
    .optional()
    .describe('Packages required by the generated app template for this framework'),

  // Additional metadata fields (also present in RegistryEntry)
  reExports: z
    .array(z.string())
    .optional()
    .describe('Exports that resource wrappers should re-export (e.g. authorization, services)'),
  shortName: z
    .string()
    .optional()
    .describe('Short name for file/variable naming (avoids parsing package name)'),
  cliHint: z.string().optional().describe('Hint for CLI post-creation messages'),
  optionalFeature: z.string().optional().describe('Feature flag name for optional route filtering'),
  intentHints: z
    .array(z.string())
    .optional()
    .describe(
      'Lowercase concept phrases ("social login", "pagination") that map user intent to this package. ' +
        'Consumed by generate-agent-catalog to produce intent-grouped SKILL.md output.',
    ),
  npmOverrides: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'npm `overrides` entries that must be pinned at the GENERATED project ROOT when this package ' +
        'is selected. npm honors `overrides` only from the install root — never from a nested ' +
        "dependency's package.json — so a bond that pulls a transitive dep with a known CVE declares " +
        'the patched pin here and the scaffolder merges it into the project root package.json. ' +
        'Exact versions only (no ranges), per save-exact policy. ' +
        'Example: {"ws":"8.21.0"} for socket.io-based realtime bonds (ws DoS GHSA-96hv-2xvq-fx4p).',
    ),
  egressHosts: z
    .array(z.string())
    .optional()
    .describe(
      'Outbound API hostnames this package DIALS at runtime — hand-verified from the bond source ' +
        'or its vendor SDK default endpoint, never from docs. A sandbox denies every host that is ' +
        'not on its egress allowlist, so a project that installs this package has these merged into ' +
        'its allowlist automatically; without them the vendor call just hangs with no denial signal. ' +
        'Exact hostnames, or a `*.apex` wildcard (the ONLY wildcard shape the matcher supports — ' +
        'a middle wildcard like `email.*.amazonaws.com` silently never matches). Dashboard, ' +
        'console and documentation URLs are NOT dialed and must not be listed. Omit for packages ' +
        'whose destination is entirely user-supplied (a self-hosted search node, an arbitrary ' +
        'webhook URL) — those belong in the project allowlist, not here.',
    ),
})

export type MoleculeMetadata = z.infer<typeof MoleculeMetadata>
export type BuildTooling = NonNullable<MoleculeMetadata['buildTooling']>

/**
 * Inferred package information - derived from conventions, not manifests
 */
export const InferredPackage = z.object({
  // From package.json
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  dependencies: z.record(z.string(), z.string()).default({}),
  peerDependencies: z.record(z.string(), z.string()).default({}),

  // Inferred from directory location
  type: PackageType,

  // Inferred from source scanning
  routes: z.array(InferredRoute).default([]),
  tables: z.array(InferredTable).default([]),
  exports: z.array(z.string()).default([]).describe('Named exports from index.ts'),

  // From README.md if present
  moleculeMd: z.string().optional().describe('Contents of README.md'),

  // Package metadata from centralized registry
  molecule: MoleculeMetadata.optional().describe('Package metadata from registry.json'),

  // Paths
  path: z.string().describe('Absolute path to package'),
  srcPath: z.string().optional().describe('Path to src directory'),
})

export type InferredPackage = z.infer<typeof InferredPackage>

// ============================================================================
// Centralized Registry (source of truth for all molecule packages)
// ============================================================================

/**
 * Font metadata for font provider packages
 */
export const FontMetadata = z.object({
  role: z.string().describe('Font role: sans, serif, mono, or icon'),
  family: z.string().describe('CSS font-family name'),
  source: z.string().describe('Source type: google, bunny, local, system, custom'),
  url: z.string().optional().describe('Font CSS stylesheet URL (CDN fonts)'),
  preconnect: z.array(z.string()).optional().describe('Preconnect origins (CDN fonts)'),
  utilityCss: z
    .string()
    .optional()
    .describe('Extra CSS injected after @font-face (icon fonts: the utility class)'),
  fontsDir: z
    .string()
    .optional()
    .describe('Directory within package containing font files (local fonts)'),
  faces: z
    .array(
      z.object({
        file: z.string().describe('Font filename within fontsDir'),
        weight: z.union([z.number(), z.string()]).describe('CSS font-weight (number or range)'),
        style: z.string().optional().describe('CSS font-style (default: normal)'),
        variable: z.boolean().optional().describe('Variable font — wrap in @supports'),
      }),
    )
    .optional()
    .describe('@font-face declarations (local fonts)'),
})

export type FontMetadata = z.infer<typeof FontMetadata>

/**
 * A single entry in the centralized molecule registry.
 * This is the single source of truth for all package metadata.
 * Language-agnostic to support future non-Node packages.
 */
export const RegistryEntry = z.object({
  language: z
    .enum(['typescript', 'python', 'go', 'rust', 'java'])
    .default('typescript')
    .describe('Source language of the package'),
  runtime: z
    .enum(['node', 'python', 'go', 'deno', 'bun'])
    .default('node')
    .describe('Runtime environment'),
  type: z.enum([
    'core',
    'provider',
    'resource',
    'middleware',
    'utility',
    'infrastructure',
    'framework',
    'feature',
    'native',
    'locales',
  ]),
  category: z
    .string()
    .describe('Feature category: database, auth, payments, email, cache, storage, etc.'),
  label: z.string().describe('Human-readable name for UI'),
  description: z.string().describe('Short description for UI hint text'),
  stack: z
    .enum(['api', 'app'])
    .describe('Which stack this package belongs to (api = backend, app = frontend)'),
  implements: z
    .string()
    .optional()
    .describe('Core interface this provider implements (e.g. @molecule/api-payments)'),
  defaultProvider: z
    .string()
    .optional()
    .describe('Default provider package to auto-include when no explicit provider is selected'),
  multiSelect: z
    .boolean()
    .optional()
    .describe('Whether users can pick multiple providers (core interfaces only)'),
  alwaysInclude: z.boolean().optional().describe('Auto-included in every project'),
  featureBundled: z.boolean().optional().describe('Auto-included when parent category is selected'),
  exports: z.array(z.string()).default([]).describe('Named exports from index.ts'),
  secrets: z.array(MoleculeSecret).default([]),
  runtimeDependencies: z
    .array(z.string())
    .default([])
    .describe('Non-molecule npm packages needed at runtime'),
  moleculePeers: z
    .array(z.string())
    .optional()
    .describe(
      'REQUIRED @molecule peerDependencies (optional peers excluded). Scaffolding' +
        ' expands the selection through these so an imported peer (oauth-buttons ->' +
        ' oauth-logos) is always installed; kept in the registry so no molecule' +
        ' source checkout is needed at scaffold time (prod has none).',
    ),
  framework: z
    .enum(['react', 'vue', 'svelte', 'solid', 'angular', 'react-native'])
    .optional()
    .describe('Framework-specific package (filters in feature menu)'),
  templateRequires: z
    .array(z.string())
    .optional()
    .describe('Packages required by the generated app template for this framework'),
  ui: z
    .object({
      order: z.number().optional().describe('Sort order in feature menu (lower = higher)'),
      hidden: z.boolean().optional().describe('Hide from create UI'),
    })
    .optional(),
  routes: z.array(InferredRoute).optional().describe('Route definitions'),
  tables: z
    .array(
      z.object({
        name: z.string(),
        sqlFile: z
          .string()
          .describe('Relative path within package, e.g. "src/__setup__/users.sql"'),
      }),
    )
    .optional()
    .describe('SQL table setup files'),
  font: FontMetadata.optional().describe(
    'Font metadata for CLI font style generation (font provider packages only)',
  ),
  buildTooling: z
    .object({
      devDependencies: z
        .record(z.string(), z.string())
        .optional()
        .describe('NPM devDependencies to add to the generated project'),
      vitePlugin: z
        .object({
          import: z.string().describe('Import statement for the Vite plugin'),
          usage: z.string().describe('Plugin call for the plugins array'),
        })
        .optional()
        .describe('Vite plugin configuration'),
      cssTemplate: z
        .string()
        .optional()
        .describe('Template file name for CSS entry (e.g. "app/shared/index-tailwind.css.tpl")'),
    })
    .optional()
    .describe('Build tooling metadata for project scaffolding'),
  bondWiring: z
    .object({
      type: z
        .enum(['singleton', 'named', 'none'])
        .describe(
          'Bond registration type (none: the project wires it itself, e.g. test tooling — never into src/bonds/)',
        ),
      bondCategory: z.string().describe('Bond registry category (e.g. oauth, payments)'),
      nameExport: z.string().optional().describe('Export that provides the named bond key'),
      providerExports: z.array(z.string()).optional().describe('Exports to import for the bond'),
    })
    .optional()
    .describe('How the CLI should wire this provider bond'),
  middlewareMountPath: z
    .string()
    .optional()
    .describe('Express mount path for route-set middleware (e.g. /api/billing)'),
  middlewareSetup: z
    .object({
      configFile: z
        .string()
        .optional()
        .describe('Project-relative config module to scaffold (e.g. src/tiers.ts)'),
      configImport: z
        .string()
        .optional()
        .describe('Import line pulling the config into the middleware file'),
      expression: z.string().describe('Call expression assigned to the middleware export'),
      configTemplate: z
        .string()
        .optional()
        .describe('Full content scaffolded into configFile when absent'),
    })
    .optional()
    .describe('How to wire a create* middleware factory that takes options'),
  appBondSetup: z
    .object({
      exportName: z
        .string()
        .describe(
          'Variable name exported from the bond setup file (e.g. themeProvider, i18nProvider, authClient)',
        ),
      reExport: z
        .boolean()
        .optional()
        .describe('Whether bonds/index.js should re-export this for framework templates'),
      generatorType: z
        .enum(['theme', 'i18n', 'generic'])
        .optional()
        .describe('Which code generator to use. Omit for default bond setup pattern.'),
    })
    .optional()
    .describe('App-side bond setup metadata for framework template integration'),
  bondSetup: z
    .object({
      generatorType: z
        .enum(['realtime-deferred'])
        .optional()
        .describe(
          'API bond stub variant. realtime-deferred: emit createProvider({ deferAttach: true }) — the provider binds no port of its own; the scaffolded server attaches it to the API HTTP server via attachHttpServer.',
        ),
    })
    .optional()
    .describe('API-side bond setup metadata (provider/server wiring variants)'),
  providerExportName: z
    .string()
    .optional()
    .describe('Override export name for the provider (when not "provider")'),
  bondSetter: z
    .string()
    .optional()
    .describe(
      'The setter a provider bond calls to register itself (e.g. setClient) — scanned from source by sync-registry --scan-exports',
    ),
  services: z
    .array(
      z.object({
        export: z.string().describe('Export name of the service (e.g. deviceService)'),
        bondCategory: z.string().describe('Bond category to register under (e.g. device, plans)'),
        bondType: z
          .enum(['singleton', 'custom'])
          .optional()
          .describe('Bond type (default: singleton)'),
      }),
    )
    .optional()
    .describe('Services this package registers with the bond system'),
  reExports: z
    .array(z.string())
    .optional()
    .describe('Exports that resource wrappers should re-export (e.g. authorization, services)'),
  shortName: z
    .string()
    .optional()
    .describe('Short name for file/variable naming (avoids parsing package name)'),
  cliHint: z.string().optional().describe('Hint for CLI post-creation messages'),
  optionalFeature: z.string().optional().describe('Feature flag name for optional route filtering'),
  generates: z
    .array(z.string())
    .optional()
    .describe(
      'What this package generates during injection (e.g. "service-worker", "service-worker-push")',
    ),
  path: z.string().describe('Relative path within monorepo (e.g. "packages/api/core/database")'),
  testMock: z
    .record(z.string(), z.string())
    .optional()
    .describe('Mock exports for test file generation (export name → mock expression)'),
  defaultBond: z
    .string()
    .optional()
    .describe('Default bond file name when no explicit provider is selected (e.g. "auth-default")'),
  defaultBondSetup: z
    .object({
      factory: z.string().describe('Factory function to call'),
      setter: z.string().describe('Setter function to call with result'),
      configImport: z.string().optional().describe('Config variable to import from ../config.js'),
      configImports: z
        .array(z.string())
        .optional()
        .describe(
          'More names to import from ../config.js WITHOUT spreading them into the factory call ' +
            '(use for a value a configExtend entry reads, e.g. "baseURL: API_BASE_URL")',
        ),
      extraImports: z
        .array(
          z.object({
            names: z.array(z.string()),
            from: z.string(),
          }),
        )
        .optional()
        .describe('Additional imports needed for the setup'),
      extraSetupLines: z
        .array(z.string())
        .optional()
        .describe('Extra lines for the setup function body'),
      configExtend: z
        .array(z.string())
        .optional()
        .describe(
          'Extra named values to spread into the config object (must be imported via extraImports). ' +
            'When set, factory call becomes factory({ ...configImport, field1, field2 })',
        ),
      header: z
        .array(z.string())
        .optional()
        .describe(
          'Doc-comment lines for the generated bond file, shown to the executor that edits it ' +
            '(the calls that replace a second implementation, the one store the file is). ' +
            'Defaults to the generic factory/setter sentence.',
        ),
      setupAfter: z
        .array(z.string())
        .optional()
        .describe(
          'Packages whose bond setup must run BEFORE this bond’s setup in the generated ' +
            'bonds/index.ts (a topological order, not registry order). Declare it when the setup ' +
            'reads another bond: app-auth mirrors the auth token into the HTTP client, so it ' +
            'names @molecule/app-http.',
        ),
      authBridge: z
        .object({
          package: z.string().describe('The package whose bond file holds the auth client'),
          bond: z.string().describe('That bond’s file name, imported as `./<bond>.js`'),
          client: z.string().describe('The auth client export read on every request'),
          schemeConfig: z
            .string()
            .describe('The `../config.js` export whose `authScheme` names the header scheme'),
        })
        .optional()
        .describe(
          'Emit the auth wiring a separate HTTP client needs: read the auth bond’s token ' +
            'on every request, send it with the configured Authorization scheme, and register ' +
            'the restore as the client’s gate. Dropped when that bond is not generated in ' +
            'the same scaffold (a provider bond replaced it), so no import names a missing file.',
        ),
    })
    .optional()
    .describe('How to generate a default bond setup when no explicit provider is selected'),
  intentHints: z
    .array(z.string())
    .optional()
    .describe(
      'Lowercase concept phrases ("social login", "pagination") that map user intent to this package. ' +
        'Consumed by generate-agent-catalog to produce intent-grouped SKILL.md output.',
    ),
  npmOverrides: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'npm `overrides` entries that must be pinned at the GENERATED project ROOT when this package ' +
        'is selected. npm honors `overrides` only from the install root — never from a nested ' +
        "dependency's package.json — so a bond that pulls a transitive dep with a known CVE declares " +
        'the patched pin here and the scaffolder merges it into the project root package.json. ' +
        'Exact versions only (no ranges), per save-exact policy. ' +
        'Example: {"ws":"8.21.0"} for socket.io-based realtime bonds (ws DoS GHSA-96hv-2xvq-fx4p).',
    ),
  egressHosts: z
    .array(z.string())
    .optional()
    .describe(
      'Outbound API hostnames this package DIALS at runtime — hand-verified from the bond source ' +
        'or its vendor SDK default endpoint, never from docs. A sandbox denies every host that is ' +
        'not on its egress allowlist, so a project that installs this package has these merged into ' +
        'its allowlist automatically; without them the vendor call just hangs with no denial signal. ' +
        'Exact hostnames, or a `*.apex` wildcard (the ONLY wildcard shape the matcher supports — ' +
        'a middle wildcard like `email.*.amazonaws.com` silently never matches). Dashboard, ' +
        'console and documentation URLs are NOT dialed and must not be listed. Omit for packages ' +
        'whose destination is entirely user-supplied (a self-hosted search node, an arbitrary ' +
        'webhook URL) — those belong in the project allowlist, not here.',
    ),
})

export type RegistryEntry = z.infer<typeof RegistryEntry>

/**
 * API framework configuration for code generation.
 * Each entry describes the import/instantiation patterns for a framework.
 */
export const ApiFrameworkConfig = z.object({
  name: z.string().describe('Framework name (e.g. express)'),
  routerImport: z.string().describe('Import statement for the router module'),
  routerCreate: z.string().describe('Expression to create a new router instance'),
  middlewareTypeImport: z
    .string()
    .describe('Import statement for the middleware request handler type'),
  middlewareType: z.string().describe('Type name for middleware handlers'),
  serverImport: z.string().describe('Import statement for the server module'),
  serverCreate: z.string().describe('Expression to create a new server/app instance'),
  jsonBodyParser: z.string().describe('Expression for built-in JSON body parser middleware'),
  errorHandlerSignature: z.string().describe('Error handler function signature'),
  errorHandlerCast: z.string().describe('Cast expression for the error handler'),
  serverType: z.string().describe('Type name for the server/app instance'),
  dependencies: z.record(z.string(), z.string()).default({}).describe('Runtime npm dependencies'),
  devDependencies: z.record(z.string(), z.string()).default({}).describe('Dev npm dependencies'),
})

export type ApiFrameworkConfig = z.infer<typeof ApiFrameworkConfig>

/**
 * App (frontend) framework configuration for project scaffolding.
 * Each entry describes deps, tsconfig, and vite plugin settings.
 */
export const AppFrameworkConfig = z.object({
  label: z.string().describe('Human-readable name for CLI menus'),
  hint: z.string().optional().describe('Hint text shown next to the label in CLI menus'),
  dependencies: z.record(z.string(), z.string()).default({}).describe('Runtime npm dependencies'),
  devDependencies: z.record(z.string(), z.string()).default({}).describe('Dev npm dependencies'),
  tsconfig: z
    .record(z.string(), z.unknown())
    .default({})
    .describe('Framework-specific tsconfig compilerOptions overrides'),
  tsconfigOverride: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Complete tsconfig.json override (replaces default generation when set)'),
  vitePlugin: z
    .object({
      import: z.string().describe('Import statement for the Vite plugin'),
      usage: z.string().describe('Plugin call for the plugins array'),
    })
    .optional()
    .describe('Vite plugin configuration'),
  buildScript: z
    .string()
    .optional()
    .describe('Build script command (defaults to "tsc --noEmit && vite build")'),
  typeDeclarations: z
    .string()
    .optional()
    .describe('Extra type declarations appended to vite-env.d.ts'),
  sharedCodeDir: z
    .string()
    .optional()
    .describe(
      'Subdirectory under src/ for shared code (e.g. "lib" for SvelteKit). Omit for src/ root.',
    ),
  fileExtension: z
    .string()
    .optional()
    .describe('Source file extension for this framework (defaults to "tsx")'),
  htmlTemplate: z.string().optional().describe('HTML template filename (defaults to "index.html")'),
  publicDir: z
    .string()
    .optional()
    .describe('Static assets directory name (defaults to "public"). SvelteKit uses "static".'),
  gitignoreTemplate: z
    .string()
    .optional()
    .describe(
      'Gitignore template path relative to templates dir (defaults to "app/shared/gitignore.tpl")',
    ),
  skipCustomServiceWorker: z
    .boolean()
    .optional()
    .describe(
      'Skip generating src/service-worker.ts. Set for frameworks like SvelteKit that auto-compile service workers from src/, which conflicts with vite-plugin-pwa generateSW mode.',
    ),
  uiFramework: z
    .string()
    .optional()
    .describe(
      'Override framework name for the UI package suffix in CSS @source directives. E.g. "react-native" for react-native-web → @molecule/app-ui-react-native.',
    ),
  templateRequires: z
    .array(z.string())
    .optional()
    .describe(
      'Packages required by app templates for this framework. Used when no framework package exists in the registry (e.g. react-native-web has no @molecule/app-react-native-web).',
    ),
  excludePeerDependencies: z
    .array(z.string())
    .optional()
    .describe(
      'Peer dependency names to exclude from injection. Used when a build-time alias replaces an npm package (e.g. react-native is aliased to a DOM shim in react-native-web).',
    ),
  viteExtraConfig: z
    .string()
    .optional()
    .describe('Extra Vite config lines injected into defineConfig (e.g. resolve block)'),
  htmlRootElement: z
    .string()
    .optional()
    .describe(
      'Root element in index.html body (defaults to \'<div id="root"></div>\'). Angular uses "<app-root></app-root>".',
    ),
})

export type AppFrameworkConfig = z.infer<typeof AppFrameworkConfig>

/**
 * Staging driver configuration for ephemeral branch-per-feature environments.
 * Each entry describes a deployment driver (e.g. Docker Compose, Fly.io)
 * that the CLI can use to manage staging environments.
 */
export const StagingDriverRegistryEntry = z.object({
  name: z.string().describe('Driver identifier (e.g. docker-compose, fly-io)'),
  package: z.string().describe('@molecule package providing this driver'),
  label: z.string().describe('Human-readable name for CLI menus'),
  description: z.string().describe('Short description of the driver'),
  prerequisites: z
    .array(z.string())
    .default([])
    .describe('CLI tools that must be installed (e.g. docker)'),
  defaultPortRange: z
    .object({
      start: z.number().describe('First port in the range'),
      end: z.number().describe('Last port in the range'),
    })
    .optional()
    .describe('Default port range for environment allocation'),
  handlesBuilds: z
    .boolean()
    .default(false)
    .describe('Whether this driver builds inside containers (skips CLI pre-build)'),
  services: z
    .record(
      z.string(),
      z.object({
        port: z.union([z.number(), z.literal('dynamic')]).describe('Port or dynamic allocation'),
        healthPath: z.string().optional().describe('HTTP path for health checks'),
        image: z.string().optional().describe('Default container image'),
      }),
    )
    .optional()
    .describe('Services managed by this driver'),
})

export type StagingDriverRegistryEntry = z.infer<typeof StagingDriverRegistryEntry>

/**
 * The centralized molecule registry — single source of truth for all packages.
 * Lives at mlcl/registry.json and is auto-updated by mlcl commands.
 */
export const Registry = z.object({
  version: z.literal(1),
  packages: z.record(z.string(), RegistryEntry),
  typeDefaults: z
    .record(
      z.string(),
      z.object({
        implicitPeers: z.array(z.string()).describe('Packages to auto-add as peer deps'),
      }),
    )
    .optional()
    .describe('Default settings per package type (resource, provider, etc.)'),
  apiFrameworks: z
    .record(z.string(), ApiFrameworkConfig)
    .optional()
    .describe('API framework configurations for code generation'),
  appFrameworks: z
    .record(z.string(), AppFrameworkConfig)
    .optional()
    .describe('App framework configurations for project scaffolding'),
  stagingDrivers: z
    .record(z.string(), StagingDriverRegistryEntry)
    .optional()
    .describe('Staging driver configurations for ephemeral environments'),
  toolchain: z
    .object({
      shared: z
        .record(z.string(), z.string())
        .default({})
        .describe('Dev dependencies shared across all generated projects'),
      api: z
        .record(z.string(), z.string())
        .default({})
        .describe('Dev dependencies specific to generated API projects'),
      app: z
        .record(z.string(), z.string())
        .default({})
        .describe('Dev dependencies specific to generated App projects'),
      moleculePackage: z
        .record(z.string(), z.string())
        .default({})
        .describe('Dev dependencies for scaffolded molecule packages'),
    })
    .optional()
    .describe('Pinned toolchain versions for generated projects and packages'),
  moleculeVersions: z
    .object({
      default: z
        .string()
        .describe(
          'Exact version every @molecule/* package pins to (the monorepo lockstep version). No ^/~ — exact only.',
        ),
      overrides: z
        .record(z.string(), z.string())
        .default({})
        .describe(
          'Per-package exact version overrides for @molecule/* packages that diverge from the default.',
        ),
    })
    .optional()
    .describe(
      'Exact published versions for @molecule/* packages — the single source of truth for the version scaffolded projects pin each @molecule dependency to.',
    ),
  themePresets: z
    .record(
      z.string(),
      z.object({
        label: z.string().describe('Human-readable name for CLI menus'),
        description: z.string().describe('Short description for UI hint text'),
        themeProvider: z
          .string()
          .describe(
            'Theme provider package to use (replaces default @molecule/app-theme provider)',
          ),
        classMapProvider: z
          .string()
          .optional()
          .describe('ClassMap provider package to use instead of the default (e.g. glass effects)'),
      }),
    )
    .optional()
    .describe('Named theme presets that bundle a theme provider + optional ClassMap override'),
})

export type Registry = z.infer<typeof Registry>

// ============================================================================
// Injection Plan
// ============================================================================

/**
 * File operation during injection
 */
export const FileOperation = z.object({
  action: z.enum(['create', 'modify', 'delete']),
  targetPath: z.string().describe('Path in target project'),
  sourcePath: z.string().optional().describe('Path in molecule package'),
  description: z.string(),
  content: z.string().optional().describe('Content to write (for create/modify)'),
})

export type FileOperation = z.infer<typeof FileOperation>

/**
 * Conflict detected during injection planning
 */
export const Conflict = z.object({
  path: z.string(),
  type: z.enum(['file-exists', 'route-collision', 'missing-dependency', 'missing-bond']),
  message: z.string(),
  resolution: z.enum(['skip', 'overwrite', 'merge', 'abort']).optional(),
})

export type Conflict = z.infer<typeof Conflict>

/**
 * Complete injection plan for a molecule
 */
export const InjectionPlan = z.object({
  package: InferredPackage,
  operations: z.array(FileOperation).default([]),
  conflicts: z.array(Conflict).default([]),

  // Dependencies to install
  npmInstall: z.array(z.string()).default([]),

  // Post-injection instructions (from README.md)
  postInstructions: z.array(z.string()).default([]),
})

export type InjectionPlan = z.infer<typeof InjectionPlan>
