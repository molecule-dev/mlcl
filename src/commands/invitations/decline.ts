import { Args, Command } from '@oclif/core'

import { declineInvitation } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class InvitationsDeclineCmd extends Command {
  static override description = 'Decline a team invitation'

  static override examples = ['<%= config.bin %> invitations decline <inviteId>']

  static override args = {
    inviteId: Args.string({ description: 'invitation id', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(InvitationsDeclineCmd)
    await declineInvitation(arg.inviteId)
    this.log(ui.check('Declined.'))
  }
}
