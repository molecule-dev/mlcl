import { existsSync, readFileSync, rmSync } from 'node:fs'
import { basename, isAbsolute, join } from 'node:path'

import * as p from '@clack/prompts'
import { Args, Command, Flags } from '@oclif/core'
import { CLI_COMMAND } from '#cli-command'
import chalk from 'chalk'
import { execa } from 'execa'

import { AUTH_PRECONFIGURATION_GUIDANCE, readOpenApiAuthContract } from '../lib/auth-contract.js'
import { readProjectCapabilityMap } from '../lib/capability-map.js'
import { runRecordedCheck } from '../lib/check-stop-hook.js'
import {
  changeDirectoryStep,
  type CreateVerification,
  projectOrientation,
  requestedCapabilityMap,
  summarizeVerification,
  verificationFields,
  verificationLines,
} from '../lib/create-next.js'
import { readCreatePackages } from '../lib/create-packages.js'
import { withHeartbeat } from '../lib/create-progress.js'
import { assertDdlCompatibility } from '../lib/database-compatibility.js'
import { DDL_INCOMPATIBLE_EXIT, isDdlCompatibilityFailure } from '../lib/ddl-exit.js'
import { providerTemplateVars } from '../lib/feature-files.js'
import {
  buildAppFeatureMenu,
  buildFeatureMenu,
  collectFeaturePackages,
  collectSecrets,
  type DynamicFeature,
  resolveDefaultProviders,
  resolveFeatureBundledPackages,
  resolveLocalePackages,
  resolveTransitivePeers,
} from '../lib/features.js'
import { t } from '../lib/i18n.js'
import { writeInstallScriptEntries } from '../lib/install-scripts.js'
import { declaredDependencies, newDeclarations } from '../lib/manifest-declarations.js'
import { npmFailureDetail, npmInstall } from '../lib/npm-install.js'
import { deriveOptionalFeatures, featureTemplatePackages } from '../lib/optional-features.js'
import { serviceWorkerPackageFor } from '../lib/peer-closure.js'
import {
  getMoleculeVersion,
  loadAppFrameworks,
  loadRegistry,
  loadThemePresets,
  packagesByStack,
  requirePackageByRole,
} from '../lib/registry.js'
import {
  addPackages,
  collectNpmOverrides,
  copyFontFiles,
  copySqlSetupScripts,
  createApiProject,
  createAppProject,
  createFullStackProject,
  createStaticProject,
  createStatusPageEdgeProject,
  ensureRootFormatterConfig,
  generateEnvFile,
  generateFontHtml,
  getTemplateRequiredPackages,
  getTemplatesDir,
  scaffoldSecurityWorkflow,
} from '../lib/scaffold.js'
import { scaffoldOnlyNames } from '../lib/scaffold-only.js'
import type { InferredPackage, MoleculeSecret } from '../lib/schema.js'
import { createSpinner } from '../lib/spinner.js'
import { applyStarterLock, readStarterLock } from '../lib/starter-lock.js'
import { writeStopHooks } from '../lib/stop-hooks.js'
import { ui } from '../lib/ui.js'
import { describeWebOnlyChains, rendersOnReactNative, webOnlyChains } from '../lib/web-only.js'

/**
 * Package families a `static` site never ships: nobody logs in (auth, OAuth,
 * the settings panel), and a static host serves plain files (no service
 * worker — version/update checks, web push and the PWA registration packet all
 * generate one). Matched by registry category and by the `generates` flag, so a
 * new bond in one of these families is excluded without a code change.
 */
const STATIC_EXCLUDED_CATEGORIES = new Set([
  'auth',
  'auth-shell',
  'oauth-buttons',
  'oauth-logos',
  'pwa-default',
  'settings-panel',
  'version',
])

/**
 * Whether a package is excluded from a `static` site's package set.
 *
 * @param pkg - A registry package, or `undefined` for a name the registry does not carry.
 * @returns True when a static site must not ship it.
 */
export function isStaticExcluded(pkg: InferredPackage | undefined): boolean {
  if (!pkg?.molecule) return false
  if (STATIC_EXCLUDED_CATEGORIES.has(pkg.molecule.category)) return true
  return (pkg.molecule.generates ?? []).some((g) => g.startsWith('service-worker'))
}

/**
 * The injector's warning lines from a captured child `stderr`.
 *
 * `create` runs `inject` as a CHILD with `stdio: 'pipe'`, so on success the
 * child's output is never shown. The injector raises everything advisory
 * through oclif's `this.warn`, which writes `… Warning: <message>` to stderr —
 * the one channel a successful scaffold must not drop, because a silent gap
 * (say, a stale copy's dependency metadata not written) is exactly what
 * `--skip-install` beside an older fleet install used to produce (r10
 * acceptance review, F11).
 *
 * oclif WRAPS a long message over several ` ›   ` lines, so a warning is the
 * `Warning:` line plus every continuation line until the next non-continuation
 * line. Spinner frames, progress lines and ordinary output stay captured.
 *
 * @param stderr - The child's captured stderr.
 * @returns One message per warning, prefix, colour and wrapping removed.
 */
export function injectWarningLines(stderr: string): string[] {
  return oclifMessages(stderr, 'Warning: ')
}

/**
 * The setup commands a scaffold still needs before `npm run dev`, in the order they must run.
 *
 * Without `npm install` (`--skip-install`, or an install that failed) no package is on disk, so the
 * injector refuses every workspace and `src/bonds/index.ts` stays a stub the app's own imports do
 * not compile against (`no exported member 'authClient'`). Next steps that went straight to
 * `npm run dev` led to exactly that build. The inject command names this CLI's own version:
 * another version's registry pins other versions than the ones just installed, which the injector
 * refuses, and `--force` replaces the stub files the skipped run left. The same inject copies the
 * font files an app serves from its static directory (SvelteKit, Angular), which a scaffold made
 * before `npm install` cannot find.
 *
 * @param pending - What the scaffold left undone.
 * @param pending.installNeeded - Whether `npm install` has yet to run (skipped or failed).
 * @param pending.injectSkipped - Each workspace whose integration code was not generated,
 *   relative to the project root (`.`, `app`, `api`).
 * @param pending.assetsPending - Each workspace whose font files are not copied yet.
 * @param pending.cliVersion - This CLI's version.
 * @returns The commands, one per entry, run from the project root.
 */
export function pendingSetupSteps(pending: {
  installNeeded: boolean
  injectSkipped: readonly string[]
  assetsPending?: readonly string[]
  cliVersion: string
}): string[] {
  const injects = [...new Set([...pending.injectSkipped, ...(pending.assetsPending ?? [])])]
  return [
    ...(pending.installNeeded ? ['npm install'] : []),
    ...injects.map(
      (workspace) => `${CLI_COMMAND}@${pending.cliVersion} inject --force -p ${workspace}`,
    ),
  ]
}

/**
 * Why a failed `mlcl inject` child failed, from its execa error.
 *
 * execa's `message` for a failed child is its WHOLE captured output: the plan, every file it
 * wrote, "Injection complete", and the closing "Next steps". On 2026-11-14 that was over a
 * thousand lines in which the one refusal (a package with no installed copy at its pin) sat near
 * the end. The injector lists each failure as a `•` line under its `Errors:` label (stdout), and
 * a fatal oclif error writes `Error: …` to stderr, wrapped over ` ›` lines; those are returned.
 * Anything else falls back to the error's first line.
 *
 * @param error - The thrown value: an execa error (`stdout`, `stderr`, `shortMessage`), or any value.
 * @returns The failure lines, one per line, colour and wrapping removed.
 */
export function injectFailureDetail(error: unknown): string {
  const e = (typeof error === 'object' && error !== null ? error : {}) as {
    stdout?: unknown
    stderr?: unknown
    shortMessage?: unknown
    message?: unknown
  }
  const stdout = typeof e.stdout === 'string' ? e.stdout : ''
  const lines = stdout.split('\n').map(stripAnsi)
  const label = t('commands.inject.labels.errors')
  const start = lines.findIndex((line) => line.trim() === label)
  const bullets: string[] = []
  if (start >= 0) {
    for (const line of lines.slice(start + 1)) {
      const bullet = /^\s*•\s+(.*)$/.exec(line)
      if (!bullet) break
      bullets.push(bullet[1]!.trim())
    }
  }
  if (bullets.length > 0) return bullets.join('\n')
  const fatal = oclifMessages(typeof e.stderr === 'string' ? e.stderr : '', 'Error: ')
  if (fatal.length > 0) return fatal.join('\n')
  const first = String(e.shortMessage ?? e.message ?? error).split('\n')[0] ?? ''
  return first.trim()
}

