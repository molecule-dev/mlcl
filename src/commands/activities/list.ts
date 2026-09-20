import { Command } from '@oclif/core'

import { listActivities } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ActivitiesListCmd extends Command {
  static override description = 'List captured side effects (emails, webhooks, etc.) for a project'

  static override examples = ['<%= config.bin %> activities list --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(ActivitiesListCmd)
    const acts = await listActivities(flags.project)
    this.log(ui.heading(`${acts.length} activities`))
    for (const a of acts)
      this.log(`  ${a.type}  ${a.status}  ${a.summary ?? ''}  ${a.recipient ?? ''}`)
  }
}
