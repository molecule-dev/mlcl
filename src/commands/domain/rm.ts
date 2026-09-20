import { Args, Command } from '@oclif/core'

import { removeDomain } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DomainRmCmd extends Command {
  static override description = 'Remove a custom domain'

  static override examples = ['<%= config.bin %> domain rm --project <id> <domainId>']

  static override args = {
    domainId: Args.string({ description: 'domain id', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(DomainRmCmd)
    const id = arg.domainId
    if (!id) this.error('Provide a domain id')
    await removeDomain(flags.project, id)
    this.log(ui.check('Removed.'))
  }
}
