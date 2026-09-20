import { Command } from '@oclif/core'

import { getTiers } from '../../lib/platform.js'

export default class UsageTiersCmd extends Command {
  static override description = 'Public pricing tiers'

  static override examples = ['<%= config.bin %> usage tiers']

  public async run(): Promise<void> {
    this.log(JSON.stringify(await getTiers(), null, 2))
  }
}
