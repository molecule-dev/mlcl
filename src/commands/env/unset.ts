import { Args, Command, Flags } from '@oclif/core'

import { loadEnvFile, saveEnvFile, unsetEnvValue } from '../../lib/env-store.js'
import { ui } from '../../lib/ui.js'
import { envPath } from './list.js'

export default class EnvUnset extends Command {
  static override description =
    'Comment out an environment variable (value preserved in the file for easy restore)'

  static override examples = ['<%= config.bin %> env unset STRIPE_SECRET_KEY']

  static override args = { key: Args.string({ description: 'Variable name', required: true }) }

  static override flags = {
    app: Flags.boolean({ description: 'Target app/.env instead of api/.env', default: false }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(EnvUnset)
    const file = loadEnvFile(envPath(flags.app))
    if (!unsetEnvValue(file, args.key)) {
      this.error(`"${args.key}" is not set in ${file.path}`, { exit: 1 })
    }
    saveEnvFile(file)
    this.log(
      `${ui.check('Unset')} ${ui.id(args.key)} ${ui.dim('(commented out — value preserved)')}`,
    )
  }
}
