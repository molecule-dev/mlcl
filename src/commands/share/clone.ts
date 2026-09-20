import { Args, Command } from '@oclif/core'

import { cloneSharedProject } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { requireAuth } from '../../shared/project-flag.js'

export default class ShareCloneCmd extends Command {
  static override description = 'Clone a shared project into your account'

  static override examples = ['<%= config.bin %> share clone <slug>']

  static override args = {
    slug: Args.string({ description: 'share slug (from the share URL)', required: true }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { args } = await this.parse(ShareCloneCmd)
    const p = await cloneSharedProject(args.slug)
    this.log(`${ui.check('Cloned')} ${p.name} ${ui.dim(`→ ${p.id}`)}`)
    this.log(ui.cmd(`mlcl project open ${p.id}`))
  }
}
