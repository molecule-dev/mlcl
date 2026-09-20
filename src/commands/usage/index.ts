import { Command, Flags } from '@oclif/core'

import { getUsage } from '../../lib/platform.js'
import { requireAuth } from '../../shared/project-flag.js'

export default class UsageCmd extends Command {
  static override description = 'Usage rollup (account, or --project)'

  static override examples = ['<%= config.bin %> usage [--project <id>]']

  static override flags = {
    project: Flags.string({ char: 'p', description: 'project id (default: account)' }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(UsageCmd)
    const usage = await getUsage(flags.project ? 'project' : 'account', flags.project)
    this.log(JSON.stringify(usage, null, 2))
  }
}
