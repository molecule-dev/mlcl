import { Args, Command } from '@oclif/core'

import { restoreSnapshot } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class SnapshotRestoreCmd extends Command {
  static override description = 'Restore a sandbox snapshot (destructive)'

  static override examples = ['<%= config.bin %> snapshot restore --project <id> <snapId>']

  static override args = {
    snapId: Args.string({ description: 'snapshot id', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(SnapshotRestoreCmd)
    const id = arg.snapId
    if (!id) this.error('Provide a snapshot id')
    await restoreSnapshot(flags.project, id)
    this.log(ui.check('Restored ') + id)
  }
}
