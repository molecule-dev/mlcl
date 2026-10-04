import * as p from '@clack/prompts'
import { Command, Flags } from '@oclif/core'

import { deleteAccount, PlatformApiError } from '../../lib/platform.js'
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
    const entered = await p.password({
      message: 'Your password (leave blank if you sign in with a provider):',
    })
    if (p.isCancel(entered)) {
      this.log('Aborted.')
      return
    }
    try {
      await deleteAccount(entered || undefined)
    } catch (error) {
      const message = accountDeleteErrorMessage(error)
      if (message) this.error(message)
      throw error
    }
    this.log(ui.check('Account deleted. The stored token is now dead.'))
  }
}

/** Plain one-line messages for the platform's account-deletion refusals. */
export function accountDeleteErrorMessage(error: unknown): string | undefined {
  if (!(error instanceof PlatformApiError)) return undefined
  switch (error.errorKey) {
    case 'user.error.passwordMismatch':
      return 'That password is not right.'
    case 'user.error.passwordRequired':
      return 'Enter your password to delete your account.'
    case 'service.busy':
      return 'We could not cancel your subscription, so nothing was deleted. Try again in a minute.'
    default:
      return undefined
  }
}
