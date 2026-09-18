import { execSync } from 'node:child_process'
import { join } from 'node:path'

import * as p from '@clack/prompts'
import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'

import { addEnvironment, allocatePort, branchToSlug, loadDriver } from '../../lib/staging.js'

export default class StageUp extends Command {
  static override description = 'Deploy a staging environment for the current branch'

  static override examples = [
    '<%= config.bin %> stage up',
    '<%= config.bin %> stage up --branch feature/login',
    '<%= config.bin %> stage up --skip-build',
  ]

  static override flags = {
    branch: Flags.string({
      char: 'b',
      description: 'Branch name (defaults to current git branch)',
    }),
    driver: Flags.string({
      char: 'd',
      description: 'Staging driver to use (defaults to first available)',
    }),
    'skip-build': Flags.boolean({
      description: 'Skip building before deploying',
      default: false,
    }),
    'project-path': Flags.string({
      char: 'p',
      description: 'Path to the project root',
      default: '.',
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(StageUp)
    const projectPath = flags['project-path'] === '.' ? process.cwd() : flags['project-path']

    p.intro(chalk.bgCyan(' stage up '))

    // 1. Detect branch
    const branch = flags.branch ?? this.detectBranch()
    if (!branch) {
      p.cancel('Could not detect git branch. Use --branch to specify one.')
      this.exit(1)
    }

    // 2. Generate slug
    const slug = await branchToSlug(branch)
    p.log.info(`Branch: ${chalk.cyan(branch)} → Slug: ${chalk.cyan(slug)}`)

    // 3. Load driver from registry
    let driver
    try {
      driver = await loadDriver(flags.driver)
    } catch (error) {
      p.cancel((error as Error).message)
      this.exit(1)
    }

    // 4. Check driver prerequisites
    const spinner = p.spinner()
    spinner.start(`Checking ${driver.config.label} prerequisites...`)

    const prereqs = await driver.provider.checkPrerequisites()

    if (!prereqs.met) {
      spinner.stop(`Prerequisites not met`)
      p.cancel(`Missing prerequisites: ${prereqs.missing.join(', ')}`)
      this.exit(1)
    }

    spinner.stop('Prerequisites OK')

    // 5. Allocate ports
    if (!driver.config.defaultPortRange) {
      p.cancel(`Driver "${driver.name}" does not define a defaultPortRange in the registry.`)
      this.exit(1)
    }

    const ports = await allocatePort(projectPath, driver.config.defaultPortRange)

    p.log.info(
      `Ports: API=${chalk.cyan(ports.api)} App=${chalk.cyan(ports.app)} DB=${chalk.cyan(ports.db)}`,
    )

    // 6. Build if needed (skip when driver builds inside containers)
    if (!flags['skip-build'] && !driver.config.handlesBuilds) {
      spinner.start('Building project...')
      try {
        const apiPath = join(projectPath, 'api')
        const appPath = join(projectPath, 'app')
        execSync('npm run build', { cwd: apiPath, stdio: 'pipe' })
        execSync('npm run build', { cwd: appPath, stdio: 'pipe' })
        spinner.stop('Build complete')
      } catch (error) {
        spinner.stop('Build failed')
        this.warn(`Build failed: ${(error as Error).message ?? error}`)
        p.log.warn('Build failed — continuing with --skip-build behavior')
      }
    }

    // 7. Deploy
    spinner.start(`Deploying staging environment ${chalk.cyan(slug)}...`)

    const now = new Date().toISOString()
    const env = {
      slug,
      branch,
      type: 'staging' as const,
      name: `staging-${slug}`,
      createdAt: now,
      driver: driver.name,
      driverMeta: { apiPort: ports.api, appPort: ports.app, dbPort: ports.db },
    }

    const driverConf = {
      name: driver.name,
      projectPath,
      portRange: driver.config.defaultPortRange,
    }

    const urls = await driver.provider.up(env, driverConf)
    spinner.stop('Deployed')

    // 8. Save state
    await addEnvironment(projectPath, {
      slug,
      branch,
      driver: driver.name,
      createdAt: now,
      updatedAt: now,
      urls: { api: urls.api, app: urls.app },
      ports,
      status: 'running',
      driverMeta: { apiPort: ports.api, appPort: ports.app, dbPort: ports.db },
    })

    // 9. Report
    p.log.success(chalk.green('Staging environment is live!'))
    if (urls.api) p.log.info(`  API: ${chalk.cyan(urls.api)}`)
    if (urls.app) p.log.info(`  App: ${chalk.cyan(urls.app)}`)

    p.outro(`Use ${chalk.cyan('mlcl stage status')} to check health`)
  }

  private detectBranch(): string | null {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim()
    } catch (_error) {
      // best-effort: git not available or not in a repo; caller handles null
      return null
    }
  }
}
