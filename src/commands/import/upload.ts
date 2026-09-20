import { Args, Command } from '@oclif/core'

import { uploadImportTarball } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class ImportUploadCmd extends Command {
  static override description = 'Upload a repo tarball (.tar.gz) for import into the sandbox'

  static override examples = ['<%= config.bin %> import upload --project <id> ~/repo.tar.gz']

  static override args = {
    path: Args.string({ description: 'path to .tar.gz', required: true }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args } = await this.parse(ImportUploadCmd)
    this.log(ui.dim('Uploading…'))
    await uploadImportTarball(flags.project, args.path)
    this.log(ui.check('Uploaded — the sandbox will boot with this repo.'))
  }
}
