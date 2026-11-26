/**
 * npm representation of each flagship template's tree. npm unpacks a package file by file, and the
 * flagship fleet is most of mlcl's files: 27,638 of the 29,413 in 2.2.13. A first `npx mlcl` spent
 * about 20 of its 24 s unpacking templates, and the same bytes with the flagships as one file each
 * install in 4.7 s instead of 64.9 s. Prepack records every file npm would ship from a flagship's
 * directory in one Brotli manifest beside the files that listing and template selection read
 * (`template.json`, `CATALOG.md`), and a nested `.npmignore` leaves the rest out. A scaffold
 * unpacks the template it copies into the user's cache once, and reads it there. A source checkout
 * has no manifest and reads its templates in place.
 *
 * Like template-locales, this uses Node's Brotli codec and a JSON manifest, so the installed
 * package needs no tar reader and stays unmodified.
 *
 * @module
 */
import { isUtf8 } from 'node:buffer'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, parse, posix, relative, resolve, sep, win32 } from 'node:path'
import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib'

import type { NpmPackResult } from './npm-pack-json.js'

/** The manifest each packed flagship directory carries. */
export const TEMPLATE_TREE_ARCHIVE = 'tree.json.br'
const PENDING_IGNORE = '.mlcl-tree-npmignore.tmp'

/**
 * The flagship files the package keeps as plain files: `mlcl templates <slug>` reads the catalog and
 * `mlcl create --template` reads `template.json` before it copies anything.
 */
export const TEMPLATE_TREE_KEPT = ['template.json', 'CATALOG.md'] as const

/** The nested `.npmignore` prepack writes into each packed flagship directory. */
export const TEMPLATE_TREE_NPMIGNORE = [
  '# Written by prepack (src/lib/template-tree.ts) and removed by postpack: the flagship ships as',
  `# ${TEMPLATE_TREE_ARCHIVE}, unpacked into the user's cache when a project is scaffolded from it.`,
  '*',
  ...[...TEMPLATE_TREE_KEPT, TEMPLATE_TREE_ARCHIVE].map((file) => `!/${file}`),
  '',
].join('\n')

interface TreeEntry {
  mode: number
  text?: string
  base64?: string
}

interface DecodedEntry {
  data: Buffer
  mode: number
}

const WINDOWS_DEVICE = /^(?:con|prn|aux|nul|conin\$|conout\$|(?:com|lpt)[1-9¹²³]) *(?:\.|$)/i
const SLUG = /^[\w-]+$/

/**
 * Validate names for the filesystems the package is installed on, including case-insensitive ones.
 *
 * @param paths - The manifest's relative file paths.
 * @param label - Where the paths came from, for errors.
 */
