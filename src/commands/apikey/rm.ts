import { Args, Command } from '@oclif/core'

import { revokeApiKey } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ApikeyRmCmd extends Command {
  static override description = 'Revoke a project API key'

  static override examples = ['<%= config.bin %> apikey rm --project <id> <keyId>']

  static override args = {
    keyId: Args.string({ description: 'key id', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(ApikeyRmCmd)
    const id = arg.keyId
    if (!id) this.error('Provide a key id')
    await revokeApiKey(flags.project, id)
    this.log(ui.check('Revoked.'))
  }
}
