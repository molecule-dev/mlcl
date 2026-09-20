import { Command } from '@oclif/core'

import { getProfile } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ProfileGetCmd extends Command {
  static override description = 'Show your molecule.dev profile'

  static override examples = ['<%= config.bin %> profile get']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(ProfileGetCmd)
    const p = await getProfile()
    this.log(`  ${ui.id('id')}       ${p.id}`)
    this.log(`  ${ui.id('email')}    ${p.email ?? ''}`)
    this.log(`  ${ui.id('name')}     ${p.name ?? ''}`)
    this.log(`  ${ui.id('username')} ${p.username ?? ''}`)
  }
}
