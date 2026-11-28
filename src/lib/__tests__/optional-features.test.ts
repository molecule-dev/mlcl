/**
 * Optional features: a custom scaffold writes a page, link, field or route only when a package in
 * its stack serves it.
 *
 * The default custom stack (`api-resource-user` with an SQLite database) has no email transport,
 * two-factor provider, payments provider or OAuth provider. It used to get a password-reset flow,
 * a plan page, a two-factor field, billing settings and OAuth buttons anyway, and a model asked
 * for "sign-up and log-in, no other features" spent a minute deleting them (harness eval
 * `scaffold`, 2026-11-24). Every framework and the API router are checked, without and with
 * the four features.
 *
 * @module
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

import * as prettier from 'prettier'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  applyFeatureSections,
  deriveOptionalFeatures,
  FEATURE_TEMPLATES_DIR,
  featureSectionNames,
  selectOptionalFeatures,
  templateFeaturePackages,
} from '../optional-features.js'
import { loadAppFrameworks, loadRegistry } from '../registry.js'
import { copyTemplateFiles } from '../scaffold.js'
import { APP_TEMPLATES } from './helpers/app-templates.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')

/** What each feature puts in an app: its pages, links, fields and components. */
const FEATURE_TEXT: Record<string, RegExp> = {
  emails: /forgot-password|reset-password|ForgotPassword|ResetPassword/,
  payments: /plan-updated|PlanUpdated|planUpdated\.verifyFailed/,
  billing:
    /TiersUpgradeSection|mol-tiers-upgrade-section|BillingSection|settings\.billing\.upgradeTitle/,
  oauth: /OAuthButtons|oauth-buttons|oauthConfig/,
  'two-factor': /twoFactorToken|twoFactorEnabled|handleToggle2FA/,
  settings: /SettingsPanel|SettingsComponent|settings-panel\.component/,
  footer: /\bFooter\b|FooterComponent|app-footer|about\.title/,
}

