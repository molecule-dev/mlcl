import { Args, Command, Flags } from '@oclif/core'

import { loadEnvFile, saveEnvFile, setEnvValue } from '../../lib/env-store.js'
import { ui } from '../../lib/ui.js'
import { envPath } from './list.js'

export default class EnvSet extends Command {
  static override description =
    'Set an environment variable in the project .env (creates the key or updates in place)'

  static override examples = [
    '<%= config.bin %> env set STRIPE_SECRET_KEY=sk_test_…',
    '<%= config.bin %> env set VITE_API_URL https://api.example.com --app',
  ]

  static override args = {
    pair: Args.string({ description: 'KEY=VALUE (or pass VALUE as a second arg)', required: true }),
    value: Args.string({ description: 'Value when KEY given alone', required: false }),
  }

  static override flags = {
    app: Flags.boolean({ description: 'Target app/.env instead of api/.env', default: false }),
  }

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(EnvSet)
    let key = args.pair
    let value = args.value
    if (args.pair.includes('=') && value === undefined) {
      ;[key, value] = args.pair.split(/=(.*)/s, 2)
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) this.error(`"${key}" is not a valid variable name`)
    if (value === undefined) this.error('Provide KEY=VALUE or KEY VALUE')

    const file = loadEnvFile(envPath(flags.app))
    const created = setEnvValue(file, key, value)
    saveEnvFile(file)
    this.log(
      created
        ? `${ui.check('Added')} ${ui.id(key)} ${ui.dim(`→ ${file.path}`)}`
        : `${ui.check('Updated')} ${ui.id(key)} ${ui.dim(`in ${file.path}`)}`,
    )
  }
}
