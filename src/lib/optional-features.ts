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
 * settings panel, so a two-factor or payments provider brings it. The same file declares which
 * enabled features include other capabilities and which packages enable a feature only when
 * selected by name. A package installed as a peer does not count as an explicit selection.
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
 * @param selectedFeatures - Features explicitly selected by name and recorded in the project manifest.
 * @returns The feature names.
 */
export function deriveOptionalFeatures(
  packageNames: readonly string[],
  registryPackages?: readonly InferredPackage[],
  selectedFeatures: readonly string[] = [],
): Set<string> {
  const features = new Set(selectedFeatures)
  const names = new Set(packageNames)
  for (const pkg of registryPackages ?? []) {
    if (!names.has(pkg.name)) continue
    const feature = pkg.molecule?.optionalFeature
    if (typeof feature === 'string' && feature) features.add(feature)
  }
  const specs = featureDefinitions()
  // A Set visits each newly included feature once, even when definitions form a cycle.
  for (const feature of features) {
    for (const included of specs[feature]?.includes ?? []) features.add(included)
  }
  // A containing template is a placement requirement. Its capabilities are enabled when
  // the package that implements them is declared (an API-only stack has no settings panel).
  for (const feature of [...features]) {
    const inside = specs[feature]?.inside
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

interface FeatureDefinition {
  inside?: string
  includes?: string[]
  selectedBy?: string
}

let definitions: Record<string, FeatureDefinition> | undefined

/** Load the feature combinations and explicit selections shared by the app and API templates. */
function featureDefinitions(): Record<string, FeatureDefinition> {
  const file = join(APP_TEMPLATES_DIR, 'features.json')
  return (definitions ??= existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {})
}

/**
 * Find the opt-in features that the packages explicitly requested by create or add enable.
 *
 * @param packageNames - The names requested before the CLI resolves peers and defaults.
 * @returns The opted-in feature names.
 */
export function selectOptionalFeatures(packageNames: readonly string[]): string[] {
  return Object.entries(featureDefinitions()).flatMap(([feature, spec]) =>
    spec.selectedBy && packageNames.includes(spec.selectedBy) ? [feature] : [],
  )
}

/**
 * Read explicit feature selections from a project's package.json `molecule` field.
 *
 * @param metadata - The manifest's parsed Molecule metadata.
 * @returns The selected feature names, including for a manifest predating the field.
 */
export function recordedOptionalFeatures(metadata: unknown): string[] {
  const selected = (metadata as { selectedFeatures?: unknown } | undefined)?.selectedFeatures
  return Array.isArray(selected)
    ? selected.filter((name): name is string => typeof name === 'string')
    : []
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
