import { access } from 'node:fs/promises'
import { join } from 'node:path'

import * as p from '@clack/prompts'
import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'

import { t } from '../lib/i18n.js'
import { findRegistryPackage, getPackageStack } from '../lib/registry.js'
import { scanPackage, validatePackagePlacement } from '../lib/scanner.js'

export default class Validate extends Command {
  static override description = t('commands.validate.description')

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --path /path/to/molecule',
    '<%= config.bin %> <%= command.id %> --json',
  ]

  static override flags = {
    path: Flags.string({
      char: 'p',
      description: t('commands.validate.flags.path'),
      default: '.',
    }),
    json: Flags.boolean({
      description: t('commands.validate.flags.json'),
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Validate)
    const packagePath = flags.path === '.' ? process.cwd() : flags.path

    if (!flags.json) {
      p.intro(chalk.bgCyan(` ${t('commands.validate.labels.intro')} `))
    }

    const spinner = flags.json ? null : p.spinner()
    spinner?.start(t('commands.validate.spinners.validating'))

    const issues: { level: 'error' | 'warning' | 'info'; message: string }[] = []

    try {
      // Check package.json exists
      try {
        await access(join(packagePath, 'package.json'))
      } catch (_error) {
        // safe: absence of the file is the signal — the ENOENT detail is irrelevant
        issues.push({ level: 'error', message: t('commands.validate.errors.missingPackageJson') })
      }

      // Check src directory exists
      try {
        await access(join(packagePath, 'src'))
      } catch (_error) {
        // safe: absence of the directory is the signal — the ENOENT detail is irrelevant
        issues.push({ level: 'error', message: t('commands.validate.errors.missingSrcDir') })
      }

      // Check src/index.ts exists
      try {
        await access(join(packagePath, 'src', 'index.ts'))
      } catch (_error) {
        // safe: absence of the file is the signal — the ENOENT detail is irrelevant
        issues.push({ level: 'error', message: t('commands.validate.errors.missingEntryPoint') })
      }

      // Check tsconfig.json exists
      try {
        await access(join(packagePath, 'tsconfig.json'))
      } catch (_error) {
        // safe: absence of the file is the signal — the ENOENT detail is irrelevant
        issues.push({ level: 'warning', message: t('commands.validate.warnings.missingTsconfig') })
      }

      // Check README.md exists
      try {
        await access(join(packagePath, 'README.md'))
      } catch (_error) {
        // safe: absence of the file is the signal — the ENOENT detail is irrelevant
        issues.push({
          level: 'info',
          message: t('commands.validate.info.noMoleculeMd'),
        })
      }

      // Scan package for more detailed validation
      const pkg = await scanPackage(packagePath)

      // Validate package name
      if (!pkg.name.startsWith('@molecule/')) {
        issues.push({
          level: 'error',
          message: t('commands.validate.errors.invalidName', { name: pkg.name }),
        })
      } else if (!getPackageStack(pkg.name)) {
        issues.push({
          level: 'warning',
          message: t('commands.validate.warnings.missingPrefix', { name: pkg.name }),
        })
      }

      // Check for exports
      if (pkg.exports.length === 0) {
        issues.push({ level: 'warning', message: t('commands.validate.warnings.noExports') })
      }

      // Type-specific validations
      if (pkg.type === 'resource') {
        if (pkg.tables.length === 0) {
          issues.push({ level: 'info', message: t('commands.validate.info.noTables') })
        }
        if (pkg.routes.length === 0) {
          issues.push({
            level: 'info',
            message: t('commands.validate.info.noRoutes'),
          })
        }
      }

      // Validate package placement (type vs directory)
      const placementWarning = validatePackagePlacement(pkg)
      if (placementWarning) {
        issues.push({ level: 'error', message: placementWarning })
      }

      if (pkg.type === 'bond') {
        const hasCoreInterface = Object.keys(pkg.peerDependencies).some((dep) => {
          const registryEntry = findRegistryPackage(dep)
          if (registryEntry?.type === 'core') return true
          // Fallback: check prefix pattern for packages not yet in the registry
          return dep.startsWith('@molecule/api-') && !dep.includes('-', '@molecule/api-'.length)
        })
        if (!hasCoreInterface) {
          issues.push({
            level: 'info',
            message: t('commands.validate.info.bondNoPeerDep'),
          })
        }
      }

      spinner?.stop(t('commands.validate.spinners.complete'))

      // Output results
      const errors = issues.filter((i) => i.level === 'error')
      const warnings = issues.filter((i) => i.level === 'warning')
      const infos = issues.filter((i) => i.level === 'info')

      if (flags.json) {
        this.log(
          JSON.stringify(
            {
              valid: errors.length === 0,
              package: {
                name: pkg.name,
                version: pkg.version,
                type: pkg.type,
              },
              issues,
            },
            null,
            2,
          ),
        )
        return
      }

      this.log('')
      this.log(
        chalk.bold(t('commands.validate.labels.package', { name: pkg.name, version: pkg.version })),
      )
      this.log(t('commands.validate.labels.type', { type: chalk.cyan(pkg.type) }))
      this.log('')

      if (pkg.exports.length > 0) {
        this.log(chalk.bold(t('commands.validate.labels.exports')))
        for (const exp of pkg.exports.slice(0, 10)) {
          this.log(`  ${chalk.green('•')} ${exp}`)
        }
        if (pkg.exports.length > 10) {
          this.log(
            chalk.gray(t('commands.validate.labels.andMore', { count: pkg.exports.length - 10 })),
          )
        }
        this.log('')
      }

      if (pkg.tables.length > 0) {
        this.log(chalk.bold(t('commands.validate.labels.tables')))
        for (const table of pkg.tables) {
          this.log(`  ${chalk.blue('•')} ${table.name}`)
        }
        this.log('')
      }

      if (pkg.routes.length > 0) {
        this.log(chalk.bold(t('commands.validate.labels.routes')))
        for (const route of pkg.routes) {
          this.log(`  ${chalk.cyan(route.method.toUpperCase().padEnd(6))} ${route.path}`)
        }
        this.log('')
      }

      if (issues.length === 0) {
        p.outro(chalk.green(`✓ ${t('commands.validate.messages.valid')}`))
      } else {
        this.log(chalk.bold(t('commands.validate.labels.issues')))
        for (const issue of issues) {
          const icon =
            issue.level === 'error'
              ? chalk.red('✗')
              : issue.level === 'warning'
                ? chalk.yellow('!')
                : chalk.blue('i')
          const color =
            issue.level === 'error'
              ? chalk.red
              : issue.level === 'warning'
                ? chalk.yellow
                : chalk.gray
          this.log(`  ${icon} ${color(issue.message)}`)
        }
        this.log('')

        if (errors.length > 0) {
          p.outro(
            chalk.red(
              `✗ ${t('commands.validate.messages.errorSummary', { errors: errors.length, warnings: warnings.length })}`,
            ),
          )
          this.exit(1)
        } else {
          p.outro(
            chalk.yellow(
              `✓ ${t('commands.validate.messages.warningSummary', { warnings: warnings.length, infos: infos.length })}`,
            ),
          )
        }
      }
    } catch (error) {
      spinner?.stop(t('commands.validate.spinners.failed'))
      if (error instanceof Error) {
        this.error(error.message)
      }
      throw error
    }
  }
}
