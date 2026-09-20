import { Args, Command } from '@oclif/core'

import { revokeEgressDestination } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class EgressRevokeCmd extends Command {
  static override description = 'Revoked a host'

  static override examples = ['<%= config.bin %> egress/revoke --project <id> <host>']

  static override args = {
    host: Args.string({ description: 'hostname to revoke', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args } = await this.parse(EgressRevokeCmd)
    await revokeEgressDestination(flags.project, args.host)
    this.log(ui.check('Revoked ') + args.host)
  }
}
