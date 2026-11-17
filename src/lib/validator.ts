/**
 * Verify that injection produced its documented scaffold artifacts.
 * TypeScript, lint, build and runtime correctness are checked by `mlcl check`,
 * using the project's own tools. Source substrings cannot establish runtime wiring.
 * @module
 */
import { access, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import { t } from './i18n.js'
import { getAppFrameworkDeps, getPackageStack } from './registry.js'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/** What a project Molecule did not create is checked for instead. */
export interface ExistingProjectValidation {
  /** True for a project whose package.json has no `molecule.projectType`. */
  existingProject?: boolean
  /** Absolute path of the setup module inject wrote there (it may be `.js` or `.mjs`). */
  bondsIndex?: string
}

/**
 * Check the generated file contract without guessing application behavior. A project Molecule
 * did not create keeps its own server and router, so only its setup module is required there.
 */
export async function validateInjectionOutput(
  projectPath: string,
  options: ExistingProjectValidation = {},
): Promise<ValidationResult> {
  const errors: string[] = []
  const app = await detectAppProjectForValidation(projectPath)
  const artifacts =
    options.existingProject && options.bondsIndex
      ? [relative(projectPath, options.bondsIndex)]
      : app
        ? ['src/bonds/index.ts']
        : ['src/server.ts', 'src/App/router.ts', 'src/bonds/index.ts']
  for (const file of artifacts) {
    try {
      await access(join(projectPath, file))
    } catch (_error) {
      errors.push(t('lib.validator.errors.missingCriticalFile', { file }))
    }
  }
  return { valid: errors.length === 0, errors, warnings: [] }
}

/**
 * Detect app project by reading package.json molecule.projectType or deps.
 */
async function detectAppProjectForValidation(projectPath: string): Promise<boolean> {
  try {
    const packageJson = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'))
    if (packageJson.molecule?.projectType === 'app') return true

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
    const frameworkDeps = getAppFrameworkDeps()
    if (frameworkDeps.some((d) => d in deps) && !('express' in deps)) return true

    const moleculeDeps = Object.keys(deps).filter((d) => d.startsWith('@molecule/'))
    const hasAppPkgs = moleculeDeps.some((d) => getPackageStack(d) === 'app')
    const hasApiPkgs = moleculeDeps.some((d) => getPackageStack(d) === 'api')
    if (hasAppPkgs && !hasApiPkgs) return true

    return false
  } catch (_error) {
    // Best-effort: if package.json is absent or unparseable, treat as non-app project
    return false
  }
}
