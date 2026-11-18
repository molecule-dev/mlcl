import { Command } from '@oclif/core'

import { sandboxExec } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

/**
 * One word quoted for a POSIX shell, unchanged when it needs no quoting.
 *
 * @param word - An argument.
 * @returns The word as the sandbox shell must read it to see exactly this argument.
 */
export function shellQuote(word: string): string {
  return /^[A-Za-z0-9_@%+=:,./-]+$/.test(word) ? word : `'${word.replace(/'/g, `'\\''`)}'`
}

/**
 * The command line the sandbox shell runs. One argument is a whole command line and is sent as
 * written (`-- "npm test && npm run lint"`). Several arguments are an argv, each quoted so the
 * shell sees exactly those words (`-- sh -c 'cd app && npm test'`). Joining them with spaces
 * dropped the quoting: that `sh -c` ran `cd` alone and the rest at the workspace root.
 *
 * @param argv - The arguments after `--`.
 * @returns The command string for the API.
 */
export function commandLine(argv: string[]): string {
  if (argv.length <= 1) return argv[0] ?? ''
  return argv.map(shellQuote).join(' ')
}

export default class SandboxExecCmd extends Command {
  static override description =
    'Run a command in the project sandbox (exits with the command’s exit code)'

  static override strict = false

  static override examples = [
    '<%= config.bin %> sandbox exec --project <id> -- npm test',
    '<%= config.bin %> sandbox exec --project <id> -- "cd my-app && npm run build"',
    "<%= config.bin %> sandbox exec --project <id> -- sh -c 'cd my-app && npm test'",
  ]

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, argv } = await this.parse(SandboxExecCmd)
    const command = commandLine(argv as string[])
    if (!command) this.error('Provide a command after --')
    const result = await sandboxExec(flags.project, command)
    if (result.stdout) this.log(result.stdout)
    if (result.stderr) this.log(ui.warn(result.stderr))
    // A failing command must fail this one too, or a script cannot tell a red test run from green.
    if (typeof result.exitCode === 'number' && result.exitCode !== 0) this.exit(result.exitCode)
  }
}
