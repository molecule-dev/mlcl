import { Args, Command } from '@oclif/core'

import { loadEnvFile } from '../../lib/env-store.js'
import { envPath } from './list.js'

export default class EnvGet extends Command {
  static override description =
    'Print one environment variable value (for scripts: mlcl env get DATABASE_URL)'

  static override examples = [
    '<%= config.bin %> env get DATABASE_URL',
    '<%= config.bin %> env get VITE_API_URL --app',
  ]

  static override args = {
    key: Args.string({ description: 'Variable name', required: true }),
  }

  static override enableJsonFlag = true

  public async run(): Promise<{ key: string; value: string | null }> {
    const { args } = await this.parse(EnvGet)
    const file = loadEnvFile(envPath(false))
    const entry = file.entries.find((e) => e.key === args.key && !e.commented)
    if (!entry) {
      this.error(`"${args.key}" is not set in ${file.path}`, { exit: 1 })
    }
    this.log(entry.value)
    return { key: args.key, value: entry.value }
  }
}
