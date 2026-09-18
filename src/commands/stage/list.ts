import * as p from '@clack/prompts'
import { Command, Flags } from '@oclif/core'
import chalk from 'chalk'

import { listEnvironments } from '../../lib/staging.js'

export default class StageList extends Command {
  static override description = 'List all active staging environments'

  static override examples = ['<%= config.bin %> stage list', '<%= config.bin %> stage list --json']

  static override flags = {
    json: Flags.boolean({
      description: 'Output as JSON',
      default: false,
    }),
    'project-path': Flags.string({
      char: 'p',
      description: 'Path to the project root',
      default: '.',
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(StageList)
    const projectPath = flags['project-path'] === '.' ? process.cwd() : flags['project-path']

    const envs = await listEnvironments(projectPath)

    if (flags.json) {
      this.log(JSON.stringify(envs, null, 2))
      return
    }

    p.intro(chalk.bgCyan(' stage list '))

    if (envs.length === 0) {
      p.log.info('No active staging environments.')
      p.log.info(`Run ${chalk.cyan('mlcl stage up')} to create one.`)
      p.outro('')
      return
    }

    const header = [
      chalk.bold('Branch'.padEnd(30)),
      chalk.bold('Slug'.padEnd(25)),
      chalk.bold('Driver'.padEnd(18)),
      chalk.bold('Status'.padEnd(10)),
      chalk.bold('API URL'.padEnd(30)),
      chalk.bold('App URL'),
    ].join(' ')

    p.log.info(header)
    p.log.info('-'.repeat(140))

    for (const env of envs) {
      const statusColor = env.status === 'running' ? chalk.green : chalk.yellow
      const row = [
        env.branch.padEnd(30),
        chalk.cyan(env.slug.padEnd(25)),
        env.driver.padEnd(18),
        statusColor(env.status.padEnd(10)),
        (env.urls.api ?? '-').padEnd(30),
        env.urls.app ?? '-',
      ].join(' ')
      p.log.info(row)
    }

    p.outro(`${envs.length} environment(s) active`)
  }
}
