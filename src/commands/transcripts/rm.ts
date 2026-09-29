import { Args, Command } from '@oclif/core'

import { listTranscripts, PlatformApiError, removeTranscript } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

export default class TranscriptsRmCmd extends Command {
  static override description =
    "Remove an imported session transcript from a project (the project's own IDE conversations cannot be removed here)"

  static override examples = ['<%= config.bin %> transcripts rm --project <id> <transcriptId>']

  static override args = {
    transcriptId: Args.string({
      description: 'transcript id (from `transcripts list`)',
      required: true,
    }),
  }

  static override flags = { project: projectFlag }

  public async run(): Promise<void> {
    requireAuth()
    const { flags, args } = await this.parse(TranscriptsRmCmd)
    try {
      await removeTranscript(flags.project, args.transcriptId)
    } catch (error) {
      if (!(error instanceof PlatformApiError) || error.status !== 404) throw error
      // Only imported sessions are stored as transcripts; an IDE conversation is
      // listed alongside them but is the project's chat, not an import.
      const rows = await listTranscripts(flags.project).catch((_error) => [])
      const match = rows.find((t) => t.id === args.transcriptId)
      if (match?.source === 'molecule-ide') {
        this.error(
          `${args.transcriptId} is the project's own conversation in the molecule.dev IDE, not an imported session, so it cannot be removed. Keep it out of the share page with \`mlcl share visibility -p ${flags.project} --transcripts off\`.`,
          { exit: 1 },
        )
      }
      this.error(`No imported transcript ${args.transcriptId} in this project.`, { exit: 1 })
    }
    this.log(ui.check('Removed.'))
  }
}
