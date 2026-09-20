import { Command } from '@oclif/core'

import { createBackup } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DbBackupCmd extends Command {
  static override description = 'Create a cloud database backup'

  static override examples = ['<%= config.bin %> db backup --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(DbBackupCmd)
    const b = await createBackup(flags.project)
    this.log(ui.check('Backup created ') + b.id)
  }
}
