/**
 * Inference engine — derives package metadata from a natural language description.
 *
 * Used by `mlcl init` in interactive mode to turn a single sentence
 * ("A Redis-backed cache provider") into full InferredMetadata.
 *
 * The CLI NEVER calls an external AI API. This is pure heuristic matching
 * against the registry + keyword rules.
 *
 * @module
 */

import type { InferredPackage, MoleculeSecret } from './schema.js'

export interface InferredMetadata {
  name: string
  type:
    | 'core'
    | 'provider'
    | 'resource'
    | 'middleware'
    | 'utility'
    | 'infrastructure'
    | 'framework'
    | 'feature'
    | 'native'
  category: string
  stack: 'api' | 'app'
  label: string
  description: string
  implements?: string
  secrets: MoleculeSecret[]
  tables: string[]
}

// ---------------------------------------------------------------------------
// Keyword dictionaries
// ---------------------------------------------------------------------------

const API_KEYWORDS = [
  'api',
  'backend',
  'server',
  'express',
  'handler',
  'endpoint',
  'route',
  'rest',
  'middleware',
  'sql',
  'database',
  'query',
  'migration',
  'webhook',
]

const APP_KEYWORDS = [
  'frontend',
  'app',
  'ui',
  'component',
  'page',
  'view',
  'widget',
  'hook',
  'store',
  'browser',
  'client',
  'react',
  'vue',
  'svelte',
  'solid',
  'angular',
]

const CORE_KEYWORDS = [
  'interface',
  'abstraction',
  'abstract',
  'core',
  'contract',
  'protocol',
  'agnostic',
  'generic',
  'model-agnostic',
  'provider interface',
]

const PROVIDER_KEYWORDS = [
  'provider',
  'implementation',
  'adapter',
  'driver',
  'integration',
  'client',
  'sdk',
  'wrapper',
]

const RESOURCE_KEYWORDS = ['resource', 'entity', 'crud', 'table', 'collection', 'record']

const MIDDLEWARE_KEYWORDS = ['middleware', 'interceptor', 'filter', 'guard']

const UTILITY_KEYWORDS = ['utility', 'helper', 'util', 'validation', 'formatter']

const FRAMEWORK_KEYWORDS = [
  'react hook',
  'vue composable',
  'svelte store',
  'solid primitive',
  'angular service',
  'framework binding',
  'framework adapter',
  'react component',
  'vue component',
  'svelte component',
  'solid component',
  'angular component',
]

const FEATURE_KEYWORDS = [
  'rich text',
  'charts',
  'maps',
  'video player',
  'in-app purchase',
  'iap',
  'ide',
  'code editor',
  'live preview',
  'domain-specific',
]

const NATIVE_KEYWORDS = [
  'native',
  'capacitor',
  'device capability',
  'geolocation',
  'biometrics',
  'camera',
  'haptics',
  'push notification',
  'clipboard',
  'keyboard',
  'status bar',
  'splash screen',
  'nfc',
  'bluetooth',
  'accelerometer',
  'gyroscope',
  'battery',
  'brightness',
  'contacts',
  'calendar',
  'filesystem',
  'screen orientation',
]

/**
 * Build provider-name-to-category mapping from the registry at runtime.
 * Derives the mapping from provider packages: @molecule/api-{category}-{provider}
 * or @molecule/app-{category}-{provider} -> { provider: category }.
 */
