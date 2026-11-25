/**
 * Read a custom app template the way the scaffold writes it, for tests that compile or render one.
 *
 * A framework's templates live at `templates/app/<framework>/<path>`, except a feature's whole files,
 * which live at `templates/app/<framework>/features/<feature>/<path>`. Either way, the
 * `{{#feature}}` sections are kept or dropped for the given features (see `optional-features.ts`).
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { applyFeatureSections, FEATURE_TEMPLATES_DIR } from '../../optional-features.js'

/** The custom app templates' directory. */
export const APP_TEMPLATES = join(import.meta.dirname, '..', '..', '..', '..', 'templates', 'app')

/**
 * Every feature any framework's templates gate on: the feature folder names and section names.
 *
 * @returns The feature names, sorted.
 */
export function allTemplateFeatures(): Set<string> {
  const names = new Set<string>()
  const sectionNames = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) sectionNames(path)
      else if (entry.name.endsWith('.tpl')) {
        for (const match of readFileSync(path, 'utf8').matchAll(
          /\{\{[#^]feature ([a-z0-9-]+)\}\}/g,
        ))
          names.add(match[1] as string)
      }
    }
  }
  for (const entry of readdirSync(APP_TEMPLATES, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const framework = entry.name
    const features = join(APP_TEMPLATES, framework, FEATURE_TEMPLATES_DIR)
    if (existsSync(features)) for (const name of readdirSync(features)) names.add(name)
    sectionNames(join(APP_TEMPLATES, framework))
  }
  return new Set([...names].sort())
}

/**
 * The text a scaffold with these features writes for one template (before `{{KEY}}` substitution).
 *
 * @param framework - The framework directory (`react`, `vue`, ...), or `shared`.
 * @param path - The template's path under it, as written under `src/` (`pages/Login.tsx.tpl`).
 * @param features - The features the stack brings; every feature by default.
 * @returns The template text with its sections applied.
 * @throws {Error} When the file is in a feature folder whose feature is not given.
 */
export function readAppTemplate(
  framework: string,
  path: string,
  features: ReadonlySet<string> = allTemplateFeatures(),
): string {
  const base = join(APP_TEMPLATES, framework, path)
  let file = existsSync(base) ? base : undefined
  if (!file) {
    const featuresDir = join(APP_TEMPLATES, framework, FEATURE_TEMPLATES_DIR)
    const owner = existsSync(featuresDir)
      ? readdirSync(featuresDir).find((feature) => existsSync(join(featuresDir, feature, path)))
      : undefined
    if (!owner) throw new Error(`no template ${framework}/${path}`)
    if (!features.has(owner)) throw new Error(`${framework}/${path} needs the ${owner} feature`)
    file = join(featuresDir, owner, path)
  }
  return applyFeatureSections(readFileSync(file, 'utf8'), features, file)
}
