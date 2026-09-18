import { execSync } from 'node:child_process'

import * as p from '@clack/prompts'
import { Command, Flags } from '@oclif/core'

import { branchToSlug, getEnvironment, loadDriver } from '../../lib/staging.js'

export default class StageLogs extends Command {
  static override description = 'View logs from a staging environment'

  static override examples = [
    '<%= config.bin %> stage logs',
    '<%= config.bin %> stage logs --service api --tail 50',
    '<%= config.bin %> stage logs -b feature/login',
  ]

  static override flags = {
    service: Flags.string({
      char: 's',
      description: 'Service to view logs for',
      options: ['api', 'app', 'db', 'all'],
      default: 'all',
    }),
    tail: Flags.integer({
      char: 'n',
      description: 'Number of lines to show',
      default: 100,
    }),
    branch: Flags.string({
      char: 'b',
      description: 'Branch name or slug (defaults to current branch)',
    }),
    'project-path': Flags.string({
      char: 'p',
      description: 'Path to the project root',
      default: '.',
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(StageLogs)
    const projectPath = flags['project-path'] === '.' ? process.cwd() : flags['project-path']

    // Resolve slug
    const branch = flags.branch ?? this.detectBranch()
    if (!branch) {
      p.cancel('Could not detect git branch. Use --branch to specify one.')
      this.exit(1)
    }

    const slug = await branchToSlug(branch)
    let env = await getEnvironment(projectPath, slug)

    if (!env) {
      // Try branch value directly as slug
      env = await getEnvironment(projectPath, branch)
    }

    if (!env) {
      p.cancel(`No staging environment found for "${branch}"`)
      this.exit(1)
    }

    // Get logs from driver
    const driver = await loadDriver(env.driver)
    const service = (flags.service ?? 'all') as 'api' | 'app' | 'all'

    const logs = await driver.provider.logs(
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
      { service, tail: flags.tail },
    )

    for (const line of logs.lines) {
      this.log(line)
    }
  }

  private detectBranch(): string | null {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim()
    } catch (_error) {
      // Safe to ignore: git may be absent or cwd is not a repo; caller handles null by prompting --branch
      return null
    }
  }
}
