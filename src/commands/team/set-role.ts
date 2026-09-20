import { Args, Command } from '@oclif/core'

import { setMemberRole } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class TeamSetRoleCmd extends Command {
  static override description = 'Change a member role'

  static override examples = ['<%= config.bin %> team set-role --project <id> <memberId> <role>']

  static override args = {
    memberId: Args.string({ description: 'member id', required: true }),
    role: Args.string({ description: 'viewer|editor|admin', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args } = await this.parse(TeamSetRoleCmd)
    const { memberId, role } = args
    if (!memberId || !role) this.error('Provide <memberId> <role>')
    await setMemberRole(flags.project, memberId, role)
    this.log(ui.check('Role updated.'))
  }
}
