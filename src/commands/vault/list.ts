import { Command } from '@oclif/core'

import { listVault } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class VaultListCmd extends Command {
  static override description = 'List vault secrets for a project'

  static override examples = ['<%= config.bin %> vault list --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(VaultListCmd)
    const secrets = await listVault(flags.project)
    this.log(ui.heading(`${secrets.length} secrets`))
    for (const s of secrets) this.log(`  ${ui.id(s.key)}  ${s.description ?? ''}`)
  }
}
