import { Command } from '@oclif/core'

import { getChatUsage } from '../../lib/platform.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class UsageChatCmd extends Command {
  static override description = 'AI chat usage for a project (turns, tokens, cost)'

  static override examples = ['<%= config.bin %> usage chat --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(UsageChatCmd)
    const usage = await getChatUsage(flags.project)
    this.log(JSON.stringify(usage, null, 2))
  }
}
