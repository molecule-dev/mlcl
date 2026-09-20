import { Command } from '@oclif/core'

import { listTeam } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class TeamListCmd extends Command {
  static override description = 'List project team + pending invites'

  static override examples = ['<%= config.bin %> team list --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(TeamListCmd)
    const t = await listTeam(flags.project)
    this.log(ui.heading('Members'))
    for (const m of t.members ?? []) this.log(`  ${m.email ?? m.userId}  ${m.role}`)
    if ((t.invites ?? []).length) {
      this.log(ui.heading('Pending invites'))
      for (const i of t.invites ?? []) this.log(`  ${i.email}  ${i.role}  ${i.id}`)
    }
  }
}
