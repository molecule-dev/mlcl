import { Command } from '@oclif/core'

import { getDatabaseTables } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DbTablesCmd extends Command {
  static override description = 'Cloud database schema tables'

  static override examples = ['<%= config.bin %> db tables --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(DbTablesCmd)
    const tables = await getDatabaseTables(flags.project)
    this.log(ui.heading(`${tables.length} tables`))
    for (const t of tables) this.log(`  ${ui.id(t.name)}  ${t.columns?.length ?? 0} columns`)
  }
}
