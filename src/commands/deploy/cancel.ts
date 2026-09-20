import { Command, Flags } from '@oclif/core'

import { cancelDeployment } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DeployCancelCmd extends Command {
  static override description = 'Cancel a running deployment'

  static override examples = ['<%= config.bin %> deploy cancel --project <id> --deployment <id>']

  static override flags = {
    project: projectFlag,
    deployment: Flags.string({ description: 'deployment id', required: true }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(DeployCancelCmd)
    await cancelDeployment(flags.project, flags.deployment)
    this.log(ui.check('Cancelled.'))
  }
}