export function validateTemplatePaths(paths: readonly string[], label: string): void {
  const seen = new Map<string, { spelling: string; isFile: boolean }>()
  for (const path of paths) {
    const parts = path.split('/')
    let spelling = ''
    let folded = ''
    for (const [index, part] of parts.entries()) {
      if (
        !part ||
        /[<>:"\\|?*\p{Cc}\p{Cs}]/u.test(part) ||
        /[ .]$/.test(part) ||
        WINDOWS_DEVICE.test(part)
      )
        throw new Error(`${label} lists an invalid template file: ${path}`)
      spelling += `/${part}`
      folded += `/${part.normalize('NFC').toUpperCase()}`
      const isFile = index === parts.length - 1
      const previous = seen.get(folded)
      if (previous && (previous.spelling !== spelling || previous.isFile || isFile))
        throw new Error(
          `${label} lists a conflicting template path: ${path} (${previous.spelling.slice(1)})`,
        )
      seen.set(folded, { spelling, isFile })
    }
  }
}

/**
 * Record each flagship's shipped files in its manifest and write the `.npmignore` that leaves them
 * out of the package. `shipped` is npm's own file list for the package (`npm pack --dry-run --json
 * --ignore-scripts`), so the manifest carries exactly what the package carried before.
 *
 * @param packageRoot - The mlcl package root.
 * @param shipped - Package-relative paths and modes npm would pack.
 * @returns How many templates and files were recorded, and the manifests' total size.
 */
export function packTemplateTrees(
  packageRoot: string,
  shipped: ReadonlyArray<Pick<NpmPackResult['files'][number], 'path' | 'mode'>>,
): { templates: number; files: number; bytes: number } {
  const bySlug = new Map<string, { rel: string; mode: number }[]>()
  for (const { path, mode } of shipped) {
    const match = /^templates\/apps\/([^/]+)\/(.+)$/.exec(path)
    if (!match) continue
    const [, slug, rel] = match
    if (!SLUG.test(slug)) throw new Error(`Invalid template slug in package path: ${path}`)
    if (!Number.isInteger(mode) || mode < 0 || mode > 0o7777)
      throw new Error(`Invalid npm file mode for ${path}: ${mode}`)
    const entry = { rel, mode: mode & 0o777 }
    const entries = bySlug.get(slug)
    if (entries) entries.push(entry)
    else bySlug.set(slug, [entry])
  }
  validateTemplatePaths([...bySlug.keys()], 'npm package')
  for (const [slug, entries] of bySlug)
    validateTemplatePaths(
      entries.map(({ rel }) => rel),
      slug,
    )
  const result = { templates: 0, files: 0, bytes: 0 }
  for (const [slug, entries] of [...bySlug].sort(([a], [b]) => a.localeCompare(b))) {
    const dir = join(packageRoot, 'templates', 'apps', slug)
    const ignore = join(dir, '.npmignore')
    if (lstatSync(ignore, { throwIfNoEntry: false }))
      throw new Error(`${slug} has its own .npmignore; the template tree pack writes that file`)
    const files = new Map<string, TreeEntry>()
    for (const { rel, mode } of entries.sort((a, b) => (a.rel < b.rel ? -1 : 1))) {
      const file = join(dir, rel)
      const bytes = readFileSync(file)
      const text = bytes.toString('utf8')
      files.set(
        rel,
        Buffer.from(text).equals(bytes)
          ? { mode, text }
          : { mode, base64: bytes.toString('base64') },
      )
    }
    const packed = brotliCompressSync(
      Buffer.from(JSON.stringify({ schema: 1, files: Object.fromEntries(files) })),
      { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } },
    )
    writeFileSync(join(dir, TEMPLATE_TREE_ARCHIVE), packed)
    const pending = join(dir, PENDING_IGNORE)
    writeFileSync(pending, TEMPLATE_TREE_NPMIGNORE, { flag: 'wx' })
    renameSync(pending, ignore)
    result.templates++
    result.files += entries.length
    result.bytes += packed.length
  }
  return result
}

/**
 * Remove the manifests and the `.npmignore` files prepack wrote. An `.npmignore` with other content
 * is left in place.
 *
 * @param packageRoot - The mlcl package root.
 * @returns How many template directories were cleaned.
 */
export function cleanTemplateTrees(packageRoot: string): number {
  const apps = join(packageRoot, 'templates', 'apps')
  let removed = 0
  for (const app of readdirSync(apps, { withFileTypes: true })) {
    if (!app.isDirectory()) continue
    const dir = join(apps, app.name)
    const archive = join(dir, TEMPLATE_TREE_ARCHIVE)
    const ignore = join(dir, '.npmignore')
    const had = lstatSync(archive, { throwIfNoEntry: false })
    if (lstatSync(ignore, { throwIfNoEntry: false })?.isFile()) {
      const content = readFileSync(ignore, 'utf8')
      // Older prepack versions could be interrupted while writing the final ignore directly.
      if (
        content === TEMPLATE_TREE_NPMIGNORE ||
        (had && TEMPLATE_TREE_NPMIGNORE.startsWith(content))
      )
        rmSync(ignore, { force: true })
    }
    rmSync(join(dir, PENDING_IGNORE), { force: true })
    if (had) {
      rmSync(archive, { force: true })
      removed++
    }
  }
  return removed
}

/**
 * Decode and validate a manifest before anything is written from it.
 *
 * @param bytes - The manifest's bytes.
 * @param label - The manifest's path, for errors.
 * @returns Each file's bytes and mode, keyed by its path in the template directory.
 */
