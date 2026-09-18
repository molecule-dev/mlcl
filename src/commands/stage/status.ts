import { execSync } from 'node:child_process'

import * as p from '@clack/prompts'
import { Args, Command, Flags } from '@oclif/core'
import chalk from 'chalk'

import { branchToSlug, getEnvironment, loadDriver } from '../../lib/staging.js'

export default class StageStatus extends Command {
  static override description = 'Show detailed status of a staging environment'

  static override examples = [
    '<%= config.bin %> stage status',
    '<%= config.bin %> stage status feat-login',
  ]

  static override args = {
    slug: Args.string({
      description: 'Branch name or slug (defaults to current branch)',
      required: false,
    }),
  }

  static override flags = {
    'project-path': Flags.string({
      char: 'p',
      description: 'Path to the project root',
      default: '.',
    }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(StageStatus)
    const projectPath = flags['project-path'] === '.' ? process.cwd() : flags['project-path']

    p.intro(chalk.bgCyan(' stage status '))

    // Resolve slug
    let slug: string
    if (args.slug) {
      slug = args.slug
      // Try as-is first, then as branch name
      let env = await getEnvironment(projectPath, slug)
      if (!env) {
        slug = await branchToSlug(args.slug)
        env = await getEnvironment(projectPath, slug)
      }
      if (!env) {
        p.cancel(`No staging environment found for "${args.slug}"`)
        this.exit(1)
      }
    } else {
      const branch = this.detectBranch()
      if (!branch) {
        p.cancel('Could not detect git branch. Provide a slug argument.')
        this.exit(1)
      }
      slug = await branchToSlug(branch)
    }

    const env = await getEnvironment(projectPath, slug)
    if (!env) {
      p.cancel(`No staging environment found for slug "${slug}"`)
      this.exit(1)
    }

    // Display info
    p.log.info(`${chalk.bold('Branch:')}  ${env.branch}`)
    p.log.info(`${chalk.bold('Slug:')}    ${env.slug}`)
    p.log.info(`${chalk.bold('Driver:')}  ${env.driver}`)
    p.log.info(
      `${chalk.bold('Status:')}  ${env.status === 'running' ? chalk.green(env.status) : chalk.yellow(env.status)}`,
    )
    p.log.info(`${chalk.bold('Created:')} ${env.createdAt}`)
    p.log.info(`${chalk.bold('Updated:')} ${env.updatedAt}`)

    if (env.urls.api) p.log.info(`${chalk.bold('API URL:')} ${chalk.cyan(env.urls.api)}`)
    if (env.urls.app) p.log.info(`${chalk.bold('App URL:')} ${chalk.cyan(env.urls.app)}`)

    if (env.ports.api || env.ports.app || env.ports.db) {
      p.log.info(
        `${chalk.bold('Ports:')}   API=${env.ports.api ?? '-'} App=${env.ports.app ?? '-'} DB=${env.ports.db ?? '-'}`,
      )
    }

    // Health check
    try {
      const driver = await loadDriver(env.driver)
      const spinner = p.spinner()
      spinner.start('Checking health...')

      try {
        const health = await driver.provider.health(
          {
            slug: env.slug,
            branch: env.branch,
            type: 'staging',
            name: `staging-${env.slug}`,
            createdAt: env.createdAt,
            driver: env.driver,
            driverMeta: env.driverMeta,
          },
          { name: env.driver, projectPath },
        )

        if (health.healthy) {
          spinner.stop(chalk.green('Healthy'))
        } else {
          spinner.stop(chalk.yellow('Unhealthy'))
        }

        if (health.api) p.log.info(`  API: ${health.api.status}`)
        if (health.app) p.log.info(`  App: ${health.app.status}`)
      } catch (error) {
        spinner.stop(chalk.red('Health check failed'))
        this.warn(`Health check error: ${error}`)
      }
    } catch (_error) {
      // Driver not available or not installed — health check is best-effort, safe to skip
    }

    p.outro('')
  }

  private detectBranch(): string | null {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim()
    } catch (_error) {
      // Not in a git repo or git not available — caller handles null gracefully
      return null
    }
  }
}
