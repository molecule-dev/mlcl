import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web'

import { Args, Command, Flags } from '@oclif/core'

import { apiBaseUrl, readCredentials } from '../../lib/platform.js'
import { ui } from '../../lib/ui.js'
import { requireAuth } from '../../shared/project-flag.js'

/**
 * GET /projects/:id/export — the no-lock-in EJECT bundle: a single .tar.gz
 * carrying the project source, a pg_dump of its dev database, the resolved
 * .env files (brokered tokens omitted server-side), a MANIFEST, and an
 * EJECTED.md with the run-it-anywhere-else steps. Closes the one ⬜ row in
 * docs/PARITY.md.
 */
export default class ProjectExportCmd extends Command {
  static override description =
    'Download the project eject bundle (.tar.gz: code + database dump + .env + manifest) — take the project anywhere'

  static override examples = [
    '<%= config.bin %> project export <id>',
    '<%= config.bin %> project export <id> -o ./eject.tar.gz',
  ]

  static override args = {
    id: Args.string({ description: 'project id', required: true }),
  }

  static override flags = {
    out: Flags.string({
      char: 'o',
      description: 'Output path (default: ./molecule-export-<projectId>.tar.gz)',
    }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { args, flags } = await this.parse(ProjectExportCmd)
    const token = process.env.MOLECULE_TOKEN ?? readCredentials()?.token
    const response = await fetch(`${apiBaseUrl()}/projects/${args.id}/export`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(10 * 60_000),
    })
    if (!response.ok || !response.body) {
      // Errors arrive as JSON (a success is a streamed tarball).
      const text = await response.text().catch(() => '')
      let message = `API responded ${response.status}`
      try {
        message = (JSON.parse(text) as { error?: string }).error ?? message
      } catch (_error) {
        // Error body wasn't JSON — keep the generic line.
      }
      this.error(message, { exit: 1 })
    }

    const disposition = response.headers.get('content-disposition') ?? ''
    const fromHeader = /filename="?([^";]+)"?/.exec(disposition)?.[1]
    const out = flags.out ?? fromHeader ?? `molecule-export-${args.id}.tar.gz`

    await pipeline(Readable.fromWeb(response.body as NodeWebReadableStream), createWriteStream(out))
    this.log(`${ui.check('Exported')} ${ui.id(out)} ${ui.dim(`from project ${args.id}`)}`)
    this.log(ui.dim('The bundle carries a MANIFEST.txt describing exactly what it contains.'))
  }
}
