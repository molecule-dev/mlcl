import { readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import * as p from '@clack/prompts'
import { Args, Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import { execa } from 'execa'

import { appendSecretsToEnvFile, type EnvAppendResult } from '../lib/env-file.js'
import { collectSecrets } from '../lib/features.js'
import { formatGeneratedFiles } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import {
  applyBondSwap,
  BondSwapError,
  type BondSwapResult,
  detectProjectRoot,
  resolveBondPaths,
} from '../lib/integrate.js'
import { getMoleculeVersion, getPackageStack, loadRegistry } from '../lib/registry.js'
import { syncProjectAssets } from '../lib/scaffold.js'
import type { InferredPackage } from '../lib/schema.js'
import { setTelemetryContext } from '../lib/telemetry.js'

export default class Swap extends Command {
  static override description = t('commands.swap.description')

  static override examples = [
    '<%= config.bin %> <%= command.id %> @molecule/app-icons-lucide',
    '<%= config.bin %> <%= command.id %> @molecule/api-database-mysql --no-interactive',
    '<%= config.bin %> <%= command.id %> @molecule/api-oauth-apple --replace @molecule/api-oauth-github',
  ]

  static override args = {
    molecule: Args.string({
      description: t('commands.swap.args.molecule'),
      required: true,
    }),
  }

  static override flags = {
    replace: Flags.string({
      char: 'r',
      description: t('commands.swap.flags.replace'),
    }),
    'no-interactive': Flags.boolean({
      description: t('commands.swap.flags.noInteractive'),
      default: false,
    }),
    install: Flags.boolean({
      description: t('commands.swap.flags.install'),
      default: true,
      allowNo: true,
    }),
    format: Flags.boolean({
      description: t('commands.swap.flags.format'),
      default: true,
      allowNo: true,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Swap)

    setTelemetryContext({
      swapTo: args.molecule?.slice(0, 80),
      swapFrom: flags.replace?.slice(0, 80),
    })
    const newName = args.molecule

    p.intro(chalk.bgCyan(` ${t('commands.swap.labels.intro')} `))

    if (!newName.startsWith('@molecule/')) {
      p.cancel(t('commands.swap.errors.mustBeMolecule'))
      this.exit(1)
    }

    const spinner = p.spinner()

    // 1. Resolve the new provider from the registry
    spinner.start(t('commands.swap.spinners.resolving'))

    const stack = getPackageStack(newName) ?? 'app'
    const registry = [...loadRegistry('api'), ...loadRegistry('app')]
    const newPkg = registry.find((pkg) => pkg.name === newName)

    if (!newPkg) {
      spinner.stop(chalk.red(t('commands.swap.errors.notFound', { name: newName })))
      p.cancel(t('commands.swap.errors.cannotResolve'))
      this.exit(1)
    }

    if (newPkg.molecule?.type !== 'provider' || !newPkg.molecule?.implements) {
      spinner.stop(chalk.red(t('commands.swap.errors.notProvider', { name: newName })))
      p.cancel(t('commands.swap.errors.notProviderDetail'))
      this.exit(1)
    }

    const implementsInterface = newPkg.molecule.implements
    spinner.stop(
      t('commands.swap.spinners.resolved', {
        name: chalk.cyan(newName),
        interface: chalk.dim(implementsInterface),
      }),
    )

    // 2. Detect project path (marker, api/ or app/ subdirectory, or src/bonds/)
    const projectPath = await detectProjectRoot(process.cwd(), stack)
    if (!projectPath) {
      p.cancel(t('commands.swap.errors.noProjectDir', { stack }))
      this.exit(1)
    }

    // 3. Find the existing provider for this interface
    spinner.start(t('commands.swap.spinners.findingExisting'))

    const packageJsonPath = join(projectPath, 'package.json')
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

    let oldPkg: InferredPackage | undefined

    if (flags.replace) {
      // User specified which provider to replace
      oldPkg = registry.find((pkg) => pkg.name === flags.replace)
      if (!oldPkg) {
        spinner.stop(chalk.red(t('commands.swap.errors.replaceNotFound', { name: flags.replace })))
        p.cancel(t('commands.swap.errors.replaceNotFoundDetail'))
        this.exit(1)
      }
    } else {
      // Auto-detect: find installed provider for the same interface
      const candidates: InferredPackage[] = []
      for (const depName of Object.keys(deps)) {
        if (!depName.startsWith('@molecule/')) continue
        const pkg = registry.find((r) => r.name === depName)
        if (pkg?.molecule?.type === 'provider' && pkg.molecule.implements === implementsInterface) {
          candidates.push(pkg)
        }
      }

      if (candidates.length === 0) {
        spinner.stop(
          chalk.red(
            t('commands.swap.errors.noExistingProvider', { interface: implementsInterface }),
          ),
        )
        p.cancel(t('commands.swap.errors.noExistingProviderDetail'))
        this.exit(1)
      }

      if (candidates.length > 1) {
        spinner.stop(
          chalk.red(
            t('commands.swap.errors.multipleProviders', { interface: implementsInterface }),
          ),
        )
        p.note(
          candidates.map((c) => `  ${c.name}`).join('\n'),
          t('commands.swap.labels.multipleProvidersNote'),
        )
        p.cancel(t('commands.swap.errors.multipleProvidersDetail'))
        this.exit(1)
      }

      oldPkg = candidates[0]
    }

    if (oldPkg.name === newName) {
      spinner.stop(chalk.yellow(t('commands.swap.errors.alreadyInstalled', { name: newName })))
      p.cancel(t('commands.swap.errors.alreadyInstalledDetail'))
      this.exit(1)
    }

    spinner.stop(
      t('commands.swap.spinners.foundExisting', {
        old: chalk.cyan(oldPkg.name),
        new: chalk.cyan(newName),
      }),
    )

    // 4. Resolve bond file paths (framework-aware: honours a shared-code subdir
    //    like SvelteKit's src/lib, mirroring `mlcl inject` — never hardcodes
    //    src/bonds). Shared with the executor below so the preview matches reality.
    const paths = await resolveBondPaths(projectPath, oldPkg.name, newName)
    const rel = (abs: string): string => relative(projectPath, abs)

    // The new provider's credentials will be appended to .env after the swap
    // (same commented format as `mlcl create`/`mlcl inject`; existing keys are
    // never touched). Dry-run the append now so the preview shows exactly
    // which keys a real run will add.
    const rawName: unknown = packageJson.name
    const projectName =
      typeof rawName === 'string' && rawName.length > 0
        ? (rawName.split('/').pop() ?? rawName)
        : 'my-app'
    let envPreview: EnvAppendResult | null = null
    try {
      envPreview = await appendSecretsToEnvFile(
        projectPath,
        collectSecrets([newPkg]),
        stack,
        projectName,
        { dryRun: true },
      )
    } catch (error) {
      // Preview-only failure must not block the swap; the real append below
      // reports its own errors.
      this.warn(`Could not preview .env changes: ${error}`)
    }

    // 5. Preview & confirm
    const previewLines = [
      `${chalk.dim(t('commands.swap.labels.interface'))}  ${implementsInterface}`,
      `${chalk.red(t('commands.swap.labels.remove'))}   ${oldPkg.name}`,
      `${chalk.green(t('commands.swap.labels.add'))}      ${newName}`,
      '',
      chalk.dim(t('commands.swap.labels.files')),
      `  ${chalk.red('-')} ${rel(paths.oldBondFile)}`,
      `  ${chalk.green('+')} ${rel(paths.newBondFile)}`,
      `  ${chalk.yellow('~')} ${rel(paths.bondsIndexFile)}`,
    ]
    if (envPreview && envPreview.appended.length > 0) {
      previewLines.push('', chalk.dim(t('commands.swap.labels.envPreview')))
      for (const secret of envPreview.appended) {
        previewLines.push(`  ${chalk.green('+')} ${secret.name}`)
      }
    }
    p.note(previewLines.join('\n'), t('commands.swap.labels.swapPreview'))

    if (!flags['no-interactive']) {
      const confirmed = await p.confirm({ message: t('commands.swap.prompts.proceed') })
      if (p.isCancel(confirmed) || !confirmed) {
        p.cancel(t('commands.swap.prompts.cancelled'))
        this.exit(0)
      }
    }

    // 6. Execute the swap atomically.
    //
    // Pin the exact lockstep version from the registry (InferredPackage.version
    // is a vestigial '0.0.0' placeholder); the registry's moleculeVersions map is
    // the single source of truth for what @molecule deps pin to. Preserve the
    // file: protocol pattern for monorepo dev.
    const oldVersion = deps[oldPkg.name]
    let newVersion = getMoleculeVersion(newName)
    if (oldVersion?.startsWith('file:')) {
      newVersion = `file:${newPkg.path}`
    }

    spinner.start(t('commands.swap.spinners.swapping'))

    // applyBondSwap pre-flights the bonds/index.ts rewrite BEFORE deleting the old
    // bond file and orders deletion last with full rollback — so a project that
    // doesn't match the expected index format aborts cleanly (project untouched)
    // instead of shipping a green "success" that no longer compiles.
    let result: BondSwapResult
    try {
      result = await applyBondSwap({
        projectPath,
        oldPkg,
        newPkg,
        newName,
        implementsInterface,
        newVersion,
      })
    } catch (error) {
      spinner.stop(chalk.red(t('commands.swap.spinners.swapFailed')))
      if (error instanceof BondSwapError) {
        p.cancel(error.message)
      } else {
        p.cancel(t('commands.swap.errors.swapFailedDetail', { error: String(error) }))
      }
      this.exit(1)
    }

    spinner.stop(t('commands.swap.spinners.swapped'))

    // The import was rewritten (else applyBondSwap would have aborted). If the
    // setup call wasn't found, the new provider compiles but is never wired —
    // tell the user to add the call manually rather than silently shipping it.
    if (!result.callRewritten) {
      this.warn(t('commands.swap.warnings.setupCallNotWired', { file: rel(result.bondsIndexFile) }))
    }

    // 6b. Append the new provider's secrets to .env — swapping to a
    // credentialed provider (e.g. mailgun → sendgrid) must leave the project
    // runnable: the same commented credential guidance `mlcl create`
    // scaffolds, never overwriting existing keys. The old provider's keys are
    // deliberately left untouched (they may be swapped back to).
    let envResult: EnvAppendResult | null = null
    try {
      envResult = await appendSecretsToEnvFile(
        projectPath,
        collectSecrets([newPkg]),
        stack,
        projectName,
        { generatedBy: 'mlcl swap' },
      )
    } catch (error) {
      this.warn(`Could not append secrets to .env: ${error}`)
    }

    if (envResult && envResult.appended.length > 0) {
      this.log('')
      this.log(
        chalk.cyan(
          `  ${t(envResult.created ? 'commands.swap.labels.envCreated' : 'commands.swap.labels.envUpdated')}`,
        ),
      )
      for (const secret of envResult.appended) {
        const note = secret.generated
          ? chalk.green(t('commands.swap.messages.envGenerated'))
          : chalk.yellow(t('commands.swap.messages.envNeedsSetup'))
        this.log(`    ${chalk.green('+')} ${secret.name} ${chalk.gray('—')} ${note}`)
      }
      if (envResult.skipped.length > 0) {
        this.log(
          chalk.gray(
            `    ${t('commands.swap.messages.envAlreadyPresent', { keys: envResult.skipped.join(', ') })}`,
          ),
        )
      }
    }

    // 7. npm install
    if (flags.install) {
      spinner.start(t('commands.swap.spinners.installing'))
      try {
        await execa('npm', ['install'], { cwd: projectPath })
        spinner.stop(t('commands.swap.spinners.installed'))
      } catch (error) {
        spinner.stop(chalk.yellow(t('commands.swap.spinners.installFailed')))
        this.warn(`npm install failed: ${error}`)
      }
    }

    // 7b. Sync static assets (font files, HTML font block)
    spinner.start(t('commands.swap.spinners.syncing'))
    try {
      await syncProjectAssets(projectPath)
      spinner.stop(t('commands.swap.spinners.synced'))
    } catch (_error) {
      // syncProjectAssets is best-effort (copies optional font/HTML assets); safe to skip if not applicable
      spinner.stop(chalk.gray(t('commands.swap.spinners.syncSkipped')))
    }

    // 8. Format
    if (flags.format) {
      try {
        await formatGeneratedFiles(projectPath)
      } catch (_error) {
        // Formatting is best-effort; a missing prettier or config error should not abort the swap
      }
    }

    p.outro(chalk.green(t('commands.swap.messages.success', { old: oldPkg.name, new: newName })))
  }
}
