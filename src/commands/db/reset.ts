import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Command, Flags } from '@oclif/core'
import { execaSync } from 'execa'

import { ui } from '../../lib/ui.js'

export default class DbReset extends Command {
  static override description =
    'Drop and recreate the project database, then run migrations + package setup SQL'

  static override examples = ['<%= config.bin %> db reset']

  static override flags = {
    force: Flags.boolean({ description: 'Skip the confirmation prompt', default: false }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(DbReset)
    if (!flags.force) {
      this.log(ui.warn('This drops ALL data in the project database. Continue? [y/N] '))
      const answer = await new Promise<string>((resolve) => {
        process.stdin.once('data', (d) => resolve(d.toString().trim().toLowerCase()))
      })
      if (answer !== 'y' && answer !== 'yes') {
        this.log('Aborted.')
        return
      }
    }
    const apiDir = existsSync(join(process.cwd(), 'api', 'package.json'))
      ? join(process.cwd(), 'api')
      : process.cwd()
    if (existsSync(join(apiDir, 'package.json'))) {
      const pkg = JSON.parse(readFileSync(join(apiDir, 'package.json'), 'utf8'))
      if (pkg.scripts?.['db:setup']) {
        execaSync('npm', ['run', 'db:setup'], { cwd: apiDir, stdio: 'inherit' })
        this.log(ui.check('Database reset (db:setup).'))
        return
      }
    }
    execaSync('npx', ['tsx', 'src/scripts/migrate.ts', '--fresh'], {
      cwd: apiDir,
      stdio: 'inherit',
    })
    this.log(ui.check('Database reset (fresh migrate).'))
  }
}
