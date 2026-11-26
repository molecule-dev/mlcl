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
import { createHash } from 'node:crypto'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib'

/** The manifest each packed flagship directory carries. */
export const TEMPLATE_TREE_ARCHIVE = 'tree.json.br'

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

/** A manifest path: relative, `/`-separated, and never leaving the template directory. */
function safeRelative(rel: string): boolean {
  const parts = rel.split('/')
  return parts.every((p) => p !== '' && p !== '.' && p !== '..' && !/[\\:\0]/.test(p))
}

/**
 * Record each flagship's shipped files in its manifest and write the `.npmignore` that leaves them
 * out of the package. `shipped` is npm's own file list for the package (`npm pack --dry-run --json
 * --ignore-scripts`), so the manifest carries exactly what the package carried before.
 *
 * @param packageRoot - The mlcl package root.
 * @param shipped - Package-relative paths npm would pack.
 * @returns How many templates and files were recorded, and the manifests' total size.
 */
export function packTemplateTrees(
  packageRoot: string,
  shipped: readonly string[],
): { templates: number; files: number; bytes: number } {
  const bySlug = new Map<string, string[]>()
  for (const path of shipped) {
    const match = /^templates\/apps\/([^/]+)\/(.+)$/.exec(path)
    if (!match) continue
    const [, slug, rel] = match
    if (!safeRelative(rel)) throw new Error(`Template path leaves its directory: ${path}`)
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), rel])
  }
  const result = { templates: 0, files: 0, bytes: 0 }
  for (const [slug, rels] of [...bySlug].sort(([a], [b]) => a.localeCompare(b))) {
    const dir = join(packageRoot, 'templates', 'apps', slug)
    if (existsSync(join(dir, '.npmignore')))
      throw new Error(`${slug} has its own .npmignore; the template tree pack writes that file`)
    const files: Record<string, TreeEntry> = {}
    for (const rel of rels.sort()) {
      const file = join(dir, rel)
      const bytes = readFileSync(file)
      const mode = statSync(file).mode & 0o777
      const text = bytes.toString('utf8')
      files[rel] = Buffer.from(text).equals(bytes)
        ? { mode, text }
        : { mode, base64: bytes.toString('base64') }
    }
    const packed = brotliCompressSync(Buffer.from(JSON.stringify({ schema: 1, files })), {
      params: { [constants.BROTLI_PARAM_QUALITY]: 9 },
    })
    writeFileSync(join(dir, TEMPLATE_TREE_ARCHIVE), packed)
    writeFileSync(join(dir, '.npmignore'), TEMPLATE_TREE_NPMIGNORE)
    result.templates++
    result.files += rels.length
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
    const had = existsSync(archive)
    if (had) rmSync(archive)
    if (existsSync(ignore) && readFileSync(ignore, 'utf8') === TEMPLATE_TREE_NPMIGNORE)
      rmSync(ignore)
    if (had) removed++
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
export function decodeTemplateTree(
  bytes: Buffer,
  label: string,
): Record<string, { data: Buffer; mode: number }> {
  const manifest = JSON.parse(brotliDecompressSync(bytes).toString('utf8')) as {
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
  const out: Record<string, { data: Buffer; mode: number }> = {}
  for (const [rel, entry] of Object.entries(manifest.files as Record<string, TreeEntry>)) {
    const ok =
      safeRelative(rel) &&
      entry &&
      Number.isInteger(entry.mode) &&
      entry.mode >= 0 &&
      entry.mode <= 0o777 &&
      (typeof entry.text === 'string') !== (typeof entry.base64 === 'string')
    if (!ok) throw new Error(`${label} lists an invalid template file: ${rel}`)
    const data =
      typeof entry.text === 'string'
        ? Buffer.from(entry.text)
        : Buffer.from(entry.base64 as string, 'base64')
    out[rel] = { data, mode: entry.mode }
  }
  return out
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
    return join(env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'mlcl', 'Cache')
  if (platform === 'darwin') return join(home, 'Library', 'Caches', 'mlcl')
  return join(env.XDG_CACHE_HOME || join(home, '.cache'), 'mlcl')
}

/**
 * The directory a flagship template is read from: its own directory in a source checkout, or, in an
 * installed package, the cache directory its manifest is unpacked into. The first call unpacks into
 * a private directory and renames it into place, so concurrent scaffolds never read a partial tree;
 * the directory name carries the manifest's hash, so a new mlcl version unpacks its own copy (an
 * older one is left alone: another scaffold may be reading it).
 *
 * @param cliRoot - The mlcl package root.
 * @param slug - The template's slug (already validated as a plain name).
 * @param cacheDir - The cache directory (default: {@link mlclCacheDir}).
 * @returns The template directory.
 */
export function resolveTemplateDir(
  cliRoot: string,
  slug: string,
  cacheDir: string = mlclCacheDir(),
): string {
  const dir = join(cliRoot, 'templates', 'apps', slug)
  const archive = join(dir, TEMPLATE_TREE_ARCHIVE)
  if (!existsSync(archive)) return dir
  const bytes = readFileSync(archive)
  const key = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
  const root = join(cacheDir, 'templates')
  const target = join(root, `${slug}-${key}`)
  if (existsSync(target)) return target
  const files = decodeTemplateTree(bytes, archive)
  mkdirSync(root, { recursive: true })
  const staging = mkdtempSync(join(root, `.${slug}-`))
  try {
    for (const [rel, { data, mode }] of Object.entries(files)) {
      const file = join(staging, rel)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, data)
      chmodSync(file, mode)
    }
    try {
      renameSync(staging, target)
    } catch (error) {
      // Another scaffold renamed its copy into place first; its tree is the same.
      if (!existsSync(target)) throw error
      rmSync(staging, { recursive: true, force: true })
    }
  } catch (error) {
    rmSync(staging, { recursive: true, force: true })
    throw error
  }
  return target
}
