/**
 * Optional features: the parts of a scaffold that work only when a package in the stack serves them.
 *
 * A registry package declares the feature it brings with `molecule.optionalFeature` (an email
 * transport brings `emails`, a two-factor provider `two-factor`, a payments provider `payments`,
 * an OAuth provider `oauth`, the billing routes `billing`). The emails capture provider declares
 * none: every stack gets it to record mail, and recording mail does not make a reset page work. A resource route marked `optional: <feature>` is mounted only when
 * the stack has that feature, and the app templates follow the same rule:
 *
 * - a whole file lives under `templates/app/<framework>/features/<feature>/`, at the path it takes
 *   under `src/`, and is written only with that feature;
 * - a part of a file sits between `{{#feature <feature>}}` and `{{/feature}}` lines, and the lines
 *   between `{{^feature <feature>}}` and `{{/feature}}` are written only WITHOUT it.
 *
 * So a custom stack without an email transport gets no password-reset page, link or route (the
 * route answered 501 on every request), and one without payments no plan page.
 *
 * The app shell's optional parts are features too: the settings panel package brings `settings`
 * (the settings page and the header's drawer) and the footer package `footer` (the footer and the
 * about page). A feature whose controls sit inside another feature's files brings that one:
 * `templates/app/features.json` says two-factor's switch and the billing section live in the
 * settings panel, so a two-factor or payments provider brings it.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { InferredPackage } from './schema.js'

/**
 * The optional features a set of packages brings, from each registry entry's `optionalFeature`.
 *
 * @param packageNames - The project's `@molecule/*` packages.
 * @param registryPackages - Registry entries to read `optionalFeature` from.
 * @returns The feature names.
 */
export function deriveOptionalFeatures(
  packageNames: readonly string[],
  registryPackages?: readonly InferredPackage[],
): Set<string> {
  const features = new Set<string>()
  if (!registryPackages) return features
  const names = new Set(packageNames)
  for (const pkg of registryPackages) {
    if (!names.has(pkg.name)) continue
    const feature = pkg.molecule?.optionalFeature
    if (typeof feature === 'string' && feature) features.add(feature)
  }
  for (const feature of [...features]) {
    const inside = containingFeatures()[feature]
    if (inside) features.add(inside)
  }
  return features
}

/** The app templates this mlcl writes (`templates/app`). */
export const APP_TEMPLATES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'templates',
  'app',
)

/** `templates/app/features.json`: the feature whose files hold another feature's controls. */
const FEATURES_FILE = join(APP_TEMPLATES_DIR, 'features.json')

let containing: Record<string, string> | undefined

/** Each feature whose controls live in another feature's files, mapped to that feature. */
function containingFeatures(): Record<string, string> {
  if (containing) return containing
  const read = existsSync(FEATURES_FILE)
    ? (JSON.parse(readFileSync(FEATURES_FILE, 'utf8')) as Record<string, { inside?: string }>)
    : {}
  containing = Object.fromEntries(
    Object.entries(read).flatMap(([feature, spec]) =>
      spec.inside ? [[feature, spec.inside]] : [],
    ),
  )
  return containing
}

/** The directory, inside a framework's app templates, that holds whole files per feature. */
export const FEATURE_TEMPLATES_DIR = 'features'

