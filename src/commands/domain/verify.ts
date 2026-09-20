import { Args, Command } from '@oclif/core'

import { verifyDomain } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DomainVerifyCmd extends Command {
  static override description = 'Trigger DNS verification'

  static override examples = ['<%= config.bin %> domain verify --project <id> <domainId>']

  static override args = {
    domainId: Args.string({ description: 'domain id', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(DomainVerifyCmd)
    const id = arg.domainId
    if (!id) this.error('Provide a domain id')
    await verifyDomain(flags.project, id)
    this.log(ui.check('Verification triggered.'))
  }
}
