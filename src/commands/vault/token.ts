import { Command, Flags } from '@oclif/core'

import { mintVaultToken, revokeVaultToken } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class VaultTokenCmd extends Command {
  static override description = 'Mint a runtime vault token (mvt_…)'

  static override examples = ['<%= config.bin %> vault token --project <id>']

  static override flags = {
    project: projectFlag,
    revoke: Flags.boolean({ description: 'revoke instead of mint', default: false }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(VaultTokenCmd)
    if (flags.revoke) {
      await revokeVaultToken(flags.project)
      this.log(ui.check('Revoked.'))
      return
    }
    const t = await mintVaultToken(flags.project)
    this.log(ui.check('Minted — copy it now:'))
    this.log(ui.cmd(t.token))
  }
}
