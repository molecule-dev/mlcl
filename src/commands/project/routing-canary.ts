import { Command } from '@oclif/core'

import { putProductionRoutingCanary } from '../../lib/platform.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ProjectRoutingCanary extends Command {
  static override description =
    'Select a protected project with a live Fly Machine deployment as the platform routing canary (platform admins only)'

  static override examples = ['<%= config.bin %> project routing-canary --project <id>']

  static override enableJsonFlag = true

  static override flags = { project: projectFlag }

  async run(): Promise<{ projectId: string }> {
    requireAuth()
    const { flags } = await this.parse(ProjectRoutingCanary)
    const selection = await putProductionRoutingCanary(flags.project)
    this.log(`Routing canary selected: ${selection.projectId}`)
    return selection
  }
}
