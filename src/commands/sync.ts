import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

import { Args, Command, Flags } from '@oclif/core'

import { writeProjectFile } from '../lib/platform.js'
import { ui } from '../lib/ui.js'
import { projectFlag, requireAuth } from '../shared/project-flag.js'

/** Directories never worth sending: installs, builds, VCS and tool output. */
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  '.vite',
  'coverage',
  'test-results',
  'playwright-report',
  'blob-report',
  '.meilisearch',
  '.cache',
])

/** Binary extensions the text-only files API cannot carry. */
const BINARY_EXT = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.eot',
  '.zip',
  '.gz',
  '.tgz',
  '.pdf',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
  '.wasm',
])

/** Files that are local state, never project source. */
const SKIP_FILES = new Set(['.DS_Store'])

/**
 * Whether a buffer looks like text: no NUL byte in the first 8 KB. A binary
 * file that slips past the extension list is skipped with a note, not sent
 * mangled.
 */
function looksLikeText(buf: Buffer): boolean {
  const head = buf.subarray(0, 8192)
  return !head.includes(0)
}

/** Walk a tree, yielding project-relative POSIX paths of the files to send. */
function* walk(root: string, dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      yield* walk(root, full)
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue
      if (/^\.env(\..*)?$/.test(entry.name) && entry.name !== '.env.example') continue
      yield relative(root, full).split(sep).join('/')
    }
  }
}

/**
 * Push a local project tree into a project's sandbox — every text file under
 * the directory is written through the files API (`PUT /projects/:id/files/*`),
 * so what the sandbox holds is what you have on disk. Installs, builds, VCS
 * metadata and `.env` files stay local; binary files are skipped (the API is
 * text-only) and listed so you can put them in place another way.
 *
 * It never deletes: a file removed locally stays in the sandbox until you
 * remove it there (`mlcl sandbox exec --project <id> "rm …"`).
 */
export default class Sync extends Command {
  static override description =
    'Push a local project tree into a molecule.dev project sandbox (text files only; never deletes)'

  static override examples = [
    '<%= config.bin %> sync --project <id>',
    '<%= config.bin %> sync ./my-app --project <id> --dry-run',
    '<%= config.bin %> sync --project <id> --only app/src',
    '<%= config.bin %> sync --project <id> --dest my-app',
  ]

  static override args = {
    dir: Args.string({
      description: 'local project root (default: current directory)',
      default: '.',
    }),
  }

  static override flags = {
    project: projectFlag,
    'dry-run': Flags.boolean({
      description: 'List what would be sent; send nothing',
      default: false,
    }),
    only: Flags.string({
      description: 'Only send files under this project-relative path (repeatable)',
      multiple: true,
    }),
    concurrency: Flags.integer({ description: 'Parallel writes', default: 6 }),
    dest: Flags.string({
      description:
        'Workspace-relative directory to write under (the platform scaffolds a project at /workspace/<appDir>, e.g. `my-app`)',
      default: '',
    }),
  }

  public async run(): Promise<void> {
    requireAuth()
    const { args, flags } = await this.parse(Sync)
    const root = resolve(args.dir)
    if (!statSync(root).isDirectory()) this.error(`${root} is not a directory`, { exit: 1 })
    const dest = (flags.dest ?? '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
    const only = (flags.only ?? []).map((p) =>
      p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, ''),
    )
    const files = [...walk(root, root)].filter(
      (rel) => only.length === 0 || only.some((o) => rel === o || rel.startsWith(`${o}/`)),
    )
    const skippedBinary: string[] = []
    const queue: Array<{ rel: string; content: string }> = []
    for (const rel of files) {
      const ext = rel.slice(rel.lastIndexOf('.')).toLowerCase()
      const buf = readFileSync(join(root, rel))
      if (BINARY_EXT.has(ext) || !looksLikeText(buf)) {
        skippedBinary.push(rel)
        continue
      }
      queue.push({ rel, content: buf.toString('utf8') })
    }
    const total = queue.reduce((n, f) => n + f.content.length, 0)
    this.log(
      `${ui.heading(flags['dry-run'] ? 'Would send' : 'Sending')} ${queue.length} files ${ui.dim(`(${(total / 1024).toFixed(0)} KB) → project ${flags.project}${dest ? ` under ${dest}/` : ''}`)}`,
    )
    if (flags['dry-run']) {
      for (const f of queue) this.log(`  ${f.rel}`)
    } else {
      let done = 0
      const failed: string[] = []
      const workers = Array.from({ length: Math.max(1, flags.concurrency) }, async () => {
        for (;;) {
          const next = queue.shift()
          if (!next) return
          try {
            await writeProjectFile(
              flags.project,
              dest ? `${dest}/${next.rel}` : next.rel,
              next.content,
            )
            done++
            if (done % 25 === 0 || done === files.length) this.log(ui.dim(`  ${done} written`))
          } catch (error) {
            failed.push(`${next.rel}: ${(error as Error).message}`)
          }
        }
      })
      await Promise.all(workers)
      this.log(`${ui.check(`${done} files written`)}`)
      if (failed.length) {
        for (const f of failed) this.log(`  ${ui.dim('failed')} ${f}`)
        this.error(`${failed.length} file(s) failed`, { exit: 1 })
      }
    }
    if (skippedBinary.length) {
      this.log(
        ui.dim(`\nSkipped ${skippedBinary.length} binary file(s) — the files API is text-only:`),
      )
      for (const f of skippedBinary) this.log(ui.dim(`  ${f}`))
    }
  }
}
