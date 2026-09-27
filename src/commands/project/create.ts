import { Args, Command, Flags } from '@oclif/core'

import { createProject } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { requireAuth } from '../../shared/project-flag.js'

/**
 * Create a project on molecule.dev without opening the IDE — the same
 * `POST /projects` the Dashboard uses. The project starts with no sandbox;
 * `mlcl sandbox start` boots one (the platform scaffolds the chosen type into
 * it), and `mlcl sync` then pushes a local tree over that scaffold.
 */
export default class ProjectCreate extends Command {
  static override description =
    'Create a molecule.dev project (no sandbox yet — `sandbox start` boots one, `sync` pushes local files into it)'

  static override examples = [
    '<%= config.bin %> project create "How Molecule works" --type static --framework react',
    '<%= config.bin %> project create my-api --type api --packages @molecule/api-database-postgresql',
  ]

  static override enableJsonFlag = true

  static override args = {
    name: Args.string({
      description: 'project name (the deploy slug is derived from it)',
      required: true,
    }),
  }

  static override flags = {
    type: Flags.string({
      description: 'project type',
      options: ['api', 'app', 'full-stack', 'static'],
      default: 'full-stack',
    }),
    framework: Flags.string({
      description: 'app framework (react, vue, svelte, solid, angular, react-native)',
    }),
    packages: Flags.string({
      description: 'comma-separated @molecule/* packages to scaffold with',
    }),
  }

  public async run(): Promise<{ id: string; name: string; slug?: string }> {
    requireAuth()
    const { args, flags } = await this.parse(ProjectCreate)
    const packages = flags.packages
      ? flags.packages
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      : undefined
    const project = await createProject({
      name: args.name,
      projectType: flags.type,
      framework: flags.framework,
      packages,
    })
    this.log(`${ui.check('Created')} ${project.name} ${ui.dim(`→ ${project.id}`)}`)
    this.log(ui.cmd(`mlcl sandbox start --project ${project.id}`))
    return { id: project.id, name: project.name, slug: project.slug }
  }
}
