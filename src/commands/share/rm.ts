import { Args, Command } from '@oclif/core'

import { removeShare } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ShareRmCmd extends Command {
  static override description = 'Revoke a share link'

  static override examples = ['<%= config.bin %> share rm --project <id> <shareId>']

  static override args = {
    shareId: Args.string({ description: 'share id', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(ShareRmCmd)
    const id = arg.shareId
    if (!id) this.error('Provide a share id')
    await removeShare(flags.project, id)
    this.log(ui.check('Revoked.'))
  }
}
