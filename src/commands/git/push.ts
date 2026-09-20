import { Command } from '@oclif/core'

import { gitPush } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class GitPushCmd extends Command {
  static override description = 'Push the sandbox repo to the connected remote (platform-mediated)'

  static override examples = ['<%= config.bin %> git push --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(GitPushCmd)
    this.log(ui.dim('Pushing…'))
    await gitPush(flags.project)
    this.log(ui.check('Pushed.'))
  }
}
