// @vitest-environment node
/**
 * Every package mlcl's own code imports — its CLI source, its tests and its
 * scripts — is declared in mlcl's package.json.
 *
 * mlcl's CI and Release runs install mlcl ALONE (`npm ci` in a standalone
 * checkout, with `legacy-peer-deps`, so no peer is installed either). In this
 * workspace npm hoists every package to the root `node_modules`, so an import
 * mlcl never declared still resolves, and every local run is green. The first
 * run to notice is the remote one: on 2026-11-14 four test files imported
 * `@molecule/app-query-react` without declaring it, and the Release run that
 * was to publish mlcl failed on them.
 *
 * Imports are read with the TypeScript parser, so code inside strings and
 * template literals (the fixture apps tests write to disk) is not counted;
 * those fixtures declare their own dependencies.
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { join, relative } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const MLCL = join(import.meta.dirname, '..', '..', '..')
const manifest = JSON.parse(readFileSync(join(MLCL, 'package.json'), 'utf8')) as {
  name: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}
const declared = new Set([
  manifest.name,
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.devDependencies ?? {}),
  ...Object.keys(manifest.optionalDependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
])
const builtins = new Set(builtinModules)

/** The directories of mlcl's own code (templates are scaffold sources with their own manifests). */
const ROOTS = ['src', 'scripts', 'bin']
const SOURCE = /\.(?:[cm]?[jt]sx?)$/

/**
 * Every source file under one of mlcl's own code directories.
 *
 * @param dir - Absolute directory.
 * @returns Absolute file paths.
 */
function sourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.'))
      continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...sourceFiles(path))
    else if (SOURCE.test(entry.name) && !entry.name.endsWith('.d.ts')) files.push(path)
  }
  return files
}

/**
 * The package a bare specifier names (`@scope/name/sub` → `@scope/name`).
 *
 * @param specifier - An import specifier.
 * @returns The package name, or null for a relative, builtin, URL or alias specifier.
 */
function packageOf(specifier: string): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null
  if (specifier.startsWith('node:') || /^[a-z]+:/.test(specifier)) return null
  const parts = specifier.split('/')
  const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
  if (builtins.has(name)) return null
  return name
}

/**
 * The module specifiers one file loads: static imports and re-exports, `import('x')`,
 * `require('x')` and `vi.mock('x')` / `vi.importActual('x')` with a literal argument.
 *
 * @param file - Absolute path.
 * @returns The literal specifiers.
 */
function specifiersOf(file: string): string[] {
  const text = readFileSync(file, 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const found: string[] = []
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      found.push(node.moduleSpecifier.text)
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const [first] = node.arguments
      const callee = node.expression
      const named =
        callee.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(callee) && callee.text === 'require') ||
        (ts.isPropertyAccessExpression(callee) &&
          ts.isIdentifier(callee.expression) &&
          callee.expression.text === 'vi' &&
          ['mock', 'doMock', 'importActual'].includes(callee.name.text))
      if (named && ts.isStringLiteralLike(first)) found.push(first.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

describe("mlcl's own imports", () => {
  it('declares every package its source, tests and scripts import', () => {
    const undeclared = new Map<string, Set<string>>()
    for (const root of ROOTS)
      for (const file of sourceFiles(join(MLCL, root)))
        for (const specifier of specifiersOf(file)) {
          const name = packageOf(specifier)
          if (!name || declared.has(name)) continue
          const files = undeclared.get(name) ?? new Set<string>()
          files.add(relative(MLCL, file))
          undeclared.set(name, files)
        }
    const report = [...undeclared]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([name, files]) =>
          `${name} — add it to mlcl's devDependencies (exact version); imported by ${[...files].sort().join(', ')}`,
      )
    expect(report).toEqual([])
  })

  it('reads imports the way the module graph does, not from strings', () => {
    const dir = join(MLCL, 'src', 'lib', '__tests__')
    const self = join(dir, 'declared-own-imports.test.ts')
    const specifiers = specifiersOf(self)
    expect(specifiers).toEqual(expect.arrayContaining(['node:fs', 'typescript', 'vitest']))
    // The doc comment above names `@molecule/app-query-react`; a comment is not an import.
    expect(specifiers).not.toContain('@molecule/app-query-react')
    expect(packageOf('@molecule/app-ui-react/dist/index.js')).toBe('@molecule/app-ui-react')
    expect(packageOf('fs')).toBeNull()
    expect(packageOf('./local.js')).toBeNull()
    expect(packageOf('virtual:module')).toBeNull()
  })
})
