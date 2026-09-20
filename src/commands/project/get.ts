import { Args, Command } from '@oclif/core'

import { getProject } from '../../lib/platform.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ProjectGetCmd extends Command {
  static override description = 'Project detail (settings, URLs, role)'

  static override examples = ['<%= config.bin %> project get <id>']

  static override args = {
    id: Args.string({ description: 'project id', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(ProjectGetCmd)
    const p = await getProject(arg.id)
    this.log(JSON.stringify(p, null, 2))
  }
}
