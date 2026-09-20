import { Command } from '@oclif/core'

import { sandboxAction } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class SandboxRestartCmd extends Command {
  static override description = 'Restart a project sandbox'

  static override examples = ['<%= config.bin %> sandbox restart --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(SandboxRestartCmd)
    await sandboxAction(flags.project, 'restart')
    this.log(ui.check('Restarted.'))
  }
}
