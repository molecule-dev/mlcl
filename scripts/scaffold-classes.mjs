/**
 * Every class an app's bonded ClassMap returns gets a style in the app's own build.
 *
 * A ClassMap class with no rule renders as nothing: a theme colour, an animation or a font the
 * app's stylesheet never defines. On 2026-11-23 a fresh react-native app's Tailwind config
 * generated none of the 77 theme-colour classes its NativeWind ClassMap returns (no colours on a
 * device), and a custom web app's stylesheet defined 34 of the 50 theme tokens its ClassMap names.
 *
 * - The ClassMap is the package `src/bonds/` passes to `setClassMap`, loaded from the app's
 *   `node_modules`; its classes are every string entry plus each function called with no options.
 * - An app with a `tailwind.config.js` (NativeWind, Tailwind 3) is compiled with its own
 *   `tailwindcss` binary for `NATIVEWIND_OS=ios` and `web`; on ios each class must also compile to
 *   a style with NativeWind's own compiler (`react-native-css-interop/css-to-rn`), which is what
 *   a device applies.
 * - Any other app is judged on the CSS its `build` script wrote under `dist/`.
 *
 * Used by check-framework-scaffolds.mjs (its `classes` step).
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Unescapes a CSS identifier (`hover\:bg-x` → `hover:bg-x`, `\31 0` → `10`).
 *
 * @param {string} ident - The identifier as written in a selector.
 * @returns {string} The class name.
 */
function unescapeIdent(ident) {
  return ident.replace(/\\([0-9a-fA-F]{1,6})\s?|\\(.)/g, (_, hex, char) =>
    hex ? String.fromCodePoint(parseInt(hex, 16)) : char,
  )
}

/**
 * The class names a stylesheet's rules select (minified or not, nested or not).
 *
 * @param {string} css - The stylesheet.
 * @returns {Set<string>} The class names.
 */
export function classNamesInCss(css) {
  const names = new Set()
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '')
  let start = 0
  let quote = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quote) {
      if (char === '\\') i++
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'") quote = char
    else if (char === '\\') i++
    else if (char === ';' || char === '}') start = i + 1
    else if (char === '{') {
      const prelude = text.slice(start, i).trim()
      start = i + 1
      if (prelude.startsWith('@')) continue
      for (const match of prelude.matchAll(/\.((?:\\[0-9a-fA-F]{1,6}\s?|\\[^\n]|[\w-])+)/g)) {
        names.add(unescapeIdent(match[1]))
      }
    }
  }
  return names
}

/**
 * The package `src/bonds/` passes to `setClassMap`.
 *
 * @param {string} app - The app directory.
 * @returns {string | undefined} Its name, or `undefined` when no bond file sets a ClassMap.
 */
export function bondedClassMapPackage(app) {
  const dir = join(app, 'src', 'bonds')
  if (!existsSync(dir)) return undefined
  for (const file of readdirSync(dir).filter((name) => /\.(ts|js)$/.test(name))) {
    const source = readFileSync(join(dir, file), 'utf8')
    if (!source.includes('setClassMap')) continue
    const match = /import\s*\{[^}]*\bclassMap\b[^}]*\}\s*from\s*['"]([^'"]+)['"]/.exec(source)
    if (match) return match[1]
  }
  return undefined
}

/**
 * Every class a ClassMap returns: its string entries and each function called with no
 * options (a function that needs one, or returns a class built from `undefined`, is skipped).
 *
 * @param {Record<string, unknown>} classMap - The ClassMap.
 * @returns {string[]} The classes, each once.
 */
export function classMapClasses(classMap) {
  const strings = []
  for (const [key, value] of Object.entries(classMap)) {
    if (typeof value === 'string') strings.push(value)
    else if (typeof value === 'function' && key !== 'cn') {
      let result
      try {
        result = value()
      } catch (_error) {
        // An entry that needs an argument has no option-free form to check.
        continue
      }
      if (typeof result === 'string' && !result.includes('undefined')) strings.push(result)
    }
  }
  return [...new Set(strings.flatMap((value) => value.split(/\s+/)).filter(Boolean))]
}

/**
 * The classes NativeWind's compiler (`cssToReactNativeRuntime`) produced a style for. Its
 * `rules` is a plain object keyed by class (a `Map` in some versions).
 *
 * @param {{ rules?: Map<string, unknown> | Record<string, unknown> }} compiled - Its output.
 * @returns {Set<string>} The classes.
 */
export function nativeStyledClasses(compiled) {
  const rules = compiled.rules ?? {}
  return new Set(rules instanceof Map ? rules.keys() : Object.keys(rules))
}

/**
 * The CSS files under a directory, skipping `node_modules`.
 *
 * @param {string} dir - The directory.
 * @returns {string[]} Absolute paths.
 */
function cssFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true })
    .filter((file) => file.endsWith('.css') && !file.split(/[\\/]/).includes('node_modules'))
    .map((file) => join(dir, file))
}

/**
 * A path under the `node_modules` the app resolves from: its own, or a parent's, where a workspace
 * install (a full-stack project's root) hoists it.
 *
 * @param {string} app - The installed app.
 * @param {string} path - The path under `node_modules`.
 * @returns {string} The first that exists, or the app's own when none does.
 */
function installedPath(app, path) {
  for (let dir = app; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', path)
    if (existsSync(candidate)) return candidate
    if (dirname(dir) === dir) return join(app, 'node_modules', path)
  }
}

/**
 * Checks that every class of the app's bonded ClassMap has a style in the app's own build.
 * For a web app, run it after the app's `build` script.
 *
 * @param {string} app - The installed app.
 * @returns {Promise<{ ok: boolean, output: string }>} Whether every class has one, and a report.
 */
export async function checkScaffoldClasses(app) {
  const pkg = bondedClassMapPackage(app)
  if (!pkg) return { ok: true, output: 'no bond file sets a ClassMap' }
  const entry = installedPath(app, join(pkg, 'dist', 'index.js'))
  const { classMap } = await import(pathToFileURL(entry).href)
  const classes = classMapClasses(classMap)
  const failures = []
  /**
   * Records the classes a build has no style for.
   *
   * @param {string} target - What was built.
   * @param {Set<string>} styled - The classes it has a style for.
   * @param {string[]} [required] - The classes the renderer applies.
   */
  const judge = (target, styled, required = classes) => {
    const missing = required.filter((cls) => !styled.has(cls))
    if (missing.length)
      failures.push(
        `${target}: ${missing.length} of ${required.length} classes of ${pkg} have no style: ` +
          missing.slice(0, 12).join(' ') +
          (missing.length > 12 ? ' …' : ''),
      )
  }

  if (existsSync(join(app, 'tailwind.config.js'))) {
    const manifest = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'))
    const usesNativeWind = Boolean(
      manifest.dependencies?.nativewind ?? manifest.devDependencies?.nativewind,
    )
    const tmp = mkdtempSync(join(tmpdir(), 'mol-scaffold-classes-'))
    try {
      const input = existsSync(join(app, 'src', 'global.css')) ? 'src/global.css' : undefined
      for (const os of ['ios', 'web']) {
        const out = join(tmp, `${os}.css`)
        execFileSync(
          installedPath(app, join('.bin', 'tailwindcss')),
          ['-c', 'tailwind.config.js', ...(input ? ['-i', input] : []), '-o', out],
          { cwd: app, env: { ...process.env, NATIVEWIND_OS: os }, stdio: 'pipe' },
        )
        const css = readFileSync(out, 'utf8')
        judge(`tailwind (NATIVEWIND_OS=${os})`, classNamesInCss(css))
        if (os === 'ios' && usesNativeWind) {
          // The app's own NativeWind compiles the CSS (the version a device runs), resolved from
          // the app, so mlcl declares none of it.
          const appRequire = createRequire(join(app, 'package.json'))
          let compiler
          try {
            compiler = appRequire('react-native-css-interop/css-to-rn')
          } catch (error) {
            failures.push(
              `the app depends on nativewind but react-native-css-interop/css-to-rn, the ` +
                `compiler that styles a device, does not resolve from it: ${error.message}`,
            )
            continue
          }
          const compiled = compiler.cssToReactNativeRuntime(css)
          // NativeWind forwards descendant recipes to the native child element as literal classes.
          const nativeClasses = new Set(
            classes.flatMap((cls) => {
              const descendants = classMap.splitForNative?.(cls, '')?.descendants
              const forwarded = Object.values(descendants ?? {}).flatMap((value) =>
                value.split(/\s+/).filter(Boolean),
              )
              return forwarded.length ? forwarded : [cls]
            }),
          )
          judge('NativeWind on a device', nativeStyledClasses(compiled), [...nativeClasses])
        }
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  } else {
    const built = cssFiles(join(app, 'dist'))
    if (!built.length) failures.push('the build wrote no CSS under dist/')
    else {
      const styled = new Set()
      for (const file of built)
        for (const cls of classNamesInCss(readFileSync(file, 'utf8'))) styled.add(cls)
      judge('dist/ CSS', styled)
    }
  }

  if (failures.length)
    return {
      ok: false,
      output:
        `${failures.join('\n')}\n` +
        `Each class needs a rule in the app's stylesheet: a NativeWind app loads ` +
        `require('@molecule/app-ui-nativewind/preset') in tailwind.config.js; a web app's ` +
        `src/index.css imports '@molecule/app-ui-tailwind/base.css'.`,
    }
  return { ok: true, output: `all ${classes.length} classes of ${pkg} have a style` }
}
