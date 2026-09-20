import { Command } from '@oclif/core'

import { exportAccountData } from '../../lib/platform.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class AccountExportCmd extends Command {
  static override description = 'GDPR data export (all your data as JSON)'

  static override examples = ['<%= config.bin %> account export']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const data = await exportAccountData()
    this.log(JSON.stringify(data, null, 2))
  }
}
