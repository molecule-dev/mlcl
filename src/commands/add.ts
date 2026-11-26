import { existsSync, readFileSync } from 'node:fs'
import { access, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'

import * as p from '@clack/prompts'
import { Args, Command, Errors, Flags } from '@oclif/core'
import { CLI_COMMAND } from '#cli-command'
import chalk from 'chalk'
import { execa } from 'execa'

import {
  addedDeclarations,
  afterAddGuidance,
  declaredNames,
  installedPackageDir,
} from '../lib/add-guidance.js'
import { AUTH_PRECONFIGURATION_GUIDANCE } from '../lib/auth-contract.js'
import { manifestStack, resolveCapability } from '../lib/capability-add.js'
import { refreshAgentsCapabilityMap } from '../lib/capability-map.js'
import { assertDdlCompatibility } from '../lib/database-compatibility.js'
import { providerTemplateVars, writeAddedFeatureFiles } from '../lib/feature-files.js'
import { t } from '../lib/i18n.js'
import { declareInjectedThirdParty } from '../lib/injected-third-party.js'
import { type AddVersionSource, parseAddArgument, resolveAddVersion } from '../lib/integrate.js'
import { databasePackageOf } from '../lib/migration-dialect.js'
import { npmInstall } from '../lib/npm-install.js'
import { npmInstallRoot } from '../lib/npm-install-root.js'
import { deriveOptionalFeatures, featureTemplatePackages } from '../lib/optional-features.js'
import { installCommand } from '../lib/package-search.js'
import {
  missingMoleculePeers,
  moleculesToInject,
  serviceWorkerPackageFor,
} from '../lib/peer-closure.js'
import { withProjectLocks } from '../lib/project-lock.js'
import {
  getMoleculeVersion,
  getPackageStack,
  getRawRegistry,
  loadAppFrameworks,
  loadRegistry,
} from '../lib/registry.js'
import { getTemplatesDir } from '../lib/scaffold.js'
import { scaffoldOnlyNames } from '../lib/scaffold-only.js'
import { createSpinner } from '../lib/spinner.js'
import { setTelemetryContext } from '../lib/telemetry.js'
import { describeWebOnlyChains, rendersOnReactNative, webOnlyChains } from '../lib/web-only.js'
import { projectFramework, toSearchEntry } from './search.js'

/** One package named on the command line, after a rename is followed. */
interface AddRequest {
  name: string
  requestedVersion?: string
  stack: ReturnType<typeof getPackageStack>
}

/** An app written from the starter templates, which records the features its files have. */
interface StarterApp {
  appDir: string
  /** The project's other half, in a full-stack project. */
  apiDir?: string
  framework: string
  projectName: string
  features: Set<string>
  /** The packages the project declared before the add. */
  declared: string[]
}

/** The package names a workspace's manifest declares, or none without one. */
function manifestNames(dir: string | undefined): string[] {
  if (!dir || !existsSync(join(dir, 'package.json'))) return []
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  return [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]
}

/** The workspaces a project root declares (`['api', 'app']` for a full-stack one), or none. */
function rootWorkspaces(dir: string): string[] {
  if (!existsSync(join(dir, 'package.json'))) return []
  const { workspaces } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
    workspaces?: unknown
  }
  return Array.isArray(workspaces) ? workspaces.filter((w) => typeof w === 'string') : []
}

/**
 * The starter app of the project an add runs in: the app itself, or the app of the project root
 * the add runs in or in one of whose workspaces it runs. A flagship template or an app made
 * before the record (`molecule.templateFeatures`) has none.
 */
function starterAppOf(cwd: string): StarterApp | undefined {
  const parent = dirname(cwd)
  const root = rootWorkspaces(cwd).includes('app')
    ? cwd
    : ['app', 'api'].includes(basename(cwd)) && rootWorkspaces(parent).includes(basename(cwd))
      ? parent
      : undefined
  const appDir = root ? join(root, 'app') : cwd
  const apiDir = root && rootWorkspaces(root).includes('api') ? join(root, 'api') : undefined
  const file = join(appDir, 'package.json')
  if (!existsSync(file)) return undefined
  const pkg = JSON.parse(readFileSync(file, 'utf8')) as {
    name?: string
    molecule?: { framework?: string; templateFeatures?: unknown }
  }
  const recorded = pkg.molecule?.templateFeatures
  if (!Array.isArray(recorded) || !pkg.molecule?.framework) return undefined
  return {
    appDir,
    apiDir,
    framework: pkg.molecule.framework,
    projectName: pkg.name ?? 'app',
    features: new Set(recorded.filter((name): name is string => typeof name === 'string')),
    declared: [...manifestNames(appDir), ...manifestNames(apiDir)],
  }
}

