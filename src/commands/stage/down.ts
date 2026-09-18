import { execSync } from 'node:child_process'

import * as p from '@clack/prompts'
import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'

import {
  branchToSlug,
  getEnvironment,
  listEnvironments,
  loadDriver,
  removeEnvironment,
} from '../../lib/staging.js'

export default class StageDown extends Command {
  static override description = 'Tear down a staging environment'

  static override examples = [
    '<%= config.bin %> stage down',
    '<%= config.bin %> stage down --branch feature/login',
    '<%= config.bin %> stage down --all',
  ]

  static override flags = {
    branch: Flags.string({
      char: 'b',
      description: 'Branch name or slug to tear down (defaults to current branch)',
    }),
    all: Flags.boolean({
      description: 'Tear down all staging environments',
      default: false,
    }),
    force: Flags.boolean({
      char: 'f',
      description: 'Skip confirmation prompt',
      default: false,
    }),
    'project-path': Flags.string({
      char: 'p',
      description: 'Path to the project root',
      default: '.',
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(StageDown)
    const projectPath = flags['project-path'] === '.' ? process.cwd() : flags['project-path']

    p.intro(chalk.bgCyan(' stage down '))

    if (flags.all) {
      // Tear down all environments
      const envs = await listEnvironments(projectPath)
      if (envs.length === 0) {
        p.log.info('No active staging environments.')
        p.outro('')
        return
      }

      if (!flags.force) {
        const confirmed = await p.confirm({
          message: `Tear down ${envs.length} staging environment(s)?`,
        })
        if (p.isCancel(confirmed) || !confirmed) {
          p.cancel('Cancelled.')
          return
        }
      }

      const spinner = p.spinner()
      for (const env of envs) {
        spinner.start(`Tearing down ${chalk.cyan(env.slug)}...`)
        await this.teardownEnv(env.slug, env.driver, projectPath)
        await removeEnvironment(projectPath, env.slug)
        spinner.stop(`Removed ${env.slug}`)
      }

      p.log.success('All staging environments torn down.')
    } else {
      // Tear down single environment
      const branch = flags.branch ?? this.detectBranch()
      if (!branch) {
        p.cancel('Could not detect git branch. Use --branch to specify one.')
        this.exit(1)
      }

      const slug = await branchToSlug(branch)
      let env = await getEnvironment(projectPath, slug)

      if (!env) {
        // Try using the branch value directly as a slug
        env = await getEnvironment(projectPath, branch)
        if (!env) {
          p.cancel(`No staging environment found for branch "${branch}" (slug: ${slug})`)
          this.exit(1)
        }
        await this.doTeardown(branch, env.driver, projectPath, flags.force)
      } else {
        await this.doTeardown(slug, env.driver, projectPath, flags.force)
      }
    }

    p.outro('')
  }

  private async doTeardown(
    slug: string,
    driverName: string,
    projectPath: string,
    force: boolean,
  ): Promise<void> {
    if (!force) {
      const confirmed = await p.confirm({
        message: `Tear down staging environment ${chalk.cyan(slug)}?`,
      })
      if (p.isCancel(confirmed) || !confirmed) {
        p.cancel('Cancelled.')
        return
      }
    }

    const spinner = p.spinner()
    spinner.start(`Tearing down ${chalk.cyan(slug)}...`)
    await this.teardownEnv(slug, driverName, projectPath)
    await removeEnvironment(projectPath, slug)
    spinner.stop(`Removed ${slug}`)
    p.log.success('Staging environment torn down.')
  }

  private async teardownEnv(slug: string, driverName: string, projectPath: string): Promise<void> {
    try {
      const driver = await loadDriver(driverName)
      await driver.provider.down(
        {
          slug,
          branch: '',
          type: 'staging',
          name: `staging-${slug}`,
          createdAt: '',
          driver: driverName,
        },
        { name: driverName, projectPath },
      )
    } catch (_error) {
      // Best-effort teardown — driver may not be available or the remote resource
      // may already be gone; ignoring is safe, the environment record is removed regardless.
    }
  }

  private detectBranch(): string | null {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim()
    } catch (_error) {
      // Best-effort: git may not be installed or cwd is not a git repo; null return is the correct fallback.
      return null
    }
  }
}
