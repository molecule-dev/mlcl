import { exec } from 'node:child_process'
import { access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import * as p from '@clack/prompts'
import { Args, Command, Flags } from '@oclif/core'
import chalk from 'chalk'
import { execa } from 'execa'

import { t } from '../lib/i18n.js'
import { resolveAddVersion } from '../lib/integrate.js'
import { setTelemetryContext } from '../lib/telemetry.js'

const execAsync = promisify(exec)

export default class Add extends Command {
  static override description = t('commands.add.description')

  static override examples = [
    '<%= config.bin %> <%= command.id %> @molecule/api-resource-user',
    '<%= config.bin %> <%= command.id %> @molecule/api-oauth-github --no-install',
    '<%= config.bin %> <%= command.id %> @molecule/api-emails-mailgun --inject',
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
  }

  static override args = {
    molecule: Args.string({
      description: t('commands.add.args.molecule'),
      required: true,
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Add)
    setTelemetryContext({ packages: args.molecule })
    const moleculeName = args.molecule

    p.intro(chalk.bgCyan(` ${t('commands.add.labels.intro')} `))

    // Validate molecule name
    if (!moleculeName.startsWith('@molecule/')) {
      this.warn(t('commands.add.warnings.namingConvention', { name: moleculeName }))
    }

    // A full-stack project keeps its dependencies in `api/` and `app/`, not at the root. Run from the
    // root, the package used to land in the root package.json and `--inject` scaffolded a phantom
    // second project there, leaving the real one unwired, with a success exit. Pick the workspace from
    // the package's own stack, the way `swap` does.
    let workDir = process.cwd()
    {
      const { existsSync } = await import('node:fs')
      const isFullStackRoot =
        existsSync(join(workDir, 'api', 'package.json')) &&
        existsSync(join(workDir, 'app', 'package.json'))
      if (isFullStackRoot) {
        const stack = /^@molecule\/api-/.test(moleculeName)
          ? 'api'
          : /^@molecule\/app-/.test(moleculeName)
            ? 'app'
            : null
        if (!stack) {
          p.cancel(t('commands.add.errors.workspaceUnknown', { name: moleculeName }))
          this.exit(1)
        }
        workDir = join(workDir, stack)
      }
    }

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

    const spinner = p.spinner()

    // Add to dependencies
    spinner.start(t('commands.add.spinners.adding', { name: moleculeName }))

    try {
      // Read package.json
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

      // Resolve the exact version to pin. Prefers the published npm version, then
      // falls back to the local molecule registry (packages may not be published
      // in the external-app MVP flow), never throwing an opaque npm error.
      const { version: resolvedVersion, source } = await resolveAddVersion(
        moleculeName,
        async (name) => {
          // Array form — the package name is never shell-interpolated (same
          // shape as check-package-upgrades.ts's npmViewFetcher).
          const { stdout } = await execa('npm', ['view', name, 'version'], {
            timeout: 20_000,
            reject: true,
          })
          return stdout
        },
      )

      if (source === 'fallback') {
        // Neither npm nor the registry knows the name: writing `latest` would break the exact-pin rule
        // and the next `npm install` would 404.
        spinner.stop(t('commands.add.spinners.addFailed'))
        this.error(t('commands.add.errors.notFound', { name: moleculeName }), { exit: 1 })
      }

      const depKey = flags.dev ? 'devDependencies' : 'dependencies'
      packageJson[depKey] = packageJson[depKey] ?? {}
      packageJson[depKey][moleculeName] = resolvedVersion

      // Write package.json
      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')

      spinner.stop(t('commands.add.spinners.addedTo', { name: moleculeName, depKey }))

      // Tell the user when the version did not come from npm so they can adjust it.
      if (source === 'registry') {
        this.warn(
          t('commands.add.warnings.versionFromRegistry', {
            name: moleculeName,
            version: resolvedVersion,
          }),
        )
      }

      // Install BEFORE the --inject handoff: inject's plan validation resolves
      // the package through node_modules (it warns "Run 'npm install' first"
      // otherwise), and an unattended `add --inject` (agents, the molecule MCP
      // server) must end with the dependency actually on disk.
      if (!flags['no-install']) {
        spinner.start(t('commands.add.spinners.installing'))

        try {
          await execAsync('npm install', { cwd: workDir })
          spinner.stop(t('commands.add.spinners.installed'))
        } catch (error) {
          this.warn(`npm install failed: ${error}`)
          spinner.stop(t('commands.add.spinners.installFailed'))
          this.log('')
          this.log(chalk.yellow(t('commands.add.messages.installNote')))
          this.error(t('commands.add.errors.installFailed'), { exit: 1 })
        }
      }

      // --inject: hand off to `mlcl inject`, which wires the package into the
      // project's bonds. inject prints its own summary and next steps.
      if (flags.inject) {
        p.outro(chalk.green(`✓ ${t('commands.add.messages.success', { name: moleculeName })}`))
        await this.config.runCommand('inject', ['--molecule', moleculeName, '-p', workDir])
        return
      }

      p.outro(chalk.green(`✓ ${t('commands.add.messages.success', { name: moleculeName })}`))

      this.log('')
      this.log(t('commands.add.messages.nextSteps'))
      if (flags['no-install']) {
        this.log(
          `  ${t('commands.add.messages.stepInstall', { command: chalk.cyan('npm install') })}`,
        )
        this.log(
          `  ${t('commands.add.messages.stepInject', { num: 2, command: chalk.cyan('mlcl inject') })}`,
        )
      } else {
        this.log(
          `  ${t('commands.add.messages.stepInject', { num: 1, command: chalk.cyan('mlcl inject') })}`,
        )
      }
    } catch (error) {
      spinner.stop(t('commands.add.spinners.addFailed'))
      throw error
    }
  }
}
