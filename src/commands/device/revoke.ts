import { Args, Command, Flags } from '@oclif/core'

import { listDevices, localDeviceId, revokeDevice } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { requireAuth } from './list.js'

export default class DeviceRevoke extends Command {
  static override description =
    'Revoke a device/session — kills every token bound to it, including a stolen CLI login. --all-but-current signs out everywhere except this machine.'

  static override examples = [
    '<%= config.bin %> device revoke <id>',
    '<%= config.bin %> device revoke --all-but-current',
  ]

  static override args = {
    id: Args.string({ description: 'Device id (from mlcl device list)', required: false }),
  }

  static override flags = {
    'all-but-current': Flags.boolean({
      description: 'Revoke every device EXCEPT the one this CLI is logged in as',
      default: false,
    }),
    force: Flags.boolean({ description: 'Skip the self-revocation confirmation', default: false }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { args, flags } = await this.parse(DeviceRevoke)
    const mine = localDeviceId()

    let targets: string[]
    if (flags['all-but-current']) {
      targets = (await listDevices()).map((d) => d.id).filter((id) => id !== mine)
      if (targets.length === 0) {
        this.log(ui.ok('Nothing to revoke — only the current device exists.'))
        return
      }
    } else {
      if (!args.id) this.error('Provide a device id (mlcl device list) or --all-but-current')
      targets = [args.id]
      if (targets[0] === mine && !flags.force) {
        this.log(ui.warn('That is THIS machine — revoking it logs this CLI out. Continue? [y/N] '))
        const answer = await new Promise<string>((resolve) => {
          process.stdin.once('data', (d) => resolve(d.toString().trim().toLowerCase()))
        })
        if (answer !== 'y' && answer !== 'yes') {
          this.log('Aborted.')
          return
        }
      }
    }

    for (const id of targets) {
      await revokeDevice(id)
      this.log(
        `${ui.check('Revoked')} ${ui.id(id)}${id === mine ? ui.dim('  (this machine — you are now logged out)') : ''}`,
      )
    }
    this.log(ui.dim('\nRevoked tokens die within ~10s (the platform device-check cache).'))
  }
}
