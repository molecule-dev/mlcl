import { Command } from '@oclif/core'

import { sandboxExec } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class SandboxExecCmd extends Command {
  static override description = 'Run a command in the project sandbox'

  static override strict = false

  static override examples = ['<%= config.bin %> sandbox exec --project <id> -- npm test']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, argv } = await this.parse(SandboxExecCmd)
    const command = (argv as string[]).join(' ')
    if (!command) this.error('Provide a command after --')
    const result = await sandboxExec(flags.project, command)
    if (result.stdout) this.log(result.stdout)
    if (result.stderr) this.log(ui.warn(result.stderr))
  }
}
