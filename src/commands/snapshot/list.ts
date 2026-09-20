import { Command } from '@oclif/core'

import { listSnapshots } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class SnapshotListCmd extends Command {
  static override description = 'List sandbox snapshots'

  static override examples = ['<%= config.bin %> snapshot list --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(SnapshotListCmd)
    const snaps = await listSnapshots(flags.project)
    this.log(ui.heading(`${snaps.length} snapshots`))
    for (const s of snaps) this.log(`  ${s.id}  ${s.label ?? ''} ${s.createdAt ?? ''}`)
  }
}
