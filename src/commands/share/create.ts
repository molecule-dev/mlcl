import { Command } from '@oclif/core'

import { createShare } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ShareCreateCmd extends Command {
  static override description = 'Mint a public share link'

  static override examples = ['<%= config.bin %> share create --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(ShareCreateCmd)
    const s = await createShare(flags.project)
    this.log(ui.check('Created ') + (s.url ?? `https://www.molecule.dev/share/${s.slug}`))
  }
}
