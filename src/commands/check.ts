import { Command, Flags } from '@oclif/core'

import { CHECK_STEP_KINDS, type CheckProgress, DEFAULT_CHECK_STEPS } from '../lib/check.js'
import {
  readHookInput,
  runRecordedCheck,
  runStopHook,
  STOP_HOOK_HARNESSES,
  type StopHookHarness,
} from '../lib/check-stop-hook.js'
import { withHeartbeat } from '../lib/create-progress.js'
import { ui } from '../lib/ui.js'

/**
 * Run the project's own checks — typecheck, lint and build by default, unit tests and e2e when
 * asked for — discovered from its package.json scripts, concurrently (e2e after the build), and
 * print one compact report with the first actionable errors. The local twin of the IDE's `check`
 * tool: one call instead of hand-running each script and grepping its output.
 *
 * Each step's start and finish, and every 30 s the steps still running, go to stderr, so a caller
 * reading only stdout (`--json`) gets the report alone and a harness watching the output never
 * sees a silent command it might take for a hang.
 */
export default class Check extends Command {
  static override description =
    'Run the project’s checks (typecheck, lint and build; unit and e2e with --steps — discovered from its scripts) and print one compact report with the first errors'

  static override examples = [
    '<%= config.bin %> check',
    '<%= config.bin %> check --steps typecheck,lint',
    '<%= config.bin %> check --steps unit,e2e',
    '<%= config.bin %> check --e2e "e2e/auth.spec.ts --grep login"',
    '<%= config.bin %> check --json',
  ]

  static override flags = {
    json: Flags.boolean({ description: 'Machine-readable report', default: false }),
    steps: Flags.string({
      description: `Only these steps, comma-separated, from ${CHECK_STEP_KINDS.join(', ')} (default: ${DEFAULT_CHECK_STEPS.join(', ')})`,
    }),
    e2e: Flags.string({
      description: 'Run e2e too, with these extra arguments (spec files, `--grep …`)',
    }),
    'stop-hook': Flags.string({
      description:
        "Answer this harness's stop hook: type-check and lint when files changed since the last pass, nothing printed on a pass, the errors handed back to the agent on a failure",
      options: [...STOP_HOOK_HARNESSES],
      exclusive: ['steps', 'e2e', 'json'],
    }),
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Check)
    const root = process.cwd()
    if (flags['stop-hook']) {
      await this.stopHook(root, flags['stop-hook'] as StopHookHarness)
      return
    }
    const running = new Set<string>()
    const progress = (event: CheckProgress): void => {
      if (event.type === 'start') {
        running.add(event.step.name)
        process.stderr.write(`check: ${event.step.name} started\n`)
      } else {
        running.delete(event.step.name)
        const seconds = Math.round(event.result.durationMs / 1000)
        process.stderr.write(`check: ${event.step.name} ${event.result.status} (${seconds}s)\n`)
      }
    }
    const result = await withHeartbeat(
      // A pass of every step the Stop hook runs is recorded, so the stop that follows skips it.
      () =>
        runRecordedCheck(root, { steps: flags.steps, e2e: flags.e2e }, { onProgress: progress }),
      (elapsed) => {
        if (running.size)
          process.stderr.write(`check: still running ${[...running].join(', ')} (${elapsed}s)\n`)
      },
    )
    // The tests run only when asked for; say so, so a pass is not read as "the tests passed".
    const testsSkipped = !flags.steps && !flags.e2e

    if ('error' in result) {
      this.error(result.error)
    }

    if (flags.json) {
      this.log(
        JSON.stringify(
          {
            ok: result.ok,
            results: result.results,
            ...(testsSkipped ? { notRun: ['unit', 'e2e'] } : {}),
          },
          null,
          2,
        ),
      )
      return
    }

    this.log(`\n${ui.heading('Check')} ${ui.dim(root)}`)
    this.log(result.report)
    if (testsSkipped) this.log(ui.dim('Tests did not run: npx mlcl check --steps unit,e2e'))
    if (!result.ok) this.exit(1)
  }

  /**
   * Answer a harness's stop hook. Never fails the hook: a check that cannot run lets the agent stop.
   *
   * @param root - The project root.
   * @param harness - The harness whose hook format to answer in.
   */
  private async stopHook(root: string, harness: StopHookHarness): Promise<void> {
    try {
      const output = await runStopHook(root, harness, await readHookInput())
      if (output) this.log(output)
    } catch (_error) {
      // A hook that throws would stop the harness from finishing; the agent's own check still applies.
    }
  }
}
