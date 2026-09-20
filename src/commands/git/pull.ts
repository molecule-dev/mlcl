import { Command } from '@oclif/core'

import { gitPull } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class GitPullCmd extends Command {
  static override description = 'Pull the connected remote into the sandbox'

  static override examples = ['<%= config.bin %> git pull --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(GitPullCmd)
    this.log(ui.dim('Pulling…'))
    await gitPull(flags.project)
    this.log(ui.check('Pulled.'))
  }
}
