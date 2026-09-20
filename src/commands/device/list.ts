import { Command } from '@oclif/core'

import { listDevices, localDeviceId, readCredentials } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'

export function requireAuth(): void {
  if (!readCredentials() && !process.env.MOLECULE_TOKEN) {
    throw new Error('Not logged in — run `mlcl login` first (or set MOLECULE_TOKEN for CI).')
  }
}

export default class DeviceList extends Command {
  static override description =
    'List your molecule.dev devices/sessions (browsers + CLIs) — revoking one kills its token'

  static override examples = [
    '<%= config.bin %> device list',
    '<%= config.bin %> device list --json',
  ]

  static override enableJsonFlag = true

  public async run(): Promise<
    Array<{ id: string; name?: string; current: boolean; updatedAt?: string }>
  > {
    requireAuth()
    const devices = await listDevices()
    const mine = localDeviceId()
    const rows = devices.map((d) => ({
      id: d.id,
      name: d.name,
      current: d.id === mine || d.current === true,
      updatedAt: d.updatedAt,
    }))

    const { flags } = await this.parse(DeviceList)
    if (flags.json) {
      this.log(JSON.stringify(rows, null, 2))
      return rows
    }

    this.log(
      `\n${ui.heading(`${rows.length} device${rows.length === 1 ? '' : 's'}`)} ${ui.dim('(revoke with: mlcl device revoke <id>)')}\n`,
    )
    for (const d of rows.sort((a, b) => Number(b.current) - Number(a.current))) {
      const marker = d.current ? ui.ok('●') : ' '
      this.log(
        `  ${marker} ${ui.id(d.id)}  ${d.name ?? ui.dim('unnamed')}${d.current ? ui.dim('  ← this machine') : ''}`,
      )
    }
    this.log('')
    return rows
  }
}
