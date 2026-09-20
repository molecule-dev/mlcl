import { Command } from '@oclif/core'

import { listApiKeys } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ApikeyListCmd extends Command {
  static override description = 'List project API keys'

  static override examples = ['<%= config.bin %> apikey list --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(ApikeyListCmd)
    const keys = await listApiKeys(flags.project)
    this.log(ui.heading(`${keys.length} keys`))
    for (const k of keys) this.log(`  ${k.id}  ${k.name ?? ''}  ${k.key ?? ''}`)
  }
}
