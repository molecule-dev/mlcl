/**
 * npm never packs a `.gitignore` or `.npmrc` file, at any depth, whatever the
 * `files` allowlist says. A flagship installed from the registry therefore
 * arrives without them, and `mlcl create --template <app>` from the published
 * package used to scaffold a project with no root, `app/` or `api/` `.gitignore`.
 * The root one is what keeps the `.env*` secrets family out of git.
 *
 * Before publishing (`prepack`), {@link packTemplateDotfiles} records each such
 * file of each flagship in a `dotfiles.json` beside it; `postpack` removes the
 * manifests again ({@link cleanTemplateDotfiles}). After copying a template,
 * {@link restoreTemplateDotfiles} writes every recorded file the copy lacks. In
 * the monorepo the real files exist and no manifest does, so nothing changes.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

/** The file names npm leaves out of every package. */
export const UNPACKED_DOTFILES: readonly string[] = ['.gitignore', '.npmrc']

/** Written beside each flagship by `prepack` and removed by `postpack`; never committed. */
export const TEMPLATE_DOTFILES_MANIFEST = 'dotfiles.json'

/** The template directories a scaffolded project receives (see `TEMPLATE_USER_COPY`). */
const COPIED_DIRECTORIES: readonly string[] = ['app', 'api']

interface DotfilesManifest {
  schema: 1
  files: Record<string, string>
}

/** Collect every unpacked dot file under `root/rel`, skipping what the template copy skips. */
function collectDotfiles(
  root: string,
  rel: string,
  skip: (name: string) => boolean,
  out: string[],
): void {
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const next = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      if (!skip(entry.name)) collectDotfiles(root, next, skip, out)
    } else if (entry.isFile() && UNPACKED_DOTFILES.includes(entry.name)) out.push(next)
  }
}

/**
 * The unpacked dot files of one flagship that a scaffolded project receives, as
 * template-relative paths: the root `.gitignore` and every `.gitignore`/`.npmrc`
 * under `app/` and `api/`.
 *
 * @param templateDir - The flagship directory (`templates/apps/<app>`).
 * @param skip - The template copy's skip rule for entry names.
 * @returns The sorted relative paths.
 */
export function templateDotfiles(templateDir: string, skip: (name: string) => boolean): string[] {
  const out: string[] = []
  if (existsSync(join(templateDir, '.gitignore'))) out.push('.gitignore')
  for (const dir of COPIED_DIRECTORIES)
    if (existsSync(join(templateDir, dir))) collectDotfiles(templateDir, dir, skip, out)
  return out.sort()
}

/**
 * Record each flagship's unpacked dot files in its `dotfiles.json`. Refuses (and
 * so stops the publish) when a dot file under `templates/` is one no scaffold
 * would restore, because npm would drop it silently.
 *
 * @param templatesDir - The package's `templates/` directory.
 * @param skip - The template copy's skip rule for entry names.
 * @returns How many flagships and files were recorded.
 */
export function packTemplateDotfiles(
  templatesDir: string,
  skip: (name: string) => boolean,
): { templates: number; files: number } {
  const appsDir = join(templatesDir, 'apps')
  const covered = new Set<string>()
  let templates = 0
  let files = 0
  const apps = existsSync(appsDir) ? readdirSync(appsDir).sort() : []
  for (const name of apps) {
    const dir = join(appsDir, name)
    if (!statSync(dir).isDirectory()) continue
    const rels = templateDotfiles(dir, skip)
    if (!rels.length) continue
    const manifest: DotfilesManifest = {
      schema: 1,
      files: Object.fromEntries(rels.map((rel) => [rel, readFileSync(join(dir, rel), 'utf8')])),
    }
    writeFileSync(join(dir, TEMPLATE_DOTFILES_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`)
    for (const rel of rels) covered.add(`apps/${name}/${rel}`)
    templates++
    files += rels.length
  }
  // A dot file under a directory the copy skips (`dist/`) never reaches a project.
  const all: string[] = []
  collectDotfiles(templatesDir, '', skip, all)
  const uncovered = all.filter((rel) => !covered.has(rel))
  if (uncovered.length)
    throw new Error(
      `npm leaves these template files out and no scaffold restores them: ${uncovered.join(', ')}`,
    )
  return { templates, files }
}

/**
 * Remove every flagship's `dotfiles.json`.
 *
 * @param templatesDir - The package's `templates/` directory.
 * @returns How many manifests were removed.
 */
export function cleanTemplateDotfiles(templatesDir: string): number {
  const appsDir = join(templatesDir, 'apps')
  let removed = 0
  for (const name of existsSync(appsDir) ? readdirSync(appsDir) : []) {
    const file = join(appsDir, name, TEMPLATE_DOTFILES_MANIFEST)
    if (!existsSync(file)) continue
    rmSync(file)
    removed++
  }
  return removed
}

/** Whether `rel` is a position {@link templateDotfiles} can produce. */
function restorable(rel: string): boolean {
  const parts = rel.split('/')
  if (parts.some((part) => part === '' || part === '.' || part === '..')) return false
  if (!UNPACKED_DOTFILES.includes(basename(rel))) return false
  return rel === '.gitignore' || (parts.length > 1 && COPIED_DIRECTORIES.includes(parts[0]))
}

/**
 * Write each dot file a flagship's `dotfiles.json` records and the copied
 * project lacks. A template without a manifest (the monorepo) restores nothing.
 *
 * @param templateDir - The flagship directory the project was copied from.
 * @param destDir - The scaffolded project.
 * @returns The relative paths written.
 */
export async function restoreTemplateDotfiles(
  templateDir: string,
  destDir: string,
): Promise<string[]> {
  const file = join(templateDir, TEMPLATE_DOTFILES_MANIFEST)
  if (!existsSync(file)) return []
  const manifest = JSON.parse(readFileSync(file, 'utf8')) as DotfilesManifest
  if (manifest?.schema !== 1 || !manifest.files || typeof manifest.files !== 'object')
    throw new Error(`${file} is not a template dot-file manifest`)
  const restored: string[] = []
  for (const [rel, content] of Object.entries(manifest.files)) {
    if (!restorable(rel) || typeof content !== 'string')
      throw new Error(`${file} lists ${rel}, which is not a template dot file`)
    const dst = join(destDir, ...rel.split('/'))
    if (existsSync(dst)) continue
    await mkdir(dirname(dst), { recursive: true })
    await writeFile(dst, content)
    restored.push(rel)
  }
  return restored
}
