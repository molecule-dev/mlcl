import { chmodSync, writeFileSync } from 'node:fs'

import { Command, Flags } from '@oclif/core'

import { exportAccountData } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { requireAuth } from '../../shared/project-flag.js'

export default class AccountExportCmd extends Command {
  static override description = 'GDPR data export (all your data as JSON)'

  static override examples = [
    '<%= config.bin %> account export',
    '<%= config.bin %> account export --out my-data.json',
  ]

  static override flags = {
    out: Flags.string({ description: 'write the JSON to this file instead of stdout' }),
    // Accepted and ignored: an export is always the signed-in account's data.
    // Kept so scripts that still pass --project do not break.
    project: Flags.string({ hidden: true, char: 'p', description: 'ignored' }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(AccountExportCmd)
    const data = await exportAccountData()
    const truncated = Object.entries(data.meta?.truncatedSections ?? {})
      .filter(([, info]) => info?.truncated)
      .map(([name, info]) => `${name} (first ${info.limit} rows)`)
    if (truncated.length) {
      this.logToStderr(
        ui.warn(
          `This export is incomplete: ${truncated.join(', ')} hit the row limit and do not hold all your data.`,
        ),
      )
    }
    const json = JSON.stringify(data, null, 2)
    if (flags.out) {
      writeFileSync(flags.out, `${json}\n`, { mode: 0o600 })
      // `mode` applies only when the file is created; tighten one that already existed.
      try {
        chmodSync(flags.out, 0o600)
      } catch (_error) {
        // Windows has no POSIX modes; nothing to tighten there.
      }
      this.logToStderr(ui.check(`Wrote ${flags.out}.`))
      return
    }
    this.log(json)
  }
}