/** The router each feature mounts (`resource<Name><Feature>Router`). */
const FEATURE_ROUTER: Record<string, RegExp> = {
  devices: /router\.get\(`\/devices`,/,
  emails: /router\.use\(resourceUserEmailsRouter\)/,
  payments: /router\.use\(resourceUserPaymentsRouter\)/,
  oauth: /router\.use\(resourceUserOauthRouter\)/,
  'two-factor': /router\.use\(resourceUserTwoFactorRouter\)/,
}

/** The server mount each middleware feature adds (`app.use(<path>, …)` in server.ts). */
const FEATURE_MOUNT: Record<string, RegExp> = {
  billing: /app\.use\('\/api\/billing', /,
}

/** One provider per feature, for the counterexample stack. A payments provider brings billing. */
const FEATURE_PACKAGES = [
  '@molecule/api-emails-resend',
  '@molecule/api-payments-stripe',
  '@molecule/api-oauth-github',
  '@molecule/api-two-factor-otplib',
  '@molecule/api-push-notifications-web-push',
  '@molecule/app-settings-panel-react',
  '@molecule/app-footer-react',
]

/** The editable router's code for each feature (`api/src/handlers/auth.ts`). */
const FEATURE_ROUTER_CODE: Record<string, RegExp> = {
  emails: /export const emailsRouter = Router\(\)/,
  payments: /export const paymentsRouter = Router\(\)/,
  oauth: /export const oauthRouter = Router\(\)/,
  'two-factor': /export const twoFactorRouter = Router\(\)/,
}

/**
 * The source files under `src` that the scaffold's own `.prettierrc` (and the framework's prettier
 * plugins) would rewrite: a dropped section must leave the text a formatter keeps.
 */
async function unformatted(src: string, framework: string): Promise<string[]> {
  const options = {
    ...(JSON.parse(
      readFileSync(join(ROOT, 'templates', 'app', 'shared', 'prettierrc.json.tpl'), 'utf8'),
    ) as object),
    plugins: loadAppFrameworks()[framework]?.prettierPlugins ?? [],
  }
  const out: string[] = []
  for (const file of await files(src)) {
    if (!/\.(ts|tsx|vue|svelte)$/.test(file)) continue
    const text = readFileSync(join(src, file), 'utf8')
    if (!(await prettier.check(text, { ...options, filepath: join(src, file) }))) out.push(file)
  }
  return out
}

/**
 * The settings panel's two-factor off switch, per framework: the shared AuthSection shows an
 * Enable button that only answers 404 when the API has no two-factor provider.
 */
const TWO_FACTOR_OFF =
  /<AuthSection twoFactor=\{false\} \/>|<AuthSection :two-factor="false" \/>|<mol-auth-section \[twoFactor\]="false">/

/** Whether a framework's settings panel renders the shared AuthSection. */
function rendersAuthSection(src: string): boolean {
  return readdirSync(join(src, 'components')).some((file) =>
    /<AuthSection\b|<mol-auth-section\b/.test(readFileSync(join(src, 'components', file), 'utf8')),
  )
}

/** The settings panel files that turn the two-factor row off. */
function twoFactorOff(src: string): string[] {
  return readdirSync(join(src, 'components')).filter((file) =>
    TWO_FACTOR_OFF.test(readFileSync(join(src, 'components', file), 'utf8')),
  )
}

const FRAMEWORKS = readdirSync(APP_TEMPLATES, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
  .map((entry) => entry.name)

/**
 * The features a framework's templates gate: every feature an api or framework-free package brings,
 * and a feature a framework's own UI packages bring (the settings panel's `settings`) only where
 * those packages render. react-native-web renders with React Native's UI set and writes its own
 * settings drawer and footer.
 */
function gatedFeatures(framework: string): string[] {
  const frameworks = loadAppFrameworks()
  const rendersWith = new Set([framework, frameworks[framework]?.uiFramework ?? framework])
  const brought = new Map<string, Set<string | undefined>>()
  for (const pkg of loadRegistry()) {
    const feature = pkg.molecule?.optionalFeature
    if (feature)
      (brought.get(feature) ?? brought.set(feature, new Set()).get(feature)!).add(
        pkg.molecule?.framework,
      )
  }
  return Object.keys(FEATURE_TEXT)
    .filter((feature) => {
      const by = brought.get(feature) ?? new Set()
      return (
        by.has(undefined) || [...by].some((name) => name !== undefined && rendersWith.has(name))
      )
    })
    .sort()
}

/** Every file under a directory, relative to it. */
async function files(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) out.push(relative(dir, join(entry.parentPath, entry.name)))
  }
  return out.sort()
}

/**
 * The files of an app's `src/` that mention each feature. The auth client's endpoint settings in
 * `config.ts` name the API's routes, not pages.
 */
async function featureMentions(src: string): Promise<Record<string, string[]>> {
  const found: Record<string, string[]> = {}
  for (const file of await files(src)) {
    // Locale strings are data; bonds/ and their smoke test are generated from the packages' own docs.
    if (/(^|\/)(locales|bonds|__tests__)\//.test(file)) continue
    const text = readFileSync(join(src, file), 'utf8')
      .split('\n')
      .filter((line) => !/^\s*(forgot|reset)PasswordEndpoint:/.test(line))
      .join('\n')
    for (const [feature, pattern] of Object.entries(FEATURE_TEXT)) {
      if (pattern.test(text)) (found[feature] ??= []).push(file)
    }
  }
  return found
}

describe('applyFeatureSections', () => {
  const template = [
    'a',
    '{{#feature emails}}',
    'b',
    '{{/feature}}',
    '{{^feature emails}}',
    'c',
    '{{/feature}}',
    'd',
  ].join('\n')

  it('keeps a section with its feature and an inverse section without it', () => {
    expect(applyFeatureSections(template, new Set(['emails']))).toBe('a\nb\nd')
    expect(applyFeatureSections(template, new Set())).toBe('a\nc\nd')
  })

  it('leaves one blank line where a dropped section sat between two', () => {
    const spaced = 'a\n\n{{#feature oauth}}\nb\n{{/feature}}\n\nc'
    expect(applyFeatureSections(spaced, new Set())).toBe('a\n\nc')
    expect(applyFeatureSections(spaced, new Set(['oauth']))).toBe('a\n\nb\n\nc')
  })

  // Angular's login page lists the OAuth buttons and the footer in one `imports` line, which the
  // formatter keeps on one line or splits by its length: a line per pair, without a nested section,
  // needed four copies of every page around it (OLD MUSTFAIL: nesting threw).
  it('keeps a line inside nested sections only when every section keeps it', () => {
    const nested = [
      '{{#feature oauth}}',
      '{{#feature footer}}',
      'both',
      '{{/feature}}',
      '{{^feature footer}}',
      'oauth only',
      '{{/feature}}',
      '{{/feature}}',
      'always',
    ].join('\n')
    expect(applyFeatureSections(nested, new Set(['oauth', 'footer']))).toBe('both\nalways')
    expect(applyFeatureSections(nested, new Set(['oauth']))).toBe('oauth only\nalways')
    expect(applyFeatureSections(nested, new Set(['footer']))).toBe('always')
    expect(() =>
      applyFeatureSections('{{#feature a}}\n{{#feature b}}\n{{/feature}}', new Set()),
    ).toThrow(/never closed/)
  })

  it('refuses unclosed, unopened and inline markers', () => {
    expect(() => applyFeatureSections('{{#feature a}}\nx', new Set())).toThrow(/never closed/)
    expect(() => applyFeatureSections('x\n{{/feature}}', new Set())).toThrow(/closes no section/)
    expect(() => applyFeatureSections('x {{#feature a}}', new Set())).toThrow(/only text/)
  })
})

describe('optional features in the registry', () => {
  const registry = loadRegistry()
  const declared = new Set([
    ...registry.map((pkg) => pkg.molecule?.optionalFeature).filter(Boolean),
    ...selectOptionalFeatures(registry.map((pkg) => pkg.name)),
  ])

  it('every feature the app templates gate on has a package that can enable it', () => {
    const used = new Set<string>()
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) walk(path)
        else if (entry.name.endsWith('.tpl')) {
          for (const name of featureSectionNames(readFileSync(path, 'utf8'))) used.add(name)
        }
      }
    }
    walk(APP_TEMPLATES)
    for (const framework of FRAMEWORKS) {
      const dir = join(APP_TEMPLATES, framework, FEATURE_TEMPLATES_DIR)
      if (existsSync(dir)) for (const name of readdirSync(dir)) used.add(name)
    }
    expect([...used].sort()).toEqual(
      [...Object.keys(FEATURE_TEXT), 'devices', 'push-client'].sort(),
    )
    for (const name of used) expect(declared, `no package declares ${name}`).toContain(name)
  })

  // A framework may put a feature in whole files or in sections of shared ones; the set it gates
  // is what must match.
  it('every framework gates the features its templates render', () => {
    const shape = (framework: string): string => {
      const dir = join(APP_TEMPLATES, framework, FEATURE_TEMPLATES_DIR)
      const folders = existsSync(dir) ? readdirSync(dir).sort() : []
      const sections = new Set<string>()
      for (const file of readdirSync(join(APP_TEMPLATES, framework), {
        recursive: true,
        encoding: 'utf8',
      })) {
        if (file.endsWith('.tpl')) {
          const text = readFileSync(join(APP_TEMPLATES, framework, file), 'utf8')
          for (const name of featureSectionNames(text)) sections.add(name)
        }
      }
      return JSON.stringify([...new Set([...folders, ...sections])].sort())
    }
    for (const framework of FRAMEWORKS) {
      const expected = gatedFeatures(framework)
      if (framework === 'react-native-web') expected.push('devices', 'push-client')
      expect(shape(framework), framework).toBe(JSON.stringify(expected.sort()))
    }
    expect(gatedFeatures('react')).toEqual(Object.keys(FEATURE_TEXT).sort())
    expect(gatedFeatures('react-native-web')).not.toContain('settings')
  })

  // Every stack gets the emails capture provider to record mail, which serves no reset page; the
  // payments capture provider is a whole dev payments vendor, so it serves the plan pages.
  it('only the payments capture provider serves a feature', () => {
    expect(deriveOptionalFeatures(['@molecule/api-emails-capture'], registry)).toEqual(new Set())
    expect(deriveOptionalFeatures(['@molecule/api-payments-capture'], registry)).toEqual(
      new Set(['payments']),
    )
    // A core is the interface, not a provider: with no provider bonded its routes answer 501.
    expect(
      deriveOptionalFeatures(['@molecule/api-payments', '@molecule/api-two-factor'], registry),
    ).toEqual(new Set())
    // A create adds the billing routes to a payments provider (featureBundled); named here.
    expect(
      deriveOptionalFeatures([...FEATURE_PACKAGES, '@molecule/api-billing-routes'], registry),
    ).toEqual(new Set([...Object.keys(FEATURE_TEXT), 'push', 'devices']))
  })

  // A framework's templateRequires goes into every app it scaffolds, so a feature package listed
  // there gives every custom app that feature's pages (the settings panel, the footer and about
  // page), which an agent asked for a smaller app then deletes.
  it('no framework requires a package that brings an optional feature', () => {
    const byName = new Map(registry.map((pkg) => [pkg.name, pkg]))
    const offenders = registry.flatMap((pkg) =>
      (pkg.molecule?.templateRequires ?? []).flatMap((required) => {
        const feature = byName.get(required)?.molecule?.optionalFeature
        return feature ? [`${pkg.name} requires ${required} (${feature})`] : []
      }),
    )
    expect(offenders).toEqual([])
  })
})

