import { Command, Flags } from '@oclif/core'

import { inviteMember } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class TeamInviteCmd extends Command {
  static override description = 'Invite a member by email'

  static override examples = [
    '<%= config.bin %> team invite --project <id> --email x@y.com --role editor',
  ]

  static override flags = {
    project: projectFlag,
    email: Flags.string({ required: true }),
    role: Flags.string({ description: 'viewer|editor|admin', default: 'editor' }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(TeamInviteCmd)
    await await inviteMember(flags.project, flags.email, flags.role)
    this.log(ui.check(`Invited ${flags.email} as ${flags.role}`))
  }
}
