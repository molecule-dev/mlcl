import { Args, Command } from '@oclif/core'

import { acceptInvitation } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { requireAuth } from '../../shared/project-flag.js'

export default class InvitationsAcceptCmd extends Command {
  static override description = 'Accept a team invitation'

  static override examples = ['<%= config.bin %> invitations accept <inviteId>']

  static override args = {
    inviteId: Args.string({ description: 'invitation id', required: true }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { args: arg } = await this.parse(InvitationsAcceptCmd)
    await acceptInvitation(arg.inviteId)
    this.log(ui.check('Accepted.'))
  }
}