describe.each(FRAMEWORKS)('the %s app templates', (framework) => {
  let scratch: string
  beforeAll(async () => {
    scratch = await mkdtemp(join(tmpdir(), `mlcl-features-${framework}-`))
  })
  afterAll(async () => {
    await rm(scratch, { recursive: true, force: true })
  })

  it('write no page, link, field or component of a feature the stack lacks', async () => {
    const project = join(scratch, 'none')
    await copyTemplateFiles(project, framework, 'features-none')
    // A feature the framework's templates do not gate is always written.
    expect(
      Object.keys(await featureMentions(join(project, 'src'))).filter((feature) =>
        gatedFeatures(framework).includes(feature),
      ),
    ).toEqual([])
    if (rendersAuthSection(join(project, 'src'))) {
      expect(twoFactorOff(join(project, 'src'))).toHaveLength(1)
    }
    expect(await unformatted(join(project, 'src'), framework)).toEqual([])
  })

  it('write each feature the stack brings', async () => {
    const project = join(scratch, 'all')
    await copyTemplateFiles(
      project,
      framework,
      'features-all',
      {},
      new Set(Object.keys(FEATURE_TEXT)),
    )
    const found = await featureMentions(join(project, 'src'))
    expect(Object.keys(found).sort()).toEqual(Object.keys(FEATURE_TEXT).sort())
    expect(twoFactorOff(join(project, 'src'))).toEqual([])
    expect(await unformatted(join(project, 'src'), framework)).toEqual([])
  })
})

