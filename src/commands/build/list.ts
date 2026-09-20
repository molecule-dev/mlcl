import { Command } from '@oclif/core'

import { listBuilds } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class BuildListCmd extends Command {
  static override description = 'List builds'

  static override examples = ['<%= config.bin %> build list --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(BuildListCmd)
    const builds = await listBuilds(flags.project)
    this.log(ui.heading(`${builds.length} builds`))
    for (const b of builds) this.log(`  ${b.id}  ${b.platform ?? ''}  ${b.status}`)
  }
}
