import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { Command, Flags } from '@oclif/core'
import { execaSync } from 'execa'

import { ui } from '../../lib/ui.js'

export default class DbMigrate extends Command {
  static override description =
    'Run the project\u2019s database migrations (the scaffolded api/src/scripts/migrate.ts)'

  static override examples = [
    '<%= config.bin %> db migrate',
    '<%= config.bin %> db migrate --fresh',
  ]

  static override flags = {
    fresh: Flags.boolean({
      description: 'Drop/recreate the database first (DESTRUCTIVE)',
      default: false,
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(DbMigrate)
    const apiDir = existsSync(join(process.cwd(), 'api', 'package.json'))
      ? join(process.cwd(), 'api')
      : process.cwd()
    const migrateScript = join(apiDir, 'src', 'scripts', 'migrate.ts')
    if (!existsSync(migrateScript)) {
      this.error(
        `No migrate script at ${migrateScript} — is this a molecule project with a database bond?`,
        { exit: 1 },
      )
    }
    if (flags.fresh) {
      this.log(ui.warn('Recreating database (--fresh)…'))
      execaSync('npx', ['tsx', 'src/scripts/migrate.ts', '--fresh'], {
        cwd: apiDir,
        stdio: 'inherit',
      })
    } else {
      execaSync('npx', ['tsx', 'src/scripts/migrate.ts'], { cwd: apiDir, stdio: 'inherit' })
    }
    this.log(ui.check('Migrations applied.'))
  }
}
