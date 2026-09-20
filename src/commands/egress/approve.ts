import { Args, Command } from '@oclif/core'

import { approveEgressDestination } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class EgressApproveCmd extends Command {
  static override description = 'Approved a host'

  static override examples = ['<%= config.bin %> egress/approve --project <id> <host>']

  static override args = {
    host: Args.string({ description: 'hostname to allow', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args } = await this.parse(EgressApproveCmd)
    await approveEgressDestination(flags.project, args.host)
    this.log(ui.check('Approved ') + args.host)
  }
}
