import { Command } from '@oclif/core'

import { getDetectedEnvKeys } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class EnvDetectedCmd extends Command {
  static override description =
    'List env keys detected from code + registry (what the app looks for)'

  static override examples = ['<%= config.bin %> env detected --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(EnvDetectedCmd)
    const keys = await getDetectedEnvKeys(flags.project)
    this.log(ui.heading(`${keys.length} detected keys`))
    for (const k of keys) this.log(`  ${k}`)
  }
}
