import { basename, isAbsolute, join } from 'node:path'

import * as p from '@clack/prompts'
import { Args, Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import { execa } from 'execa'

import {
  buildFeatureMenu,
  collectFeaturePackages,
  collectSecrets,
  type DynamicFeature,
  resolveDefaultProviders,
  resolveFeatureBundledPackages,
  resolveLocalePackages,
  resolveTransitivePeers,
} from '../lib/features.js'
import { formatGeneratedFiles } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import {
  getPackageStack,
  loadAppFrameworks,
  loadRegistry,
  loadThemePresets,
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
  generateEnvFile,
  generateFontHtml,
  getTemplateRequiredPackages,
  scaffoldSecurityWorkflow,
} from '../lib/scaffold.js'
import type { InferredPackage, MoleculeSecret } from '../lib/schema.js'
import { ui } from '../lib/ui.js'

/**
 * Package families a `static` site never ships: nobody logs in (auth, OAuth,
 * the settings panel), and a static host serves plain files (no service
 * worker — version/update checks and web push both generate one). Matched by
 * registry category and by the `generates` flag, so a new bond in one of these
 * families is excluded without a code change.
 */
const STATIC_EXCLUDED_CATEGORIES = new Set([
  'auth',
  'auth-shell',
  'oauth-buttons',
  'oauth-logos',
  'settings-panel',
  'version',
])

/** Whether a package is excluded from a `static` site's package set. */
function isStaticExcluded(pkg: InferredPackage | undefined): boolean {
  if (!pkg?.molecule) return false
  if (STATIC_EXCLUDED_CATEGORIES.has(pkg.molecule.category)) return true
  return (pkg.molecule.generates ?? []).some((g) => g.startsWith('service-worker'))
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
    type: Flags.string({
      description: t('commands.create.flags.type'),
      options: ['api', 'app', 'full-stack', 'static', 'status-page', 'status-page-edge'],
    }),
    framework: Flags.string({
      description: t('commands.create.flags.framework'),
    }),
    packages: Flags.string({
      description: t('commands.create.flags.packages'),
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
        'Print a machine-readable JSON result instead of progress output (implies --no-interactive)',
      default: false,
    }),
    force: Flags.boolean({
      description: t('commands.create.flags.force'),
      default: false,
    }),
    template: Flags.string({
      description:
        'App template slug (e.g., blog, crm, online-store). Run `mlcl templates` to list all available templates.',
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Create)

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
    if (args.name !== undefined) {
      const segments = args.name.split(/[\\/]/).filter((seg) => seg.length > 0 && seg !== '.')
      const finalSegment = segments[segments.length - 1]
      if (segments.length === 0 || segments.includes('..') || !/^[a-z0-9-]+$/.test(finalSegment)) {
        this.error(t('commands.create.errors.nameInvalid', { name: args.name }))
      }
    }

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
      const templateInstanceDir = join(this.config.root, 'templates', 'apps', flags.template)
      const templateAppPkg = join(templateInstanceDir, 'app', 'package.json')
      const { existsSync } = await import('node:fs')
      if (existsSync(templateAppPkg)) {
        const {
          copyTemplateInstance,
          ensureAgentsMd,
          ensureReadmeMd,
          ensureRootNpmrc,
          stampMoleculeMetadata,
        } = await import('../lib/scaffold.js')
        await copyTemplateInstance(templateInstanceDir, projectPath, projectName)
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
            `The ${flags.template} template is built with ${templateFramework ?? 'its own framework'}; --framework ${requestedFramework} was not applied. For another framework, create a custom app: mlcl create <name> --type ${flags.type ?? 'full-stack'} --framework ${requestedFramework}.`,
          )
        }
        if (requestedPackages) {
          this.warn(
            `The template was copied as built; --packages ${requestedPackages} were not added. Add them now with: mlcl add <package> --inject`,
          )
        }
        say(
          `${ui.check('Scaffolded')} ${ui.id(flags.template)} ${ui.dim('→')} ${ui.id(projectPath)}`,
        )
        if (!flags['skip-install']) {
          const { execa } = await import('execa')
          try {
            await execa('npm', ['install'], { cwd: projectPath })
            say(ui.check('Installed dependencies.'))
          } catch (error) {
            this.warn(
              `npm install failed — run it manually. ${error instanceof Error ? error.message : String(error)}`,
            )
          }
        }
        say('')
        say(ui.heading(t('commands.create.messages.nextSteps')))
        say(`  ${ui.cmd(`cd ${projectName}`)}`)
        say(`  ${ui.dim('# edit api/.env and app/.env with your credentials')}`)
        say(`  ${ui.cmd('npm run dev')}`)
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
    const appMenu =
      appPackages.length > 0 ? buildFeatureMenu(appPackages) : { alwaysInclude: [], features: [] }

    // For app packages, filter providers by framework
    if (framework) {
      for (const feature of appMenu.features) {
        feature.providers = feature.providers.filter((prov) => {
          const provFramework = prov.molecule?.framework
          return !provFramework || provFramework === framework
        })
      }
    }

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
    const spinner = nonInteractive ? null : p.spinner()

    // Generate font HTML (local @font-face styles or CDN links) from package metadata
    const fontResult = framework
      ? generateFontHtml(selectedPackageNames, allPackages)
      : { html: '', fontFiles: [] }
    const fontLinks = fontResult.html

    // Derive named bond providers from selected packages using registry metadata
    // Groups by bondWiring.bondCategory (e.g. oauth → OAUTH_PROVIDERS, payments → PAYMENTS_PROVIDERS)
    const extraVars: Record<string, string> = {}
    for (const name of selectedPackageNames) {
      const pkg = allPackages.find((p) => p.name === name)
      const bondWiring = pkg?.molecule?.bondWiring as
        { type?: string; bondCategory?: string } | undefined
      if (bondWiring?.type !== 'named' || !bondWiring.bondCategory) continue
      const key = `${bondWiring.bondCategory.toUpperCase()}_PROVIDERS`
      const shortName = name.split('-').pop()!
      extraVars[key] = extraVars[key] ? `${extraVars[key]}, '${shortName}'` : `'${shortName}'`
    }

    // Step 7: Resolve full package list (template requirements + default providers)
    // Done before project creation so templates can adapt to selected providers.
    if (framework) {
      const fwConfig = loadAppFrameworks()[framework]
      const templateRequired = getTemplateRequiredPackages(framework, frameworkPkg, fwConfig)
      log(`Template-required packages: ${templateRequired.join(', ') || '(none)'}`)
      selectedPackageNames.push(...templateRequired)
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
    const transitivePeers = resolveTransitivePeers(selectedPackageNames, allPackages)
    log(`Transitive peer companions auto-resolved: ${transitivePeers.join(', ') || '(none)'}`)
    selectedPackageNames.push(...transitivePeers)
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
      )
    } else {
      await createApiProject(projectPath, projectName, 'express', npmOverrides)
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
      const { ensureAgentsMd, ensureRootNpmrc, ensureReadmeMd, stampMoleculeMetadata } =
        await import('../lib/scaffold.js')
      await ensureAgentsMd(projectPath)
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
    if (isFullStack || isStatic || projectType === 'app') {
      const { ensureE2EFiles } = await import('../lib/scaffold.js')
      await ensureE2EFiles(hasAppSubdir ? join(projectPath, 'app') : projectPath)
    }

    // Edge status page is a standalone Workers project — skip addPackages/inject/env steps
    if (isStatusPageEdge) {
      if (!flags['skip-install']) {
        spinner?.start(t('commands.create.spinners.installing'))
        log(t('commands.create.spinners.installing'))
        try {
          await execa('npm', ['install'], { cwd: projectPath })
          spinner?.stop(t('commands.create.spinners.installed'))
          log(t('commands.create.spinners.installed'))
        } catch (error) {
          spinner?.stop(chalk.yellow(t('commands.create.spinners.installFailed')))
          log(t('commands.create.spinners.installFailed'))
          this.warn(`npm install failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      say('')
      if (!nonInteractive) p.outro(chalk.green(t('commands.create.messages.success')))
      say('')
      say(
        nonInteractive
          ? t('commands.create.messages.nextSteps')
          : chalk.bold(t('commands.create.messages.nextSteps')),
      )
      say(`  cd ${projectName}`)
      say('  npx wrangler dev')
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
            },
            null,
            2,
          ),
        )
      }
      return
    }

    if (isFullStack) {
      const apiPkgs = uniquePackages.filter((name) => getPackageStack(name) === 'api')
      const appPkgs = uniquePackages.filter((name) => getPackageStack(name) === 'app')
      const apiPath = join(projectPath, 'api')
      const appPath = join(projectPath, 'app')
      log(`API packages (${apiPkgs.length}): ${apiPkgs.join(', ')}`)
      log(`App packages (${appPkgs.length}): ${appPkgs.join(', ')}`)

      spinner?.start(t('commands.create.spinners.addingPackages'))
      if (apiPkgs.length > 0) await addPackages(apiPath, apiPkgs)
      if (appPkgs.length > 0) await addPackages(appPath, appPkgs)
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
      await addPackages(hasAppSubdir ? join(projectPath, 'app') : projectPath, uniquePackages)
      spinner?.stop(t('commands.create.spinners.addedPackages', { count: uniquePackages.length }))
      log(t('commands.create.spinners.addedPackages', { count: uniquePackages.length }))
    }

    // Step 9: Install dependencies
    if (!flags['skip-install']) {
      spinner?.start(t('commands.create.spinners.installing'))
      log(t('commands.create.spinners.installing'))
      try {
        await execa('npm', ['install'], { cwd: projectPath })
        spinner?.stop(t('commands.create.spinners.installed'))
        log(t('commands.create.spinners.installed'))
      } catch (error) {
        spinner?.stop(chalk.yellow(t('commands.create.spinners.installFailed')))
        log(t('commands.create.spinners.installFailed'))
        this.warn(`npm install failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Step 10: Run injection (generates integration code)
    // When --skip-install is set (e.g. sandbox scaffolding), run inject in fast
    // mode: skip install (create handles it), skip tests, skip Prettier formatting.
    const fastInject = flags['skip-install']
    if (isFullStack) {
      // Inject both workspaces
      for (const workspace of ['api', 'app']) {
        const wsPath = join(projectPath, workspace)
        spinner?.start(t('commands.create.spinners.injecting', { workspace }))
        log(t('commands.create.spinners.injecting', { workspace }))
        try {
          await this.runInject(wsPath, fastInject)
          spinner?.stop(t('commands.create.spinners.injected', { workspace }))
          log(t('commands.create.spinners.injected', { workspace }))
        } catch (e) {
          spinner?.stop(chalk.yellow(t('commands.create.spinners.injectSkipped', { workspace })))
          log(t('commands.create.spinners.injectSkipped', { workspace }))
          log(`  Inject error: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    } else {
      spinner?.start(t('commands.create.spinners.injectingSingle'))
      log(t('commands.create.spinners.injectingSingle'))
      try {
        await this.runInject(hasAppSubdir ? join(projectPath, 'app') : projectPath, fastInject)
        spinner?.stop(t('commands.create.spinners.injectedSingle'))
        log(t('commands.create.spinners.injectedSingle'))
      } catch (e) {
        spinner?.stop(chalk.yellow(t('commands.create.spinners.injectSkippedSingle')))
        log(t('commands.create.spinners.injectSkippedSingle'))
        log(`  Inject error: ${e instanceof Error ? e.message : String(e)}`)
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

    // Wire the IDE8 activity-capture PRODUCER into the just-generated API boot
    // (custom builds + the package-driven flagship fallback). The baked flagship
    // fast path wires it in copyTemplateInstance and returns before here, so this
    // covers every OTHER path from one place. No-op outside the molecule.dev IDE
    // (guarded on MOLECULE_ACTIVITY_URL); idempotent. App-only builds have no API.
    {
      const activityApiPath = isFullStack
        ? join(projectPath, 'api')
        : projectType === 'api'
          ? projectPath
          : null
      if (activityApiPath) {
        const { injectActivityCaptureBoot } = await import('../lib/scaffold.js')
        await injectActivityCaptureBoot(activityApiPath)
      }
    }

    // Generate .env template (from package metadata secrets)
    if (isFullStack) {
      const apiSecrets = allSelectedSecrets.filter((s) => !s.name.startsWith('VITE_'))
      const appSecrets = allSelectedSecrets.filter((s) => s.name.startsWith('VITE_'))
      await generateEnvFile(join(projectPath, 'api'), apiSecrets, 'api')
      await generateEnvFile(join(projectPath, 'app'), appSecrets, 'app')
      log(t('commands.create.messages.envGenFullStack'))
    } else if (isStatic) {
      // App-only site under app/: only the VITE_ secrets apply, no API env.
      await generateEnvFile(
        join(projectPath, 'app'),
        allSelectedSecrets.filter((s) => s.name.startsWith('VITE_')),
        'app',
      )
      log(t('commands.create.messages.envGenSingle'))
    } else {
      const envType = projectType === 'app' ? 'app' : 'api'
      await generateEnvFile(projectPath, allSelectedSecrets, envType)
      log(t('commands.create.messages.envGenSingle'))
    }

    // Step 11: Copy SQL setup scripts (API and full-stack)
    if (isFullStack) {
      const apiPath = join(projectPath, 'api')
      await copySqlSetupScripts(apiPath, uniquePackages, allPackages)
      log(t('commands.create.messages.sqlCopied'))
    } else if (projectType === 'api') {
      await copySqlSetupScripts(projectPath, uniquePackages, allPackages)
      log(t('commands.create.messages.sqlCopied'))
    }

    // Step 11.5: Copy local font files to static assets fonts/
    if (fontResult.fontFiles.length > 0) {
      const fwPublicDir = framework
        ? (loadAppFrameworks()[framework]?.publicDir ?? 'public')
        : 'public'
      if (hasAppSubdir) {
        await copyFontFiles(join(projectPath, 'app'), fontResult.fontFiles, fwPublicDir)
      } else if (projectType === 'app') {
        await copyFontFiles(projectPath, fontResult.fontFiles, fwPublicDir)
      }
      log(t('commands.create.messages.fontsCopied'))
    }

    // Format generated code (skip when --skip-install: no node_modules for Prettier)
    if (!flags['skip-install']) {
      spinner?.start(t('commands.create.spinners.formatting'))
      try {
        if (isFullStack) {
          await formatGeneratedFiles(join(projectPath, 'api'))
          await formatGeneratedFiles(join(projectPath, 'app'))
        } else if (isStatic) {
          await formatGeneratedFiles(join(projectPath, 'app'))
        } else {
          await formatGeneratedFiles(projectPath)
        }
        spinner?.stop(t('commands.create.spinners.formatted'))
        log(t('commands.create.spinners.formatted'))
      } catch (error) {
        spinner?.stop(chalk.yellow(t('commands.create.spinners.formattingSkipped')))
        this.warn(
          `Prettier formatting failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    // Run smoke tests (skip when --skip-install: no deps to test against)
    if (!flags['skip-install']) {
      spinner?.start(t('commands.create.spinners.testing'))
      try {
        const testCwd = isFullStack
          ? join(projectPath, 'api')
          : hasAppSubdir
            ? join(projectPath, 'app')
            : projectPath
        const testResult = await execa('npx', ['vitest', 'run', '--reporter=verbose'], {
          cwd: testCwd,
          stdio: 'pipe',
          timeout: 60_000,
        })
        const summaryMatch = testResult.stdout.match(/Tests\s+(\d+\s+passed[^)]*\))/)
        spinner?.stop(
          chalk.green(
            t('commands.create.spinners.testsPassed', {
              summary: summaryMatch ? ` (${summaryMatch[0]})` : '',
            }),
          ),
        )
        log(
          t('commands.create.spinners.testsPassed', {
            summary: summaryMatch ? ` (${summaryMatch[0]})` : '',
          }),
        )
      } catch (error) {
        spinner?.stop(chalk.yellow(t('commands.create.spinners.testsFailed')))
        log(t('commands.create.spinners.testsFailed'))
        this.warn(`Smoke tests failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Done
    say('')
    if (!nonInteractive) p.outro(chalk.green(t('commands.create.messages.success')))

    const uniqueSecretNames = [...new Set(allSelectedSecrets.map((s) => s.name))]
    if (uniqueSecretNames.length > 0) {
      say('')
      say(
        nonInteractive
          ? t('commands.create.messages.envVars')
          : chalk.bold(t('commands.create.messages.envVars')),
      )
      for (const name of uniqueSecretNames) {
        say(`  ${name}`)
      }
    }

    say('')
    say(
      nonInteractive
        ? t('commands.create.messages.nextSteps')
        : chalk.bold(t('commands.create.messages.nextSteps')),
    )
    say(`  cd ${projectName}`)
    if (uniqueSecretNames.length > 0) {
      if (isFullStack) {
        say(`  ${t('commands.create.messages.editEnvFullStack')}`)
      } else {
        say(`  ${t('commands.create.messages.editEnv')}`)
      }
    }
    if (
      uniquePackages.some((name) => {
        const pkg = allPackages.find((p) => p.name === name)
        return pkg?.molecule?.cliHint === 'generate-jwt-keys'
      })
    ) {
      say(`  ${t('commands.create.messages.generateJwt')}`)
    }
    say(`  npm run dev`)

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
            secrets: uniqueSecretNames,
            installSkipped: flags['skip-install'] === true,
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

  private async runInject(projectPath: string, fast = false): Promise<void> {
    const { dirname } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const mlclPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'bin', 'run.js')
    const args = [mlclPath, 'inject', '--force', '--no-install', '-p', projectPath]
    if (fast) {
      args.push('--no-test', '--no-format', '--no-ai')
    }
    await execa('node', args, {
      stdio: 'pipe',
    })
  }
}
