import { Command } from '@oclif/core'

import { sandboxAction } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class SandboxStopCmd extends Command {
  static override description = 'Hibernate a project sandbox'

  static override examples = ['<%= config.bin %> sandbox stop --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(SandboxStopCmd)
    await sandboxAction(flags.project, 'stop')
    this.log(ui.check('Stopped.'))
  }
}
