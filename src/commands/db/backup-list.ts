import { Command } from '@oclif/core'

import { listBackups } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DbBackupListCmd extends Command {
  static override description = 'List cloud database backups'

  static override examples = ['<%= config.bin %> db backup-list --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(DbBackupListCmd)
    const backups = await listBackups(flags.project)
    this.log(ui.heading(`${backups.length} backups`))
    for (const b of backups) this.log(`  ${b.id}  ${b.status ?? ''}  ${b.createdAt ?? ''}`)
  }
}
