import { Command, Flags } from '@oclif/core'

import { createApiKey } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ApikeyCreateCmd extends Command {
  static override description = 'Mint a project API key'

  static override examples = ['<%= config.bin %> apikey create --project <id> --name ci']

  static override flags = {
    project: projectFlag,
    name: Flags.string({ description: 'key name', required: true }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(ApikeyCreateCmd)
    const k = await createApiKey(flags.project, flags.name)
    this.log(ui.check('Created — copy it now, it will not be shown again:'))
    this.log(k.key ?? k.id)
  }
}