/** `text` without ANSI colour codes or trailing whitespace. */
function stripAnsi(text: string): string {
  return (
    text
      // eslint-disable-next-line no-control-regex
      .replace(/\x1B\[[0-9;]*m/g, '')
      .trimEnd()
  )
}

/**
 * The oclif messages in a captured stream that start with `prefix` (`Warning: `, `Error: `): the
 * prefixed line plus every ` ›` continuation line oclif wraps a long message over.
 *
 * @param stream - A child's captured stderr.
 * @param prefix - The marker oclif writes before the message.
 * @returns One message per occurrence, prefix, colour and wrapping removed.
 */
function oclifMessages(stream: string, prefix: string): string[] {
  const warnings: string[] = []
  let current: string | null = null
  const flush = (): void => {
    if (current !== null) warnings.push(current)
    current = null
  }
  for (const raw of `${stream ?? ''}`.split('\n')) {
    const clean = stripAnsi(raw)
    const marker = clean.indexOf(prefix)
    if (marker >= 0) {
      flush()
      current = clean.slice(marker + prefix.length).trim()
      continue
    }
    const continuation = /^\s*›\s+(.*)$/.exec(clean)
    if (current !== null && continuation) {
      current = `${current} ${continuation[1]!.trim()}`.trim()
      continue
    }
    // Any other line belongs to the spinner/progress output.
    flush()
  }
  flush()
  return warnings.map((warning) => warning.replace(/\s+/g, ' ').trim())
}

export default class Create extends Command {
  static override description = t('commands.create.description')

  static override examples = [
    '<%= config.bin %> <%= command.id %> my-app',
    '<%= config.bin %> <%= command.id %> my-app --skip-install',
    '<%= config.bin %> <%= command.id %> my-api --type api --packages @molecule/api-database-postgresql,@molecule/api-resource-user --no-interactive',
    '<%= config.bin %> <%= command.id %> my-app --type app --framework react --packages @molecule/app-state-zustand --no-interactive',
    '<%= config.bin %> <%= command.id %> my-project --type full-stack --framework react --packages @molecule/api-database-postgresql,@molecule/app-auth --no-interactive',
  ]

  static override args = {
    name: Args.string({
      description: t('commands.create.args.name'),
      required: false,
    }),
  }

  static override flags = {
    'skip-install': Flags.boolean({
      description: t('commands.create.flags.skipInstall'),
      default: false,
    }),
    // An installed project runs its own check, and the result says what passed: an agent then has
    // no reason to run it before changing anything. A caller that scaffolds in bulk and builds later
    // passes --no-verify.
    verify: Flags.boolean({
      description: t('commands.create.flags.verify'),
      default: true,
      allowNo: true,
    }),
    // A host that boots the project at once (molecule.dev's sandbox scaffold) needs the wiring
    // now: on 2026-11-14 a production scaffold whose injector refused one package exited 0 with
    // an app whose providers were never generated, and the failure surfaced only at the deploy's
    // `tsc`. The env form lets such a host ask for it without knowing which CLI version it runs.
    'require-inject': Flags.boolean({
      description: t('commands.create.flags.requireInject'),
      default: false,
      env: 'MLCL_REQUIRE_INJECT',
    }),
    // The molecule.dev IDE frames the live preview and talks to it through five bridge scripts;
    // a project the user runs on its own carries none. The host sets MLCL_IDE_PREVIEW=1, which an
    // mlcl older than this flag ignores.
    'ide-preview': Flags.boolean({
      description: t('commands.create.flags.idePreview'),
      default: false,
      env: 'MLCL_IDE_PREVIEW',
    }),
    // A molecule.dev project records the emails, SMS, push and webhooks it sends in the IDE's
    // Activity panel; a project run anywhere else would carry the capture wiring and its packages
    // for nothing. The host sets MLCL_ACTIVITY_CAPTURE=1, which an mlcl older than this flag
    // ignores (it wires capture into every API).
    'activity-capture': Flags.boolean({
      description: t('commands.create.flags.activityCapture'),
      default: false,
      env: 'MLCL_ACTIVITY_CAPTURE',
    }),
    type: Flags.string({
      description: t('commands.create.flags.type'),
      options: ['api', 'app', 'full-stack', 'static', 'status-page', 'status-page-edge'],
    }),
    framework: Flags.string({
      description: t('commands.create.flags.framework'),
    }),
    packages: Flags.string({
      description: t('commands.create.flags.packages'),
      multiple: true,
    }),
    theme: Flags.string({
      description: t('commands.create.flags.theme'),
    }),
    'no-interactive': Flags.boolean({
      description: t('commands.create.flags.noInteractive'),
      default: false,
    }),
    json: Flags.boolean({
      description:
        'Print a machine-readable JSON result instead of progress output; a slow step still reports on stderr (implies --no-interactive)',
      default: false,
    }),
    force: Flags.boolean({
      description: t('commands.create.flags.force'),
      default: false,
    }),
    template: Flags.string({
      description: `App template slug (e.g., blog, crm, online-store). Run \`${CLI_COMMAND} templates\` for the list and the rules for choosing, and \`${CLI_COMMAND} templates <slug>\` for one template's catalog.`,
    }),
    'api-contract': Flags.string({
      description:
        'OpenAPI 3.1 JSON document whose auth operations configure the generated app-auth bond',
    }),
  }

  public async run(): Promise<void> {
    const { args, flags: parsed } = await this.parse(Create)
    // `--packages` as one comma list, the form the rest of this command reads (create-packages.ts).
    const named = parsed.packages
      ? readCreatePackages(parsed.packages, args.name, new Set(loadRegistry().map((p) => p.name)))
      : undefined
    if (named && named.unknown.length > 0) {
      this.error(t('commands.create.errors.packagesUnknown', { names: named.unknown.join(', ') }))
    }
    const scaffoldOnly = named ? scaffoldOnlyNames(named.packages) : []
    if (named && scaffoldOnly.length > 0) {
      const rest = named.packages.filter((name) => !scaffoldOnly.includes(name))
      this.error(
        t('commands.create.errors.packagesScaffoldOnly', {
          names: scaffoldOnly.join(', '),
          retry: rest.length > 0 ? `--packages ${rest.join(',')}` : 'no --packages',
        }),
      )
    }
    if (named) args.name = named.name
    const flags = {
      ...parsed,
      packages: named && named.packages.length > 0 ? named.packages.join(',') : undefined,
    }

    // Human progress output, suppressed under --json so the result object is
    // the only thing on stdout (agents parse it; humans read the steps).
    const say = (msg: string): void => {
      if (!flags.json) this.log(msg)
    }

    // Validate the name argument BEFORE any path is derived from it. The name
    // becomes the scaffold target — `npm install` runs inside it — so it must
    // not traverse out of the intended root. Absolute and multi-segment
    // relative paths are legitimate callers (workspace harnesses and the
    // platform's sandbox scaffold pass `.tmp/<mkdtemp>/project`-shaped
    // targets), but no segment may be `..`, and the FINAL segment — the
    // directory mlcl creates and the package.json name it derives — must be a
    // plain lowercase slug, the same rule the interactive prompt enforces.
    // Without this, a non-interactive `mlcl create ../../elsewhere` silently
    // scaffolds (and installs) outside the working directory.
    // `.` (or `./`) means the current directory, as in `npm init` and
    // `create-vite .`: an agent working in an empty repo reaches for it first
    // (2026-11-22 smoke test: Codex's `mlcl create .` was refused and it had to
    // retry with "$PWD"). Its final segment is then the directory's own name.
    if (args.name !== undefined) {
      const segments = args.name.split(/[\\/]/).filter((seg) => seg.length > 0 && seg !== '.')
      const here = segments.length === 0 && /^\.[\\/]?$/.test(args.name)
      const finalSegment = here ? basename(process.cwd()) : segments[segments.length - 1]
      if (
        (segments.length === 0 && !here) ||
        segments.includes('..') ||
        !/^[a-z0-9-]+$/.test(finalSegment)
      ) {
        const name = here ? `${args.name} (${finalSegment})` : args.name
        this.error(t('commands.create.errors.nameInvalid', { name }))
      }
    }

    const apiAuthContract = flags['api-contract']
      ? await readOpenApiAuthContract(flags['api-contract'])
      : undefined

    // What the caller asked for, before a template fills the flags in — the
    // template fast path copies the template as built, so a framework or extra
    // packages the caller named are reported rather than silently dropped.
    const requestedFramework = flags.framework
    const requestedPackages = flags.packages
    let templateFramework: string | undefined

    // Template resolution: --template populates --type, --packages, and --no-interactive.
    //
    // Prefer the per-app `templates/apps/<slug>/template.json` over the
    // consolidated `templates/apps/registry.json` when both exist — the per-app
    // file is the canonical source of truth (it ships with the app and is
    // the file polish/dispatch agents edit). The aggregate registry can drift
    // out of sync when packages are added per-app and the registry isn't
    // updated. Scaffolding from a stale registry produces apps missing
    // dependencies declared in template.json (e.g. `@molecule/api-entitlements`,
    // `@molecule/api-payments-stripe`), which then crash at runtime with
    // "Entitlements provider not configured" or 503 on /billing/checkout.
    if (flags.template) {
      // The slug is joined into filesystem paths below (and again for the
      // fast-path template-instance copy) — reject anything that is not a
      // plain slug BEFORE those joins, or `--template ../../foo` reads its
      // template.json from (and copies its app from) outside templates/apps.
      if (!/^[\w-]+$/.test(flags.template)) {
        this.error(t('commands.create.errors.templateInvalid', { template: flags.template }))
      }
      const templateRegistryPath = join(this.config.root, 'templates', 'apps', 'registry.json')
      const perAppTemplatePath = join(
        this.config.root,
        'templates',
        'apps',
        flags.template,
        'template.json',
      )
      try {
        const { readFileSync, existsSync } = await import('node:fs')
        let template:
          | {
              label?: string
              type?: string
              framework?: string
              packages?: string[]
            }
          | undefined
        let source: string
        if (existsSync(perAppTemplatePath)) {
          template = JSON.parse(readFileSync(perAppTemplatePath, 'utf8'))
          source = `per-app template.json`
        } else {
          const registry = JSON.parse(readFileSync(templateRegistryPath, 'utf8')) as {
            templates?: Record<
              string,
              { label?: string; type?: string; framework?: string; packages?: string[] }
            >
          }
          template = registry.templates?.[flags.template]
          source = `templates/apps/registry.json`
          if (!template) {
            const available = Object.keys(registry.templates || {})
              .sort()
              .join(', ')
            this.error(`Unknown template "${flags.template}". Available: ${available}`)
          }
        }
        if (!template) {
          this.error(`Unknown template "${flags.template}".`)
        }

        // Auto-set flags from template
        if (!flags.type) flags.type = template.type || 'full-stack'
        // The template carries its framework — asking the user (or requiring
        // --framework) for a fully-baked template would be noise.
        templateFramework = template.framework || 'react'
        if (!flags.framework) flags.framework = templateFramework
        if (!flags.packages) flags.packages = (template.packages || []).join(',')
        else flags.packages = flags.packages + ',' + (template.packages || []).join(',')
        flags['no-interactive'] = true

        say(`${ui.heading(`Using template`)} ${ui.id(template.label || flags.template)}`)
        say(ui.dim(`Packages: ${(template.packages || []).length} from template (${source})`))
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          this.error('Template registry not found. Run from the mlcl directory.')
        }

        throw error
      }
    }

    const nonInteractive = flags['no-interactive'] || flags.json === true

    // Non-interactive mode: validate required flags
    if (nonInteractive) {
      if (!args.name) this.error(t('commands.create.errors.nameRequired'))
      if (!flags.type) this.error(t('commands.create.errors.typeRequired'))
      if (
        (flags.type === 'app' ||
          flags.type === 'full-stack' ||
          flags.type === 'static' ||
          flags.type === 'status-page') &&
        !flags.framework
      )
        this.error(t('commands.create.errors.frameworkRequired'))
    }

    if (!nonInteractive) p.intro(chalk.bgGreen(` ${t('commands.create.labels.intro')} `))

    // Step 1: Get project name
    let projectName = args.name

    if (!projectName) {
      const name = await p.text({
        message: t('commands.create.prompts.projectName'),
        placeholder: t('commands.create.prompts.projectNamePlaceholder'),
        validate: (val) => {
          if (!val) return t('commands.create.prompts.nameRequired')
          if (!/^[a-z0-9-]+$/.test(val)) return t('commands.create.prompts.nameFormat')
          return undefined
        },
      })

      if (p.isCancel(name)) {
        p.cancel(t('commands.create.prompts.cancelled'))
        process.exit(0)
      }

      projectName = name
    }

    // Resolve the project path from the name argument: an ABSOLUTE path is
    // honored as-is (joining it onto cwd nested it under the working directory,
    // which once made a scaffold-harness type-check silently check nothing —
    // an absolute path got nested under the temp root); a bare name that
    // equals the cwd's basename means 'here'; anything else is relative to
    // cwd. Then extract a clean basename for package.json names.
    const projectPath = isAbsolute(projectName)
      ? projectName
      : basename(process.cwd()) === projectName
        ? process.cwd()
        : join(process.cwd(), projectName)
    projectName = basename(projectPath)

    // A second `create` into a directory that already holds a project used to rewrite it silently:
    // every file the scaffold owns was overwritten, `api/.env` was regenerated with a new JWT keypair
    // (so the copy in `.keys/` no longer matched) and the user's own keys were blanked, all with exit
    // code 0 — and an agent that retries a slow scaffold does exactly this. An empty or new directory
    // is the normal case; an existing project needs an explicit --force.
    if (!flags.force) {
      const { existsSync } = await import('node:fs')
      const markers = ['package.json', '.env', join('api', '.env'), join('app', 'package.json')]
      const found = markers.find((marker) => existsSync(join(projectPath, marker)))
      if (found) {
        this.error(t('commands.create.errors.projectExists', { path: projectPath, found }), {
          exit: 2,
        })
      }
    }

    // Fast path: --template <app> with a fully-baked instance at
    // mlcl/templates/apps/<app>/. Skip the package-driven scaffold flow
    // entirely — the template is the project; we just copy the four
    // user-facing items (app/, api/, package.json, .gitignore) and rewrite
    // the project name. Polish/stitch/scaffold artifacts stay in the
    // monorepo and never reach the user sandbox.
    if (flags.template) {
      // An installed mlcl ships each flagship as one manifest; this is where it is unpacked.
      const { resolveTemplateDir } = await import('../lib/template-tree.js')
      const templateInstanceDir = resolveTemplateDir(this.config.root, flags.template)
      const templateAppPkg = join(templateInstanceDir, 'app', 'package.json')
      const { existsSync } = await import('node:fs')
      if (existsSync(templateAppPkg)) {
        const {
          copyTemplateInstance,
          ensureAgentsMd,
          ensureAgentSkills,
          ensureReadmeMd,
          ensureRootNpmrc,
          readTemplatePackages,
          readTemplateSetupSqlVersions,
          stampMoleculeMetadata,
        } = await import('../lib/scaffold.js')

        // Refuse a template whose OWN database provider cannot apply its SQL —
        // BEFORE the tree copy, so no half-built project is left behind.
        //
        // `--template` ignores `--packages`, but the template still declares its
        // own provider (its `api/package.json`) and its own `api/migrations/*.sql`,
        // and the scaffold copies the declared packages' setup SQL into
        // `api/__setup__/`. Judging only the caller's package list would leave
        // every template unchecked — the same class of boot failure the custom
        // path refuses (a DuckDB template with a cascading FK never migrates).
        //
        // The resolution is the TARGET's, not the template source's: the copier
        // runs against `<project>/api` (F4), so this walk-up starts there too and
        // both see the same node_modules chain. The version map comes from the
        // template's own manifests (what the copied project will pin), and the
        // registry slice is the API one — exactly what `copyTemplateInstance`
        // passes to the same resolver. A nested install beside the template
        // source can therefore never supply the bytes a scaffolded app receives.
        const templateApiPath = join(templateInstanceDir, 'api')
        const setupSqlVersions = await readTemplateSetupSqlVersions(templateInstanceDir)
        {
          try {
            const { projectDatabasePackage } = await import('../lib/migration-dialect.js')
            await assertDdlCompatibility({
              projectPath: join(projectPath, 'api'),
              packageNames: await readTemplatePackages(templateInstanceDir),
              versions: setupSqlVersions,
              packages: loadRegistry('api'),
              // The template's OWN migrations are the bytes the tree copy lands;
              // the target has none until that copy has happened.
              sqlDirs: [join(templateApiPath, 'migrations')],
              database: (await projectDatabasePackage(templateApiPath)) ?? undefined,
            })
          } catch (error) {
            this.error(error instanceof Error ? error.message : String(error))
          }
        }

        if (apiAuthContract) {
          const resources = (await readTemplatePackages(templateInstanceDir)).filter(
            (name) => loadRegistry().find((pkg) => pkg.name === name)?.molecule?.authContract,
          )
          if (resources.length !== 1) {
            this.error(
              '--api-contract needs exactly one template API resource with authContract metadata',
            )
          }
          apiAuthContract.resourcePackage = resources[0]
        }
        await copyTemplateInstance(
          templateInstanceDir,
          projectPath,
          projectName,
          setupSqlVersions,
          apiAuthContract,
          {
            idePreview: flags['ide-preview'],
            activityCapture: flags['activity-capture'],
            templatesRoot: join(this.config.root, 'templates'),
          },
        )
        await ensureRootFormatterConfig(projectPath)
        // The template is copied as built, so its own shape decides the catalog
        // scope — `flags.type` was filled from the template above. Skills first:
        // AGENTS.md lists the skills the project has on disk.
        await ensureAgentSkills(projectPath, {
          projectType: flags.type ?? 'full-stack',
          framework: flags.framework ?? templateFramework,
        })
        writeStopHooks(projectPath)
        await ensureAgentsMd(projectPath)
        await ensureRootNpmrc(projectPath)
        await ensureReadmeMd(projectPath, projectName, flags.type ?? 'full-stack', flags.framework)
        await stampMoleculeMetadata(projectPath)
        // A template with no api/ workspace (a static site) gets no api .env:
        // writing one into a missing directory failed the scaffold (ENOTDIR,
        // static-site-thin on the platform's host path, 2026-09-26).
        if (existsSync(join(projectPath, 'api'))) {
          const { generateEnvFile } = await import('../lib/scaffold.js')
          const { collectSecrets } = await import('../lib/features.js')
          const { loadRegistry } = await import('../lib/registry.js')

          const allPackages = loadRegistry()
          const selectedNames = (flags.packages ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          const explicitPkgMetas = selectedNames
            .map((name) => allPackages.find((p) => p.name === name))
            .filter(Boolean)
          await generateEnvFile(
            join(projectPath, 'api'),
            collectSecrets(explicitPkgMetas as never[]),
            'api',
            projectName,
          )
        }
        if (requestedFramework && requestedFramework !== templateFramework) {
          this.warn(
            `The ${flags.template} template is built with ${templateFramework ?? 'its own framework'}; --framework ${requestedFramework} was not applied. For another framework, create a custom app: ${CLI_COMMAND} create <name> --type ${flags.type ?? 'full-stack'} --framework ${requestedFramework}.`,
          )
        }
        if (requestedPackages) {
          this.warn(
            `The template was copied as built; --packages ${requestedPackages} were not added. Add them now with: ${CLI_COMMAND} add <package> --inject`,
          )
        }
        say(
          `${ui.check('Scaffolded')} ${ui.id(flags.template)} ${ui.dim('→')} ${ui.id(projectPath)}`,
        )
        let installNeeded = flags['skip-install'] === true
        let installFailure: string | undefined
        if (!flags['skip-install']) {
          try {
            await this.runSlowStep(
              'npm install',
              t('commands.create.spinners.installing'),
              () => npmInstall(projectPath, { wholeTree: true }),
              { json: flags.json === true },
            )
            say(ui.check('Installed dependencies.'))
          } catch (error) {
            installNeeded = true
            installFailure = npmFailureDetail(error)
            this.warn(`npm install failed — run it manually. ${installFailure}`)
          }
        }
        const verification = installNeeded
          ? null
          : await this.verifyCreated(projectPath, flags.verify, { json: flags.json === true })
        if (verification) for (const line of verificationLines(verification)) say(line)
        say('')
        say(ui.heading(t('commands.create.messages.nextSteps')))
        const cdStep = changeDirectoryStep(projectPath)
        if (cdStep) say(`  ${ui.cmd(cdStep)}`)
        for (const step of pendingSetupSteps({
          installNeeded,
          injectSkipped: [],
          cliVersion: this.config.version,
        }))
          say(`  ${ui.cmd(step)}`)
        say(`  ${ui.dim('# edit api/.env and app/.env with your credentials')}`)
        say(`  ${ui.cmd('npm run dev')}`)
        const orientation = projectOrientation(projectPath, {
          checked: verification?.ok === true,
          installed: !installNeeded,
        })
        say('')
        say(ui.heading(t('commands.create.messages.orientation')))
        for (const line of orientation) say(`  ${line}`)
        if (flags.json) {
          this.log(
            JSON.stringify(
              {
                project: projectName,
                path: projectPath,
                type: flags.type ?? 'full-stack',
                framework: flags.framework ?? null,
                template: flags.template,
                packages: (flags.packages ?? '')
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
                installSkipped: flags['skip-install'] === true,
                ...(installFailure ? { installFailure } : {}),
                injectSkipped: [],
                pendingSetup: pendingSetupSteps({
                  installNeeded,
                  injectSkipped: [],
                  cliVersion: this.config.version,
                }),
                capabilityMap: await readProjectCapabilityMap(projectPath),
                ...verificationFields(verification),
                next: orientation,
              },
              null,
              2,
            ),
          )
        }
        return
      }
      // Else fall through to legacy package-driven scaffold (registry-only
      // templates without a baked instance).
    }

    // Step 2: Select project type
    let projectType: 'api' | 'app' | 'full-stack' | 'static' | 'status-page' | 'status-page-edge'
    if (nonInteractive) {
      projectType = flags.type as typeof projectType
    } else {
      const projectTypeResult = await p.select({
        message: t('commands.create.prompts.projectType'),
        options: [
          {
            value: 'api',
            label: t('commands.create.prompts.projectTypeApi'),
            hint: t('commands.create.prompts.projectTypeApiHint'),
          },
          {
            value: 'app',
            label: t('commands.create.prompts.projectTypeApp'),
            hint: t('commands.create.prompts.projectTypeAppHint'),
          },
          {
            value: 'full-stack',
            label: t('commands.create.prompts.projectTypeFullStack'),
            hint: t('commands.create.prompts.projectTypeFullStackHint'),
          },
          {
            value: 'static',
            label: t('commands.create.prompts.projectTypeStatic'),
            hint: t('commands.create.prompts.projectTypeStaticHint'),
          },
          {
            value: 'status-page',
            label: t('commands.create.prompts.projectTypeStatusPage'),
            hint: t('commands.create.prompts.projectTypeStatusPageHint'),
          },
          {
            value: 'status-page-edge',
            label: t('commands.create.prompts.projectTypeStatusPageEdge'),
            hint: t('commands.create.prompts.projectTypeStatusPageEdgeHint'),
          },
        ],
      })

      if (p.isCancel(projectTypeResult)) {
        p.cancel(t('commands.create.prompts.cancelled'))
        process.exit(0)
      }

      projectType = projectTypeResult as typeof projectType
    }

    // Step 3: Select framework (app and full-stack)
    const needsFramework =
      projectType === 'app' ||
      projectType === 'full-stack' ||
      projectType === 'static' ||
      projectType === 'status-page'
    let framework: string | undefined
    if (needsFramework) {
      if (nonInteractive) {
        const validFrameworks = Object.keys(loadAppFrameworks())
        if (flags.framework && !validFrameworks.includes(flags.framework)) {
          this.error(`Invalid framework "${flags.framework}". Valid: ${validFrameworks.join(', ')}`)
        }
        framework = flags.framework
      } else {
        const appFrameworks = loadAppFrameworks()
        const frameworkResult = await p.select({
          message: t('commands.create.prompts.framework'),
          options: Object.entries(appFrameworks).map(([value, config]) => ({
            value,
            label: config.label,
            hint: config.hint,
          })),
        })

        if (p.isCancel(frameworkResult)) {
          p.cancel(t('commands.create.prompts.cancelled'))
          process.exit(0)
        }

        framework = frameworkResult as string
      }
    }

    // A static site is prerendered with react-dom/server — React only.
    if (projectType === 'static' && framework !== 'react') {
      this.error(t('commands.create.errors.staticFrameworkReact'))
    }

    // Step 4: Load @molecule packages for selected stack from registry
    const isFullStack = projectType === 'full-stack' || projectType === 'status-page'
    const isStatusPage = projectType === 'status-page'
    const isStatusPageEdge = projectType === 'status-page-edge'
    // A static site is app-only code laid out under `app/` (the full-stack
    // shape minus `api/`), so the app lives in a sub-directory like full-stack
    // while the package menu is the app-only one.
    const isStatic = projectType === 'static'
    const hasAppSubdir = isFullStack || isStatic
    const apiPackages =
      isFullStack || projectType === 'api' || isStatusPageEdge ? loadRegistry('api') : []
    const appPackages = isFullStack || projectType === 'app' || isStatic ? loadRegistry('app') : []
    const allPackages = [...apiPackages, ...appPackages]

    // Build feature menus per stack
    const apiMenu =
      apiPackages.length > 0 ? buildFeatureMenu(apiPackages) : { alwaysInclude: [], features: [] }
    const appMenu = buildAppFeatureMenu(appPackages, framework)

    // Merge always-include from both stacks
    const alwaysInclude = [...apiMenu.alwaysInclude, ...appMenu.alwaysInclude]
    const features = isFullStack
      ? [...apiMenu.features, ...appMenu.features]
      : projectType === 'api'
        ? apiMenu.features
        : appMenu.features

    // Step 5: Select features (dynamically built from package metadata)
    const selectedPackageNames: string[] = alwaysInclude.map((pkg) => pkg.name)
    const allSelectedSecrets: MoleculeSecret[] = [...collectSecrets(alwaysInclude)]

    // For app/full-stack projects, auto-include the framework package.
    // Filter by category === 'framework' to select the main framework package (e.g. @molecule/app-vue)
    // rather than a framework UI adapter (e.g. @molecule/app-ui-vue) which also has type 'framework'.
    const frameworkPkg = framework
      ? appPackages.find(
          (p) =>
            p.molecule?.type === 'framework' &&
            p.molecule?.category === 'framework' &&
            p.molecule?.framework === framework,
        )
      : undefined
    if (frameworkPkg && !selectedPackageNames.includes(frameworkPkg.name)) {
      selectedPackageNames.push(frameworkPkg.name)
    }

    if (isStatusPage) {
      // Status page auto-selects its packages — no feature menu.
      // Include both core interfaces and providers so the injector can detect
      // features like monitoring (it checks allMolecules for core package names).
      const statusPagePackages = [
        '@molecule/api-database',
        '@molecule/api-database-sqlite',
        '@molecule/api-monitoring',
        '@molecule/api-monitoring-default',
        '@molecule/api-notifications',
        '@molecule/api-notifications-webhook',
        '@molecule/api-scheduler',
        '@molecule/api-scheduler-default',
        '@molecule/api-resource-status-page',
        '@molecule/api-secrets',
        '@molecule/api-secrets-env',
        '@molecule/app-status-dashboard',
        '@molecule/app-status-dashboard-http',
        '@molecule/app-http',
      ]
      selectedPackageNames.push(...statusPagePackages)
      // Collect secrets from status page packages
      const statusPkgMetas = statusPagePackages
        .map((name) => allPackages.find((p) => p.name === name))
        .filter(Boolean) as InferredPackage[]
      allSelectedSecrets.push(...collectSecrets(statusPkgMetas))
      // Also add any explicit packages from --packages flag
      if (flags.packages) {
        const explicitPackages = flags.packages.split(',').map((s) => s.trim())
        selectedPackageNames.push(...explicitPackages)
        const explicitPkgMetas = explicitPackages
          .map((name) => allPackages.find((p) => p.name === name))
          .filter(Boolean) as InferredPackage[]
        allSelectedSecrets.push(...collectSecrets(explicitPkgMetas))
      }
    } else if (isStatusPageEdge) {
      // Edge status page uses monitoring types only (no full bond stack)
      const edgePackages = ['@molecule/api-monitoring']
      selectedPackageNames.push(...edgePackages)
      if (flags.packages) {
        const explicitPackages = flags.packages.split(',').map((s) => s.trim())
        selectedPackageNames.push(...explicitPackages)
      }
    } else if (nonInteractive && flags.packages) {
      // Non-interactive: use explicit package list
      const explicitPackages = flags.packages.split(',').map((s) => s.trim())
      selectedPackageNames.push(...explicitPackages)
      // Collect secrets from all explicitly requested packages
      const explicitPkgMetas = explicitPackages
        .map((name) => allPackages.find((p) => p.name === name))
        .filter(Boolean) as InferredPackage[]
      allSelectedSecrets.push(...collectSecrets(explicitPkgMetas))
    } else if (!nonInteractive) {
      const result = await this.selectFeatures(features, allPackages)
      selectedPackageNames.push(...result.packages)
      allSelectedSecrets.push(...result.secrets)
    }

    // Step 6: Create project
    const log = (msg: string): void => {
      if (nonInteractive) say(msg)
    }
    const spinner = nonInteractive ? null : createSpinner()

    // This caller creates the configured Vite index.html below. Svelte's
    // app.html and non-Vite callers retain the static-copy asset contract.
    const fontFramework = framework ? loadAppFrameworks()[framework] : undefined
    const fontAssetMode =
      fontFramework?.vitePlugin && !fontFramework.htmlTemplate ? 'module' : 'copy'
    // Generate font HTML (local @font-face styles or CDN links) from package metadata
    const fontResult = framework
      ? generateFontHtml(selectedPackageNames, allPackages, fontAssetMode)
      : { html: '', fontFiles: [] }
    const fontLinks = fontResult.html

    // Derive named bond providers from selected packages using registry metadata
    // Groups by bondWiring.bondCategory (e.g. oauth → OAUTH_PROVIDERS, payments → PAYMENTS_PROVIDERS)
    const extraVars: Record<string, string> = {}
    if (apiAuthContract && isFullStack) {
      const resources = selectedPackageNames.filter(
        (name) => allPackages.find((pkg) => pkg.name === name)?.molecule?.authContract,
      )
      if (resources.length !== 1) {
        this.error(
          '--api-contract needs exactly one selected API resource with authContract metadata',
        )
      }
      apiAuthContract.resourcePackage = resources[0]
    }
    if (apiAuthContract) extraVars.AUTH_CONTRACT_JSON = JSON.stringify(apiAuthContract)
    if (flags['ide-preview']) extraVars.IDE_PREVIEW = '1'
    Object.assign(extraVars, providerTemplateVars(selectedPackageNames, allPackages))

    // Step 7: Resolve full package list (template requirements + default providers)
    // Done before project creation so templates can adapt to selected providers.
    if (framework) {
      const fwConfig = loadAppFrameworks()[framework]
      const templateRequired = getTemplateRequiredPackages(framework, frameworkPkg, fwConfig)
      log(`Template-required packages: ${templateRequired.join(', ') || '(none)'}`)
      selectedPackageNames.push(...templateRequired)
    }
    // A molecule.dev project records what its API sends in the Activity panel. That is one
    // package, whose setup call the generated bonds index awaits last (`setupLast`).
    if (flags['activity-capture'] && (isFullStack || projectType === 'api')) {
      const capture = requirePackageByRole('api', 'utility', 'activity')
      if (!selectedPackageNames.includes(capture)) selectedPackageNames.push(capture)
    }
    const bundledPackages = resolveFeatureBundledPackages(selectedPackageNames, allPackages)
    log(`Feature-bundled packages auto-resolved: ${bundledPackages.join(', ') || '(none)'}`)
    selectedPackageNames.push(...bundledPackages)

    const defaultProviders = resolveDefaultProviders(selectedPackageNames, allPackages)
    log(`Default providers auto-resolved: ${defaultProviders.join(', ') || '(none)'}`)
    selectedPackageNames.push(...defaultProviders)

    // Theme preset resolution: swap default theme provider + add classMap provider
    const themePresets = loadThemePresets()
    const themeName = flags.theme
    if (themeName) {
      const preset = themePresets[themeName]
      if (!preset) {
        const validPresets = Object.keys(themePresets)
        this.error(
          `Invalid theme "${themeName}". Valid: ${validPresets.join(', ') || '(none registered)'}`,
        )
      }

      // Find and replace the default theme provider with the preset's provider
      const defaultThemeProvider = allPackages.find(
        (p) => p.molecule?.category === 'theme' && p.molecule?.type === 'core',
      )?.molecule?.defaultProvider
      if (defaultThemeProvider) {
        const idx = selectedPackageNames.indexOf(defaultThemeProvider)
        if (idx !== -1) selectedPackageNames.splice(idx, 1)
      }
      selectedPackageNames.push(preset.themeProvider)

      // If preset specifies a classMap provider, swap the default UI provider too
      if (preset.classMapProvider) {
        const defaultUiProvider = allPackages.find(
          (p) => p.molecule?.category === 'ui' && p.molecule?.type === 'core',
        )?.molecule?.defaultProvider
        if (defaultUiProvider) {
          const idx = selectedPackageNames.indexOf(defaultUiProvider)
          if (idx !== -1) selectedPackageNames.splice(idx, 1)
        }
        selectedPackageNames.push(preset.classMapProvider)
      }

      log(
        `Theme preset "${themeName}": ${preset.themeProvider}${preset.classMapProvider ? ` + ${preset.classMapProvider}` : ''}`,
      )
    }

    // Close the transitive @molecule peer set BEFORE locales so deeply-nested
    // companions (auth-ui-react → oauth-buttons-react → oauth-logos-react) and
    // their locale bonds are all scaffolded — otherwise the build breaks on a
    // missing import the injector's one-level peer pass never added.
    // A static site drops the auth / service-worker families BEFORE peers and
    // locale bonds resolve, so nothing pulls their companions back in.
    const dropStaticExcluded = (names: string[]): string[] =>
      isStatic
        ? names.filter((name) => !isStaticExcluded(allPackages.find((p) => p.name === name)))
        : names
    if (isStatic) {
      const kept = dropStaticExcluded(selectedPackageNames)
      const dropped = selectedPackageNames.filter((name) => !kept.includes(name))
      selectedPackageNames.splice(0, selectedPackageNames.length, ...kept)
      log(`Static site: excluded ${dropped.join(', ') || '(none)'}`)
    }
    // Web push needs the service worker the PWA package registers, an optional peer of the push
    // package: a selection that names push gets it here, the peer walk below never does.
    const workerPackage = serviceWorkerPackageFor(
      selectedPackageNames,
      new Map(allPackages.map((p) => [p.name, p])),
    )
    if (workerPackage && !selectedPackageNames.includes(workerPackage)) {
      selectedPackageNames.push(workerPackage)
    }
    // The peers, and the packages only a feature's pages use (the plan page's package with
    // payments, the OAuth buttons' auth-ui package), until neither adds one. The scaffold writes a
    // feature's pages for every package it is handed, peers included: the default bonds bundle
    // peers on the payments providers, so its stack gets the plan page and the settings panel,
    // and their packages must come with it. A feature's packages can bring peers in turn. Same
    // derivation as the app templates and the API router.
    for (;;) {
      const transitivePeers = resolveTransitivePeers(selectedPackageNames, allPackages)
      log(`Transitive peer companions auto-resolved: ${transitivePeers.join(', ') || '(none)'}`)
      selectedPackageNames.push(...transitivePeers)
      if (!framework) break
      const featurePackages = featureTemplatePackages(
        join(getTemplatesDir(), 'app'),
        framework,
        deriveOptionalFeatures(selectedPackageNames, allPackages),
      ).filter((name) => !selectedPackageNames.includes(name))
      log(`Feature template packages: ${featurePackages.join(', ') || '(none)'}`)
      if (featurePackages.length === 0) break
      selectedPackageNames.push(...featurePackages)
    }
    // Second pass for a static site: a transitive peer may have re-added an
    // excluded family. Runs BEFORE locale resolution so no orphan locale bond
    // is added for a package that is not there.
    if (isStatic) {
      selectedPackageNames.splice(
        0,
        selectedPackageNames.length,
        ...dropStaticExcluded(selectedPackageNames),
      )
    }

    const localePackages = resolveLocalePackages(selectedPackageNames, allPackages)
    log(`Locale packages auto-resolved: ${localePackages.join(', ') || '(none)'}`)
    selectedPackageNames.push(...localePackages)
    const uniquePackages = [...new Set(selectedPackageNames)]
    log(`Total unique packages: ${uniquePackages.length}`)

    // The exact version this scaffold is pinning for every selected package
    // (`addPackages` writes `getMoleculeVersion`). Computed ONCE and handed to
    // both the Step 8b preflight and the Step 11 copier, so the bytes judged and
    // the bytes written are the same package/version/SQL tuples by construction —
    // a parent fleet install or a sibling checkout of another version is not the
    // input either of them may use.
    const setupSqlVersions: Record<string, string> = Object.fromEntries(
      uniquePackages.map((name) => [name, getMoleculeVersion(name)]),
    )

    // Extract build tooling from any selected provider that declares it
    const buildToolingProvider = allPackages.find(
      (p) => uniquePackages.includes(p.name) && p.molecule?.buildTooling,
    )
    const buildTooling = buildToolingProvider?.molecule?.buildTooling
    log(
      `Build tooling: ${buildToolingProvider?.name ?? '(none)'}${buildTooling?.cssTemplate ? ` (CSS: ${buildTooling.cssTemplate})` : ''}`,
    )

    // npm `overrides` a selected bond requires at the install ROOT (npm honors
    // overrides only from the root). Driven by registry `molecule.npmOverrides`
    // — e.g. the socket.io realtime bonds pin a patched `ws` to close a transitive
    // DoS CVE (GHSA-96hv-2xvq-fx4p) that the bond's own package.json cannot fix.
    const npmOverrides = collectNpmOverrides(uniquePackages, allPackages)
    if (Object.keys(npmOverrides).length > 0) {
      log(`npm overrides (root): ${JSON.stringify(npmOverrides)}`)
    }

    // Step 8b: Refuse a database bond that cannot apply the setup SQL this
    // selection ships — BEFORE the scaffold writes anything, so a refused
    // combination leaves no directory at all. Without this check the app is
    // generated, `server.ts` awaits `runMigrations()` at boot, and the API never
    // starts (DuckDB rejects foreign-key referential actions and partial indexes,
    // which 21 of 46 registry resource packages use). The SQL is resolved through
    // Node's own walk-up (`installedPackageRoot` in `database-compatibility.ts`),
    // bound to the exact version this scaffold pins and STEP 11's copier uses, so
    // the bytes judged are the bytes the generated app will import.
    {
      const apiPath = isFullStack
        ? join(projectPath, 'api')
        : projectType === 'api'
          ? projectPath
          : null
      if (apiPath) {
        try {
          await assertDdlCompatibility({
            projectPath: apiPath,
            packageNames: uniquePackages,
            versions: setupSqlVersions,
            packages: allPackages,
          })
        } catch (error) {
          this.error(error instanceof Error ? error.message : String(error))
        }
      }
    }

    // Step 8c: Refuse a package that renders only in a browser, or one that requires it as a peer,
    // in a React Native project — before the scaffold writes anything, naming the chain.
    if (rendersOnReactNative({ molecule: { framework } })) {
      const refused = webOnlyChains(
        uniquePackages,
        new Map(allPackages.map((pkg) => [pkg.name, pkg])),
      )
      if (refused.length > 0) {
        this.error(t('commands.create.errors.webOnly', { list: describeWebOnlyChains(refused) }))
      }
    }

    spinner?.start(t('commands.create.spinners.creating'))
    if (isStatusPageEdge) {
      await createStatusPageEdgeProject(projectPath, projectName)
    } else if (isFullStack) {
      await createFullStackProject(
        projectPath,
        projectName,
        framework!,
        fontLinks,
        extraVars,
        uniquePackages,
        buildTooling,
        'express',
        npmOverrides,
        fontAssetMode,
      )
    } else if (isStatic) {
      await createStaticProject(
        projectPath,
        projectName,
        framework!,
        fontLinks,
        extraVars,
        uniquePackages,
        buildTooling,
        npmOverrides,
        fontAssetMode,
      )
    } else if (projectType === 'app') {
      await createAppProject(
        projectPath,
        projectName,
        framework!,
        false,
        fontLinks,
        extraVars,
        uniquePackages,
        buildTooling,
        npmOverrides,
        fontAssetMode,
      )
    } else {
      await createApiProject(projectPath, projectName, 'express', npmOverrides)
    }

    // Close the @molecule dependency set in the written manifests — the same
    // guarantee the --template path gets inside copyTemplateInstance. The
    // selected set above deliberately withholds a transitive PROVIDER peer
    // whose core it already provides (resolveTransitivePeers: wiring two
    // providers for one singleton core makes the last setup call win, X0 run
    // xr-molecule-flash-m23), but a package like api-bonds-default-express
    // STATICALLY imports every provider it can re-export, so the withheld one
    // must still be declared for the install to resolve. No-op when the
    // closure adds nothing.
    {
      const { ensureMoleculePeerClosure } = await import('../lib/scaffold.js')
      const added = await ensureMoleculePeerClosure(projectPath)
      const addedCount = Object.values(added).reduce((n, names) => n + names.length, 0)
      if (addedCount > 0) {
        log(
          `Manifest peer closure re-added ${addedCount} bond-withheld provider peer(s): ${Object.values(
            added,
          )
            .flat()
            .join(', ')}`,
        )
      }
    }

    // Secure-by-default scanning (SEC3) for every custom build, written once at
    // the true project root (so a full-stack monorepo's api/app sub-projects
    // never get a duplicate nested copy). The flagship `--template` fast path
    // wrote its own copy inside copyTemplateInstance and returned earlier.
    await scaffoldSecurityWorkflow(projectPath, projectName)

    // AGENTS.md for external coding agents (Claude Code, Codex, Cursor, …) —
    // the molecule conventions in context on project open. The .npmrc carries
    // legacy-peer-deps so a default `npm install` resolves (see its comment).
    {
      const { ensureAgentSkills, ensureRootNpmrc, ensureReadmeMd, stampMoleculeMetadata } =
        await import('../lib/scaffold.js')
      await ensureAgentSkills(projectPath, { projectType, framework })
      writeStopHooks(projectPath)
      await ensureRootNpmrc(projectPath)
      await ensureReadmeMd(projectPath, projectName, projectType, framework)
      await stampMoleculeMetadata(projectPath)
    }

    spinner?.stop(t('commands.create.spinners.created'))
    log(t('commands.create.messages.createdProject', { type: projectType, name: projectName }))

    // Copy template domain pages, handlers, locales, and theme if --template was specified
    if (flags.template) {
      const { copyTemplateDomainFiles } = await import('../lib/scaffold.js')
      const appPath = hasAppSubdir ? join(projectPath, 'app') : projectPath
      const apiPath = isFullStack ? join(projectPath, 'api') : null
      await copyTemplateDomainFiles(flags.template, framework!, appPath, apiPath, this.config.root)
      say(`Copied template pages for: ${flags.template}`)
    }

    // Every app gets a runnable `e2e/`: the bond wiring (which browser — the live
    // preview inside a molecule sandbox, real Playwright elsewhere) always, and a
    // playwright.config.ts + smoke spec when no template supplied specs of its own.
    // A web app gets a runnable Playwright suite. A framework the registry marks
    // `e2e: false` (React Native) has no browser to drive, so Playwright's config
    // and specs would be tooling the app can never run — and `tsc` still
    // type-checks them, so they broke `npm run build`.
    if (
      (isFullStack || isStatic || projectType === 'app') &&
      loadAppFrameworks()[framework ?? '']?.e2e !== false
    ) {
      const { ensureE2EFiles } = await import('../lib/scaffold.js')
      await ensureE2EFiles(hasAppSubdir ? join(projectPath, 'app') : projectPath)
    }

    // Edge status page is a standalone Workers project — skip addPackages/inject/env steps
    if (isStatusPageEdge) {
      let installNeeded = flags['skip-install'] === true
      let installFailure: string | undefined
      if (!flags['skip-install']) {
        try {
          await this.runSlowStep(
            'npm install',
            t('commands.create.spinners.installing'),
            () => npmInstall(projectPath, { wholeTree: true }),
            { json: flags.json === true, spinner },
          )
          spinner?.stop(t('commands.create.spinners.installed'))
          log(t('commands.create.spinners.installed'))
        } catch (error) {
          installNeeded = true
          installFailure = npmFailureDetail(error)
          spinner?.stop(chalk.yellow(t('commands.create.spinners.installFailed')))
          log(t('commands.create.spinners.installFailed'))
          this.warn(`npm install failed: ${installFailure}`)
        }
      }

      const verification = installNeeded
        ? null
        : await this.verifyCreated(projectPath, flags.verify, {
            json: flags.json === true,
            spinner,
          })
      if (verification) for (const line of verificationLines(verification)) say(line)
      say('')
      if (!nonInteractive) p.outro(chalk.green(t('commands.create.messages.success')))
      say('')
      say(
        nonInteractive
          ? t('commands.create.messages.nextSteps')
          : chalk.bold(t('commands.create.messages.nextSteps')),
      )
      const cdStep = changeDirectoryStep(projectPath)
      if (cdStep) say(`  ${cdStep}`)
      for (const step of pendingSetupSteps({
        installNeeded,
        injectSkipped: [],
        cliVersion: this.config.version,
      }))
        say(`  ${step}`)
      say('  npx wrangler dev')
      const orientation = projectOrientation(projectPath, {
        checked: verification?.ok === true,
        installed: !installNeeded,
      })
      say('')
      say(t('commands.create.messages.orientation'))
      for (const line of orientation) say(`  ${line}`)
      if (nonInteractive) {
        say('')
        say(t('commands.create.messages.projectPath', { path: projectPath }))
      }
      if (flags.json) {
        this.log(
          JSON.stringify(
            {
              project: projectName,
              path: projectPath,
              type: 'status-page-edge',
              framework: null,
              template: null,
              packages: uniquePackages,
              installSkipped: flags['skip-install'] === true,
              ...(installFailure ? { installFailure } : {}),
              injectSkipped: [],
              pendingSetup: pendingSetupSteps({
                installNeeded,
                injectSkipped: [],
                cliVersion: this.config.version,
              }),
              capabilityMap: requestedCapabilityMap(
                await readProjectCapabilityMap(projectPath),
                flags.packages,
              ),
              ...verificationFields(verification),
              next: orientation,
            },
            null,
            2,
          ),
        )
      }
      return
    }

    // Dev tooling (stack `tooling`) goes into each workspace's devDependencies.
    const byStack = packagesByStack(uniquePackages)
    if (isFullStack) {
      const { api: apiPkgs, app: appPkgs, tooling: toolingPkgs } = byStack
      const apiPath = join(projectPath, 'api')
      const appPath = join(projectPath, 'app')
      log(`API packages (${apiPkgs.length}): ${apiPkgs.join(', ')}`)
      log(`App packages (${appPkgs.length}): ${appPkgs.join(', ')}`)

      spinner?.start(t('commands.create.spinners.addingPackages'))
      if (apiPkgs.length > 0) await addPackages(apiPath, apiPkgs)
      if (appPkgs.length > 0) await addPackages(appPath, appPkgs)
      if (toolingPkgs.length > 0) {
        await addPackages(apiPath, toolingPkgs, undefined, 'devDependencies')
        await addPackages(appPath, toolingPkgs, undefined, 'devDependencies')
      }
      spinner?.stop(
        t('commands.create.spinners.addedFullStack', {
          apiCount: apiPkgs.length,
          appCount: appPkgs.length,
        }),
      )
      log(
        t('commands.create.spinners.addedFullStack', {
          apiCount: apiPkgs.length,
          appCount: appPkgs.length,
        }),
      )
    } else {
      spinner?.start(t('commands.create.spinners.addingPackages'))
      const workspacePath = hasAppSubdir ? join(projectPath, 'app') : projectPath
      await addPackages(
        workspacePath,
        uniquePackages.filter((name) => !byStack.tooling.includes(name)),
      )
      if (byStack.tooling.length > 0)
        await addPackages(workspacePath, byStack.tooling, undefined, 'devDependencies')
      spinner?.stop(t('commands.create.spinners.addedPackages', { count: uniquePackages.length }))
      log(t('commands.create.spinners.addedPackages', { count: uniquePackages.length }))
    }

    // AGENTS.md before the install, from the manifests so far: the README points an agent at it,
    // and an agent reads the project while the install runs (r19 eval: Codex listed AGENTS.md
    // a minute before create wrote it). It is written again once inject and the peer closure have
    // declared the rest, unless something else changed it meanwhile.
    let earlyAgentsMd: string | null = null
    {
      const agentsMd = join(projectPath, 'AGENTS.md')
      if (!existsSync(agentsMd)) {
        const { ensureAgentsMd } = await import('../lib/scaffold.js')
        await ensureAgentsMd(projectPath, undefined, { creating: true })
        earlyAgentsMd = existsSync(agentsMd) ? readFileSync(agentsMd, 'utf8') : null
      }
    }

    // Step 9: Install dependencies
    let installNeeded = flags['skip-install'] === true
    // npm's reason when an install below fails: the JSON result carries it.
    let installFailure: string | undefined
    // What the install below sees, so the steps after it can tell whether they declared more.
    const declaredAtInstall = flags['skip-install']
      ? undefined
      : await declaredDependencies(projectPath)
    // Install from mlcl's resolved lock for this framework: npm resolves only what the stack names
    // beyond it, instead of the whole tree from nothing (lib/starter-lock.ts).
    const lockFramework = projectType === 'api' ? undefined : framework
    const starterLock =
      !flags['skip-install'] &&
      (projectType === 'full-stack' || projectType === 'api' || projectType === 'app') &&
      applyStarterLock(projectPath, lockFramework) > 0
    if (starterLock) log(t('commands.create.messages.starterLock'))
    // With no install here, the project's own `npm install` gets the install-script decisions of
    // the tree the starter lock describes (npmInstall writes them on every install mlcl runs).
    if (
      flags['skip-install'] &&
      (projectType === 'full-stack' || projectType === 'api' || projectType === 'app')
    )
      writeInstallScriptEntries(projectPath, {
        lock: readStarterLock(lockFramework)?.packages,
      })
    if (!flags['skip-install']) {
      try {
        await this.runSlowStep(
          'npm install',
          t('commands.create.spinners.installing'),
          () => npmInstall(projectPath, { wholeTree: true }),
          { json: flags.json === true, spinner },
        )
        spinner?.stop(t('commands.create.spinners.installed'))
        log(t('commands.create.spinners.installed'))
      } catch (error) {
        installNeeded = true
        installFailure = npmFailureDetail(error)
        spinner?.stop(chalk.yellow(t('commands.create.spinners.installFailed')))
        log(t('commands.create.spinners.installFailed'))
        this.warn(`npm install failed: ${installFailure}`)
      }
    }

    // Step 10: Run injection (generates integration code)
    // When --skip-install is set (e.g. sandbox scaffolding), run inject in fast
    // mode: skip install (create handles it), skip tests, skip Prettier formatting.
    const fastInject = flags['skip-install']
    // Each workspace whose integration code was not generated, relative to the project: the
    // closing next steps name the command that generates it.
    const injectSkipped: string[] = []
    // Why each skipped workspace's inject failed. `log` prints nothing under --json, so without
    // this the JSON result named the skipped workspace and never the reason.
    const injectFailure: Record<string, string> = {}
    if (isFullStack) {
      // Inject both workspaces
      for (const workspace of ['api', 'app']) {
        const wsPath = join(projectPath, workspace)
        try {
          await this.runSlowStep(
            `${CLI_COMMAND} inject -p ${workspace}`,
            t('commands.create.spinners.injecting', { workspace }),
            () => this.runInject(wsPath, fastInject),
            { json: flags.json === true, spinner },
          )
          spinner?.stop(t('commands.create.spinners.injected', { workspace }))
          log(t('commands.create.spinners.injected', { workspace }))
        } catch (e) {
          // The injector refused DDL compatibility (its dedicated exit status):
          // the app could never migrate at boot, so the scaffold FAILS rather
          // than reporting success over an un-injected project (r7 review, N1).
          // Every other inject failure keeps the warn-and-continue treatment a
          // `--skip-install` scaffold needs.
          if (isDdlCompatibilityFailure(e)) {
            spinner?.stop(chalk.red(t('commands.create.spinners.injectSkipped', { workspace })))
            this.error(
              t('commands.create.errors.injectDdlIncompatible', {
                command: chalk.cyan(`${CLI_COMMAND} inject -p ${wsPath}`),
              }),
              { exit: DDL_INCOMPATIBLE_EXIT },
            )
          }
          if (flags['require-inject']) {
            spinner?.stop(chalk.red(t('commands.create.spinners.injectSkipped', { workspace })))
            this.error(
              t('commands.create.errors.injectRequired', {
                workspace,
                command: chalk.cyan(`${CLI_COMMAND} inject -p ${wsPath}`),
                error: injectFailureDetail(e),
              }),
            )
          }
          injectSkipped.push(workspace)
          injectFailure[workspace] = injectFailureDetail(e)
          spinner?.stop(chalk.yellow(t('commands.create.spinners.injectSkipped', { workspace })))
          log(t('commands.create.spinners.injectSkipped', { workspace }))
          log(`  Inject error: ${injectFailure[workspace]}`)
        }
      }
    } else {
      const injectPath = hasAppSubdir ? join(projectPath, 'app') : projectPath
      try {
        await this.runSlowStep(
          `${CLI_COMMAND} inject -p ${hasAppSubdir ? 'app' : '.'}`,
          t('commands.create.spinners.injectingSingle'),
          () => this.runInject(injectPath, fastInject),
          { json: flags.json === true, spinner },
        )
        spinner?.stop(t('commands.create.spinners.injectedSingle'))
        log(t('commands.create.spinners.injectedSingle'))
      } catch (e) {
        // Same rule as the full-stack branch: an injector DDL refusal is fatal.
        if (isDdlCompatibilityFailure(e)) {
          spinner?.stop(chalk.red(t('commands.create.spinners.injectSkippedSingle')))
          this.error(
            t('commands.create.errors.injectDdlIncompatible', {
              command: chalk.cyan(`${CLI_COMMAND} inject -p ${injectPath}`),
            }),
            { exit: DDL_INCOMPATIBLE_EXIT },
          )
        }
        if (flags['require-inject']) {
          spinner?.stop(chalk.red(t('commands.create.spinners.injectSkippedSingle')))
          this.error(
            t('commands.create.errors.injectRequired', {
              workspace: basename(injectPath),
              command: chalk.cyan(`${CLI_COMMAND} inject -p ${injectPath}`),
              error: injectFailureDetail(e),
            }),
          )
        }
        const workspace = hasAppSubdir ? 'app' : '.'
        injectSkipped.push(workspace)
        injectFailure[workspace] = injectFailureDetail(e)
        spinner?.stop(chalk.yellow(t('commands.create.spinners.injectSkippedSingle')))
        log(t('commands.create.spinners.injectSkippedSingle'))
        log(`  Inject error: ${injectFailure[workspace]}`)
      }
    }

    // Re-apply template overrides for files generated by the injector
    // (e.g. blog/crm need `bonds/app-ui-tailwind.ts` to wrap classMap with applyGeneratedVisualTokens).
    if (flags.template) {
      const { applyTemplatePostInjectOverrides, wireTemplateApiRouters } =
        await import('../lib/scaffold.js')
      const appPath = hasAppSubdir ? join(projectPath, 'app') : projectPath
      await applyTemplatePostInjectOverrides(flags.template, appPath, this.config.root)

      // Wire template-supplied API handlers + routes/* into the generated App/router.ts.
      // Without this, template-specific resource handlers (and the billing router) are
      // copied into src/handlers and src/routes but never mounted on the express app.
      const templateApiPath = isFullStack
        ? join(projectPath, 'api')
        : projectType === 'api'
          ? projectPath
          : null
      if (templateApiPath) {
        await wireTemplateApiRouters(templateApiPath)
      }
    } else {
      // Custom builds (no template) get the same handlers/index.ts anchor every
      // template ships, so the executor's learned "register endpoints in
      // handlers/index.ts" pattern applies uniformly (custom == template).
      // Without it, a custom build has no handlers/ dir → a read_file miss every time.
      const { ensureBaseHandlersIndex } = await import('../lib/scaffold.js')
      const customApiPath = isFullStack
        ? join(projectPath, 'api')
        : projectType === 'api'
          ? projectPath
          : null
      if (customApiPath) {
        await ensureBaseHandlersIndex(customApiPath)
      }
    }

    // Close the manifests' @molecule peers again now that every step that declares
    // packages has run: the closure above precedes `addPackages` and the capture
    // wiring, and the project installs with --legacy-peer-deps, which adds no peers.
    // No-op when nothing is missing.
    {
      const { ensureMoleculePeerClosure } = await import('../lib/scaffold.js')
      const added = Object.values(await ensureMoleculePeerClosure(projectPath)).flat()
      if (added.length > 0) log(`Manifest peer closure added ${added.length}: ${added.join(', ')}`)
    }

    // Describe wiring only after injection, template overrides and the peer closure above have
    // written every manifest. ensureAgentsMd preserves a user-owned file from an earlier run. It
    // reads those manifests, as the template path does, so AGENTS.md and the --json capabilityMap
    // list the same packages, including peers the closure adds (api-resource-user).
    {
      const { ensureAgentsMd } = await import('../lib/scaffold.js')
      const agentsMd = join(projectPath, 'AGENTS.md')
      if (
        earlyAgentsMd !== null &&
        existsSync(agentsMd) &&
        readFileSync(agentsMd, 'utf8') === earlyAgentsMd
      )
        rmSync(agentsMd)
      await ensureAgentsMd(projectPath)
    }

    // Generate .env template (from package metadata secrets)
    // The app's public API-base-URL variable is the framework's (registry `apiUrlEnvKey`):
    // Vite reads VITE_API_URL, Expo reads EXPO_PUBLIC_API_URL, the name config.ts consumes.
    const appEnvKey = loadAppFrameworks()[framework ?? '']?.apiUrlEnvKey ?? 'VITE_API_URL'
    // Each .env file and the required variables it leaves empty. Generated keys (the JWT pair),
    // registry defaults and optional variables are not listed: telling the developer to set them
    // sent an agent to generate JWT keys the scaffold had already written (2026-11-23 eval).
    const envLeftToSet = new Map<string, string[]>()
    if (isFullStack) {
      const apiSecrets = allSelectedSecrets.filter((s) => !s.name.startsWith('VITE_'))
      const appSecrets = allSelectedSecrets.filter((s) => s.name.startsWith('VITE_'))
      envLeftToSet.set(
        'api/.env',
        await generateEnvFile(join(projectPath, 'api'), apiSecrets, 'api'),
      )
      envLeftToSet.set(
        'app/.env',
        await generateEnvFile(join(projectPath, 'app'), appSecrets, 'app', projectName, appEnvKey),
      )
      log(t('commands.create.messages.envGenFullStack'))
    } else if (isStatic) {
      // App-only site under app/: only the VITE_ secrets apply, no API env.
      envLeftToSet.set(
        'app/.env',
        await generateEnvFile(
          join(projectPath, 'app'),
          allSelectedSecrets.filter((s) => s.name.startsWith('VITE_')),
          'app',
          projectName,
          appEnvKey,
        ),
      )
      log(t('commands.create.messages.envGenSingle'))
    } else {
      const envType = projectType === 'app' ? 'app' : 'api'
      envLeftToSet.set(
        '.env',
        await generateEnvFile(projectPath, allSelectedSecrets, envType, projectName, appEnvKey),
      )
      log(t('commands.create.messages.envGenSingle'))
    }

    // Step 11: Copy SQL setup scripts (API and full-stack)
    if (isFullStack) {
      const apiPath = join(projectPath, 'api')
      await copySqlSetupScripts(apiPath, uniquePackages, allPackages, setupSqlVersions)
      log(t('commands.create.messages.sqlCopied'))
    } else if (projectType === 'api') {
      await copySqlSetupScripts(projectPath, uniquePackages, allPackages, setupSqlVersions)
      log(t('commands.create.messages.sqlCopied'))
    }

    // Step 11.5: Copy local font files to static assets fonts/. A file no node_modules holds
    // yet (the packages are not installed) is copied by the inject the next steps name.
    const assetsPending: string[] = []
    const fontWorkspace = hasAppSubdir ? 'app' : projectType === 'app' ? '.' : undefined
    if (fontResult.fontFiles.length > 0 && fontWorkspace) {
      const fwPublicDir = framework
        ? (loadAppFrameworks()[framework]?.publicDir ?? 'public')
        : 'public'
      const missing = await copyFontFiles(
        join(projectPath, fontWorkspace),
        fontResult.fontFiles,
        fwPublicDir,
      )
      if (missing.length > 0) assetsPending.push(fontWorkspace)
      log(
        t(
          missing.length > 0
            ? 'commands.create.messages.fontsPending'
            : 'commands.create.messages.fontsCopied',
          { dir: `${fwPublicDir}/fonts/` },
        ),
      )
    }

    // The root gets the packages' formatter config, so every tool formats its files alike.
    if (hasAppSubdir) await ensureRootFormatterConfig(projectPath)

    // The steps after the install declare packages too: inject (it plans against the installed
    // copies) and the peer closure. A project handed back with packages its install never saw
    // fails its first build (TS2307 until someone runs `npm install`). Install once more when
    // anything was declared since; npm adds only those.
    if (declaredAtInstall && !installNeeded) {
      const added = newDeclarations(declaredAtInstall, await declaredDependencies(projectPath))
      if (added.length > 0) {
        log(t('commands.create.messages.installingDeclaredLater', { count: added.length }))
        // The first install pruned the lock entries of what it did not see declared.
        if (starterLock) applyStarterLock(projectPath, lockFramework)
        try {
          await this.runSlowStep(
            'npm install',
            t('commands.create.spinners.installing'),
            // Seconds after the first install: its cache answers for everything but the new names.
            () => npmInstall(projectPath, { preferOffline: true, wholeTree: true }),
            { json: flags.json === true, spinner },
          )
          spinner?.stop(t('commands.create.spinners.installed'))
        } catch (error) {
          installNeeded = true
          installFailure = npmFailureDetail(error)
          spinner?.stop(chalk.yellow(t('commands.create.spinners.installFailed')))
          this.warn(`npm install failed: ${installFailure}`)
        }
      }
    }

    // No formatter pass: a scaffold is written formatter-clean at the source (the templates and the
    // generators), and inject formats the files it writes. Formatting the whole project cost 1.5-1.9 s
    // of every installed create (r18 eval, 2026-11-24). `scaffold-format-clean.test.ts` fails on any
    // file a scaffold leaves for `prettier --write`.

    // The smoke tests run once, here, on the final tree (inject runs with --no-test), and beside the
    // check: neither reads what the other writes (vitest loads src/, the build writes dist/). In
    // turn they cost 2.7 s and 6.3 s of an installed create (r33 eval). Skipped under
    // --skip-install: there are no dependencies to test against.
    const testCwd = isFullStack
      ? join(projectPath, 'api')
      : hasAppSubdir
        ? join(projectPath, 'app')
        : projectPath
    const smoke = flags['skip-install']
      ? null
      : execa('npx', ['vitest', 'run', '--reporter=verbose'], {
          cwd: testCwd,
          stdio: 'pipe',
          timeout: 60_000,
          // The timeout takes vitest's workers too, not only the npx wrapper (inject.ts runTests).
          killDescendants: true,
        }).then(
          (result) => ({ ok: true as const, stdout: result.stdout }),
          (error: unknown) => ({ ok: false as const, error }),
        )
    const verification =
      flags['skip-install'] || installNeeded
        ? null
        : await this.verifyCreated(projectPath, flags.verify, {
            json: flags.json === true,
            spinner,
          })
    if (smoke) {
      spinner?.start(t('commands.create.spinners.testing'))
      const tested = await smoke
      if (tested.ok) {
        const summaryMatch = tested.stdout.match(/Tests\s+(\d+\s+passed[^)]*\))/)
        const passed = t('commands.create.spinners.testsPassed', {
          summary: summaryMatch ? ` (${summaryMatch[0]})` : '',
        })
        spinner?.stop(chalk.green(passed))
        log(passed)
      } else {
        spinner?.stop(chalk.yellow(t('commands.create.spinners.testsFailed')))
        log(t('commands.create.spinners.testsFailed'))
        const { error } = tested
        this.warn(`Smoke tests failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    if (verification) for (const line of verificationLines(verification)) say(line)

    // Done
    if (apiAuthContract) say(AUTH_PRECONFIGURATION_GUIDANCE)
    say('')
    if (!nonInteractive) p.outro(chalk.green(t('commands.create.messages.success')))

    const envFilesToFill = [...envLeftToSet].filter(([, names]) => names.length > 0)
    for (const [file, names] of envFilesToFill) {
      say('')
      const heading = t('commands.create.messages.envVars', { file })
      say(nonInteractive ? heading : chalk.bold(heading))
      for (const name of names) say(`  ${name}`)
    }

    say('')
    say(
      nonInteractive
        ? t('commands.create.messages.nextSteps')
        : chalk.bold(t('commands.create.messages.nextSteps')),
    )
    const cdStep = changeDirectoryStep(projectPath)
    if (cdStep) say(`  ${cdStep}`)
    for (const step of pendingSetupSteps({
      installNeeded,
      injectSkipped,
      assetsPending,
      cliVersion: this.config.version,
    }))
      say(`  ${step}`)
    if (envFilesToFill.length > 0) {
      const file = envFilesToFill.map(([name]) => name).join(' and ')
      say(`  ${t('commands.create.messages.editEnv', { file })}`)
    }
    say(`  npm run dev`)
    const orientation = projectOrientation(projectPath, {
      checked: verification?.ok === true,
      installed: !installNeeded,
    })
    say('')
    say(
      nonInteractive
        ? t('commands.create.messages.orientation')
        : chalk.bold(t('commands.create.messages.orientation')),
    )
    for (const line of orientation) say(`  ${line}`)

    if (nonInteractive) {
      say('')
      say(t('commands.create.messages.projectPath', { path: projectPath }))
      say(t('commands.create.messages.packagesList', { packages: uniquePackages.join(', ') }))
    }

    if (flags.json) {
      this.log(
        JSON.stringify(
          {
            project: projectName,
            path: projectPath,
            type: projectType,
            framework: framework ?? null,
            template: flags.template ?? null,
            packages: uniquePackages,
            secrets: [...new Set(allSelectedSecrets.map((s) => s.name))],
            envToSet: Object.fromEntries(envFilesToFill),
            installSkipped: flags['skip-install'] === true,
            ...(installFailure ? { installFailure } : {}),
            injectSkipped,
            ...(Object.keys(injectFailure).length > 0 ? { injectFailure } : {}),
            pendingSetup: pendingSetupSteps({
              installNeeded,
              injectSkipped,
              assetsPending,
              cliVersion: this.config.version,
            }),
            ...(apiAuthContract ? { authGuidance: AUTH_PRECONFIGURATION_GUIDANCE } : {}),
            capabilityMap: requestedCapabilityMap(
              await readProjectCapabilityMap(projectPath),
              flags.packages,
            ),
            ...verificationFields(verification),
            next: orientation,
          },
          null,
          2,
        ),
      )
    }
  }

  /**
   * Present dynamic feature selection prompts built from package metadata.
   */
  private async selectFeatures(
    features: DynamicFeature[],
    allPackages: InferredPackage[],
  ): Promise<{
    packages: string[]
    secrets: MoleculeSecret[]
  }> {
    const packages: string[] = []
    const secrets: MoleculeSecret[] = []

    if (features.length === 0) {
      return { packages, secrets }
    }

    const selectedFeatures = await p.multiselect({
      message: t('commands.create.prompts.features'),
      options: features.map((f) => ({
        value: f.category,
        label: f.label,
        hint: f.description,
      })),
      initialValues: features.filter((f) => f.checked).map((f) => f.category),
      required: false,
    })

    if (p.isCancel(selectedFeatures)) {
      p.cancel(t('commands.create.prompts.cancelled'))
      process.exit(0)
    }

    for (const categoryKey of selectedFeatures as string[]) {
      const feature = features.find((f) => f.category === categoryKey)
      if (!feature) continue

      if (feature.providers.length > 0) {
        if (feature.multiSelect) {
          const selected = await p.multiselect({
            message: t('commands.create.prompts.selectProviders', { label: feature.label }),
            options: feature.providers.map((prov) => ({
              value: prov.name,
              label: prov.molecule!.label,
            })),
            required: false,
          })

          if (!p.isCancel(selected)) {
            const featurePkgs = collectFeaturePackages(feature, selected as string[], allPackages)
            packages.push(...featurePkgs.map((fp) => fp.name))
            secrets.push(...collectSecrets(featurePkgs))
          }
        } else {
          const selected = await p.select({
            message: t('commands.create.prompts.selectProvider', { label: feature.label }),
            options: feature.providers.map((prov) => ({
              value: prov.name,
              label: prov.molecule!.label,
            })),
          })

          if (!p.isCancel(selected)) {
            const featurePkgs = collectFeaturePackages(feature, [selected as string], allPackages)
            packages.push(...featurePkgs.map((fp) => fp.name))
            secrets.push(...collectSecrets(featurePkgs))
          }
        }
      } else {
        // No providers - just add primary + bundled
        const featurePkgs = collectFeaturePackages(feature, [], allPackages)
        packages.push(...featurePkgs.map((fp) => fp.name))
        secrets.push(...collectSecrets(featurePkgs))
      }
    }

    return {
      packages: [...new Set(packages)],
      secrets,
    }
  }

  /**
   * Run the new project's own check (`mlcl check`'s default steps), recorded for the stop hook so
   * the agent's first stop has nothing to re-run.
   *
   * @param projectPath - The installed project.
   * @param run - False under --no-verify.
   * @param progress - Where progress goes (the spinner, or stderr under --json).
   * @returns What the check came to, or null when it did not run.
   */
  private async verifyCreated(
    projectPath: string,
    run: boolean,
    progress: { json: boolean; spinner?: ReturnType<typeof p.spinner> | null },
  ): Promise<CreateVerification | null> {
    if (!run) return null
    const result = await this.runSlowStep(
      `${CLI_COMMAND} check`,
      t('commands.create.spinners.verifying'),
      () => runRecordedCheck(projectPath, {}),
      progress,
    )
    progress.spinner?.stop(t('commands.create.spinners.verifying'))
    return summarizeVerification(result)
  }

  /**
   * Run a slow scaffold step (`npm install`, the injector), saying that it is still running
   * every `HEARTBEAT_MS` until it settles (`lib/create-progress.ts`): npm prints
   * nothing while it resolves a first install, and a caller that sees no output for minutes
   * stops the command as hung. An interactive run shows the lines in its spinner. Otherwise
   * they go to stdout, or to stderr under `--json`, whose stdout carries only the result object.
   *
   * @param step - The command the step runs, as the lines name it (`npm install`).
   * @param start - The line that announces the step.
   * @param work - The step.
   * @param output - Where the lines go.
   * @param output.json - Whether `--json` was passed.
   * @param output.spinner - The interactive run's spinner, when it has one.
   * @returns What the step returns.
   */
  private async runSlowStep<T>(
    step: string,
    start: string,
    work: () => Promise<T>,
    { json, spinner }: { json: boolean; spinner?: ReturnType<typeof p.spinner> | null },
  ): Promise<T> {
    const report = (line: string): void => {
      if (spinner) spinner.message(line)
      else if (json) this.logToStderr(line)
      else this.log(line)
    }
    if (spinner) spinner.start(start)
    else report(start)
    return withHeartbeat(work, (seconds) =>
      report(t('commands.create.progress.running', { step, seconds })),
    )
  }

  private async runInject(projectPath: string, fast = false): Promise<void> {
    const { dirname } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const mlclPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'bin', 'run.js')
    // No smoke tests here: create runs them itself, once, after its last install.
    const args = [mlclPath, 'inject', '--force', '--no-install', '--no-test', '-p', projectPath]
    if (fast) {
      args.push('--no-format', '--no-ai')
    }
    const result = await execa('node', args, {
      stdio: 'pipe',
    })
    // `stdio: 'pipe'` keeps the child's output invisible on success, and the
    // injector's WARNINGS are exactly the part a scaffold must not lose: a stale
    // installed copy whose dependency metadata was therefore not written, or a
    // migration that could not be planned. They all go through oclif's
    // `this.warn` (stderr, `Warning: …`), so forward those lines and leave the
    // spinners and progress output captured.
    for (const warning of injectWarningLines(result.stderr ?? '')) this.warn(warning)
  }
}