// The real create path, API router included: the injector and the app templates derive the
// features from the same packages.
describe.each([
  { name: 'the default custom stack', extra: [], features: [] as string[] },
  // Every stack gets the emails capture provider to record mail, which serves no reset page, and
  // the core it brings as a peer serves nothing by itself: the peers are added after the first
  // look at the stack.
  {
    name: 'the emails capture provider',
    extra: ['@molecule/api-emails-capture'],
    features: [] as string[],
  },
  // The payments capture provider is a whole payments vendor for dev: its checkout returns to the
  // plan-updated page and verifies there, and it brings the billing routes like any provider. The
  // billing section sits in the settings panel, so billing brings the settings page.
  {
    name: 'the payments capture provider',
    extra: ['@molecule/api-payments-capture'],
    features: ['billing', 'payments', 'settings', 'devices'],
  },
  {
    name: 'a stack with every feature',
    extra: FEATURE_PACKAGES,
    features: [...Object.keys(FEATURE_TEXT), 'push', 'devices'],
  },
])('a full-stack scaffold of $name', ({ extra, features }) => {
  let scratch: string
  let project: string
  beforeAll(async () => {
    scratch = await mkdtemp(join(tmpdir(), 'mlcl-features-create-'))
    project = join(scratch, 'project')
    execFileSync(
      process.execPath,
      [
        join(ROOT, 'bin', 'run.js'),
        'create',
        project,
        '--type',
        'full-stack',
        '--framework',
        'react',
        '--packages',
        ['@molecule/api-database-sqlite', '@molecule/api-resource-user', ...extra].join(','),
        '--no-interactive',
        '--skip-install',
      ],
      { cwd: ROOT, encoding: 'utf8', timeout: 240_000, stdio: 'pipe' },
    )
  }, 300_000)
  afterAll(async () => {
    await rm(scratch, { recursive: true, force: true })
  })

  it('mounts the API routes of exactly its features', async () => {
    const router = await readFile(join(project, 'api', 'src', 'App', 'router.ts'), 'utf8')
    for (const [feature, pattern] of Object.entries(FEATURE_ROUTER)) {
      expect(pattern.test(router), `${feature} router mounted`).toBe(features.includes(feature))
    }
    const server = await readFile(join(project, 'api', 'src', 'server.ts'), 'utf8')
    for (const [feature, pattern] of Object.entries(FEATURE_MOUNT)) {
      expect(pattern.test(server), `${feature} routes mounted`).toBe(features.includes(feature))
    }
    // The push key answers 404 without a push provider (r18 scaffold eval: Codex removed it).
    expect(router.includes('/devices/push/public-key'), 'push key route').toBe(
      features.includes('push'),
    )
  })

  // r18 scaffold eval (2026-11-24): the four feature routers sat in handlers/auth.ts unmounted.
  it('writes the router code of exactly its features (OLD MUSTFAIL)', async () => {
    const auth = await readFile(join(project, 'api', 'src', 'handlers', 'auth.ts'), 'utf8')
    for (const [feature, pattern] of Object.entries(FEATURE_ROUTER_CODE)) {
      expect(pattern.test(auth), `${feature} router code`).toBe(features.includes(feature))
    }
  })

  // The user resource's payment strings are shown only by the payments routes.
  it('installs the payments strings only with payments (OLD MUSTFAIL)', async () => {
    const pkg = JSON.parse(await readFile(join(project, 'api', 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    expect(
      Object.keys(pkg.dependencies ?? {}).includes('@molecule/api-locales-user-payments'),
    ).toBe(features.includes('payments'))
  })

  it('writes the app pages of exactly its features', async () => {
    const found = await featureMentions(join(project, 'app', 'src'))
    expect(Object.keys(found).sort()).toEqual(
      features.filter((name) => name in FEATURE_TEXT).sort(),
    )
  })

  // The OAuth buttons are the only template that imports the auth-ui package, and the
  // plan-updated page the only one that imports the shared verifying page.
  it('installs the packages only a feature page imports with that feature', async () => {
    const pkg = JSON.parse(await readFile(join(project, 'app', 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }
    const names = Object.keys(pkg.dependencies ?? {})
    expect(names.includes('@molecule/app-auth-ui-react')).toBe(features.includes('oauth'))
    expect(names.includes('@molecule/app-plan-updated-page-react')).toBe(
      features.includes('payments'),
    )
  })
})

describe('packages for a scaffold with every feature', () => {
  const registry = loadRegistry()

  it('adds the package that selects device management for React Native Web', () => {
    // Its settings panel gates `devices`, which no package brings as an `optionalFeature`:
    // features.json selects it by @molecule/api-resource-device (2026-11-28, the scaffold check
    // threw "no package brings the devices feature" for every React Native Web run with features).
    const names = templateFeaturePackages(APP_TEMPLATES, 'react-native-web', registry)
    expect(names).toContain('@molecule/api-resource-device')
    expect(deriveOptionalFeatures(names, registry, selectOptionalFeatures(names))).toContain(
      'devices',
    )
  })

  it.each(FRAMEWORKS)('turns on every feature the %s templates gate', (framework) => {
    const names = templateFeaturePackages(APP_TEMPLATES, framework, registry)
    const enabled = deriveOptionalFeatures(names, registry, selectOptionalFeatures(names))
    const dir = join(APP_TEMPLATES, framework)
    const gated = new Set<string>()
    const walk = (path: string): void => {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        const child = join(path, entry.name)
        if (entry.isDirectory()) walk(child)
        else if (entry.name.endsWith('.tpl'))
          for (const name of featureSectionNames(readFileSync(child, 'utf8'))) gated.add(name)
      }
    }
    walk(dir)
    for (const feature of gated) expect(enabled, `${framework} ${feature}`).toContain(feature)
  })

  it('names a gated feature that no package turns on', () => {
    expect(() => templateFeaturePackages(APP_TEMPLATES, 'react-native-web', [])).toThrow(
      /no package brings the .*feature for react-native-web/,
    )
  })
})
