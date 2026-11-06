/**
 * npm representation of flagship locale data. Authored templates stay ordinary
 * source trees. Like template-dotfiles, prepack records files and the scaffold
 * restores them into its destination, without modifying the installed package.
 *
 * Use npm's nested .npmignore for selection and Node's standard Brotli codec.
 * A tar reader would add a runtime dependency/executable just for these text
 * manifests; the existing JSON manifest pattern needs neither, including offline.
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib'

export const TEMPLATE_LOCALES_ARCHIVE = 'locales.json.br'
const LOCALES = 'app/src/locales'

/** Whether a manifest path names a file in a non-English locale directory. */
function localePath(rel: string): boolean {
  const parts = rel.split('/')
  return (
    parts.length >= 2 &&
    /^[a-zA-Z0-9_-]+$/.test(parts[0]) &&
    parts[0] !== 'en' &&
    parts.every((p) => p !== '' && p !== '.' && p !== '..' && !/[\\:\0]/.test(p))
  )
}

/** Record the files the normal template copier would carry from each locale. */
function collect(
  root: string,
  rel: string,
  skip: (name: string) => boolean,
  files: Record<string, string>,
): void {
  for (const entry of readdirSync(join(root, rel), { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (skip(entry.name)) continue
    const next = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) collect(root, next, skip, files)
    else if (entry.isFile()) {
      const bytes = readFileSync(join(root, next))
      const text = bytes.toString('utf8')
      if (!Buffer.from(text).equals(bytes))
        throw new Error(`Template locale is not UTF-8 text: ${join(root, next)}`)
      files[next] = text
    } else throw new Error(`Template locale is not a regular file: ${join(root, next)}`)
  }
}

/** Generate one compressed manifest per locale-bearing flagship at prepack. */
export function packTemplateLocales(
  templatesDir: string,
  skip: (name: string) => boolean,
): { templates: number; files: number; bytes: number } {
  const apps = join(templatesDir, 'apps')
  const result = { templates: 0, files: 0, bytes: 0 }
  for (const app of readdirSync(apps, { withFileTypes: true })) {
    if (!app.isDirectory()) continue
    const template = join(apps, app.name)
    const root = join(template, LOCALES)
    if (!existsSync(root)) continue
    const files: Record<string, string> = {}
    for (const entry of readdirSync(root, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (entry.name === 'en' || skip(entry.name) || entry.isFile()) continue
      if (!entry.isDirectory() || !localePath(`${entry.name}/file`))
        throw new Error(`Invalid template locale directory: ${join(root, entry.name)}`)
      collect(root, entry.name, skip, files)
    }
    const packed = brotliCompressSync(Buffer.from(JSON.stringify({ schema: 1, files })), {
      params: { [constants.BROTLI_PARAM_QUALITY]: 9 },
    })
    writeFileSync(join(template, TEMPLATE_LOCALES_ARCHIVE), packed)
    result.templates++
    result.files += Object.keys(files).length
    result.bytes += packed.length
  }
  return result
}

/** Remove generated manifests after packing; never remove authored locale data. */
export function cleanTemplateLocales(templatesDir: string): number {
  let removed = 0
  const apps = join(templatesDir, 'apps')
  for (const app of readdirSync(apps, { withFileTypes: true })) {
    if (!app.isDirectory()) continue
    const file = join(apps, app.name, TEMPLATE_LOCALES_ARCHIVE)
    if (!existsSync(file)) continue
    rmSync(file)
    removed++
  }
  return removed
}

/** Decode and validate every entry before any destination files can be written. */
export function readTemplateLocales(templateDir: string): Record<string, string> {
  const file = join(templateDir, TEMPLATE_LOCALES_ARCHIVE)
  if (!existsSync(file)) return {}
  const manifest = JSON.parse(brotliDecompressSync(readFileSync(file)).toString('utf8')) as {
    schema?: number
    files?: unknown
  }
  if (
    manifest?.schema !== 1 ||
    !manifest.files ||
    typeof manifest.files !== 'object' ||
    Array.isArray(manifest.files)
  )
    throw new Error(`${file} is not a template locale manifest`)
  for (const [rel, content] of Object.entries(manifest.files)) {
    if (!localePath(rel) || typeof content !== 'string')
      throw new Error(`${file} lists an invalid template locale: ${rel}`)
  }
  return manifest.files as Record<string, string>
}

/** Restore packed locales before the scaffold's normal source transformations. */
export async function restoreTemplateLocales(templateDir: string, destDir: string): Promise<void> {
  for (const [rel, text] of Object.entries(readTemplateLocales(templateDir))) {
    // A source checkout can have a stale prepack manifest. Its real files win.
    if (existsSync(join(templateDir, LOCALES, rel))) continue
    const dst = join(destDir, LOCALES, rel)
    await mkdir(dirname(dst), { recursive: true })
    await writeFile(dst, text)
  }
}
