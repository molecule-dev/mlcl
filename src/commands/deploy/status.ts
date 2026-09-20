import { Command, Flags } from '@oclif/core'

import { getDeployment } from '../../lib/platform.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DeployStatusCmd extends Command {
  static override description = 'Deployment detail (incl. build log)'

  static override examples = ['<%= config.bin %> deploy status --project <id> --deployment <id>']

  static override flags = {
    project: projectFlag,
    deployment: Flags.string({ description: 'deployment id', required: true }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(DeployStatusCmd)
    const d = await getDeployment(flags.project, flags.deployment)
    this.log(JSON.stringify(d, null, 2))
  }
}
