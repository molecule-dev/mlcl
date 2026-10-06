import { Args, Command, Flags } from '@oclif/core'

import {
  apiTokenDay,
  apiTokenErrorMessage,
  ApiTokenInputError,
  validateApiTokenExpiry,
  validateApiTokenName,
} from '../../lib/api-tokens.js'
import { t } from '../../lib/i18n.js'
import { createApiToken, type CreatedApiToken } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { requireAuth } from '../../shared/project-flag.js'

export default class TokenCreate extends Command {
  static override description = t('commands.token.create.description')

  static override examples = [
    '<%= config.bin %> token create ci',
    '<%= config.bin %> token create nightly-backup --expires-in-days 30',
    'TOKEN=$(<%= config.bin %> token create ci --json | jq -r .token)',
  ]

  static override enableJsonFlag = true

  static override args = {
    name: Args.string({ description: t('commands.token.create.args.name'), required: true }),
  }

  static override flags = {
    'expires-in-days': Flags.string({
      description: t('commands.token.create.flags.expiresInDays'),
      helpValue: '<days>',
      default: '90',
    }),
  }

  public async run(): Promise<CreatedApiToken> {
    const { args, flags } = await this.parse(TokenCreate)
    // The name is free text the person typed: it is never handed to telemetry.
    let name: string
    let expiresInDays: number
    try {
      name = validateApiTokenName(args.name)
      expiresInDays = validateApiTokenExpiry(flags['expires-in-days'])
    } catch (error) {
      if (error instanceof ApiTokenInputError) this.error(error.message, { exit: 1 })
      throw error
    }
    requireAuth()

    let created: CreatedApiToken
    try {
      created = await createApiToken({ name, expiresInDays })
    } catch (error) {
      const message = apiTokenErrorMessage(error, { name })
      if (message) this.error(message, { exit: 1 })
      throw error
    }
    if (!created?.token) this.error(t('commands.token.errors.noToken', { name }), { exit: 1 })

    // stdout carries the token alone, so `$(mlcl token create ci)` captures exactly it;
    // everything meant for the person goes to stderr.
    this.logToStderr(
      ui.check(
        t('commands.token.create.created', { name, expires: apiTokenDay(created.expiresAt) }),
      ),
    )
    this.logToStderr(ui.warn(t('commands.token.create.shownOnce')))
    this.log(created.token)
    this.logToStderr(ui.dim(t('commands.token.create.useIt')))
    this.logToStderr(ui.dim(t('commands.token.create.revokeIt', { name })))
    return created
  }
}
