import { Command, Flags } from '@oclif/core'
import { CLI_COMMAND } from '#cli-command'

import {
  CHECK_STEP_KINDS,
  type CheckProgress,
  DEFAULT_CHECK_STEPS,
  selectedCheckSteps,
} from '../lib/check.js'
import { SERVE_READY_TIMEOUT_MS } from '../lib/check-serve.js'
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
 * Run the project's own checks — typecheck, lint and build by default, with unit tests, e2e and a
 * live service check available on request. The e2e and serve steps wait for the build. Print
 * one compact report with the first actionable errors. The local twin of the IDE's `check`
 * tool: one call instead of hand-running each script and grepping its output.
 *
 * Each step's start and finish, and every 30 s the steps still running, go to stderr, so a caller
 * reading only stdout (`--json`) gets the report alone and a harness watching the output never
 * sees a silent command it might take for a hang.
 */
export default class Check extends Command {
  static override description =
    'Run the project’s checks and print the first errors. Use --steps serve with --ready and --run to start the app, check its behavior and stop it. Use unit or e2e when an existing test script already manages the service.'

  static override examples = [
    '<%= config.bin %> check',
    '<%= config.bin %> check --steps typecheck,lint',
    '<%= config.bin %> check --steps unit,e2e',
    '<%= config.bin %> check --e2e "e2e/auth.spec.ts --grep login"',
    '<%= config.bin %> check --steps serve --ready http://localhost:3000/health --run "curl -fsS http://localhost:3000/api/items"',
    '<%= config.bin %> check --steps build,serve --start preview --ready http://127.0.0.1:4173/ --run "curl -fsS http://127.0.0.1:4173/"',
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
    ready: Flags.string({
      description: `HTTP URL on localhost or 127.0.0.1 for serve. Any HTTP response within ${SERVE_READY_TIMEOUT_MS / 1000}s counts as ready.`,
      helpValue: '<url>',
    }),
    run: Flags.string({
      description: 'Shell assertion for serve, run from the project root after the service answers',
      helpValue: '<command>',
    }),
    start: Flags.string({
      description: 'npm script for serve (defaults to start if declared, otherwise dev)',
      helpValue: '<script>',
    }),
    'stop-hook': Flags.string({
      description:
        "Answer this harness's stop hook: type-check and lint when files changed since the last pass, nothing printed on a pass, the errors handed back to the agent on a failure",
      options: [...STOP_HOOK_HARNESSES],
      exclusive: ['steps', 'e2e', 'json', 'ready', 'run', 'start'],
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
    // The check this one waits for (check-lock.ts) until its own first step starts.
    let waitingFor: number | undefined
    const progress = (event: CheckProgress): void => {
      waitingFor = undefined
      if (event.type === 'start') {
        running.add(event.step.name)
        process.stderr.write(`check: ${event.step.name} started\n`)
      } else if (event.type === 'note') {
        process.stderr.write(`check: ${event.step.name} ${event.text}\n`)
      } else {
        running.delete(event.step.name)
        const seconds = Math.round(event.result.durationMs / 1000)
        process.stderr.write(`check: ${event.step.name} ${event.result.status} (${seconds}s)\n`)
      }
    }
    const input = {
      steps: flags.steps,
      e2e: flags.e2e,
      ready: flags.ready,
      run: flags.run,
      start: flags.start,
    }
    const selection = selectedCheckSteps(input)
    const handlesSignals = 'steps' in selection && selection.steps.includes('serve')
    const controller = new AbortController()
    let exitCode: number | undefined
    const cancel = (signal: NodeJS.Signals): void => {
      exitCode ??= signal === 'SIGINT' ? 130 : 143
      controller.abort()
    }
    if (handlesSignals) {
      process.on('SIGINT', cancel)
      process.on('SIGTERM', cancel)
    }
    const result = await withHeartbeat(
      // A pass of every step the Stop hook runs is recorded, so the stop that follows skips it.
      () =>
        runRecordedCheck(root, input, {
          onProgress: progress,
          signal: controller.signal,
          onWait: (holder) => {
            waitingFor = holder
            process.stderr.write(
              `check: waiting for the check already running in this project (pid ${holder})\n`,
            )
          },
        }),
      (elapsed) => {
        if (running.size)
          process.stderr.write(`check: still running ${[...running].join(', ')} (${elapsed}s)\n`)
        else if (waitingFor !== undefined)
          process.stderr.write(
            `check: still waiting for the check already running in this project (pid ${waitingFor}, ${elapsed}s)\n`,
          )
      },
    ).finally(() => {
      if (handlesSignals) {
        process.off('SIGINT', cancel)
        process.off('SIGTERM', cancel)
      }
    })
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
      if (exitCode !== undefined) this.exit(exitCode)
      return
    }

    this.log(`\n${ui.heading('Check')} ${ui.dim(root)}`)
    this.log(result.report)
    if (testsSkipped) this.log(ui.dim(`Tests did not run: ${CLI_COMMAND} check --steps unit,e2e`))
    if (exitCode !== undefined || !result.ok) this.exit(exitCode ?? 1)
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
