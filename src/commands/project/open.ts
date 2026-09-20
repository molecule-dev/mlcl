import { Args, Command } from '@oclif/core'

import { listProjects, siteBaseUrl } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { requireAuth } from '../../shared/project-flag.js'

export default class ProjectOpen extends Command {
  static override description =
    'Print the IDE workspace + preview URLs for a project (or open them)'

  static override examples = [
    '<%= config.bin %> project open <id>',
    '<%= config.bin %> project open blog --browser',
  ]

  static override args = {
    nameOrId: Args.string({ description: 'Project id or name', required: true }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { args } = await this.parse(ProjectOpen)
    const projects = await listProjects()
    const project = projects.find((p) => p.id === args.nameOrId || p.name === args.nameOrId)
    if (!project) this.error(`No project "${args.nameOrId}" — run mlcl project list`)
    this.log(`${ui.id('workspace')}  ${ui.cmd(`${siteBaseUrl()}/workspace/${project.id}`)}`)
    if (project.previewUrl) this.log(`${ui.id('preview')}    ${ui.cmd(project.previewUrl)}`)
    if (project.liveUrl) this.log(`${ui.id('live')}       ${ui.cmd(project.liveUrl)}`)
  }
}
