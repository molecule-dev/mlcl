import { join } from 'node:path'

import { Command, Flags } from '@oclif/core'

import { defaultEnvPath, loadEnvFile } from '../../lib/env-store.js'
import { ui } from '../../lib/ui.js'

function envPath(app: boolean): string {
  return app ? join(process.cwd(), 'app', '.env') : defaultEnvPath()
}

export { envPath }

export default class EnvList extends Command {
  static override description =
    'List environment variables in the project .env (values masked unless --raw)'

  static override examples = [
    '<%= config.bin %> env list',
    '<%= config.bin %> env list --app --raw',
  ]

  static override flags = {
    app: Flags.boolean({
      description: 'Target app/.env instead of api/.env (full-stack projects)',
      default: false,
    }),
    raw: Flags.boolean({ description: 'Show unmasked values', default: false }),
    json: Flags.boolean({ description: 'Machine-readable output', default: false }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(EnvList)
    const file = loadEnvFile(envPath(flags.app))
    const active = file.entries.filter((e) => !e.commented)
    if (flags.json) {
      this.log(
        JSON.stringify(
          active.map((e) => ({ key: e.key, value: e.value })),
          null,
          2,
        ),
      )
      return
    }
    this.log(`\n${ui.heading(`${active.length} variables`)} ${ui.dim(`in ${file.path}`)}\n`)
    for (const entry of active) {
      const masked =
        entry.value.length <= 3
          ? '••••'
          : `${entry.value.slice(0, 3)}${'•'.repeat(Math.min(12, Math.max(4, entry.value.length - 3)))}`
      this.log(`  ${ui.id(entry.key.padEnd(32))} ${flags.raw ? entry.value : masked}`)
    }
    const commented = file.entries.filter((e) => e.commented)
    if (commented.length > 0)
      this.log(`\n  ${ui.dim(`${commented.length} commented out (mlcl env unset)`)}`)
    this.log('')
  }
}
