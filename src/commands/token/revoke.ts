import { Args, Command } from '@oclif/core'

import { apiTokenErrorMessage, ApiTokenInputError, resolveApiToken } from '../../lib/api-tokens.js'
import { t } from '../../lib/i18n.js'
import { listApiTokens, revokeApiToken } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { requireAuth } from '../../shared/project-flag.js'

export default class TokenRevoke extends Command {
  static override description = t('commands.token.revoke.description')

  static override examples = [
    '<%= config.bin %> token revoke ci',
    '<%= config.bin %> token revoke <id>',
    '<%= config.bin %> token revoke ci --json',
  ]

  static override enableJsonFlag = true

  static override args = {
    ref: Args.string({ description: t('commands.token.revoke.args.ref'), required: true }),
  }

  public async run(): Promise<{ id: string; name: string; revoked: boolean }> {
    const { args } = await this.parse(TokenRevoke)
    requireAuth()
    try {
      // Resolve through the list, so a name works and the output can say which token went.
      const target = resolveApiToken(await listApiTokens(), args.ref)
      const { revoked } = await revokeApiToken(target.id)
      this.log(ui.check(t('commands.token.revoke.revoked', { name: target.name, id: target.id })))
      return { id: target.id, name: target.name, revoked }
    } catch (error) {
      if (error instanceof ApiTokenInputError) this.error(error.message, { exit: 1 })
      const message = apiTokenErrorMessage(error)
      if (message) this.error(message, { exit: 1 })
      throw error
    }
  }
}
