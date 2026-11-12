import { Command, Flags } from '@oclif/core'

import { getDeployment, listDeployments } from '../../lib/platform.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DeployStatusCmd extends Command {
  static override description = 'Deployment detail (latest by default, incl. build log)'

  static override examples = ['<%= config.bin %> deploy status --project <id> --deployment <id>']

  static override flags = {
    project: projectFlag,
    deployment: Flags.string({ description: 'deployment id (defaults to the latest)' }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(DeployStatusCmd)
    // The API lists newest first. This is also the MCP deploy_status contract.
    const id = flags.deployment ?? (await listDeployments(flags.project))[0]?.id
    if (!id) this.error('No deployments for this project.')
    const d = await getDeployment(flags.project, id)
    this.log(JSON.stringify(d, null, 2))
  }
}
