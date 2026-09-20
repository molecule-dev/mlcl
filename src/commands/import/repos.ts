import { Command } from '@oclif/core'

import { listImportRepos } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ImportReposCmd extends Command {
  static override description = 'List repos available for import from the connected git source'

  static override examples = ['<%= config.bin %> import repos --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(ImportReposCmd)
    const repos = await listImportRepos(flags.project)
    this.log(ui.heading(`${repos.length} repos`))
    for (const r of repos)
      this.log(
        `  ${r.owner ? r.owner + '/' : ''}${r.name}  ${r.private ? 'private' : 'public'}  ${r.url}`,
      )
  }
}
