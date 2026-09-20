import { Command, Flags } from '@oclif/core'

import { getBuild } from '../../lib/platform.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class BuildStatusCmd extends Command {
  static override description = 'Build detail incl. log'

  static override examples = ['<%= config.bin %> build status --project <id> --build <id>']

  static override flags = { project: projectFlag, build: Flags.string({ required: true }) }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(BuildStatusCmd)
    const b = await getBuild(flags.project, flags.build)
    this.log(JSON.stringify(b, null, 2))
  }
}
