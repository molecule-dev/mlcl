import { Args, Command } from '@oclif/core'

import { queryDatabase } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class DbQueryCmd extends Command {
  static override description = 'Run SQL against the cloud database (read queries recommended)'

  static override examples = [
    '<%= config.bin %> db query --project <id> "SELECT * FROM users LIMIT 5"',
  ]

  static override args = {
    sql: Args.string({ description: 'SQL statement', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(DbQueryCmd)
    const sql = arg.sql
    if (!sql) this.error('Provide SQL after the command')
    const result = await queryDatabase(flags.project, sql)
    if (result.error) this.log(ui.warn(result.error))
    else this.log(JSON.stringify(result.rows ?? [], null, 2))
  }
}
