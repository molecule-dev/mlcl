import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { Command, Flags } from '@oclif/core'

import { loadEnvFile } from '../../lib/env-store.js'

export default class DbUrl extends Command {
  static override description =
    'Print the project\u2019s DATABASE_URL (resolving .env when not exported)'

  static override examples = ['<%= config.bin %> db url', 'psql "$(mlcl db url)"']

  static override enableJsonFlag = true

  static override flags = {
    app: Flags.boolean({ description: 'Read from app/.env (rare)', default: false }),
  }

  public async run(): Promise<{ url: string }> {
    const { flags } = await this.parse(DbUrl)
    const envPath = flags.app
      ? join(process.cwd(), 'app', '.env')
      : existsSync(join(process.cwd(), 'api', 'package.json'))
        ? join(process.cwd(), 'api', '.env')
        : join(process.cwd(), '.env')
    let url = process.env.DATABASE_URL
    if (!url) {
      const entry = loadEnvFile(envPath).entries.find(
        (e) => e.key === 'DATABASE_URL' && !e.commented,
      )
      url = entry?.value
    }
    if (!url) this.error(`DATABASE_URL not found in the environment or ${envPath}`, { exit: 1 })
    this.log(url)
    return { url }
  }
}
