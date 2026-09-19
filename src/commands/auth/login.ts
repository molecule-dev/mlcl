import { Flags } from '@oclif/core'
import { Command } from '@oclif/core'

import { whoami, writeCredentials } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'

export default class Login extends Command {
  static override description =
    'Log the CLI in to molecule.dev (stores a session token at ~/.mlcl/credentials.json, 0600)'

  static override examples = ['<%= config.bin %> login', '<%= config.bin %> login --token <jwt>']

  static override flags = {
    token: Flags.string({
      description:
        'A molecule.dev session token. Without this flag the command prompts for one — grab it from the molecule.dev IDE (browser devtools on an api.molecule.dev request) until personal access tokens ship.',
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Login)
    let token = flags.token
    if (!token) {
      token = await new Promise<string>((resolve) => {
        process.stdout.write('molecule.dev token: ')
        process.stdin.once('data', (data) => resolve(data.toString().trim()))
      })
    }
    if (!token) this.error('No token provided')

    // Verify before storing — a bad token should fail here, not on first use.
    const me = await whoami(token)
    writeCredentials({ token, email: me.email, savedAt: new Date().toISOString() })
    this.log(`${ui.check('Logged in')} as ${ui.id(me.email ?? me.id)}`)
    this.log(ui.dim('Token stored at ~/.mlcl/credentials.json (chmod 600).'))
  }
}
