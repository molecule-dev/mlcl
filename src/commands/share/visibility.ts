import { Command, Flags } from '@oclif/core'

import {
  getShareVisibility,
  PlatformApiError,
  type PublicWorkspaceResult,
  setPublicTranscripts,
  setPublicWorkspace,
  type ShareVisibility,
} from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

/** The state the command reports, plus what turning the workspace on copied. */
export interface ShareVisibilityResult extends ShareVisibility {
  /** Set when this run turned the public workspace on (or off). */
  workspaceCopy?: PublicWorkspaceResult
}

export default class ShareVisibilityCmd extends Command {
  static override description =
    "Show or set what a project's share links show: its session transcripts and a read-only view of its workspace. Turning the workspace on copies the files from the running sandbox at that moment; run it again with --workspace on to copy them again after changes."

  static override examples = [
    '<%= config.bin %> share visibility --project <id>',
    '<%= config.bin %> share visibility --project <id> --transcripts on --workspace on',
  ]

  static override flags = {
    project: projectFlag,
    transcripts: Flags.string({
      description: 'publish the session transcripts behind the share links',
      options: ['on', 'off'],
    }),
    workspace: Flags.string({
      description:
        'publish a read-only copy of the workspace files behind the share links (on copies them now; on again re-copies)',
      options: ['on', 'off'],
    }),
    json: Flags.boolean({ description: 'Output machine-readable JSON', default: false }),
  }

  public async run(): Promise<ShareVisibilityResult> {
    requireAuth()
    const { flags } = await this.parse(ShareVisibilityCmd)
    if (flags.transcripts) await setPublicTranscripts(flags.project, flags.transcripts === 'on')
    let workspaceCopy: PublicWorkspaceResult | undefined
    if (flags.workspace) {
      try {
        workspaceCopy = await setPublicWorkspace(flags.project, flags.workspace === 'on')
      } catch (error) {
        if (error instanceof PlatformApiError && error.errorKey === 'workspace.sleeping') {
          this.error(
            `Start the project's sandbox first (mlcl sandbox start -p ${flags.project}); the files are copied when the public workspace is turned on.`,
            { exit: 1 },
          )
        }
        throw error
      }
    }
    const state: ShareVisibilityResult = await getShareVisibility(flags.project)
    if (workspaceCopy) state.workspaceCopy = workspaceCopy
    if (flags.json) {
      this.log(JSON.stringify(state, null, 2))
      return state
    }
    const word = (on: boolean): string => (on ? ui.ok('public') : ui.dim('private'))
    if (workspaceCopy?.enabled) {
      this.log(
        ui.check(
          `Public workspace on: ${workspaceCopy.files} files as of ${workspaceCopy.capturedAt ?? 'now'}`,
        ),
      )
    }
    this.log(`  transcripts  ${word(state.transcripts)}`)
    this.log(`  workspace    ${word(state.workspace)}`)
    return state
  }
}
