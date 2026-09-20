import { Args, Command } from '@oclif/core'

import { setVaultSecret } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class VaultSetCmd extends Command {
  static override description = 'Write a vault secret'

  static override examples = ['<%= config.bin %> vault set --project <id> <key> <value>']

  static override args = {
    key: Args.string({ description: 'secret key', required: true }),
    value: Args.string({ description: 'secret value', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args: arg } = await this.parse(VaultSetCmd)
    const [key, value] = [arg.key, arg.value]
    if (!key || !value) this.error('Provide <key> <value>')
    await setVaultSecret(flags.project, key, value)
    this.log(ui.check('Set ') + key)
  }
}