function buildProviderNames(registry: InferredPackage[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  for (const pkg of registry) {
    const mol = pkg.molecule
    if (mol?.type !== 'provider' || !mol.category) continue
    // Extract provider name from package name segments after category
    // e.g. @molecule/api-database-postgresql -> postgresql
    // e.g. @molecule/app-state-zustand -> zustand
    const stripped = pkg.name.replace(/^@molecule\/(api|app)-/, '')
    const category = mol.category as string
    const providerName = stripped.startsWith(category + '-')
      ? stripped.slice(category.length + 1)
      : stripped
    if (providerName && providerName !== stripped.replace(/-/g, '')) {
      mapping[providerName] = category
    }
  }
  return mapping
}

/** Category keywords — used when no known provider name matches. */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  database: ['database', 'db', 'data store', 'datastore', 'persistence', 'sql', 'nosql'],
  payments: ['payment', 'billing', 'subscription', 'checkout', 'charge', 'invoice'],
  email: ['email', 'mail', 'transactional email', 'newsletter'],
  oauth: ['oauth', 'sso', 'single sign-on', 'social login', 'authentication provider'],
  auth: ['auth', 'authentication', 'login', 'signup', 'password', 'jwt', 'token', 'session'],
  logger: ['log', 'logger', 'logging', 'debug'],
  cache: ['cache', 'caching', 'in-memory'],
  queue: ['queue', 'job', 'worker', 'background job', 'task queue'],
  uploads: ['upload', 'file upload', 'file storage', 'object storage', 'blob'],
  'push-notifications': ['push', 'notification', 'push notification'],
  analytics: ['analytics', 'tracking', 'metrics', 'telemetry'],
  ai: ['ai', 'llm', 'chat', 'completion', 'embedding', 'language model', 'machine learning'],
  sandbox: ['sandbox', 'container', 'vm', 'virtual machine', 'isolated environment'],
  deploy: ['deploy', 'deployment', 'hosting', 'ci/cd', 'publish'],
  video: ['video', 'streaming', 'webrtc', 'video call'],
  maps: ['map', 'geolocation', 'geocoding'],
  charts: ['chart', 'graph', 'visualization', 'plotting'],
  i18n: ['i18n', 'internationalization', 'localization', 'translation', 'locale'],
  theme: ['theme', 'dark mode', 'light mode', 'color scheme'],
  forms: ['form', 'form validation', 'form state'],
  routing: ['router', 'routing', 'navigation', 'routes'],
  http: ['http', 'fetch', 'ajax', 'request', 'api client'],
  state: ['state management', 'global state', 'store'],
  storage: ['local storage', 'session storage', 'storage adapter'],
  ui: ['ui', 'component library', 'design system', 'button', 'modal', 'input'],
  'two-factor': ['2fa', 'two-factor', 'totp', 'mfa', 'multi-factor'],
  'rich-text': ['rich text', 'wysiwyg', 'markdown editor', 'text editor'],
  secrets: ['secrets', 'vault', 'env', 'environment variables'],
  config: ['config', 'configuration', 'settings'],
}

/** Special label casing rules. */
const LABEL_OVERRIDES: Record<string, string> = {
  ai: 'AI',
  oauth: 'OAuth',
  jwt: 'JWT',
  http: 'HTTP',
  i18n: 'I18n',
  ui: 'UI',
  sso: 'SSO',
  db: 'Database',
  'push-notifications': 'Push Notifications',
  'two-factor': 'Two-Factor Auth',
  'rich-text': 'Rich Text',
}

// ---------------------------------------------------------------------------
// Inference logic
// ---------------------------------------------------------------------------

/**
 * Infer full package metadata from a natural-language description.
 *
 * @param description - Free-form text like "A Redis-backed cache provider"
 * @param registry - The loaded registry packages (from loadRegistry)
 * @returns Inferred metadata with reasonable defaults
 */
export function inferFromDescription(
  description: string,
  registry: InferredPackage[],
): InferredMetadata {
  const lower = description.toLowerCase()

  const stack = inferStack(lower)
  const category = inferCategory(lower, registry)
  let providerName = inferProviderName(lower, category, registry)
  const type = inferType(lower, providerName, category, stack, registry)

  // If type is provider but no known provider name was found in the registry,
  // try extracting one from the description text. This handles new providers
  // that don't exist in the registry yet.
  if (type === 'provider' && !providerName) {
    providerName = extractProviderNameFromText(lower, category)
  }

  const implements_ = inferImplements(type, stack, category, registry)
  const secrets = inferSecrets(type, category, providerName, registry)
  const tables = inferTables(type, category, registry)
  const name = buildName(stack, type, category, providerName)
  const label = buildLabel(category, providerName, type)

  return {
    name,
    type,
    category,
    stack,
    label,
    description,
    implements: implements_,
    secrets,
    tables,
  }
}

