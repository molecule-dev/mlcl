import { Command } from '@oclif/core'

import { listShares } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ShareListCmd extends Command {
  static override description = 'List public share links'

  static override examples = ['<%= config.bin %> share list --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(ShareListCmd)
    const shares = await listShares(flags.project)
    this.log(ui.heading(`${shares.length} links`))
    for (const s of shares)
      this.log(`  ${s.url ?? `https://www.molecule.dev/share/${s.slug}`}  ${s.id}`)
  }
}
