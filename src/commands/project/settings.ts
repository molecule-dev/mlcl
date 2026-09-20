import { Command, Flags } from '@oclif/core'

import { updateProject } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ProjectSettingsCmd extends Command {
  static override description = 'Update project settings'

  static override examples = ['<%= config.bin %> project settings --project <id> --name "New Name"']

  static override flags = {
    project: projectFlag,
    name: Flags.string({ description: 'new project name' }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(ProjectSettingsCmd)
    const fields: Record<string, unknown> = {}
    if (flags.name) fields.name = flags.name
    if (Object.keys(fields).length === 0) this.error('Provide --name (or patch fields via --json)')
    await updateProject(flags.project, fields)
    this.log(ui.check('Updated.'))
  }
}