function inferStack(lower: string): 'api' | 'app' {
  const apiScore = API_KEYWORDS.filter((kw) => lower.includes(kw)).length
  const appScore = APP_KEYWORDS.filter((kw) => lower.includes(kw)).length
  // Default to api if ambiguous
  return appScore > apiScore ? 'app' : 'api'
}

function inferCategory(lower: string, registry: InferredPackage[]): string {
  // 1. Check known provider names first (most specific)
  const providerNames = buildProviderNames(registry)
  for (const [provider, cat] of Object.entries(providerNames)) {
    if (lower.includes(provider)) return cat
  }

  // 2. Check category keywords
  let bestCategory = ''
  let bestScore = 0
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestCategory = cat
    }
  }
  if (bestCategory) return bestCategory

  // 3. Check against existing registry categories
  const registryCategories = new Set<string>()
  for (const pkg of registry) {
    if (pkg.molecule?.category) registryCategories.add(pkg.molecule.category)
  }
  for (const cat of registryCategories) {
    if (lower.includes(cat)) return cat
  }

  // 4. Fall back to extracting the most meaningful noun
  return 'general'
}

function inferProviderName(
  lower: string,
  category: string,
  registry: InferredPackage[],
): string | undefined {
  // Look for a known provider in this category
  const providerNames = buildProviderNames(registry)
  for (const [provider, cat] of Object.entries(providerNames)) {
    if (cat === category && lower.includes(provider)) {
      return provider.replace(/\s+/g, '-')
    }
  }
  return undefined
}

/**
 * Fallback: extract a provider name from the description text when no known
 * provider was found in the registry. Filters out category keywords, type
 * keywords, and common stop words, then returns the first remaining word.
 */
function extractProviderNameFromText(lower: string, category: string): string | undefined {
  const words = lower.split(/[\s(),.-]+/).filter((w) => w.length > 1)

  const exclude = new Set<string>()

  // Category name + its keyword variants
  exclude.add(category)
  const categoryKws = CATEGORY_KEYWORDS[category]
  if (categoryKws) {
    for (const kw of categoryKws) {
      for (const w of kw.split(/\s+/)) exclude.add(w)
    }
  }

  // All type/role keyword lists
  for (const list of [
    API_KEYWORDS,
    APP_KEYWORDS,
    CORE_KEYWORDS,
    PROVIDER_KEYWORDS,
    RESOURCE_KEYWORDS,
    MIDDLEWARE_KEYWORDS,
    UTILITY_KEYWORDS,
    FRAMEWORK_KEYWORDS,
    FEATURE_KEYWORDS,
    NATIVE_KEYWORDS,
  ]) {
    for (const kw of list) {
      for (const w of kw.split(/\s+/)) exclude.add(w)
    }
  }

  // Common English filler words
  for (const w of [
    'a',
    'an',
    'the',
    'for',
    'with',
    'and',
    'or',
    'of',
    'in',
    'on',
    'to',
    'by',
    'based',
    'backed',
    'new',
    'from',
    'using',
    'via',
    'like',
    'as',
    'that',
    'this',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'its',
    'it',
    'use',
    'all',
  ]) {
    exclude.add(w)
  }

  const candidates = words.filter((w) => !exclude.has(w))
  return candidates.length > 0 ? candidates[0] : undefined
}

