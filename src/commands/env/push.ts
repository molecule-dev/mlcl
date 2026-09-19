import { Flags } from '@oclif/core'
import { Command } from '@oclif/core'

import { defaultEnvPath, loadEnvFile } from '../../lib/env-store.js'
import { putProjectEnv, readCredentials } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'

export default class EnvPush extends Command {
  static override description =
    'Push local .env values up to the molecule.dev project (upserts through the same route the IDE env editor saves to)'

  static override examples = [
    '<%= config.bin %> env push --project <id>',
    '<%= config.bin %> env push --project <id> --keys STRIPE_SECRET_KEY,MAILGUN_API_KEY',
  ]

  static override flags = {
    project: Flags.string({ char: 'p', description: 'molecule.dev project id', required: true }),
    keys: Flags.string({
      description: 'Comma-separated allowlist of keys to push (default: all set keys)',
    }),
    scope: Flags.string({
      description: 'Platform scope for the values',
      options: ['all', 'dev', 'prod'],
      default: 'all',
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(EnvPush)
    if (!readCredentials()) {
      this.error('Not logged in — run `mlcl login` first.', { exit: 1 })
    }
    const file = loadEnvFile(defaultEnvPath())
    const allow = flags.keys ? new Set(flags.keys.split(',').map((k) => k.trim())) : null
    const values: Record<string, string> = {}
    for (const entry of file.entries) {
      if (entry.commented) continue
      if (allow && !allow.has(entry.key)) continue
      values[entry.key] = entry.value
    }
    if (Object.keys(values).length === 0)
      this.error('No values to push (empty allowlist or empty .env)')
    await putProjectEnv(flags.project, values)
    this.log(
      `${ui.check('Pushed')} ${Object.keys(values).length} variables ${ui.dim(`→ project ${flags.project} (scope ${flags.scope})`)}`,
    )
  }
}
