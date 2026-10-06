import { execFileSync } from 'node:child_process'
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

/** Largest file sent; anything bigger is listed and skipped (the files API is not for bulk data). */
const MAX_FILE_BYTES = 1024 * 1024

/**
 * Files and folders that hold credentials or machine-local state by convention. Used when the
 * project is not a git repository (so there is no .gitignore to ask), and ALSO on top of git's
 * answer, because a secret that was committed is still a secret.
 *
 * @param rel - Project-relative POSIX path.
 * @returns True when the file must never be uploaded.
 */
export function isSecretPath(rel: string): boolean {
  const segments = rel.split('/')
  const name = segments[segments.length - 1]
  if (segments.some((seg) => seg === '.keys' || seg === '.ssh' || seg.startsWith('.mol-')))
    return true
  return (
    /\.(pem|key|p12|pfx)$/i.test(name) ||
    /^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/.test(name) ||
    ['.npmrc', '.envrc', '.dev.vars', '.netrc'].includes(name) ||
    /\.log$/i.test(name)
  )
}

/**
 * Turn `git ls-files` output into a "may this file be sent" test.
 *
 * Two things the plain set comparison got wrong, each dropping files without a word:
 * - git lists an untracked nested repository as one `dir/` entry and a submodule as its path, not
 *   their files; every file under such a directory is part of the project, so the directory entry
 *   covers them.
 * - git reports a name in the form it was stored; a file whose name came from macOS (decomposed
 *   Unicode) never equalled the composed name the walk produced. Both sides are compared
 *   normalised.
 *
 * @param entries - Paths exactly as `git ls-files -z` printed them.
 * @param isDirectory - Whether a listed path is a directory on disk (a submodule or nested repo).
 * @returns The test, taking a project-relative POSIX path.
 */
export function visibleFromGit(
  entries: readonly string[],
  isDirectory: (entry: string) => boolean,
): (rel: string) => boolean {
  const files = new Set<string>()
  const directories: string[] = []
  for (const entry of entries) {
    if (entry.endsWith('/') || isDirectory(entry)) {
      directories.push(`${entry.replace(/\/+$/, '').normalize('NFC')}/`)
    } else {
      files.add(entry.normalize('NFC'))
    }
  }
  return (rel) => {
    const normal = rel.normalize('NFC')
    return files.has(normal) || directories.some((dir) => normal.startsWith(dir))
  }
}

/**
 * The files git would track or could add in `root` (tracked + untracked, minus everything
 * .gitignore excludes) — `.gitignore` is already how the user says which files are not source.
 *
 * @param root - Project root.
 * @returns The set of project-relative POSIX paths, or null when `root` is not in a git work tree.
 */
function gitVisibleFiles(root: string): ((rel: string) => boolean) | null {
  try {
    const out = execFileSync('git', ['-C', root, 'ls-files', '-co', '--exclude-standard', '-z'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    })
    return visibleFromGit(out.split('\0').filter(Boolean), (entry) => {
      try {
        return statSync(join(root, entry)).isDirectory()
      } catch (_error) {
        return false // listed but gone: not a directory we can walk
      }
    })
  } catch (_error) {
    // Not a git work tree (or git is missing): the walk's own skip lists apply.
    return null
  }
}

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
 * so what the sandbox holds is what you have on disk. Whatever .gitignore excludes stays
 * local (and, with no git repository, installs, builds, VCS metadata, `.env` files and common
 * credential files such as keys and `.npmrc`); binary files are skipped (the API is
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
    const visible = gitVisibleFiles(root)
    const files = [...walk(root, root)].filter(
      (rel) =>
        !isSecretPath(rel) &&
        (visible === null || visible(rel)) &&
        (only.length === 0 || only.some((o) => rel === o || rel.startsWith(`${o}/`))),
    )
    const skippedBinary: string[] = []
    const skippedLarge: string[] = []
    const queue: Array<{ rel: string; content: string }> = []
    for (const rel of files) {
      const ext = rel.slice(rel.lastIndexOf('.')).toLowerCase()
      if (statSync(join(root, rel)).size > MAX_FILE_BYTES) {
        skippedLarge.push(rel)
        continue
      }
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
    if (skippedLarge.length) {
      this.log(
        ui.dim(`\nSkipped ${skippedLarge.length} file(s) over ${MAX_FILE_BYTES / 1024 / 1024} MB:`),
      )
      for (const f of skippedLarge) this.log(ui.dim(`  ${f}`))
    }
    if (skippedBinary.length) {
      this.log(
        ui.dim(`\nSkipped ${skippedBinary.length} binary file(s) — the files API is text-only:`),
      )
      for (const f of skippedBinary) this.log(ui.dim(`  ${f}`))
    }
  }
}
