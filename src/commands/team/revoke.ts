import { Args, Command } from '@oclif/core'

import { revokeInvite } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class TeamRevokeCmd extends Command {
  static override description = 'Revoke a pending invite'

  static override examples = ['<%= config.bin %> team revoke --project <id> <inviteId>']

  static override args = {
    inviteId: Args.string({ description: 'invite id', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(TeamRevokeCmd)
    const id = arg.inviteId
    if (!id) this.error('Provide an invite id')
    await revokeInvite(flags.project, id)
    this.log(ui.check('Revoked.'))
  }
}
