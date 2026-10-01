import { Command, Flags } from '@oclif/core'

import { CHECK_STEP_KINDS, runCheckLocal } from '../lib/check.js'
import { ui } from '../lib/ui.js'

/**
 * Run the project's own checks — typecheck, lint (changed files), build, unit
 * tests, e2e — discovered from its package.json scripts, concurrently (e2e
 * after the build), and print one compact report with the first actionable
 * errors. The local twin of the IDE's `check` tool: one call instead of
 * hand-running each script and grepping its output.
 */
export default class Check extends Command {
  static override description =
    'Run the project’s checks (typecheck, lint, build, unit, e2e — discovered from its scripts) and print one compact report with the first errors'

  static override examples = [
    '<%= config.bin %> check',
    '<%= config.bin %> check --steps typecheck,lint',
    '<%= config.bin %> check --e2e "e2e/auth.spec.ts --grep login"',
    '<%= config.bin %> check --json',
  ]

  static override flags = {
    json: Flags.boolean({ description: 'Machine-readable report', default: false }),
    steps: Flags.string({
      description: `Only these steps, comma-separated (default: all of ${CHECK_STEP_KINDS.join(', ')})`,
    }),
    e2e: Flags.string({
      description: 'Extra arguments for the e2e run (spec files, `--grep …`)',
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Check)
    const root = process.cwd()
    const result = await runCheckLocal(root, { steps: flags.steps, e2e: flags.e2e })

    if ('error' in result) {
      this.error(result.error)
    }

    if (flags.json) {
      this.log(JSON.stringify({ ok: result.ok, results: result.results }, null, 2))
      return
    }

    this.log(`\n${ui.heading('Check')} ${ui.dim(root)}`)
    this.log(result.report)
    if (!result.ok) this.exit(1)
  }
}