type AddFlags = { 'no-install': boolean; dev: boolean; inject: boolean; capability?: string }

export default class Add extends Command {
  static override description = t('commands.add.description')

  static override examples = [
    '<%= config.bin %> <%= command.id %> @molecule/api-resource-user',
    '<%= config.bin %> <%= command.id %> @molecule/api-oauth-github --no-install',
    '<%= config.bin %> <%= command.id %> @molecule/api-emails-mailgun --inject',
    '<%= config.bin %> <%= command.id %> @molecule/api-uploads-filesystem @molecule/api-emails-resend --inject',
    '<%= config.bin %> <%= command.id %> --capability "file uploads" --inject',
  ]

  static override flags = {
    'no-install': Flags.boolean({
      description: t('commands.add.flags.noInstall'),
      default: false,
    }),
    dev: Flags.boolean({
      char: 'D',
      description: t('commands.add.flags.dev'),
      default: false,
    }),
    inject: Flags.boolean({
      description: t('commands.add.flags.inject'),
      default: false,
    }),
    capability: Flags.string({
      description: t('commands.add.flags.capability'),
    }),
  }

  // More names may follow the first, as with `npm install a b`: agents write
  // `mlcl add a b --inject` and it used to exit 2 on the second name (harness eval `add`).
  static override strict = false

  static override args = {
    // Not required: `--capability` names the package instead.
    molecule: Args.string({
      description: t('commands.add.args.molecule'),
    }),
  }

  public async run(): Promise<void> {
    const { argv, flags } = await this.parse(Add)
    const named = (argv as string[]).filter((argument) => argument.length > 0)
    if (named.length === 0 && !flags.capability) this.error(t('commands.add.errors.missingName'))

    p.intro(chalk.bgCyan(` ${t('commands.add.labels.intro')} `))
    if (flags.capability) named.unshift(this.capabilityPackage(flags.capability))
    // A bundle only the scaffolds choose installs every provider it wires: refuse it before
    // anything is written. Only the names given here; a feature's own packages are added below.
    const resolved = named.map((argument) => {
      const { name } = parseAddArgument(argument)
      return getRawRegistry().packages[name]?.replacedBy ?? name
    })
    const scaffoldOnly = scaffoldOnlyNames(resolved)
    if (scaffoldOnly.length > 0) {
      const rest = named.filter((_, index) => !scaffoldOnly.includes(resolved[index]))
      p.cancel(
        t('commands.add.errors.scaffoldOnly', {
          names: scaffoldOnly.join(', '),
          retry:
            rest.length > 0
              ? `Run \`${CLI_COMMAND} add ${rest.join(' ')}\` for the others.`
              : `Add the capability you need instead (\`${CLI_COMMAND} search <words>\` finds it).`,
        }),
      )
      return this.exit(1)
    }
    setTelemetryContext({ packages: named.join(',') })
    // Names that land in one workspace share one install and one inject.
    const groups = new Map<string, AddRequest[]>()
    for (const argument of named) {
      const request = this.request(argument)
      const workDir = this.workspaceOf(request)
      if (groups.get(workDir)?.some((other) => other.name === request.name)) continue
      groups.set(workDir, [...(groups.get(workDir) ?? []), request])
    }
    // Lock each directory npm installs into (the inject handed off with a workspace locks the same).
    const installRoots = [...groups.keys()].map((workDir) => npmInstallRoot(workDir))
    await withProjectLocks(installRoots, () => this.addAll(groups, flags), {
      onWait: (pid) => this.log(t('commands.add.messages.waitingForLock', { pid })),
    })
  }

  /**
   * Add the packages, each group into its workspace, under the project locks.
   *
   * @param groups - The requests by workspace.
   * @param flags - The command flags.
   */
  private async addAll(groups: Map<string, AddRequest[]>, flags: AddFlags): Promise<void> {
    // A package that brings an optional feature to an app made from the starter templates brings
    // the feature's pages too, and its parts of the app's files (`feature-files.ts`).
    const starter = flags.inject ? starterAppOf(process.cwd()) : undefined
    for (const [workDir, requests] of groups) await this.addTo(workDir, requests, flags)
    if (starter) {
      const requested = [...groups.values()].flat().map((request) => request.name)
      await this.addFeatureFiles(starter, requested, flags)
    }
  }

