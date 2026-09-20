import { Command } from '@oclif/core'

import { getEgressPolicy } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class EgressGetCmd extends Command {
  static override description = 'View sandbox network egress policy (allowlist + denials)'

  static override examples = ['<%= config.bin %> egress get --project <id>']

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(EgressGetCmd)
    const policy = await getEgressPolicy(flags.project)
    this.log(`  default: ${policy.defaultPolicy ?? 'deny'}`)
    if ((policy.allowlist ?? []).length) {
      this.log(ui.heading('Allowed:'))
      for (const a of policy.allowlist!) this.log(`  ${ui.ok('✓')} ${a.host}`)
    }
    if ((policy.denials ?? []).length) {
      this.log(ui.heading('Denied:'))
      for (const d of policy.denials!) this.log(`  ${ui.warn('✗')} ${d.host}`)
    }
  }
}
