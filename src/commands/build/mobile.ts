import { Command } from '@oclif/core'

import { startBuild } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class BuildMobileCmd extends Command {
  static override description = 'Start a mobile build'

  static override examples = ['<%= config.bin %> build mobile --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(BuildMobileCmd)
    const b = await startBuild(flags.project, 'mobile')
    this.log(ui.check('Build started ') + b.id)
  }
}
