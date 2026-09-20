import { Command, Flags } from '@oclif/core'

import { deleteProject } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ProjectDeleteCmd extends Command {
  static override description = 'Delete a project (DESTRUCTIVE — tears down sandbox, prod, DB)'

  static override examples = ['<%= config.bin %> project delete --project <id> --force']

  static override flags = {
    project: projectFlag,
    force: Flags.boolean({ description: 'skip confirmation', default: false }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(ProjectDeleteCmd)
    if (!flags.force) {
      this.log(
        ui.warn(
          `This PERMANENTLY deletes the project (sandbox, prod, database). Type the project id to confirm:`,
        ),
      )
      this.log(ui.cmd(flags.project))
      const answer = await new Promise<string>((r) =>
        process.stdin.once('data', (d) => r(d.toString().trim())),
      )
      if (answer !== flags.project) {
        this.log('Aborted — id did not match.')
        return
      }
    }
    await deleteProject(flags.project)
    this.log(ui.check('Deleted.'))
  }
}
