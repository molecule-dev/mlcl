import { Command } from '@oclif/core'

import { readCredentials, whoami } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'

export default class Whoami extends Command {
  static override description = 'Show the logged-in molecule.dev account'

  static override enableJsonFlag = true

  public async run(): Promise<{ id: string; email?: string }> {
    if (!readCredentials() && !process.env.MOLECULE_TOKEN)
      this.error('Not logged in — run  first (or set MOLECULE_TOKEN for CI).', { exit: 1 })
    const me = await whoami()
    this.log(`${ui.id(me.email ?? me.id)} ${ui.dim(`(${me.id})`)}`)
    return me
  }
}
