import { Command } from '@oclif/core'

import { getStatusHistory } from '../lib/platform.js'
import { ui } from '../lib/ui.js'
import { projectFlag, requireAuth } from '../shared/project-flag.js'

export default class StatusCmd extends Command {
  static override description = 'molecule.dev status history (30 days)'

  static override examples = ['<%= config.bin %> status']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const events = await getStatusHistory()
    for (const e of events)
      this.log(
        `  ${e.date}  ${e.status === 'operational' ? ui.ok('operational') : ui.warn(e.status)}`,
      )
  }
}
