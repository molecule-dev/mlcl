import { Command, Flags } from '@oclif/core'

import { updateProfile } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ProfileUpdateCmd extends Command {
  static override description = 'Update your profile'

  static override examples = ['<%= config.bin %> profile update --name "Your Name" --bio "..."']

  static override flags = {
    project: projectFlag,
    name: Flags.string({ description: 'display name' }),
    username: Flags.string({ description: 'username' }),
    bio: Flags.string({ description: 'bio' }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(ProfileUpdateCmd)
    const fields: Record<string, string> = {}
    if (flags.name) fields.name = flags.name
    if (flags.username) fields.username = flags.username
    if (flags.bio) fields.bio = flags.bio
    if (Object.keys(fields).length === 0) this.error('Provide --name, --username, or --bio')
    await updateProfile(fields)
    this.log(ui.check('Updated.'))
  }
}
