import { Command, Flags } from '@oclif/core'

import { listTranscripts, type TranscriptSummary } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

/** How each source reads in the list. */
const SOURCE_LABEL: Record<TranscriptSummary['source'], string> = {
  'molecule-ide': 'ide',
  import: 'imported',
}

export default class TranscriptsListCmd extends Command {
  static override description =
    "List a project's session transcripts: its own chat in the molecule.dev IDE (source ide) and every imported session (source imported)"

  static override examples = ['<%= config.bin %> transcripts list --project <id>']

  static override flags = {
    project: projectFlag,
    json: Flags.boolean({ description: 'Output machine-readable JSON', default: false }),
  }

  public async run(): Promise<TranscriptSummary[]> {
    requireAuth()
    const { flags } = await this.parse(TranscriptsListCmd)
    const rows = await listTranscripts(flags.project)
    if (flags.json) {
      this.log(JSON.stringify(rows, null, 2))
      return rows
    }
    this.log(ui.heading(`${rows.length} sessions`))
    for (const t of rows) {
      const source = (SOURCE_LABEL[t.source] ?? t.source).padEnd(8)
      const when = t.startedAt ? `  ${t.startedAt.slice(0, 10)}` : ''
      this.log(
        `  ${ui.id(t.id)}  ${source}  ${t.harness} · ${t.turns} turns${when}  ${ui.dim(t.title)}`,
      )
    }
    return rows
  }
}
