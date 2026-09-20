import { Command } from '@oclif/core'

import { getDatabaseInfo } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DbInfoCmd extends Command {
  static override description = 'Cloud database connection info (password masked)'

  static override examples = ['<%= config.bin %> db info --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(DbInfoCmd)
    const info = await getDatabaseInfo(flags.project)
    this.log(`  ${ui.id('host')}     ${info.host ?? ''}`)
    this.log(`  ${ui.id('port')}     ${info.port ?? ''}`)
    this.log(`  ${ui.id('database')} ${info.database ?? ''}`)
    this.log(`  ${ui.id('user')}     ${info.username ?? ''}`)
    this.log(`  ${ui.id('password')} ${info.passwordMasked ?? '(managed)'}`)
  }
}
