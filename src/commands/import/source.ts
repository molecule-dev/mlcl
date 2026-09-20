import { Command, Flags } from '@oclif/core'

import { clearImportSource, getImportSource, setImportSource } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ImportSourceCmd extends Command {
  static override description = 'View or set the git import source for a project'

  static override examples = ['<%= config.bin %> import source --project <id> [--set <repo-url>]']

  static override flags = {
    project: projectFlag,
    set: Flags.string({ description: 'repo URL to import from' }),
    clear: Flags.boolean({ description: 'clear the source', default: false }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(ImportSourceCmd)
    if (flags.clear) {
      await clearImportSource(flags.project)
      this.log(ui.check('Cleared.'))
      return
    }
    if (flags.set) {
      await setImportSource(flags.project, flags.set)
      this.log(ui.check('Set ') + flags.set)
      return
    }
    const src = await getImportSource(flags.project)
    if (src.source) this.log(`  source: ${src.source}`)
    if (src.repo) this.log(`  repo: ${src.repo}`)
    if (!src.source && !src.repo) this.log(ui.dim('No import source set'))
  }
}
