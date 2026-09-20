import { Args, Command } from '@oclif/core'

import { deleteVaultSecret } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class VaultRmCmd extends Command {
  static override description = 'Delete a vault secret'

  static override examples = ['<%= config.bin %> vault rm --project <id> <key>']

  static override args = {
    key: Args.string({ description: 'secret key', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(VaultRmCmd)
    await deleteVaultSecret(flags.project, arg.key)
    this.log(ui.check('Deleted ') + arg.key)
  }
}
