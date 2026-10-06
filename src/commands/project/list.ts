import { Command, Flags } from '@oclif/core'

import { listProjects } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { requireAuth } from '../../shared/project-flag.js'

export default class ProjectList extends Command {
  static override description = 'List your molecule.dev projects (owned + team, with roles)'

  static override examples = ['<%= config.bin %> project list']

  static override enableJsonFlag = true

  static override flags = {
    open: Flags.boolean({ description: 'Print only projects with a live preview', default: false }),
  }

  public async run(): Promise<Array<{ id: string; name: string; role?: string }>> {
    requireAuth()
    const projects = await listProjects()
    const rows = projects.map((p) => ({ id: p.id, name: p.name, role: p.role }))
    const { flags } = await this.parse(ProjectList)
    const shown = flags.open ? projects.filter((p) => p.previewUrl) : projects
    this.log(`\n${ui.heading(`${shown.length} projects`)}\n`)
    for (const p of shown) {
      this.log(
        `  ${ui.id(p.name.padEnd(28))} ${ui.dim(p.role ?? '')}  ${p.previewUrl ? ui.dim(p.previewUrl) : ''}`,
      )
    }
    this.log('')
    return rows
  }
}
