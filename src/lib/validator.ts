/**
 * Post-injection validator - sanity checks on generated output.
 *
 * Verifies:
 * - All imported files exist
 * - No duplicate imports/exports
 * - Bond setup functions match their imports
 * - Router handler references are consistent
 * - Generated TypeScript has valid structure
 *
 * @module
 */

import { access, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { t } from './i18n.js'
import { getAppFrameworkDeps, getPackageStack } from './registry.js'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate the generated project output after injection.
 */
export async function validateInjectionOutput(projectPath: string): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // Detect if this is an app (frontend) project
  const isApp = await detectAppProjectForValidation(projectPath)

  if (isApp) {
    // App projects only need bonds/index.ts
    const criticalFiles = ['src/bonds/index.ts']
    for (const file of criticalFiles) {
      const fullPath = join(projectPath, file)
      try {
        await access(fullPath)
      } catch (_error) {
        // access() throws when the file is absent; the error is surfaced via errors.push below
        errors.push(t('lib.validator.errors.missingCriticalFile', { file }))
      }
    }

    // Validate bonds/index.ts
    await validateBonds(projectPath, errors, warnings)
  } else {
    // API projects need server.ts, router.ts, and bonds/index.ts
    const criticalFiles = ['src/server.ts', 'src/App/router.ts', 'src/bonds/index.ts']
    for (const file of criticalFiles) {
      const fullPath = join(projectPath, file)
      try {
        await access(fullPath)
      } catch (_error) {
        // access() throws when the file is absent; the error is surfaced via errors.push below
        errors.push(t('lib.validator.errors.missingCriticalFile', { file }))
      }
    }

    // Validate API-specific files
    await validateRouter(projectPath, errors, warnings)
    await validateBonds(projectPath, errors, warnings)
    await validateServer(projectPath, errors, warnings)
    await validateResourceWrappers(projectPath, errors, warnings)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
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

/**
 * Validate router.ts: imports resolve, no duplicate routes, handler refs are consistent.
 */
async function validateRouter(
  projectPath: string,
  errors: string[],
  warnings: string[],
): Promise<void> {
  const routerPath = join(projectPath, 'src', 'App', 'router.ts')
  let content: string
  try {
    content = await readFile(routerPath, 'utf-8')
  } catch (_error) {
    return // Already caught in critical files check; absence is already reported as an error
  }

  // Check imports reference existing files
  const importMatches = content.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)
  for (const match of importMatches) {
    const importPath = match[1].replace(/\.js$/, '.ts')
    const fullPath = join(dirname(routerPath), importPath)
    try {
      await access(fullPath)
    } catch (_error) {
      // access() throws when the file is absent; the error is surfaced via errors.push below
      errors.push(t('lib.validator.errors.routerImportMissing', { path: match[1] }))
    }
  }

  // Check for duplicate route definitions (same method + path)
  const routeMatches = content.matchAll(/router\.(get|post|put|patch|delete)\(`([^`]+)`/g)
  const routeSet = new Set<string>()
  for (const match of routeMatches) {
    const key = `${match[1].toUpperCase()} ${match[2]}`
    if (routeSet.has(key)) {
      errors.push(t('lib.validator.errors.duplicateRoute', { route: key }))
    }
    routeSet.add(key)
  }

  // Check handler references are prefixed with a known import name
  const importNameMatches = content.matchAll(/import\s+\{\s*requestHandlerMap\s+as\s+(\w+)\s*\}/g)
  const importNames = new Set<string>()
  for (const match of importNameMatches) {
    importNames.add(match[1])
  }

  const handlerRefs = content.matchAll(/\s+(\w+)\.(\w+)/g)
  for (const match of handlerRefs) {
    const prefix = match[1]
    if (prefix === 'router' || prefix === 'userAuthorization' || prefix === 'Router') continue
    if (!importNames.has(prefix)) {
      warnings.push(t('lib.validator.warnings.unknownHandlerMap', { name: prefix }))
    }
  }

  if (routeSet.size > 0) {
    // This is informational, not an error
    warnings.push(t('lib.validator.warnings.routeCount', { count: routeSet.size }))
  }
}

/**
 * Validate bonds/index.ts: no duplicate imports, setup functions match imports.
 */
async function validateBonds(
  projectPath: string,
  errors: string[],
  warnings: string[],
): Promise<void> {
  const bondsPath = join(projectPath, 'src', 'bonds', 'index.ts')
  let content: string
  try {
    content = await readFile(bondsPath, 'utf-8')
  } catch (_error) {
    return // Already caught in critical files check; absence is already reported as an error
  }

  // Check for duplicate imports
  const importMatches = content.matchAll(/import\s+\{[^}]+\}\s+from\s+['"](\.\/[^'"]+)['"]/g)
  const importPaths = new Set<string>()
  for (const match of importMatches) {
    if (importPaths.has(match[1])) {
      errors.push(t('lib.validator.errors.duplicateImport', { path: match[1] }))
    }
    importPaths.add(match[1])
  }

  // Check for duplicate re-exports
  const exportMatches = content.matchAll(/export\s+\*\s+from\s+['"](\.\/[^'"]+)['"]/g)
  const exportPaths = new Set<string>()
  for (const match of exportMatches) {
    if (exportPaths.has(match[1])) {
      errors.push(t('lib.validator.errors.duplicateExport', { path: match[1] }))
    }
    exportPaths.add(match[1])
  }

  // Check imported bond files exist
  for (const importPath of importPaths) {
    const tsPath = join(dirname(bondsPath), importPath.replace(/\.js$/, '.ts'))
    try {
      await access(tsPath)
    } catch (_error) {
      // access() throws when the file is absent; the error is surfaced via errors.push below
      errors.push(t('lib.validator.errors.bondFileMissing', { path: importPath }))
    }
  }

  // Verify each imported setup function is called in setupBonds
  const setupFunctionImports = content.matchAll(/import\s+\{\s*(setup\w+)\s*\}/g)
  for (const match of setupFunctionImports) {
    const funcName = match[1]
    if (!content.includes(`${funcName}()`)) {
      warnings.push(t('lib.validator.warnings.setupNotCalled', { name: funcName }))
    }
  }
}

/**
 * Validate server.ts: imports resolve, has required structure.
 */
async function validateServer(
  projectPath: string,
  errors: string[],
  warnings: string[],
): Promise<void> {
  const serverPath = join(projectPath, 'src', 'server.ts')
  let content: string
  try {
    content = await readFile(serverPath, 'utf-8')
  } catch (_error) {
    return // Already caught in critical files check; absence is already reported as an error
  }

  // Check local imports resolve
  const localImports = content.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)
  for (const match of localImports) {
    const importPath = match[1].replace(/\.js$/, '.ts')
    const fullPath = join(dirname(serverPath), importPath)
    try {
      await access(fullPath)
    } catch (_error) {
      // access() throws when the file is absent; the error is surfaced via errors.push below
      errors.push(t('lib.validator.errors.serverImportMissing', { path: match[1] }))
    }
  }

  // Check required patterns
  if (!content.includes('setupBonds')) {
    errors.push(t('lib.validator.errors.serverMissingBonds'))
  }
  if (!content.includes('router')) {
    errors.push(t('lib.validator.errors.serverMissingRouter'))
  }
  if (!content.includes('express')) {
    errors.push(t('lib.validator.errors.serverMissingExpress'))
  }
  if (!content.includes('/health')) {
    warnings.push(t('lib.validator.warnings.serverMissingHealth'))
  }
  if (!content.includes('ErrorRequestHandler') && !content.includes('error')) {
    warnings.push(t('lib.validator.warnings.serverMissingErrorHandler'))
  }
}

/**
 * Validate resource wrappers: import the correct factory function, export requestHandlerMap.
 */
async function validateResourceWrappers(
  projectPath: string,
  errors: string[],
  warnings: string[],
): Promise<void> {
  const resourceDir = join(projectPath, 'src', 'App', 'Resource')
  const { readdir } = await import('node:fs/promises')

  let entries
  try {
    entries = await readdir(resourceDir, { withFileTypes: true })
  } catch (_error) {
    return // Best-effort: Resource dir is optional; absence means no resource wrappers to validate
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const wrapperPath = join(resourceDir, entry.name, 'index.ts')
    let content: string
    try {
      content = await readFile(wrapperPath, 'utf-8')
    } catch (_error) {
      // access() throws when the file is absent; the warning is surfaced via warnings.push below
      warnings.push(t('lib.validator.warnings.resourceMissingWrapper', { name: entry.name }))
      continue
    }

    // Must export requestHandlerMap (via factory, re-export, or inline construction)
    if (!content.includes('requestHandlerMap')) {
      errors.push(t('lib.validator.errors.resourceMissingHandlerMap', { name: entry.name }))
    }
  }
}
