import { Command, Flags } from '@oclif/core'

import { getLogs, streamLogs } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class LogsCmd extends Command {
  static override description = 'Fetch runtime logs (last N lines) — use --stream for live tailing'

  static override examples = ['<%= config.bin %> logs --project <id> [--tail 100] [--stream]']

  static override flags = {
    project: projectFlag,
    tail: Flags.integer({ description: 'number of lines', default: 100 }),
    stream: Flags.boolean({ description: 'live tail (SSE)', default: false }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { flags } = await this.parse(LogsCmd)
    if (flags.stream) {
      this.log(ui.dim('Streaming logs (Ctrl+C to stop)…'))
      try {
        await streamLogs(flags.project, (line) =>
          this.log(
            `${ui.dim(line.timestamp)} ${line.level === 'error' ? ui.warn(line.level) : ui.dim(line.level)} ${line.message}`,
          ),
        )
      } catch (_error) {
        this.log(ui.dim('Stream ended.'))
      }
      return
    }
    const logs = await getLogs(flags.project, flags.tail)
    for (const l of logs) this.log(`${ui.dim(l.timestamp)} ${l.level} ${l.message}`)
  }
}
