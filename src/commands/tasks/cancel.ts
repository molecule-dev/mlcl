import { Args, Command } from '@oclif/core'

import { cancelScheduledTask } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class TasksCancelCmd extends Command {
  static override description = 'Cancelled a taskId'

  static override examples = ['<%= config.bin %> tasks/cancel --project <id> <taskId>']

  static override args = {
    taskId: Args.string({ description: 'task id', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args } = await this.parse(TasksCancelCmd)
    await cancelScheduledTask(flags.project, args.taskId)
    this.log(ui.check('Cancelled ') + args.taskId)
  }
}
