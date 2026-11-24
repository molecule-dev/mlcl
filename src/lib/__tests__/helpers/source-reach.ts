/**
 * The source files of an app that nothing its build loads ever imports.
 *
 * A Vite app's build starts at the modules `index.html` loads, plus its config and the build
 * scripts beside it (a prerender script loads `src/entry-server.tsx`); from there it follows
 * relative imports, `import.meta.glob` patterns and `new URL(…, import.meta.url)`. A source file
 * none of them reaches is never built or run: a bond file whose provider nothing wires, a
 * component an older page used, a service worker the PWA plugin does not build. Each one is code a
 * coding agent reads and edits for nothing, and `@molecule/app-vite-config-default` warns
 * `[molecule:unreached-source]` for it on every build.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

import { code } from './source-text.js'

/** Files the walk reads as source. */
const SOURCE = /\.(tsx?|jsx?|mts|mjs|vue|svelte)$/

/** Every non-test source file under `dir` (declaration files are types the compiler reads). */
function sourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      if (name !== '__tests__' && name !== 'node_modules') files.push(...sourceFiles(path))
    } else if (SOURCE.test(name) && !/\.(test|spec)\./.test(name) && !name.endsWith('.d.ts'))
      files.push(path)
  }
  return files
}

/** The file a relative specifier names, the way the bundler resolves `./x.js` to `./x.tsx`. */
function resolveRelative(from: string, specifier: string): string | undefined {
  const base = resolve(dirname(from), specifier)
  const stem = base.replace(/\.(js|jsx|mjs)$/, '')
  for (const candidate of [
    base,
    `${stem}.ts`,
    `${stem}.tsx`,
    `${stem}.mts`,
    `${stem}.js`,
    `${stem}.jsx`,
    `${stem}/index.ts`,
    `${stem}/index.tsx`,
  ])
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  return undefined
}

/** A glob pattern (`../locales/*\/ui.ts`, `./**\/x.ts`) as a regular expression over absolute paths. */
function globPattern(pattern: string): RegExp {
  const escape = (part: string): string => part.replace(/[.+?^${}()|[\]\\]/g, (c) => `\\${c}`)
  const body = pattern
    .split('**/')
    .map((part) => part.split('*').map(escape).join('[^/]*'))
    .join('(?:.*/)?')
  return new RegExp(`^${body}$`)
}

/**
 * The files the build starts from: the modules `index.html` loads, the Vite config, the scripts at
 * the app root and in `scripts/`, and the `src/` files those scripts name.
 */
function entryFiles(appDir: string): string[] {
  const entries = [
    ...readFileSync(join(appDir, 'index.html'), 'utf8').matchAll(
      /<script\b[^>]*\bsrc="\/(src\/[^"]+)"/g,
    ),
  ].map((match) => join(appDir, match[1] as string))
  const scripts = join(appDir, 'scripts')
  const tooling = [
    ...readdirSync(appDir)
      .filter((name) => /\.(m?[jt]s)$/.test(name))
      .map((name) => join(appDir, name)),
    ...(existsSync(scripts) ? sourceFiles(scripts) : []),
  ]
  for (const file of tooling) {
    entries.push(file)
    for (const match of readFileSync(file, 'utf8').matchAll(
      /['"`/](src\/[\w./-]+\.(?:tsx?|jsx?))/g,
    ))
      entries.push(join(appDir, match[1] as string))
  }
  return entries.filter((file) => existsSync(file))
}

/**
 * The source files under the app's `src/` that its build never reaches.
 *
 * @param appDir - The app half of a project (holds `index.html` and `src/`).
 * @returns Their paths relative to `appDir`, sorted.
 */
export function unreachedSources(appDir: string): string[] {
  const files = sourceFiles(join(appDir, 'src'))
  const reached = new Set<string>()
  const stack = entryFiles(appDir)
  while (stack.length > 0) {
    const file = stack.pop() as string
    if (reached.has(file)) continue
    reached.add(file)
    const text = code(readFileSync(file, 'utf8'))
    for (const match of text.matchAll(
      /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|new URL\(\s*)['"`](\.\.?\/[^'"`]+)['"`]/g,
    )) {
      const target = resolveRelative(file, match[1] as string)
      if (target) stack.push(target)
    }
    for (const match of text.matchAll(
      /import\.meta\.glob(?:<[\s\S]*?>)?\(\s*['"`]([^'"`]+)['"`]/g,
    )) {
      const pattern = globPattern(resolve(dirname(file), match[1] as string))
      for (const candidate of files) if (pattern.test(candidate)) stack.push(candidate)
    }
  }
  return files
    .filter((file) => !reached.has(file))
    .map((file) => relative(appDir, file))
    .sort()
}
