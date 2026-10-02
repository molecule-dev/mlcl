import { Command, Flags } from '@oclif/core'

import { putProjectProtection } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

/**
 * Protect a project from deletion — `DELETE /projects/:id` answers 409
 * (errorKey `project.protected`) until an owner runs this with `--off`. For
 * named, irreplaceable projects: a cleanup batch of disposable run projects
 * can then never take one with it.
 */
export default class ProjectProtectCmd extends Command {
  static override description =
    'Protect a project from deletion (DELETE answers 409 until --off) — for named, irreplaceable projects'

  static override examples = [
    '<%= config.bin %> project protect --project <id>',
    '<%= config.bin %> project protect --project <id> --off',
  ]

  static override enableJsonFlag = true

  static override flags = {
    project: projectFlag,
    off: Flags.boolean({ description: 'remove deletion protection', default: false }),
  }

  public async run(): Promise<{ enabled: boolean }> {
    requireAuth()
    const { flags } = await this.parse(ProjectProtectCmd)
    const enabled = !flags.off
    const result = await putProjectProtection(flags.project, enabled)
    this.log(
      ui.check(
        enabled
          ? `Protected — deletion is refused until "project protect --off".`
          : `Protection removed — the project can be deleted again.`,
      ),
    )
    return result
  }
}
