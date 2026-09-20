import { Command } from '@oclif/core'

import { localDeviceId } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'

export default class DeviceCurrent extends Command {
  static override description =
    'Print the device id this CLI is logged in as (offline — decodes the local token)'

  static override enableJsonFlag = true

  public async run(): Promise<{ deviceId: string | null }> {
    const deviceId = localDeviceId()
    if (!deviceId) {
      this.log(ui.warn('Not logged in.'))
      return { deviceId: null }
    }
    this.log(deviceId)
    return { deviceId }
  }
}
