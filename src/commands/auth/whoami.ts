import { Command } from '@oclif/core'

import { whoami } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { requireAuth } from '../../shared/project-flag.js'

export default class Whoami extends Command {
  static override aliases = ['whoami']
  static override description = 'Show the logged-in molecule.dev account'

  static override enableJsonFlag = true

  public async run(): Promise<{ id: string; email?: string }> {
    requireAuth()
    const me = await whoami()
    this.log(`${ui.id(me.email ?? me.id)} ${ui.dim(`(${me.id})`)}`)
    return me
  }
}
