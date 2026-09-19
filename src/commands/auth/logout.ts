import { Command } from '@oclif/core'

import { clearCredentials } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'

export default class Logout extends Command {
  static override aliases = ['logout']
  static override description = 'Remove the stored molecule.dev token'

  public async run(): Promise<void> {
    clearCredentials()
    this.log(ui.check('Logged out — stored token cleared.'))
  }
}
