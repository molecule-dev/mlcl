import { Command } from '@oclif/core'

import { listDomains } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DomainListCmd extends Command {
  static override description = 'List custom domains'

  static override examples = ['<%= config.bin %> domain list --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(DomainListCmd)
    const domains = await listDomains(flags.project)
    this.log(ui.heading(`${domains.length} domains`))
    for (const d of domains) this.log(`  ${d.domain}  ${d.verified ? 'verified' : 'unverified'}`)
  }
}
