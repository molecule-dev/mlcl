import { Command, Flags } from '@oclif/core'

import { deleteAccount } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class AccountDeleteCmd extends Command {
  static override description =
    'Delete your molecule.dev account (DESTRUCTIVE — all projects, sandboxes, data)'

  static override examples = ['<%= config.bin %> account delete --force']

  static override flags = {
    project: projectFlag,
    force: Flags.boolean({ description: 'skip confirmation', default: false }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(AccountDeleteCmd)
    if (!flags.force) {
      this.log(
        ui.warn(
          'This PERMANENTLY deletes your account and ALL projects. Type "delete my account" to confirm:',
        ),
      )
      const answer = await new Promise<string>((r) =>
        process.stdin.once('data', (d) => r(d.toString().trim())),
      )
      if (answer !== 'delete my account') {
        this.log('Aborted.')
        return
      }
    }
    await deleteAccount()
    this.log(ui.check('Account deleted. The stored token is now dead.'))
  }
}
