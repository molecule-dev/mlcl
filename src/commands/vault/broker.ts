import { Command, Flags } from '@oclif/core'

import { disableBroker, enableBroker } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class VaultBrokerCmd extends Command {
  static override description =
    'Enable/disable the credential broker (metered AI/API proxy for your app)'

  static override examples = ['<%= config.bin %> vault broker --project <id> [--disable]']

  static override flags = {
    project: projectFlag,
    disable: Flags.boolean({ description: 'disable instead of enable', default: false }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(VaultBrokerCmd)
    if (flags.disable) {
      await disableBroker(flags.project)
      this.log(ui.check('Broker disabled.'))
      return
    }
    await enableBroker(flags.project)
    this.log(ui.check('Broker enabled — metered AI/API calls route through the platform.'))
  }
}
