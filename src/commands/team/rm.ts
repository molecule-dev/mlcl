import { Args, Command } from '@oclif/core'

import { removeMember } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class TeamRmCmd extends Command {
  static override description = 'Remove a member'

  static override examples = ['<%= config.bin %> team rm --project <id> <memberId>']

  static override args = {
    memberId: Args.string({ description: 'member id', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(TeamRmCmd)
    const id = arg.memberId
    if (!id) this.error('Provide a member id')
    await removeMember(flags.project, id)
    this.log(ui.check('Removed.'))
  }
}
