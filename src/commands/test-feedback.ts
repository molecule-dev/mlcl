import { statSync, watch } from 'node:fs'
import { relative, resolve } from 'node:path'

import { Command, Flags } from '@oclif/core'

import {
  createLocalBackend,
  createPlaywrightFeedback,
  isPlaywrightFeedbackSource,
  isPlaywrightRunCommand,
  type PlaywrightFeedbackResult,
  readFeedbackSources,
  runPlaywrightFeedback,
  scopedRerunCommand,
} from '@molecule/api-ai-tools'

/** Run the supplied Playwright files while a coding agent keeps building. */
export default class TestFeedback extends Command {
  static override description =
    'Watch app sources and run supplied Playwright specs in the background; print only native locator failures, rendered-page context and triggering source paths'

  static override examples = [
    '<%= config.bin %> test-feedback --suite specs/e2e --sources app/src --command "BASE_URL=http://localhost:5173 npx --no-install playwright test --config playwright.config.ts" --watch',
    '<%= config.bin %> test-feedback --suite e2e --sources src --command "npx --no-install playwright test" --json',
  ]

  static override flags = {
    suite: Flags.string({
      description: 'Supplied or scaffolded Playwright suite directory',
      required: true,
    }),
    sources: Flags.string({ description: 'App source roots, comma-separated', default: 'src' }),
    command: Flags.string({
      description:
        'The suite’s native Playwright command targeting the local app (including config and environment)',
      required: true,
    }),
    watch: Flags.boolean({
      description: 'Keep watching while the agent builds; run this command as a background task',
      default: false,
    }),
    json: Flags.boolean({
      description: 'Emit one JSON object per native failure result',
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(TestFeedback)
    if (!isPlaywrightRunCommand(flags.command))
      this.error(
        '--command must invoke the native Playwright runner, e.g. npx --no-install playwright test --config playwright.config.ts',
      )
    const root = process.cwd(),
      suite = resolve(root, flags.suite)
    const sources = flags.sources
      .split(',')
      .map((p) => resolve(root, p.trim()))
      .filter(Boolean)
    const backend = createLocalBackend(root)
    const observed = [...new Set([...sources, suite])].map((path) => ({
      path,
      directory: statSync(path).isDirectory(),
    }))
    let failed = false,
      unavailable = false
    // A failure already printed is not printed again until a later write: the same locator may
    // still fail on the next revision, and then it is news again.
    const emitted = new Set<string>()
    const emit = (result: PlaywrightFeedbackResult): void => {
      const fresh = result.failures.filter((f) => {
        const identity = JSON.stringify([f.spec, f.line, f.locator])
        if (emitted.has(identity)) return false
        emitted.add(identity)
        return true
      })
      if (fresh.length === 0) return
      failed = true
      if (flags.json) {
        this.log(JSON.stringify({ ...result, failures: fresh }))
        return
      }
      for (const f of fresh) {
        this.log(
          `${f.spec}:${f.line}: ${f.locator}\nSource changes: ${f.sourceFiles.map((p) => relative(root, p)).join(', ')}\n${f.error}${f.rendered ? `\nRendered page (Playwright):\n${f.rendered}` : ''}`,
        )
      }
    }
    const controller = createPlaywrightFeedback({
      load: async () => {
        const files = await readFeedbackSources(backend, [suite, ...sources], [])
        return {
          sources: files.filter((f) => !/\.(?:spec|test)\.[cm]?[jt]sx?$/.test(f.path)),
          specs: files
            .filter(
              (f) =>
                !relative(suite, f.path).startsWith('..') &&
                /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(f.path),
            )
            .map((f) => ({ ...f, command: flags.command, cwd: root })),
        }
      },
      run: (spec, files, revision, onFailure, signal) =>
        runPlaywrightFeedback(backend, spec, files, revision, {
          command: (extra) =>
            scopedRerunCommand(
              `${spec.command} ${extra.join(' ')}`,
              [spec.path],
              [],
              undefined,
              root,
              [],
              { suiteSettings: true },
            ),
          emit: onFailure,
          signal,
        }),
      onResult: (result) => {
        if (result.status !== 'unavailable') return
        unavailable = true
        this.warn(`${result.spec}: ${result.reason}`)
      },
    })
    // The controller runs nothing by itself: every pass is an explicit checkpoint over the specs
    // the changed sources select. A write during a checkpoint cancels it, and the
    // next pass runs on the new source.
    const checkpoint = async (): Promise<void> => {
      for (const result of await controller.check()) if (result.status === 'failed') emit(result)
    }
    controller.changed(sources)
    if (!flags.watch) {
      await checkpoint()
      await controller.close()
      if (failed) this.exit(1)
      if (unavailable) this.exit(2)
      return
    }
    let timer: NodeJS.Timeout | undefined,
      checking: Promise<void> | undefined,
      again = false,
      closed = false
    const queue = (): void => {
      if (closed) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = undefined
        if (checking) {
          again = true
          return
        }
        checking = checkpoint().finally(() => {
          checking = undefined
          if (again) {
            again = false
            queue()
          }
        })
      }, 250)
    }
    queue()
    const watches = observed.map(({ path, directory }) =>
      watch(path, { recursive: true }, (_event, file) => {
        if (
          file &&
          isPlaywrightFeedbackSource(file.toString()) &&
          !/(?:^|[/\\])(?:node_modules|dist|\.git|\.mol)(?:[/\\]|$)/.test(file.toString())
        ) {
          emitted.clear()
          controller.changed([directory ? resolve(path, file.toString()) : path])
          queue()
        }
      }),
    )
    await new Promise<void>((done) => {
      const stop = (): void => {
        process.off('SIGINT', stop)
        process.off('SIGTERM', stop)
        closed = true
        if (timer) clearTimeout(timer)
        for (const watcher of watches) watcher.close()
        void controller
          .close()
          .then(() => checking)
          .then(done)
      }
      process.on('SIGINT', stop)
      process.on('SIGTERM', stop)
    })
  }
}
