import { Args, Command } from '@oclif/core'

import { deleteSnapshot } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class SnapshotRmCmd extends Command {
  static override description = 'Delete a sandbox snapshot'

  static override examples = ['<%= config.bin %> snapshot rm --project <id> <snapId>']

  static override args = {
    snapId: Args.string({ description: 'snapshot id', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(SnapshotRmCmd)
    const id = arg.snapId
    if (!id) this.error('Provide a snapshot id')
    await deleteSnapshot(flags.project, id)
    this.log(ui.check('Deleted ') + id)
  }
}