export function decodeTemplateTree(bytes: Buffer, label: string): Record<string, DecodedEntry> {
  const json = brotliDecompressSync(bytes)
  if (!isUtf8(json)) throw new Error(`${label} is not UTF-8`)
  const manifest = JSON.parse(json.toString('utf8')) as {
    schema?: number
    files?: unknown
  }
  if (
    manifest?.schema !== 1 ||
    !manifest.files ||
    typeof manifest.files !== 'object' ||
    Array.isArray(manifest.files)
  )
    throw new Error(`${label} is not a template tree manifest`)
  const entries = Object.entries(manifest.files as Record<string, TreeEntry>)
  validateTemplatePaths(
    entries.map(([rel]) => rel),
    label,
  )
  return Object.fromEntries(
    entries.map(([rel, entry]) => {
      const invalid = (): Error => new Error(`${label} lists an invalid template file: ${rel}`)
      if (!entry || !Number.isInteger(entry.mode) || entry.mode < 0 || entry.mode > 0o777)
        throw invalid()
      if (typeof entry.text === 'string' && !Object.hasOwn(entry, 'base64')) {
        const data = Buffer.from(entry.text)
        if (data.toString('utf8') === entry.text) return [rel, { data, mode: entry.mode }]
      }
      if (typeof entry.base64 === 'string' && !Object.hasOwn(entry, 'text')) {
        const data = Buffer.from(entry.base64, 'base64')
        if (data.toString('base64') === entry.base64) return [rel, { data, mode: entry.mode }]
      }
      throw invalid()
    }),
  )
}

/**
 * mlcl's cache directory: `MLCL_CACHE_DIR`, else the platform's per-user cache.
 *
 * @param env - The environment to read.
 * @param platform - The platform.
 * @param home - The user's home directory.
 * @returns The directory.
 */
export function mlclCacheDir(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  home: string = homedir(),
): string {
  if (env.MLCL_CACHE_DIR) return env.MLCL_CACHE_DIR
  if (platform === 'win32')
    return win32.join(env.LOCALAPPDATA || win32.join(home, 'AppData', 'Local'), 'mlcl', 'Cache')
  if (platform === 'darwin') return posix.join(home, 'Library', 'Caches', 'mlcl')
  const xdg = env.XDG_CACHE_HOME
  return posix.join(xdg && posix.isAbsolute(xdg) ? xdg : posix.join(home, '.cache'), 'mlcl')
}

const unsafeCache = (dir: string): Error => new Error(`Unsafe template cache directory: ${dir}`)

/** Resolve system paths such as macOS /var, and verify that the resolved parent cannot be replaced. */
function stableCacheParent(dir: string): string {
  if (!lstatSync(dir, { throwIfNoEntry: false })) {
    const located = join(stableCacheParent(dirname(dir)), basename(dir))
    ensurePrivateDirectory(located)
    return located
  }
  const located = realpathSync(dir)
  const uid = process.getuid?.()
  // In a user namespace the host root can map to an overflow UID.
  const rootUid = uid === undefined ? undefined : lstatSync(parse(located).root).uid
  for (let path = located; uid !== undefined; path = dirname(path)) {
    const st = lstatSync(path)
    const replaceable = (st.mode & 0o022) !== 0 && (st.mode & 0o1000) === 0
    if (!st.isDirectory() || (st.uid !== uid && st.uid !== rootUid) || replaceable)
      throw unsafeCache(path)
    if (dirname(path) === path) break
  }
  return located
}

function ensurePrivateDirectory(dir: string): void {
  try {
    mkdirSync(dir, { mode: 0o700 })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
  }
  const st = lstatSync(dir)
  const uid = process.getuid?.()
  if (!st.isDirectory() || (uid !== undefined && (st.uid !== uid || (st.mode & 0o022) !== 0)))
    throw unsafeCache(dir)
}

function removeAbandonedStaging(root: string): void {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const path = join(root, entry.name)
    const pid = /^\.[\w-]+-[a-f0-9]{16}-([1-9]\d{0,9})-[A-Za-z0-9]{6}$/.exec(entry.name)?.[1]
    if (pid) {
      try {
        process.kill(Number(pid), 0)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ESRCH')
          rmSync(path, { force: true, recursive: true })
      }
    } else if (/^\.[\w-]+-[A-Za-z0-9]{6}$/.test(entry.name)) {
      // Previous versions did not record who was unpacking. Give an older CLI a day to finish.
      const st = lstatSync(path, { throwIfNoEntry: false })
      if (st && Date.now() - st.mtimeMs > 86_400_000) rmSync(path, { force: true, recursive: true })
    }
  }
}