  /**
   * Write the app files of the features the added packages bring: the packages named and the ones
   * the add declared (a package declared earlier without `--inject` brings its feature when it is
   * named).
   */
  private async addFeatureFiles(
    app: StarterApp,
    requested: string[],
    flags: AddFlags,
  ): Promise<void> {
    const registry = loadRegistry()
    const names = [...manifestNames(app.appDir), ...manifestNames(app.apiDir)]
    const before = new Set(app.declared)
    const brought = deriveOptionalFeatures(
      [...requested, ...names.filter((name) => !before.has(name))],
      registry,
    )
    if (brought.size === 0) return
    const after = new Set([...app.features, ...brought])
    const added = [...after].filter((feature) => !app.features.has(feature))
    const vars = {
      before: providerTemplateVars(app.declared, registry),
      after: providerTemplateVars(names, registry),
    }
    if (added.length === 0 && JSON.stringify(vars.before) === JSON.stringify(vars.after)) return
    // The packages only the features' files import (the settings panel brought by billing).
    const declared = new Set(manifestNames(app.appDir))
    const missing = featureTemplatePackages(
      join(getTemplatesDir(), 'app'),
      app.framework,
      new Set(added),
    ).filter((name) => !declared.has(name) && getRawRegistry().packages[name])
    if (missing.length > 0)
      await this.addTo(
        app.appDir,
        missing.map((name) => this.request(name)),
        flags,
      )
    const changes = await writeAddedFeatureFiles({
      appDir: app.appDir,
      framework: app.framework,
      projectName: app.projectName,
      before: app.features,
      after,
      varsBefore: vars.before,
      varsAfter: vars.after,
    })
    const manifestPath = join(app.appDir, 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'))
    manifest.molecule = { ...manifest.molecule, templateFeatures: [...after].sort() }
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    const shown = (path: string): string => relative(process.cwd(), join(app.appDir, path))
    if (changes.created.length + changes.merged.length + changes.conflicted.length === 0) return
    this.log(t('commands.add.messages.featureFiles', { features: [...brought].sort().join(', ') }))
    for (const path of changes.created) this.log(`  + ${shown(path)}`)
    for (const path of changes.merged) this.log(`  ~ ${shown(path)}`)
    for (const { path, diff } of changes.conflicted) {
      this.log(`  ! ${t('commands.add.messages.featureFileConflict', { path: shown(path) })}`)
      this.log(diff)
    }
  }

  /**
   * The package `--capability` adds (`lib/capability-add.ts` has the rule), on the project's stack
   * and framework. When the words do not decide, it lists the candidates and exits 1, having
   * written nothing.
   */
  private capabilityPackage(query: string): string {
    const root = process.cwd()
    const fullStack =
      existsSync(join(root, 'api', 'package.json')) && existsSync(join(root, 'app', 'package.json'))
    const manifest = existsSync(join(root, 'package.json'))
      ? JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
      : {}
    const resolved = resolveCapability(loadRegistry().map(toSearchEntry), query, {
      stack: fullStack ? undefined : manifestStack(manifest),
      framework: projectFramework(root),
      appFrameworks: loadAppFrameworks(),
      declared: [
        ...manifestNames(root),
        ...(fullStack
          ? [...manifestNames(join(root, 'api')), ...manifestNames(join(root, 'app'))]
          : []),
      ],
    })
    if ('name' in resolved) {
      p.log.info(
        t('commands.add.messages.capabilityResolved', {
          query,
          name: resolved.name,
          because: resolved.because,
        }),
      )
      return resolved.name
    }
    const lines = resolved.choices.map(
      (hit) => `  ${hit.name}  ${hit.label}\n      ${installCommand(hit.name)}`,
    )
    p.cancel(
      [t('commands.add.errors.capabilityUndecided', { because: resolved.because }), ...lines].join(
        '\n',
      ),
    )
    return this.exit(1)
  }

  /** The package a command-line argument names, following a registry rename. */
  private request(argument: string): AddRequest {
    // `pkg@1.2.3` names one exact version; a bare name uses the registry pin for
    // a registered `@molecule/*` package (see `resolveAddVersion`).
    const parsed = parseAddArgument(argument)
    const { requestedVersion } = parsed
    let name = parsed.name

    // A renamed package: add the package that replaced it. An exact version asked for
    // (`pkg@1.2.3`) is a version of the old name, so it is installed as asked.
    const replacement = getRawRegistry().packages[name]?.replacedBy
    if (replacement && !requestedVersion) {
      p.log.warn(t('commands.add.warnings.replaced', { name, replacement }))
      name = replacement
    }

    if (!name.startsWith('@molecule/')) {
      this.warn(t('commands.add.warnings.namingConvention', { name }))
    }
    return { name, requestedVersion, stack: getPackageStack(name) }
  }

  /**
   * The workspace a package belongs in. A full-stack project keeps its dependencies in `api/` and
   * `app/`, not at the root. Run from the root, the package used to land in the root package.json
   * and `--inject` scaffolded a phantom second project there, leaving the real one unwired, with a
   * success exit. Pick the workspace from the package's own stack, the way `swap` does.
   */
  private workspaceOf({ name, stack }: AddRequest): string {
    const root = process.cwd()
    const isFullStackRoot =
      existsSync(join(root, 'api', 'package.json')) && existsSync(join(root, 'app', 'package.json'))
    if (!isFullStackRoot) return root
    if (stack === 'tooling') {
      p.cancel(t('commands.add.errors.toolingAtRoot', { name }))
      this.exit(1)
    }
    if (stack !== 'api' && stack !== 'app') {
      p.cancel(t('commands.add.errors.workspaceUnknown', { name }))
      this.exit(1)
    }
    return join(root, stack)
  }

  /** Pin, install and (with `--inject`) wire the packages that belong in one workspace. */
  private async addTo(workDir: string, requests: AddRequest[], flags: AddFlags): Promise<void> {
    const names = requests.map((request) => request.name)
    const label = names.join(', ')

    // Pre-flight: must be run from a directory that has a package.json.
    const packageJsonPath = join(workDir, 'package.json')
    try {
      await access(packageJsonPath)
    } catch (_error) {
      // No package.json in cwd — give an actionable error instead of a raw
      // ENOENT later. This is the most common external-app misstep.
      p.cancel(t('commands.add.errors.noPackageJson', { dir: workDir }))
      this.exit(1)
    }

    // A package that renders only in a browser, or one that requires it as a peer, cannot render in a
    // React Native project: refuse it before anything is written, naming the chain.
    if (rendersOnReactNative(JSON.parse(readFileSync(packageJsonPath, 'utf-8')))) {
      const refused = webOnlyChains(names, new Map(loadRegistry().map((pkg) => [pkg.name, pkg])))
      if (refused.length > 0) {
        p.cancel(t('commands.add.errors.webOnly', { list: describeWebOnlyChains(refused) }))
        this.exit(1)
      }
    }

    const spinner = createSpinner()
    spinner.start(t('commands.add.spinners.adding', { name: label }))

    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
      const manifestBefore = JSON.stringify(packageJson)

      // Resolve the exact version to pin. A registered `@molecule/*` package
      // uses the registry's own lockstep pin (what `create` writes and what the
      // registry's `setupSql`/`setupSqlVersion` describe), so the preflight below
      // judges the bytes of the version this command writes. An explicit
      // `pkg@version` must name exactly one version; a third-party package still
      // resolves from npm, and nothing here ever throws an opaque npm error.
      const versions: Record<string, string> = {}
      for (const { name, requestedVersion } of requests) {
        let source: AddVersionSource
        try {
          ;({ version: versions[name], source } = await resolveAddVersion(
            name,
            async (npmName) => {
              // Array form — the package name is never shell-interpolated (same
              // shape as check-package-upgrades.ts's npmViewFetcher).
              const { stdout } = await execa('npm', ['view', npmName, 'version'], {
                timeout: 20_000,
                reject: true,
              })
              return stdout
            },
            { requestedVersion },
          ))
        } catch (error) {
          spinner.stop(t('commands.add.spinners.addFailed', { name: label }))
          p.cancel(error instanceof Error ? error.message : String(error))
          this.exit(1)
        }
        if (source === 'fallback') {
          // Neither npm nor the registry knows the name: writing `latest` would break the
          // exact-pin rule and the next `npm install` would 404.
          spinner.stop(t('commands.add.spinners.addFailed', { name: label }))
          this.error(t('commands.add.errors.notFound', { name }), { exit: 1 })
        }
      }

      // --inject hands off to `mlcl inject`, which refuses a database that
      // cannot replay this project's SQL. That refusal used to arrive AFTER the
      // pin was written (and installed), so the app was left with a dependency
      // that broke every later inject and looked like the user's change. Judge
      // it HERE, before the manifest is touched: the pin and the install are
      // the only writes `add` performs, so this is the last safe moment.
      //
      // The SQL set is the one the runner replays (`__setup__/` + `migrations/`)
      // plus the packages being added. Its bytes come from the shared resolver
      // (`resolveSetupSqlSources`): an installed copy, the molecule source tree,
      // or the exact SQL bundled in `registry.json` — so a standalone CLI that
      // has not installed the package YET can still judge it. "Not installed" is
      // not an input to defer: the vendor package publishes its setup SQL, and
      // the registry carries those bytes.
      if (flags.inject) {
        const projectDeps = { ...packageJson.dependencies, ...packageJson.devDependencies }
        try {
          await assertDdlCompatibility({
            projectPath: workDir,
            packageNames: names,
            // The versions this command is about to write. A registered package
            // resolves to the registry pin (the version whose capability/setup
            // metadata ships here); an explicit `pkg@x.y.z` binds to that exact
            // version and refuses when no copy/bundle of it exists.
            versions,
            sqlDirs: [join(workDir, '__setup__'), join(workDir, 'migrations')],
            database: databasePackageOf([...Object.keys(projectDeps), ...names]) ?? undefined,
          })
        } catch (error) {
          spinner.stop()
          p.cancel(error instanceof Error ? error.message : String(error))
          this.exit(1)
        }
      }

      // Dev tooling (stack `tooling`) is a devDependency without `--dev`.
      const depKeyOf = (stack: AddRequest['stack']): string =>
        flags.dev || stack === 'tooling' ? 'devDependencies' : 'dependencies'
      const added = new Map<string, string[]>()
      for (const { name, stack } of requests) {
        const depKey = depKeyOf(stack)
        packageJson[depKey] = packageJson[depKey] ?? {}
        packageJson[depKey][name] = versions[name]
        added.set(depKey, [...(added.get(depKey) ?? []), name])
      }
      // Peers go beside the packages that need them: dependencies, unless every one is dev tooling.
      const peerKey = requests.every(({ stack }) => depKeyOf(stack) === 'devDependencies')
        ? 'devDependencies'
        : 'dependencies'
      packageJson[peerKey] = packageJson[peerKey] ?? {}

      // Web push needs the service worker the PWA package registers, an optional peer of the
      // push package that the peer closure below leaves out (`serviceWorkerPackageFor`).
      const worker = serviceWorkerPackageFor(names)
      const workerAdded =
        worker !== undefined &&
        !(worker in (packageJson.dependencies ?? {})) &&
        !(worker in (packageJson.devDependencies ?? {}))
      if (workerAdded) packageJson[peerKey][worker] = getMoleculeVersion(worker)

      // Declare the required `@molecule/*` peers with them, at their registry pins. A
      // scaffold installs with `--legacy-peer-deps` (its `.npmrc`), which installs no
      // peers, so a provider added alone left its core out of `node_modules` and the
      // first import of it failed. Closed over BOTH dependency maps so a peer that is
      // already declared anywhere is never declared twice.
      const peers = missingMoleculePeers([
        ...Object.keys(packageJson.dependencies ?? {}),
        ...Object.keys(packageJson.devDependencies ?? {}),
      ])
      for (const peer of peers) packageJson[peerKey][peer] = getMoleculeVersion(peer)
      if (worker && workerAdded) peers.unshift(worker)

      // The packages --inject wires: the providers and locale bonds declared with them too, or
      // they sit unbonded. inject declares their own third-party dependencies (`busboy` for the
      // Express body parser); declared here, before the one install, inject has nothing left to
      // declare and installs nothing.
      const toInject = [...new Set(names.flatMap((name) => moleculesToInject(name, peers)))]
      if (flags.inject) declareInjectedThirdParty(packageJson, toInject)

      // A package an earlier add already declared and installed (a provider the add of its
      // interface brought) changes nothing: no write and no second install. Claude added an
      // interface and its provider in two calls, and the second reinstalled the project (harness
      // eval `add`, 2026-11-25).
      const unchanged =
        JSON.stringify(packageJson) === manifestBefore &&
        names.every((name) => installedVersion(name, workDir) === versions[name])
      if (unchanged) spinner.stop(t('commands.add.spinners.alreadyAdded', { name: label }))
      else {
        await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
        const [first, ...rest] = [...added].map(([depKey, list]) =>
          t('commands.add.spinners.addedTo', { name: list.join(', '), depKey }),
        )
        spinner.stop(first)
        for (const line of rest) this.log(line)
      }
      if (peers.length > 0) {
        this.log(
          t('commands.add.messages.peersAdded', { names: peers.join(', '), depKey: peerKey }),
        )
      }

      // A registered package is pinned at the registry version on purpose (resolveAddVersion), so
      // that pin needs no word. It used to be announced as "Could not resolve … from npm", a lookup
      // that never ran, on every add of a @molecule package.

      // Install BEFORE the --inject handoff: inject's plan validation resolves
      // the package through node_modules (it warns "Run 'npm install' first"
      // otherwise), and an unattended `add --inject` (agents, the molecule MCP
      // server) must end with the dependency actually on disk.
      if (!flags['no-install'] && !unchanged) {
        spinner.start(t('commands.add.spinners.installing'))

        try {
          await npmInstall(npmInstallRoot(workDir))
          spinner.stop(t('commands.add.spinners.installed'))
        } catch (error) {
          this.warn(`npm install failed: ${error}`)
          spinner.stop(t('commands.add.spinners.installFailed'))
          this.log('')
          this.log(chalk.yellow(t('commands.add.messages.installNote')))
          this.error(t('commands.add.errors.installFailed'), { exit: 1 })
        }
      }

      if (names.includes('@molecule/app-auth') || names.includes('@molecule/api-resource-user')) {
        this.log(AUTH_PRECONFIGURATION_GUIDANCE)
      }

      // --inject: hand off to `mlcl inject`, which wires the packages into the
      // project's bonds. inject prints its own summary, how to call the added packages (`--guide`),
      // and the next steps last. Its own
      // `install` flag defaults to true, so `--no-install` must be FORWARDED —
      // otherwise a command that promised not to install started an `npm install`
      // (r6 acceptance review, F11).
      if (flags.inject) {
        p.outro(chalk.green(`✓ ${t('commands.add.messages.success', { name: label })}`))
        await this.config.runCommand('inject', [
          ...toInject.flatMap((name) => ['--molecule', name]),
          '-p',
          workDir,
          ...(flags['no-install'] ? ['--no-install'] : []),
          ...names.flatMap((name) => ['--guide', name]),
        ])
        return
      }

      // The AGENTS.md capability map lists the project's packages: keep it current.
      try {
        // From a full-stack root, `add` moved into the package's workspace: the root is where it ran.
        await refreshAgentsCapabilityMap(
          workDir === process.cwd() ? npmInstallRoot(workDir) : process.cwd(),
        )
      } catch (error) {
        this.warn(`Could not update the capability map in AGENTS.md: ${error}`)
      }
      p.outro(chalk.green(`✓ ${t('commands.add.messages.success', { name: label })}`))

      this.log('')
      this.log(t('commands.add.messages.nextSteps'))
      if (flags['no-install']) {
        this.log(
          `  ${t('commands.add.messages.stepInstall', { command: chalk.cyan('npm install') })}`,
        )
        this.log(
          `  ${t('commands.add.messages.stepInject', { num: 2, command: chalk.cyan(`${CLI_COMMAND} inject`) })}`,
        )
      } else {
        this.log(
          `  ${t('commands.add.messages.stepInject', { num: 1, command: chalk.cyan(`${CLI_COMMAND} inject`) })}`,
        )
      }
      for (const name of names)
        for (const line of afterAddGuidance(
          name,
          declaredNames(packageJson),
          undefined,
          flags['no-install'] ? [] : addedDeclarations(name, workDir),
        ))
          this.log(line)
    } catch (error) {
      // A refusal above already stopped the spinner and said why (`this.exit` and `this.error`
      // throw oclif's CLIError), as does a refusal inside the inject handoff: a line here would
      // repeat it. Anything else failed unreported.
      if (!(error instanceof Errors.CLIError))
        spinner.stop(t('commands.add.spinners.addFailed', { name: label }))
      throw error
    }
  }
}

/**
 * The version of a package installed where a workspace resolves it.
 *
 * @param name - The package.
 * @param workDir - The workspace.
 * @returns Its installed version, or undefined when it is not installed.
 */
function installedVersion(name: string, workDir: string): string | undefined {
  const dir = installedPackageDir(name, workDir)
  if (!dir) return undefined
  try {
    return (JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { version?: string })
      .version
  } catch (_error) {
    // An unreadable manifest is not an installed package.
    return undefined
  }
}
