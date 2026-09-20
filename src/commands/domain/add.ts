import { Args, Command } from '@oclif/core'

import { addDomain } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DomainAddCmd extends Command {
  static override description = 'Attach a custom domain'

  static override examples = ['<%= config.bin %> domain add --project <id> app.example.com']

  static override args = {
    domain: Args.string({ description: 'domain name', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(DomainAddCmd)
    const domain = arg.domain
    if (!domain) this.error('Provide a domain')
    const d = await addDomain(flags.project, domain)
    this.log(ui.check('Added ') + d.domain)
  }
}