function expectedTree(files: Record<string, DecodedEntry>): Map<string, DecodedEntry | undefined> {
  const expected = new Map<string, DecodedEntry | undefined>()
  for (const [rel, entry] of Object.entries(files)) {
    expected.set(rel.normalize('NFC'), entry)
    for (let dir = posix.dirname(rel); dir !== '.'; dir = posix.dirname(dir))
      expected.set(dir.normalize('NFC'), undefined)
  }
  return expected
}

function matchesTree(dir: string, expected: Map<string, DecodedEntry | undefined>): boolean {
  const uid = process.getuid?.()
  try {
    const root = lstatSync(dir, { throwIfNoEntry: false })
    if (
      !root?.isDirectory() ||
      (uid !== undefined && (root.uid !== uid || (root.mode & 0o077) !== 0))
    )
      return false
    const entries = readdirSync(dir, { recursive: true, withFileTypes: true })
    if (entries.length !== expected.size) return false
    const seen = new Set<string>()
    for (const entry of entries) {
      const path = join(entry.parentPath, entry.name)
      const rel = relative(dir, path).split(sep).join('/').normalize('NFC')
      if (seen.has(rel) || !expected.has(rel)) return false
      seen.add(rel)
      const file = expected.get(rel)
      if (!file) {
        if (!entry.isDirectory()) return false
      } else {
        if (!entry.isFile()) return false
        const stat = lstatSync(path)
        if (!stat.isFile() || stat.size !== file.data.length) return false
        if (uid !== undefined && (stat.mode & 0o777) !== file.mode) return false
        if (!readFileSync(path).equals(file.data)) return false
      }
    }
    return true
  } catch (error) {
    // Cache cleaners can remove files while this process is checking them.
    if (['ENOENT', 'ENOTDIR', 'EACCES'].includes((error as NodeJS.ErrnoException).code ?? ''))
      return false
    throw error
  }
}

/**
 * The directory a flagship template is read from: its own directory in a source checkout, or, in an
 * installed package, the cache directory its manifest is unpacked into. The first call unpacks into
 * a private directory and renames it into place, so concurrent scaffolds never read a partial tree;
 * the directory name carries the manifest's hash, so a new mlcl version unpacks its own copy (an
 * older one is left alone: another scaffold may be reading it).
 *
 * @param cliRoot - The mlcl package root.
 * @param slug - The template's slug.
 * @param cacheDir - The cache directory (default: {@link mlclCacheDir}).
 * @returns The template directory.
 */
export function resolveTemplateDir(
  cliRoot: string,
  slug: string,
  cacheDir: string = mlclCacheDir(),
): string {
  if (!SLUG.test(slug)) throw new Error(`Invalid template slug: ${slug}`)
  const dir = join(cliRoot, 'templates', 'apps', slug)
  const archive = join(dir, TEMPLATE_TREE_ARCHIVE)
  if (!existsSync(archive) || existsSync(join(cliRoot, 'src', 'lib', 'template-tree.ts')))
    return dir
  const bytes = readFileSync(archive)
  const key = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
  const files = decodeTemplateTree(bytes, archive)
  const expected = expectedTree(files)
  const location = resolve(cacheDir)
  const base = join(stableCacheParent(dirname(location)), basename(location))
  ensurePrivateDirectory(base)
  const root = join(base, 'templates')
  ensurePrivateDirectory(root)
  removeAbandonedStaging(root)
  const name = `${slug}-${key}`
  let staging: string | undefined
  try {
    for (let generation = 0; ; generation++) {
      // Leave old generations in place while any scaffold that already resolved them finishes.
      const target = join(root, generation === 0 ? name : `${name}-${generation}`)
      if (lstatSync(target, { throwIfNoEntry: false })) {
        if (matchesTree(target, expected)) return target
        continue
      }
      if (!staging) {
        staging = mkdtempSync(join(root, `.${name}-${process.pid}-`))
        for (const [rel, { data, mode }] of Object.entries(files)) {
          const file = join(staging, rel)
          mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
          writeFileSync(file, data, { flag: 'wx' })
          chmodSync(file, mode)
        }
      }
      try {
        renameSync(staging, target)
        staging = undefined
        return target
      } catch (error) {
        // Another process won the rename. Verify its work before returning it.
        if (matchesTree(target, expected)) return target
        if (!lstatSync(target, { throwIfNoEntry: false })) throw error
      }
    }
  } finally {
    if (staging) rmSync(staging, { recursive: true, force: true })
  }
}
