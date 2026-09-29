import { readFileSync, statSync } from 'node:fs'
import { basename, resolve } from 'node:path'

import { Args, Command, Flags } from '@oclif/core'

import {
  importTranscript,
  PlatformApiError,
  TRANSCRIPT_MAX_BYTES,
  type TranscriptSummary,
} from '../../lib/platform.js'
import {
  DISCOVERABLE_HARNESSES,
  type DiscoverableHarness,
  discoverSessions,
} from '../../lib/transcript-discovery.js'
import { ui } from '../../lib/ui.js'
import { projectFlag, requireAuth } from '../../shared/project-flag.js'

/** What happened to one file. */
export interface ImportOutcome {
  file: string
  status: 'imported' | 'already-imported' | 'unrecognized' | 'too-large' | 'failed' | 'would-send'
  size: number
  transcript?: TranscriptSummary
  error?: string
}

const mb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`

export default class TranscriptsImportCmd extends Command {
  static override description =
    'Import agent session transcripts (Claude Code, Codex and other harnesses) into a project'

  static override examples = [
    '<%= config.bin %> transcripts import --project <id> ./session.jsonl',
    '<%= config.bin %> transcripts import --project <id> --from claude-code',
    '<%= config.bin %> transcripts import --project <id> --from codex --cwd ./my-app --dry-run',
  ]

  static override strict = false

  static override args = {
    files: Args.string({ description: 'transcript files to import', required: false }),
  }

  static override flags = {
    project: projectFlag,
    from: Flags.string({
      description:
        "import this harness's local sessions for --cwd instead of named files (reads this machine's session store)",
      options: [...DISCOVERABLE_HARNESSES],
    }),
    cwd: Flags.string({
      description:
        'the project directory whose sessions --from looks for (default: current directory)',
    }),
    'dry-run': Flags.boolean({
      description: 'list what would be sent; send nothing',
      default: false,
    }),
    json: Flags.boolean({ description: 'Output machine-readable JSON', default: false }),
  }

  public async run(): Promise<ImportOutcome[]> {
    const { argv, flags } = await this.parse(TranscriptsImportCmd)
    const named = (argv as string[]).map((f) => resolve(f))
    if (named.length > 0 && flags.from) this.error('Pass files OR --from, not both.')
    if (named.length === 0 && !flags.from)
      this.error(
        'Pass transcript files, or --from claude-code|codex to import this directory’s sessions.',
      )

    const files = flags.from
      ? discoverSessions(flags.from as DiscoverableHarness, flags.cwd ?? process.cwd()).map(
          (s) => s.path,
        )
      : named
    if (files.length === 0) {
      const where = resolve(flags.cwd ?? process.cwd())
      this.error(`No ${flags.from} sessions recorded for ${where}.`)
    }

    if (!flags['dry-run']) requireAuth()
    const outcomes: ImportOutcome[] = []
    for (const file of files) {
      let size: number
      try {
        size = statSync(file).size
      } catch (error) {
        outcomes.push({ file, status: 'failed', size: 0, error: (error as Error).message })
        continue
      }
      if (size > TRANSCRIPT_MAX_BYTES) {
        outcomes.push({
          file,
          status: 'too-large',
          size,
          error: `${mb(size)} is over the ${mb(TRANSCRIPT_MAX_BYTES)} limit`,
        })
        continue
      }
      if (flags['dry-run']) {
        outcomes.push({ file, status: 'would-send', size })
        continue
      }
      try {
        const transcript = await importTranscript(flags.project, {
          fileName: basename(file),
          text: readFileSync(file, 'utf8'),
        })
        outcomes.push({
          file,
          status: transcript.existing ? 'already-imported' : 'imported',
          size,
          transcript,
        })
      } catch (error) {
        if (error instanceof PlatformApiError && error.status === 422) {
          outcomes.push({
            file,
            status: 'unrecognized',
            size,
            error: 'not a recognized transcript',
          })
        } else if (error instanceof PlatformApiError && error.status === 413) {
          outcomes.push({
            file,
            status: 'too-large',
            size,
            error: 'the platform refused it as too large',
          })
        } else {
          outcomes.push({ file, status: 'failed', size, error: (error as Error).message })
        }
      }
    }

    if (flags.json) {
      this.log(JSON.stringify(outcomes, null, 2))
    } else {
      for (const o of outcomes) {
        const name = basename(o.file)
        if ((o.status === 'imported' || o.status === 'already-imported') && o.transcript) {
          const t = o.transcript
          const label = o.status === 'imported' ? 'Imported' : 'Already imported'
          this.log(`${ui.check(label)} ${name}  ${t.harness} · ${t.turns} turns  ${t.id}`)
        } else if (o.status === 'would-send') {
          this.log(`  would send ${name}  ${mb(o.size)}`)
        } else {
          this.log(`${ui.cross(name)}  ${o.error ?? o.status}`)
        }
      }
    }

    const sent = outcomes.filter((o) => o.status !== 'would-send')
    if (
      sent.length > 0 &&
      sent.every((o) => o.status !== 'imported' && o.status !== 'already-imported')
    ) {
      this.exit(1)
    }
    return outcomes
  }
}