function inferType(
  lower: string,
  providerName: string | undefined,
  category: string,
  stack: string,
  registry: InferredPackage[],
): InferredMetadata['type'] {
  const hasCore = CORE_KEYWORDS.some((kw) => lower.includes(kw))
  const hasProvider = PROVIDER_KEYWORDS.some((kw) => lower.includes(kw))
  const hasResource = RESOURCE_KEYWORDS.some((kw) => lower.includes(kw))
  const hasMiddleware = MIDDLEWARE_KEYWORDS.some((kw) => lower.includes(kw))
  const hasUtility = UTILITY_KEYWORDS.some((kw) => lower.includes(kw))
  const hasFramework = FRAMEWORK_KEYWORDS.some((kw) => lower.includes(kw))
  const hasFeature = FEATURE_KEYWORDS.some((kw) => lower.includes(kw))
  const hasNative = NATIVE_KEYWORDS.some((kw) => lower.includes(kw))

  // App-specific types take priority when stack is 'app'
  if (stack === 'app') {
    // Native device capabilities
    if (hasNative) return 'native'
    // Domain-specific feature libraries (IDE, charts, maps, etc.)
    if (hasFeature) return 'feature'
    // Framework bindings (React hooks, Vue composables, etc.)
    if (hasFramework) return 'framework'
  }

  // Core keywords (interface, abstract, agnostic) are the strongest signal
  // — they override provider/resource keywords that may co-occur
  if (hasCore && !providerName) return 'core'

  // Known provider name is a strong signal for provider type
  if (providerName) return 'provider'

  // Explicit type keywords (checked in order of specificity)
  if (hasResource) return 'resource'
  if (hasMiddleware) return 'middleware'
  if (hasUtility) return 'utility'
  if (hasProvider) return 'provider'

  // Check if a core package already exists for this category — if so, likely a provider
  const coreExists = registry.some(
    (pkg) =>
      pkg.molecule?.category === category &&
      (pkg.molecule?.type === 'core' || pkg.molecule?.type === 'infrastructure'),
  )
  if (coreExists) return 'provider'

  // Default: core (creating a new abstraction)
  return 'core'
}

function inferImplements(
  type: string,
  stack: string,
  category: string,
  registry: InferredPackage[],
): string | undefined {
  if (type !== 'provider') return undefined

  // Find the core package for this category
  const corePackage = registry.find(
    (pkg) =>
      pkg.molecule?.category === category &&
      (pkg.molecule?.type === 'core' || pkg.molecule?.type === 'infrastructure') &&
      pkg.name.startsWith(`@molecule/${stack}-`),
  )

  return corePackage?.name
}

function inferSecrets(
  type: string,
  category: string,
  providerName: string | undefined,
  registry: InferredPackage[],
): MoleculeSecret[] {
  if (type !== 'provider' || !providerName) return []

  // Copy secret patterns from existing providers in the same category
  const existingProvider = registry.find(
    (pkg) => pkg.molecule?.category === category && pkg.molecule?.type === 'provider',
  )

  if (existingProvider?.molecule?.secrets && existingProvider.molecule.secrets.length > 0) {
    // Use existing secrets as a template, replacing the provider name
    const existingName = existingProvider.name
      .replace('@molecule/', '')
      .replace(/^(api|app)-/, '')
      .replace(`${category}-`, '')
      .toUpperCase()
    const newName = (providerName ?? '').toUpperCase().replace(/-/g, '_')

    return existingProvider.molecule.secrets.map((s) => ({
      name: s.name.replace(existingName, newName),
      required: s.required,
      default: s.default,
    }))
  }

  return []
}

function inferTables(type: string, category: string, registry: InferredPackage[]): string[] {
  if (type !== 'resource') return []

  // Check existing resources for similar table patterns
  const existingResource = registry.find(
    (pkg) => pkg.molecule?.category === category && pkg.molecule?.type === 'resource',
  )

  if (existingResource?.tables && existingResource.tables.length > 0) {
    return existingResource.tables.map((t) => t.name)
  }

  // Default: use category as table name (pluralized if not already)
  const tableName = category.endsWith('s') ? category : category + 's'
  return [tableName]
}

function buildName(
  stack: string,
  type: string,
  category: string,
  providerName: string | undefined,
): string {
  if (type === 'resource') return `${stack}-resource-${category}`
  if (type === 'provider' && providerName) return `${stack}-${category}-${providerName}`
  if (type === 'middleware') return `${stack}-middleware-${category}`
  if (type === 'utility') return `${stack}-utilities-${category}`
  return `${stack}-${category}`
}

function buildLabel(category: string, providerName: string | undefined, type: string): string {
  if (type === 'provider' && providerName) {
    return titleCase(providerName)
  }
  if (LABEL_OVERRIDES[category]) return LABEL_OVERRIDES[category]
  return titleCase(category)
}

function titleCase(str: string): string {
  return str
    .split('-')
    .map((word) => {
      // Check for known all-caps abbreviations
      const upper = word.toUpperCase()
      if (['AI', 'HTTP', 'UI', 'JWT', 'SSO', 'API', 'DB', 'SQL'].includes(upper)) {
        return upper
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}
