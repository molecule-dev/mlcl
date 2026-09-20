import { Command } from '@oclif/core'

import { createSnapshot } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class SnapshotCreateCmd extends Command {
  static override description = 'Create a sandbox snapshot'

  static override examples = ['<%= config.bin %> snapshot create --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(SnapshotCreateCmd)
    const s = await createSnapshot(flags.project)
    this.log(ui.check('Snapshot created ') + s.id)
  }
}
