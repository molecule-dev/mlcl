import { Command } from '@oclif/core'

import { listInvitations } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class InvitationsListCmd extends Command {
  static override description = 'List your pending team invitations'

  static override examples = ['<%= config.bin %> invitations list']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const invites = await listInvitations()
    this.log(ui.heading(`${invites.length} pending invites`))
    for (const i of invites)
      this.log(`  ${i.projectName ?? i.projectId ?? ''}  ${i.role}  ${ui.dim(i.id)}`)
  }
}
