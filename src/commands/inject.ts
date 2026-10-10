import { existsSync } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as p from '@clack/prompts'
import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import { execa } from 'execa'

import { appendSecretsToEnvFile, type EnvAppendResult } from '../lib/env-file.js'
import { collectSecrets, resolveLocalePackages } from '../lib/features.js'
import { formatGeneratedFiles } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import {
  executeInjection,
  filterExcludedPeerDependencies,
  type InjectionPlan,
  planInjection,
  resolveDefaultProvidersFromPlans,
  synthesizeAppProjectFiles,
  synthesizeProjectFiles,
  writeSynthesizedFiles,
} from '../lib/injector.js'
import { ensureMigrateRunnerImports } from '../lib/migrate-runner.js'
import {
  detectAppFramework,
  getAppFrameworkDeps,
  getPackageStack,
  getSharedCodeDir,
  loadAppFrameworks,
  loadRegistry,
} from '../lib/registry.js'
import { syncProjectAssets } from '../lib/scaffold.js'
import { validateInjectionOutput } from '../lib/validator.js'

export default class Inject extends Command {
  static override description = t('commands.inject.description')

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --dry-run',
    '<%= config.bin %> <%= command.id %> -m @molecule/api-resource-user',
    '<%= config.bin %> <%= command.id %> --no-install',
  ]

  static override flags = {
    'dry-run': Flags.boolean({
      description: t('commands.inject.flags.dryRun'),
      default: false,
    }),
    force: Flags.boolean({
      char: 'f',
      description: t('commands.inject.flags.force'),
      default: false,
    }),
    molecule: Flags.string({
      char: 'm',
      description: t('commands.inject.flags.molecule'),
    }),
    path: Flags.string({
      char: 'p',
      description: t('commands.inject.flags.path'),
      default: '.',
    }),
    install: Flags.boolean({
      description: t('commands.inject.flags.install'),
      default: true,
      allowNo: true,
    }),
    test: Flags.boolean({
      description: t('commands.inject.flags.test'),
      default: true,
      allowNo: true,
    }),
    format: Flags.boolean({
      description: 'Format generated code with Prettier',
      default: true,
      allowNo: true,
    }),
    ai: Flags.boolean({
      description: 'Use AI for code generation (falls back to heuristics when disabled)',
      default: true,
      allowNo: true,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Inject)

    // Disable AI code generation when --no-ai is passed (fast heuristic fallback)
    if (!flags.ai) {
      const { disableAI } = await import('../lib/ai.js')
      disableAI()
    }

    p.intro(chalk.bgCyan(` ${t('commands.inject.labels.intro')} `))

    const spinner = p.spinner()

    const projectPath = flags.path === '.' ? process.cwd() : flags.path

    // Step 1: Find molecules to inject
    spinner.start(t('commands.inject.spinners.finding'))

    const molecules = flags.molecule
      ? [flags.molecule]
      : await this.findPendingMolecules(projectPath)

    spinner.stop(t('commands.inject.spinners.found', { count: molecules.length }))

    if (molecules.length === 0) {
      p.outro(chalk.yellow(t('commands.inject.messages.noMolecules')))
      this.log('')
      this.log(
        t('commands.inject.messages.addHint', {
          command: chalk.cyan('mlcl add @molecule/api-resource-user'),
        }),
      )
      return
    }

    // Step 2: Detect project type and framework
    const isAppProject = await this.detectAppProject(projectPath)

    // The manifest is load-bearing from here on (framework detection, project
    // name for the .env guidance) — and an injectable project always has one.
    // Every other reader in this command treats a missing/unparseable manifest
    // as a handled condition; proceeding past this read would plan and write
    // into a directory that declares nothing, so fail with the reason instead
    // of a raw ENOENT/SyntaxError stack.
    let projectPkg: {
      name?: string
      molecule?: { framework?: string }
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    try {
      projectPkg = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'))
    } catch (error) {
      this.error(
        `Cannot inject into ${projectPath}: package.json is missing or unparseable (${String(error)})`,
        { exit: 1 },
      )
    }
    const projectDeps = { ...projectPkg.dependencies, ...projectPkg.devDependencies }
    const framework = detectAppFramework(projectDeps, projectPkg.molecule)
    const sharedSubdir = framework ? getSharedCodeDir(framework) : undefined
    const bondsBase = sharedSubdir
      ? join(projectPath, 'src', sharedSubdir, 'bonds')
      : join(projectPath, 'src', 'bonds')

    // Step 3: Generate per-molecule injection plans
    spinner.start(t('commands.inject.spinners.planning'))

    const plans: InjectionPlan[] = []
    for (const molecule of molecules) {
      const plan = await planInjection(molecule, projectPath, sharedSubdir)
      plans.push(plan)
    }

    // Resolve default providers for core packages pulled in via peer deps
    const defaultProviderMolecules = await resolveDefaultProvidersFromPlans(
      plans,
      molecules,
      projectPath,
    )
    for (const dp of defaultProviderMolecules) {
      if (!molecules.includes(dp)) {
        molecules.push(dp)
        plans.push(await planInjection(dp, projectPath, sharedSubdir))
      }
    }

    // Resolve locale packages for all selected molecules. `loadRegistry()`
    // always returns an array (an empty one when the registry declares nothing),
    // so this used to sit behind an always-true `if (registryForLocales)` —
    // dead code that implied a missing registry takes some other path. It does
    // not: an empty registry simply resolves no locale packages.
    const localeMolecules = resolveLocalePackages(molecules, loadRegistry())
    for (const lp of localeMolecules) {
      if (!molecules.includes(lp)) {
        molecules.push(lp)
        plans.push(await planInjection(lp, projectPath, sharedSubdir))
      }
    }

    // A plan whose package could not be resolved (not found in node_modules,
    // the file: path, or the registry; or unreadable) has no files, no
    // dependencies and no bond setup — it contributes NOTHING to execution or
    // to the synthesized holistic files. Executing it anyway reported a full
    // success while it injected nothing. Record why each failed and drop it
    // from the plan set. This runs after the default-provider and locale plans
    // are added too — an auto-added bond whose package is not installed fails
    // resolution the same way and must not slip past the filter.
    //
    // The `molecules` list is NOT filtered: it is what the target manifest
    // DECLARES, and the steps below that are derived from the manifest rather
    // than from the plans — above all the migration runner — must still run for
    // a declared-but-unresolved package. `mlcl add --dev <database> --no-install`
    // (or a failed install) leaves exactly that state, and the runner has to
    // land and be backed there or the project does not boot.
    const resolutionFailures: string[] = []
    const resolvablePlans = plans.filter((plan) => {
      if (plan.moleculePackage) return true
      resolutionFailures.push(
        plan.conflicts.map((c) => `${c.path}: ${c.message}`).join('; ') || plan.molecule,
      )
      return false
    })
    plans.length = 0
    plans.push(...resolvablePlans)
    for (const failure of resolutionFailures) {
      this.warn(
        `Could not resolve ${failure} — its files, dependencies and bond wiring were NOT injected. ` +
          'Install it (npm install) and re-run `mlcl inject`.',
      )
    }
    // With a request unresolved, the holistic files are NOT regenerated:
    // router.ts is synthesized from the resource PLANS and bonds/index.ts from
    // the PLANS' bond setups, so regenerating them from a plan set missing a
    // requested package would silently drop that package's routes and bond
    // wiring from a project that already has them — and with nothing resolved
    // at all they came back as empty shells over a working project. Only the
    // manifest-derived migration runner is safe to write in that state (see
    // `filesToWrite` below).
    const holisticSynthesisAllowed = resolutionFailures.length === 0

    // A migration whose SQL the package could not provide fails the request
    // too (its table would be missing at runtime), but it does NOT gate the
    // holistic files: router.ts and bonds/index.ts are synthesized from the
    // plans, and an unreadable SQL file changes no plan's routes or bond
    // wiring — the survivors' output is correct as-is.
    const migrationFailures = plans.flatMap((plan) => plan.migrationFailures ?? [])
    for (const failure of migrationFailures) {
      this.warn(
        `Could not read a migration: ${failure} — its migration was NOT injected. ` +
          'Reinstall the package (npm install) and re-run `mlcl inject`.',
      )
    }

    // Filter excluded peer dependencies (e.g. react-native aliased to DOM shim)
    if (framework) {
      const excludedPeers = loadAppFrameworks()[framework]?.excludePeerDependencies
      if (excludedPeers?.length) {
        filterExcludedPeerDependencies(plans, excludedPeers)
      }
    }

    // Synthesize holistic project files (router.ts, server.ts, wrappers, bonds)
    // Remove individual bonds/index.ts modify operations — synthesize handles it
    const bondsIndexPath = join(bondsBase, 'index.ts')
    for (const plan of plans) {
      plan.files = plan.files.filter(
        (f) => f.targetPath !== bondsIndexPath || f.action !== 'modify',
      )
    }

    const registryPackages = loadRegistry()
    const skipServiceWorker = framework
      ? loadAppFrameworks()[framework]?.skipCustomServiceWorker === true
      : false
    const syntheticFiles = isAppProject
      ? synthesizeAppProjectFiles(
          plans,
          molecules,
          projectPath,
          registryPackages,
          sharedSubdir,
          skipServiceWorker,
        )
      : await synthesizeProjectFiles(plans, molecules, projectPath, registryPackages)

    // Only the manifest-derived migration runner may be REWRITTEN while a
    // request is unresolved: every other synthesized file is derived from the
    // plans, so regenerating it would drop the unresolved package's routes /
    // bond wiring from a project that already has them (with nothing resolved
    // at all, server.ts / router.ts / bonds/index.ts came back as empty shells
    // over a working project). Files that do not exist yet are still created —
    // nothing to lose, and the post-injection validator requires them — and the
    // runner is rendered from the target project's own manifest (see
    // synthesizeProjectFiles), so it is correct regardless of what resolved.
    const migrateRunnerPath = join(projectPath, 'src', 'scripts', 'migrate.ts')
    const filesToWrite = holisticSynthesisAllowed
      ? syntheticFiles
      : syntheticFiles.filter(
          (f) => f.targetPath === migrateRunnerPath || !existsSync(f.targetPath),
        )

    // Add build tooling devDependencies when a service worker was generated
    if (filesToWrite.some((f) => f.targetPath.endsWith('service-worker.ts'))) {
      // Find the plan whose package generates the service worker (registry-driven)
      const swPlan = plans.find((p) => {
        const regPkg = registryPackages?.find((rp) => rp.name === p.molecule)
        return regPkg?.molecule?.generates?.includes('service-worker')
      })
      const targetPlan = swPlan ?? plans[0]
      if (targetPlan) {
        const regPkg = registryPackages?.find((rp) => rp.name === targetPlan.molecule)
        const devDeps = regPkg?.molecule?.buildTooling?.devDependencies
        if (devDeps) {
          for (const [name, version] of Object.entries(devDeps)) {
            targetPlan.dependencies.push({ name, version, type: 'devDependency' })
          }
        }
      }
    }

    spinner.stop(t('commands.inject.spinners.planned'))

    // Step 4: Show preview
    this.log('')
    this.log(chalk.bold(t('commands.inject.labels.injectionPlan')))
    this.log('')

    // Show per-molecule plans (bond files, middleware files, migrations, deps)
    for (const plan of plans) {
      this.log(chalk.cyan(`  ${plan.molecule}`))

      if (plan.moleculePackage) {
        this.log(
          chalk.gray(
            `    ${t('commands.inject.labels.type', { type: plan.moleculePackage.type })}`,
          ),
        )
      }

      if (plan.files.length > 0) {
        this.log(chalk.gray(`    ${t('commands.inject.labels.files')}`))
        for (const file of plan.files) {
          const icon =
            file.action === 'create'
              ? chalk.green('+')
              : file.action === 'modify'
                ? chalk.yellow('~')
                : file.action === 'transform'
                  ? chalk.magenta('⟳')
                  : chalk.blue('→')
          this.log(`      ${icon} ${file.targetPath}`)
          this.log(chalk.gray(`        ${file.description}`))
        }
      }

      if (plan.dependencies.length > 0) {
        this.log(chalk.gray(`    ${t('commands.inject.labels.dependencies')}`))
        for (const dep of plan.dependencies) {
          this.log(`      ${chalk.blue('+')} ${dep.name}@${dep.version}`)
        }
      }

      if (plan.migrations.length > 0) {
        this.log(chalk.gray(`    ${t('commands.inject.labels.migrations')}`))
        for (const migration of plan.migrations) {
          this.log(`      ${chalk.magenta('+')} ${migration.name} (table: ${migration.tableName})`)
        }
      }

      if (plan.moleculePackage?.routes && plan.moleculePackage.routes.length > 0) {
        this.log(chalk.gray(`    ${t('commands.inject.labels.routes')}`))
        for (const route of plan.moleculePackage.routes) {
          this.log(
            `      ${chalk.cyan(route.method.toUpperCase().padEnd(6))} ${route.path}${route.optional ? chalk.gray(` [${route.optional}]`) : ''}`,
          )
        }
      }

      if (plan.bondSetup) {
        this.log(chalk.gray(`    ${t('commands.inject.labels.bondSetup')}`))
        this.log(
          `      ${chalk.green('⚡')} ${plan.bondSetup.providerPackage} → ${plan.bondSetup.interfacePackage}`,
        )
      }

      if (plan.conflicts.length > 0) {
        this.log(chalk.yellow(`    ${t('commands.inject.labels.conflicts')}`))
        for (const conflict of plan.conflicts) {
          this.log(`      ${chalk.yellow('!')} ${conflict.path}: ${conflict.message}`)
        }
      }

      this.log('')
    }

    // Show synthesized holistic files — the ones that will actually be
    // written, so an unresolved request never previews files it will skip.
    if (filesToWrite.length > 0) {
      this.log(chalk.cyan(`  ${t('commands.inject.labels.generatedFiles')}`))
      this.log(chalk.gray(`    ${t('commands.inject.labels.files')}`))
      for (const file of filesToWrite) {
        this.log(`      ${chalk.green('+')} ${file.targetPath}`)
        this.log(chalk.gray(`        ${file.description}`))
      }
      this.log('')
    }

    // Check for blocking conflicts
    const blockingConflicts = plans.flatMap((p) =>
      p.conflicts.filter((c) => !c.resolution || c.resolution === 'skip'),
    )

    if (blockingConflicts.length > 0 && !flags.force) {
      this.log(
        chalk.yellow(
          t('commands.inject.messages.conflictsFound', { count: blockingConflicts.length }),
        ),
      )
    }

    // Step 5: Execute (or dry-run)
    if (flags['dry-run']) {
      // Preview the .env append too — the real run appends the injected
      // packages' missing secrets, so the dry-run must show them.
      try {
        const rawName: unknown = projectPkg.name
        const projectName =
          typeof rawName === 'string' && rawName.length > 0
            ? (rawName.split('/').pop() ?? rawName)
            : 'my-app'
        const envPreview = await appendSecretsToEnvFile(
          projectPath,
          collectSecrets(plans.map((plan) => plan.moleculePackage).filter(Boolean)),
          isAppProject ? 'app' : 'api',
          projectName,
          { dryRun: true },
        )
        if (envPreview.appended.length > 0) {
          this.log(chalk.cyan(`  ${t('commands.inject.labels.envDryRun')}`))
          for (const secret of envPreview.appended) {
            const note = secret.generated
              ? chalk.green(t('commands.inject.messages.envGenerated'))
              : chalk.yellow(t('commands.inject.messages.envNeedsSetup'))
            this.log(`    ${chalk.green('+')} ${secret.name} ${chalk.gray('—')} ${note}`)
          }
          if (envPreview.skipped.length > 0) {
            this.log(
              chalk.gray(
                `    ${t('commands.inject.messages.envAlreadyPresent', { keys: envPreview.skipped.join(', ') })}`,
              ),
            )
          }
          this.log('')
        }
      } catch (error) {
        this.warn(`Could not preview .env changes: ${error}`)
      }
      p.outro(chalk.blue(t('commands.inject.messages.dryRunComplete')))
      return
    }

    // Confirm. A confirm can never be answered when stdin isn't a TTY (agents,
    // CI, the molecule MCP server) — a piped-open stdin hangs the prompt
    // forever, an ignored one never resolves, so proceed with a logged notice.
    if (!flags.force && !process.stdin.isTTY) {
      this.log(chalk.dim(t('commands.inject.messages.nonInteractiveProceed')))
    } else if (!flags.force) {
      const proceed = await p.confirm({
        message: t('commands.inject.prompts.proceed'),
      })

      if (p.isCancel(proceed) || !proceed) {
        p.cancel(t('commands.inject.prompts.cancelled'))
        process.exit(0)
      }
    }

    spinner.start(t('commands.inject.spinners.executing'))

    let totalCreated = 0
    let totalModified = 0
    const errors: string[] = []
    const warnings: string[] = []

    // Execute per-molecule plans (bond files, middleware files, migrations, deps)
    for (const plan of plans) {
      const result = await executeInjection(plan, projectPath, {
        dryRun: flags['dry-run'],
        force: flags.force,
        autoInstall: false, // Defer npm install to after all plans
      })

      totalCreated += result.filesCreated.length
      totalModified += result.filesModified.length
      errors.push(...result.errors)
      warnings.push(...result.warnings)
    }

    // Execute synthesized holistic files (router.ts, server.ts, wrappers, bonds/index.ts).
    // The helper snapshots every target BEFORE the first write and restores on
    // failure — created files removed, pre-existing files (server.ts,
    // migrate.ts, … on a re-inject) put back — so a failed write leaves the
    // project unchanged, never worse.
    //
    // Skipped when a plan FAILED: the failed plan rolled back its own writes
    // (its bond file is gone again), and the synthesized bonds/index.ts was
    // built from ALL plans — writing it would export `./<name>.js` of a file
    // the rollback just removed, a TS2307 the project cannot compile. The
    // errors below fail the command (exit 1); the successful plans' files stay
    // but nothing references a missing module.
    //
    // `filesToWrite` is `syntheticFiles` except when a requested package could
    // not be resolved, where it narrows to the manifest-derived migration
    // runner — see `holisticSynthesisAllowed`.
    if (errors.length === 0) {
      const synthesized = await writeSynthesizedFiles(filesToWrite)
      // `written` names the files the loop wrote BEFORE the failing one; on a
      // failure those were all rolled back (they no longer exist), so they
      // must not count toward the summary's created total.
      if (!synthesized.error) totalCreated += synthesized.written.length
      if (synthesized.error) {
        errors.push(synthesized.error)
      }
    }

    // Back the migration runner the synthesized files may just have written
    // (API projects only — the app synthesis ships no runner). The runner
    // statically imports its PGlite migrator from
    // @molecule/api-bonds-default-express — never a peer of a database bond,
    // so no inject plan declares it — and its browser-profile branch lazily
    // imports @molecule/api-database-pglite: a `mlcl add --dev … --inject`
    // hands over a manifest whose PGlite pin sits in devDependencies, which
    // production deploys prune. The create (`copySqlSetupScripts`) and swap
    // paths already route through ensureMigrateRunnerImports; this command is
    // the remaining writer of the runner. No-op for database-less projects
    // and manifests that already back the runner.
    if (!isAppProject) {
      try {
        await ensureMigrateRunnerImports(projectPath)
      } catch (error) {
        warnings.push(`Could not back src/scripts/migrate.ts's imports: ${error}`)
      }
    }

    // The deferred install: the per-plan autoInstall above is disabled so a
    // multi-molecule inject runs npm ONCE, after every plan + synthesized file
    // has landed and the manifest is final. Without it the `--install` flag
    // (default true) promised an install that never ran — package.json named
    // packages node_modules did not have, and the smoke tests below failed on
    // the missing modules instead of the injection. A failure warns and
    // continues (the same policy `mlcl add` uses); `--no-install` skips the
    // step and the next-steps hint names the manual install.
    if (flags.install) {
      try {
        await execa('npm', ['install'], { cwd: projectPath, stdio: 'pipe' })
      } catch (error) {
        warnings.push(`npm install failed: ${error}`)
      }
    }

    spinner.stop(t('commands.inject.spinners.complete'))

    // Append the injected packages' secrets to the project's .env — a user
    // adding e.g. Stripe to an existing app gets the same commented
    // credential guidance (label / instructions / setup URL / example) that
    // `mlcl create` scaffolds. Existing keys are NEVER overwritten or
    // duplicated, so re-running inject appends nothing new.
    let envResult: EnvAppendResult | null = null
    try {
      const rawName: unknown = projectPkg.name
      const projectName =
        typeof rawName === 'string' && rawName.length > 0
          ? (rawName.split('/').pop() ?? rawName)
          : 'my-app'
      envResult = await appendSecretsToEnvFile(
        projectPath,
        collectSecrets(plans.map((plan) => plan.moleculePackage).filter(Boolean)),
        isAppProject ? 'app' : 'api',
        projectName,
      )
    } catch (error) {
      warnings.push(`Could not append secrets to .env: ${error}`)
    }

    if (envResult && envResult.appended.length > 0) {
      this.log('')
      this.log(
        chalk.cyan(
          `  ${t(envResult.created ? 'commands.inject.labels.envCreated' : 'commands.inject.labels.envUpdated')}`,
        ),
      )
      for (const secret of envResult.appended) {
        const note = secret.generated
          ? chalk.green(t('commands.inject.messages.envGenerated'))
          : chalk.yellow(t('commands.inject.messages.envNeedsSetup'))
        this.log(`    ${chalk.green('+')} ${secret.name} ${chalk.gray('—')} ${note}`)
      }
      if (envResult.skipped.length > 0) {
        this.log(
          chalk.gray(
            `    ${t('commands.inject.messages.envAlreadyPresent', { keys: envResult.skipped.join(', ') })}`,
          ),
        )
      }
    }

    // Sync static assets (font files, HTML font block) from installed packages
    if (isAppProject) {
      spinner.start(t('commands.inject.spinners.syncing'))
      try {
        await syncProjectAssets(projectPath)
        spinner.stop(t('commands.inject.spinners.synced'))
      } catch (error) {
        this.warn(`Asset sync skipped: ${error}`)
        spinner.stop(chalk.gray(t('commands.inject.spinners.syncSkipped')))
      }
    }

    // Post-injection validation
    spinner.start(t('commands.inject.spinners.validating'))
    const validation = await validateInjectionOutput(projectPath)
    spinner.stop(
      validation.valid
        ? t('commands.inject.spinners.validated')
        : chalk.yellow(t('commands.inject.spinners.validationIssues')),
    )

    warnings.push(...validation.warnings)
    errors.push(...validation.errors)

    // Format generated code with Prettier
    if (flags.format && validation.valid) {
      spinner.start(t('commands.inject.spinners.formatting'))
      try {
        await formatGeneratedFiles(projectPath)
        spinner.stop(t('commands.inject.spinners.formatted'))
      } catch (error) {
        this.warn(`Formatting skipped: ${error}`)
        spinner.stop(chalk.gray(t('commands.inject.spinners.formattingSkipped')))
      }
    }

    // Run smoke tests
    let testsPassed = false
    if (flags.test && validation.valid) {
      const hasTests = await this.hasTestFiles(projectPath)
      if (hasTests) {
        spinner.start(t('commands.inject.spinners.testing'))
        const testResult = await this.runTests(projectPath)
        if (testResult.success) {
          testsPassed = true
          spinner.stop(
            chalk.green(t('commands.inject.spinners.testsPassed', { summary: testResult.summary })),
          )
        } else {
          spinner.stop(chalk.yellow(t('commands.inject.spinners.testsFailed')))
          if (testResult.output) {
            errors.push(`Smoke tests failed:\n${testResult.output}`)
          }
        }
      }
    }

    if (warnings.length > 0) {
      this.log('')
      this.log(chalk.yellow(t('commands.inject.labels.warnings')))
      for (const warning of warnings) {
        this.log(`  ${chalk.yellow('!')} ${warning}`)
      }
    }

    // A request that could not fully resolve is a failed injection, not a
    // partial success: the unresolved package's files, dependencies and bond
    // wiring did NOT land (only the manifest-derived migration runner may have,
    // see `filesToWrite`). This merge sits AFTER the synthesis gate on purpose —
    // the survivors' holistic files are correct without the unresolved plan (it
    // contributed nothing to them) — so the survivors still synthesize, and the
    // exit status still says the request failed.
    errors.push(...resolutionFailures)
    errors.push(...migrationFailures)

    if (errors.length > 0) {
      this.log('')
      this.log(chalk.red(t('commands.inject.labels.errors')))
      for (const error of errors) {
        this.log(`  ${chalk.red('•')} ${error}`)
      }
    }

    p.outro(
      chalk.green(
        t('commands.inject.messages.summary', { created: totalCreated, modified: totalModified }),
      ),
    )

    this.log('')
    this.log(t('commands.inject.messages.nextSteps'))
    let stepNum = 1
    if (!flags.install) {
      this.log(
        `  ${t('commands.inject.messages.runInstall', { num: stepNum++, command: chalk.cyan('npm install') })}`,
      )
    }
    this.log(
      `  ${t('commands.inject.messages.runBuild', { num: stepNum++, command: chalk.cyan('npm run build') })}`,
    )
    if (!testsPassed) {
      this.log(
        `  ${t('commands.inject.messages.runTest', { num: stepNum, command: chalk.cyan('npm test') })}`,
      )
    }

    // The errors are printed above; the exit status has to say so too, or an agent or CI job
    // reading it takes a failed injection for a success.
    if (errors.length > 0) this.exit(1)
  }

  private async hasTestFiles(projectPath: string): Promise<boolean> {
    try {
      await access(join(projectPath, 'src', '__tests__', 'server.test.ts'))
      return true
    } catch (_error) {
      // access() throws when the test file is absent — that is the expected signal; return false
      return false
    }
  }

  private async runTests(
    projectPath: string,
  ): Promise<{ success: boolean; summary: string; output?: string }> {
    try {
      const result = await execa('npx', ['vitest', 'run', '--reporter=verbose'], {
        cwd: projectPath,
        stdio: 'pipe',
        timeout: 60_000,
      })

      // Extract summary from vitest output (e.g. "Tests  3 passed (3)")
      const summaryMatch = result.stdout.match(/Tests\s+(\d+\s+passed[^)]*\))/)
      const summary = summaryMatch ? summaryMatch[0] : 'all passed'

      return { success: true, summary }
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string }
      const output = [execError.stdout, execError.stderr].filter(Boolean).join('\n').slice(-500)
      return { success: false, summary: 'failed', output }
    }
  }

  /**
   * Detect if this is an App (frontend) project by checking package.json.
   * Looks for molecule.projectType field, or framework dependencies.
   */
  private async detectAppProject(projectPath: string): Promise<boolean> {
    try {
      const packageJsonPath = join(projectPath, 'package.json')
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

      // Explicit marker from mlcl create
      if (packageJson.molecule?.projectType === 'app') return true

      // Detect by framework dependencies (derived from registry)
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
      const frameworkDeps = getAppFrameworkDeps()
      if (frameworkDeps.some((d) => d in deps) && !('express' in deps)) return true

      // Detect by @molecule/app-* packages (vs @molecule/api-*)
      const moleculeDeps = Object.keys(deps).filter((d) => d.startsWith('@molecule/'))
      const hasAppPkgs = moleculeDeps.some((d) => getPackageStack(d) === 'app')
      const hasApiPkgs = moleculeDeps.some((d) => getPackageStack(d) === 'api')
      if (hasAppPkgs && !hasApiPkgs) return true

      return false
    } catch (_error) {
      // package.json unreadable or unparseable — treat as non-app project
      return false
    }
  }

  private async findPendingMolecules(path: string): Promise<string[]> {
    try {
      const packageJsonPath = join(path, 'package.json')
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

      return Object.keys(deps).filter((dep) => dep.startsWith('@molecule/'))
    } catch (_error) {
      // package.json absent or unreadable — no molecules to inject
      return []
    }
  }
}
