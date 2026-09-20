import { Command } from '@oclif/core'

import { getAiModels } from '../lib/platform.js'
import { ui } from '../lib/ui.js'
import { projectFlag, requireAuth } from '../shared/project-flag.js'

export default class ModelsCmd extends Command {
  static override description = 'AI model catalog (all models, defaults marked)'

  static override examples = ['<%= config.bin %> models [--json]']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const models = await getAiModels()
    for (const m of models) {
      const marker = m.isDefault ? ui.ok('● default') : '  '
      this.log(
        `  ${marker} ${m.id}  ${m.name ?? ''}  ${m.provider ?? ''}  ctx: ${m.contextWindow ?? '?'}`,
      )
    }
  }
}
