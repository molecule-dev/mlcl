import { Command } from '@oclif/core'
import { CLI_COMMAND } from '#cli-command'
import { execaSync } from 'execa'

import DbUrl from './url.js'

export default class DbConsole extends Command {
  static override description = `Open a psql console on the project database (${CLI_COMMAND} db url | psql, with flags forwarded)`

  static override examples = [
    '<%= config.bin %> db console',
    '<%= config.bin %> db console -- -c "\\dt"',
  ]

  static override strict = false

  public async run(): Promise<void> {
    const { argv } = await this.parse(DbConsole)
    const { url } = await new DbUrl([], this.config).run()
    const extra = (argv as string[]).filter((a) => a !== '--')
    execaSync('psql', [url, ...extra], { stdio: 'inherit' })
  }
}
