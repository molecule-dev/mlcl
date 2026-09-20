import { Command } from '@oclif/core'

import { startBuild } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class BuildDesktopCmd extends Command {
  static override description = 'Start a desktop build'

  static override examples = ['<%= config.bin %> build desktop --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(BuildDesktopCmd)
    const b = await startBuild(flags.project, 'desktop')
    this.log(ui.check('Build started ') + b.id)
  }
}
