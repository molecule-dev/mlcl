import { Command } from '@oclif/core'

import { apiTokenDay, apiTokenErrorMessage } from '../../lib/api-tokens.js'
import { t } from '../../lib/i18n.js'
import { listApiTokens, type PlatformApiToken } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { requireAuth } from '../../shared/project-flag.js'

export default class TokenList extends Command {
  static override description = t('commands.token.list.description')

  static override examples = ['<%= config.bin %> token list', '<%= config.bin %> token list --json']

  static override enableJsonFlag = true

  public async run(): Promise<PlatformApiToken[]> {
    await this.parse(TokenList)
    requireAuth()
    let tokens: PlatformApiToken[]
    try {
      tokens = await listApiTokens()
    } catch (error) {
      const message = apiTokenErrorMessage(error)
      if (message) this.error(message, { exit: 1 })
      throw error
    }

    if (tokens.length === 0) {
      this.log(ui.dim(t('commands.token.list.empty')))
      return tokens
    }

    const now = Date.now()
    const header = [
      t('commands.token.list.columns.id'),
      t('commands.token.list.columns.name'),
      t('commands.token.list.columns.created'),
      t('commands.token.list.columns.expires'),
      t('commands.token.list.columns.lastUsed'),
    ]
    const rows = tokens.map((row) => {
      const expires = apiTokenDay(row.expiresAt)
      return [
        row.id,
        row.name,
        apiTokenDay(row.createdAt),
        Date.parse(row.expiresAt) < now
          ? t('commands.token.list.expired', { date: expires })
          : expires,
        row.lastUsedAt ? apiTokenDay(row.lastUsedAt) : t('commands.token.list.never'),
      ]
    })
    const widths = header.map((cell, i) => Math.max(cell.length, ...rows.map((r) => r[i].length)))
    const line = (cells: string[]): string =>
      cells.map((cell, i) => (i === cells.length - 1 ? cell : cell.padEnd(widths[i]))).join('  ')

    this.log(
      `\n${ui.heading(t('commands.token.list.heading', { count: tokens.length }))} ${ui.dim(t('commands.token.list.revokeHint'))}\n`,
    )
    this.log(`  ${ui.dim(line(header))}`)
    for (const cells of rows) this.log(`  ${line(cells)}`)
    this.log('')
    return tokens
  }
}