const SECTION_OPEN = /^\s*\{\{([#^])feature ([a-z][a-z0-9-]*)\}\}\s*$/
const SECTION_CLOSE = /^\s*\{\{\/feature\}\}\s*$/

/**
 * Keep or drop each feature section of a template.
 *
 * A section is the lines between an opening line `{{#feature <name>}}` (kept with the feature) or
 * `{{^feature <name>}}` (kept without it) and a closing line `{{/feature}}`. The marker lines are
 * always dropped. A section may sit inside another: a line is kept when every section around it
 * keeps it (Angular's login page lists the OAuth buttons and the footer in one `imports` line, so it
 * needs a line for each pair). A dropped section between two blank lines leaves one blank line, as
 * the project's formatter would.
 *
 * @param content - The template text.
 * @param features - The features the project has.
 * @param source - The template's name, for errors.
 * @returns The text with each section kept or dropped.
 * @throws {Error} When a section is unclosed or closed without being opened.
 */
export function applyFeatureSections(
  content: string,
  features: ReadonlySet<string>,
  source = 'template',
): string {
  if (!content.includes('feature')) return content
  const out: string[] = []
  const open: { keep: boolean; line: number }[] = []
  const keeping = (): boolean => open.every((section) => section.keep)
  let droppedAfterBlank = false
  const lines = content.split('\n')
  lines.forEach((line, index) => {
    const start = SECTION_OPEN.exec(line)
    if (start) {
      const has = features.has(start[2] as string)
      open.push({ keep: start[1] === '#' ? has : !has, line: index + 1 })
      return
    }
    if (SECTION_CLOSE.test(line)) {
      const closed = open.pop()
      if (!closed) throw new Error(`${source}:${index + 1}: {{/feature}} closes no section`)
      if (keeping())
        droppedAfterBlank = !closed.keep && out.length > 0 && out[out.length - 1]?.trim() === ''
      return
    }
    if (/\{\{[#^/]feature\b/.test(line)) {
      throw new Error(`${source}:${index + 1}: a feature marker must be the only text on its line`)
    }
    if (!keeping()) return
    if (droppedAfterBlank && line.trim() === '') {
      droppedAfterBlank = false
      return
    }
    droppedAfterBlank = false
    out.push(line)
  })
  const unclosed = open.pop()
  if (unclosed) throw new Error(`${source}:${unclosed.line}: feature section is never closed`)
  return out.join('\n')
}

/**
 * The feature names a template text uses in its sections.
 *
 * @param content - The template text.
 * @returns The names, in order of first use.
 */
export function featureSectionNames(content: string): string[] {
  const names = new Set<string>()
  for (const line of content.split('\n')) {
    const start = SECTION_OPEN.exec(line)
    if (start) names.add(start[2] as string)
  }
  return [...names]
}

/**
 * The features a framework's app templates change with: those its files gate with a section and
 * those it holds whole files for. A react-native-web app writes its own settings drawer and
 * footer, so the settings panel and footer packages, which bring `settings` and `footer`, would
 * change nothing in it.
 *
 * @param appTemplatesDir - The `templates/app` directory.
 * @param framework - The registry app-framework key.
 * @returns The feature names.
 */
export function frameworkTemplateFeatures(appTemplatesDir: string, framework: string): Set<string> {
  const features = new Set<string>()
  const frameworkDir = join(appTemplatesDir, framework)
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.name.endsWith('.tpl'))
        for (const name of featureSectionNames(readFileSync(path, 'utf8'))) features.add(name)
    }
  }
  if (existsSync(frameworkDir)) walk(frameworkDir)
  const featuresDir = join(frameworkDir, FEATURE_TEMPLATES_DIR)
  if (existsSync(featuresDir))
    for (const entry of readdirSync(featuresDir, { withFileTypes: true }))
      if (entry.isDirectory()) features.add(entry.name)
  return features
}

/**
 * The `@molecule/*` packages the whole files of these features import, for a framework.
 *
 * Read from `<appTemplatesDir>/<framework>/features/<feature>/`, so a package only a feature uses
 * (the OAuth buttons' `@molecule/app-auth-ui-react`) is installed only with that feature, with
 * no list of them to keep.
 *
 * @param appTemplatesDir - The `templates/app` directory.
 * @param framework - The registry app-framework key.
 * @param features - The features the stack brings.
 * @returns The package names, sorted.
 */
export function featureTemplatePackages(
  appTemplatesDir: string,
  framework: string,
  features: ReadonlySet<string>,
): string[] {
  const packages = new Set<string>()
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.name.endsWith('.tpl')) {
        const text = readFileSync(path, 'utf8')
        for (const match of text.matchAll(
          /\bfrom\s+['"](@molecule\/[a-z0-9-]+)(?:\/[^'"]*)?['"]/g,
        )) {
          packages.add(match[1] as string)
        }
      }
    }
  }
  for (const feature of features) {
    const dir = join(appTemplatesDir, framework, FEATURE_TEMPLATES_DIR, feature)
    if (existsSync(dir)) walk(dir)
  }
  return [...packages].sort()
}
