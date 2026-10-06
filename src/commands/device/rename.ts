import { Args, Command } from '@oclif/core'

import { renameDevice } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { requireAuth } from '../../shared/project-flag.js'

export default class DeviceRename extends Command {
  static override description = 'Rename a device (how it appears in the IDE session list)'

  static override examples = ['<%= config.bin %> device rename <id> "work laptop"']

  static override args = {
    id: Args.string({ description: 'Device id', required: true }),
    name: Args.string({ description: 'New name', required: true }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { args } = await this.parse(DeviceRename)
    await renameDevice(args.id, args.name)
    this.log(`${ui.check('Renamed')} ${ui.id(args.id)} ${ui.dim('→')} ${ui.cmd(args.name)}`)
  }
}
