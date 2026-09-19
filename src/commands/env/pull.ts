import { Flags } from '@oclif/core'
import { Command } from '@oclif/core'

import { defaultEnvPath, loadEnvFile, saveEnvFile, setEnvValue } from '../../lib/env-store.js'
import { getProjectEnv, readCredentials } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'

export default class EnvPull extends Command {
  static override description =
    'Pull the project\u2019s environment variables from molecule.dev into the local .env (masked server-side values are skipped with a warning)'

  static override examples = ['<%= config.bin %> env pull --project <id>']

  static override flags = {
    project: Flags.string({ char: 'p', description: 'molecule.dev project id', required: true }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(EnvPull)
    if (!readCredentials()) {
      this.error('Not logged in — run `mlcl login` first.', { exit: 1 })
    }
    const remote = await getProjectEnv(flags.project)
    const file = loadEnvFile(defaultEnvPath())
    let applied = 0
    const skipped: string[] = []
    for (const entry of remote) {
      if (entry.masked || entry.value === undefined) {
        skipped.push(entry.key)
        continue
      }
      setEnvValue(file, entry.key, entry.value)
      applied++
    }
    saveEnvFile(file)
    this.log(`${ui.check('Pulled')} ${applied} variables ${ui.dim(`→ ${file.path}`)}`)
    if (skipped.length > 0) {
      this.log(
        ui.warn(
          `  ${skipped.length} secret value(s) are write-only on the platform and were skipped: ${skipped.join(', ')}`,
        ),
      )
    }
  }
}
