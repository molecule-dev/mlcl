import { Command } from '@oclif/core'

import { listScheduledTasks } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class TasksListCmd extends Command {
  static override description = 'List scheduled/idle AI tasks for a project'

  static override examples = ['<%= config.bin %> tasks list --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(TasksListCmd)
    const tasks = await listScheduledTasks(flags.project)
    this.log(ui.heading(`${tasks.length} tasks`))
    for (const t of tasks)
      this.log(`  ${t.id}  ${t.type}  ${t.status}  ${(t.prompt ?? '').slice(0, 60)}`)
  }
}
