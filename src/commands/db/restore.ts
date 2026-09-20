import { Args, Command } from '@oclif/core'

import { restoreBackup } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DbRestoreCmd extends Command {
  static override description = 'Restore a cloud backup (DESTRUCTIVE)'

  static override examples = ['<%= config.bin %> db restore --project <id> <backupId>']

  static override args = {
    backupId: Args.string({ description: 'backup id', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(DbRestoreCmd)
    const id = arg.backupId
    if (!id) this.error('Provide a backup id')
    this.log(ui.warn('This replaces the current database. Continue? [y/N] '))
    const answer = await new Promise<string>((r) =>
      process.stdin.once('data', (d) => r(d.toString().trim().toLowerCase())),
    )
    if (answer !== 'y' && answer !== 'yes') {
      this.log('Aborted.')
      return
    }
    await restoreBackup(flags.project, id)
    this.log(ui.check('Restore started.'))
  }
}
