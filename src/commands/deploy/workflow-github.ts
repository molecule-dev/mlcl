import { Command, Flags } from '@oclif/core'

import { applyWorkflow, getWorkflowYaml } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class WorkflowGithubCmd extends Command {
  static override description =
    'Generate the GitHub Actions deploy workflow (--apply writes it into the sandbox)'

  static override examples = ['<%= config.bin %> deploy workflow-github --project <id> [--apply]']

  static override flags = {
    project: projectFlag,
    apply: Flags.boolean({ description: 'write into the sandbox repo', default: false }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(WorkflowGithubCmd)
    const yaml = await getWorkflowYaml(flags.project, 'github')
    if (flags.apply) {
      await applyWorkflow(flags.project, 'github')
      this.log(ui.check('Applied to the sandbox repo.'))
    }
    this.log(yaml)
  }
}
