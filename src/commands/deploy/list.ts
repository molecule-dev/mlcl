import { Command } from '@oclif/core'

import { listDeployments } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DeployListCmd extends Command {
  static override description = 'List deployments'

  static override examples = ['<%= config.bin %> deploy list --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(DeployListCmd)
    const deps = await listDeployments(flags.project)
    this.log(ui.heading(`${deps.length} deployments`))
    for (const d of deps) this.log(`  ${d.id}  ${d.status ?? ''}  ${d.url ?? d.liveUrl ?? ''}`)
  }
}
