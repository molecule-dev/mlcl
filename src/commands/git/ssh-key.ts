import { readFileSync } from 'node:fs'

import { Args, Command } from '@oclif/core'

import { setSshKey } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class GitSshKeyCmd extends Command {
  static override description = 'Store an SSH private key for git push from the sandbox'

  static override examples = ['<%= config.bin %> git ssh-key --project <id> ~/.ssh/id_ed25519']

  static override args = {
    path: Args.string({ description: 'path to SSH private key', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args } = await this.parse(GitSshKeyCmd)
    const key = readFileSync(args.path, 'utf8').trim()
    await setSshKey(flags.project, key)
    this.log(ui.check('SSH key stored.'))
  }
}
