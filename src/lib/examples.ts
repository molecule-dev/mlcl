/**
 * The example slices mlcl ships in `templates/.agents/skills/examples/<category>/<name>/`: small,
 * tested features (a Google sign-in, Stripe checkout, file uploads) with a README that maps their
 * files. `mlcl examples` finds them with the ranking the Molecule harness uses
 * (`example-search.ts`) and prints one, so an agent in any harness copies a working slice instead
 * of writing the feature from scratch.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

import { type ExampleSearchEntry, parseExampleFrontmatter } from './example-search.js'

/** The examples directory inside a templates tree. */
export function examplesDir(templatesDir: string): string {
  return join(templatesDir, '.agents', 'skills', 'examples')
}

/**
 * Every example slice, from each `<category>/<name>/README.md`.
 *
 * @param templatesDir - mlcl's templates directory.
 * @returns The slices, by path.
 */
export function loadExampleSlices(templatesDir: string): ExampleSearchEntry[] {
  const root = examplesDir(templatesDir)
  if (!existsSync(root)) return []
  const entries: ExampleSearchEntry[] = []
  for (const category of readdirSync(root, { withFileTypes: true })) {
    if (!category.isDirectory()) continue
    for (const feature of readdirSync(join(root, category.name), { withFileTypes: true })) {
      const readme = join(root, category.name, feature.name, 'README.md')
      if (!feature.isDirectory() || !existsSync(readme)) continue
      const fm = parseExampleFrontmatter(readFileSync(readme, 'utf8'))
      entries.push({
        category: category.name,
        feature: feature.name,
        path: `.agents/skills/examples/${category.name}/${feature.name}`,
        name: fm.name ?? feature.name,
        intent: fm.intent ?? '',
        keywords: fm.keywords ?? [],
        planPhrases: fm.planPhrases,
      })
    }
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * A slice's `<category>/<name>` slug, as `mlcl examples` prints and accepts it.
 *
 * @param entry - The slice.
 * @returns The slug.
 */
export function exampleSlug(entry: ExampleSearchEntry): string {
  return `${entry.category}/${entry.feature}`
}

/**
 * The directory of the slice a slug names, or null when the slug names none. A slug is two plain
 * path segments, so it cannot reach outside the examples directory.
 *
 * @param templatesDir - mlcl's templates directory.
 * @param slug - `<category>/<name>`, with or without a trailing slash.
 * @returns The slice's directory, or null.
 */
export function exampleSliceDir(templatesDir: string, slug: string): string | null {
  const match = slug.replace(/\/+$/, '').match(/^([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9-]*)$/)
  if (!match) return null
  const dir = join(examplesDir(templatesDir), match[1], match[2])
  return existsSync(join(dir, 'README.md')) ? dir : null
}

/**
 * The files a slice ships besides its README, relative to its directory.
 *
 * @param dir - The slice's directory.
 * @returns The file paths, sorted.
 */
export function exampleSliceFiles(dir: string): string[] {
  const files: string[] = []
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.isFile()) files.push(relative(dir, path).split(sep).join('/'))
    }
  }
  walk(dir)
  return files.filter((file) => file !== 'README.md').sort()
}

/**
 * One file of a slice, or null when the slice has no such file. The path must stay inside the
 * slice's directory.
 *
 * @param dir - The slice's directory.
 * @param file - The file's path relative to the slice, as {@link exampleSliceFiles} lists it.
 * @returns The file's text, or null.
 */
export function readExampleSliceFile(dir: string, file: string): string | null {
  const path = resolve(dir, file)
  if (!path.startsWith(dir + sep) || !existsSync(path) || !statSync(path).isFile()) return null
  return readFileSync(path, 'utf8')
}
