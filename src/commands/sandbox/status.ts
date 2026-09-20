import { Command } from '@oclif/core'

import { getSandboxStatus } from '../../lib/platform.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class SandboxStatusCmd extends Command {
  static override description = 'Sandbox status for a project'

  static override examples = ['<%= config.bin %> sandbox status --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(SandboxStatusCmd)
    const status = await getSandboxStatus(flags.project)
    this.log(JSON.stringify(status, null, 2))
  }
}
