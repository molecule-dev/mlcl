/**
 * The feature routers of a resource's editable Express router: the exported `<feature>Router`
 * blocks (`oauthRouter`, `emailsRouter`, `twoFactorRouter`, `paymentsRouter`) that the generated
 * App router mounts only when the stack has that feature.
 *
 * A custom scaffold writes a feature router's code only with its feature, as the mounts already
 * did. In the r18 scaffold eval (2026-11-24) every stack without them still carried all four in
 * `handlers/auth.ts` as exported, unmounted code, and Codex rewrote the file to delete them in one
 * of five runs. A later inject that brings the feature (an email transport added with `mlcl add`)
 * appends its block to the project's file, which the project owns and may have edited.
 *
 * A block is the router's declaration, every statement that names it, and each module-scope
 * constant only those statements use (two-factor's own rate limit). The comment above a statement
 * goes with it.
 *
 * @module
 */

import { ts } from 'ts-morph'

/**
 * The exported name of a feature's router: `two-factor` → `twoFactorRouter`.
 *
 * @param feature - The feature name, as resource routes mark it (`optional`).
 * @returns The router's exported name.
 */
export function featureRouterName(feature: string): string {
  return `${feature.replace(/-(\w)/g, (_match: string, ch: string) => ch.toUpperCase())}Router`
}

/** The identifiers a node reads, its own declared names left out. */
function referencedNames(node: ts.Node): Set<string> {
  const names = new Set<string>()
  const visit = (child: ts.Node): void => {
    if (ts.isIdentifier(child)) {
      const parent = child.parent
      const declares =
        (ts.isVariableDeclaration(parent) && parent.name === child) ||
        (ts.isPropertyAccessExpression(parent) && parent.name === child) ||
        (ts.isPropertyAssignment(parent) && parent.name === child)
      if (!declares) names.add(child.text)
    }
    ts.forEachChild(child, visit)
  }
  visit(node)
  return names
}

/** The names a top-level statement declares. */
function declaredNames(statement: ts.Statement): string[] {
  if (!ts.isVariableStatement(statement)) return []
  return statement.declarationList.declarations.flatMap((declaration) =>
    ts.isIdentifier(declaration.name) ? [declaration.name.text] : [],
  )
}

/**
 * The top-level statements of each feature router's block, by feature.
 *
 * @param file - The parsed router source.
 * @param features - The features the resource's routes mark (`optional`).
 * @returns The statement indexes of each feature present in the source.
 */
function featureBlocks(file: ts.SourceFile, features: readonly string[]): Map<string, Set<number>> {
  const statements = [...file.statements]
  const declared = statements.map(declaredNames)
  const reads = statements.map(referencedNames)
  const blocks = new Map<string, Set<number>>()
  for (const feature of features) {
    const router = featureRouterName(feature)
    const own = new Set<number>()
    statements.forEach((_statement, index) => {
      if (declared[index]!.includes(router) || reads[index]!.has(router)) own.add(index)
    })
    if (own.size === 0) continue
    // A module-scope constant only this block reads goes with it.
    for (let grown = true; grown;) {
      grown = false
      statements.forEach((_statement, index) => {
        if (own.has(index) || declared[index]!.length === 0) return
        const readers = statements
          .map((_other, other) => other)
          .filter(
            (other) => other !== index && declared[index]!.some((name) => reads[other]!.has(name)),
          )
        if (readers.length > 0 && readers.every((other) => own.has(other))) {
          own.add(index)
          grown = true
        }
      })
    }
    blocks.set(feature, own)
  }
  return blocks
}

/**
 * A resource router's source with only the feature routers the stack has.
 *
 * @param source - The resource's editable router source (registry `expressRouter`).
 * @param features - The features its routes mark (`optional`).
 * @param enabled - The features the stack has.
 * @returns The source without the blocks of the features it lacks.
 */
export function routerWithFeatures(
  source: string,
  features: readonly string[],
  enabled: ReadonlySet<string>,
): string {
  const file = ts.createSourceFile('router.ts', source, ts.ScriptTarget.Latest, true)
  const drop = new Set<number>()
  for (const [feature, block] of featureBlocks(file, features))
    if (!enabled.has(feature)) for (const index of block) drop.add(index)
  if (drop.size === 0) return source
  let out = ''
  let at = 0
  file.statements.forEach((statement, index) => {
    if (!drop.has(index)) return
    out += source.slice(at, statement.getFullStart())
    at = statement.getEnd()
  })
  return out + source.slice(at)
}

/**
 * The project's router file with the feature routers it lacks added, for the features the stack
 * now has.
 *
 * @param existing - The project's router file.
 * @param source - The resource's editable router source (registry `expressRouter`).
 * @param features - The features its routes mark (`optional`).
 * @param enabled - The features the stack has.
 * @returns The file with each missing block inserted before its default export (else at its end),
 *   or undefined when nothing is missing.
 */
export function routerWithAddedFeatures(
  existing: string,
  source: string,
  features: readonly string[],
  enabled: ReadonlySet<string>,
): string | undefined {
  const file = ts.createSourceFile('router.ts', source, ts.ScriptTarget.Latest, true)
  const target = ts.createSourceFile('router.ts', existing, ts.ScriptTarget.Latest, true)
  const has = new Set(target.statements.flatMap(declaredNames))
  const add: string[] = []
  for (const [feature, block] of featureBlocks(file, features)) {
    if (!enabled.has(feature) || has.has(featureRouterName(feature))) continue
    // Each statement keeps the spacing above it in the source; the block starts at its first.
    const text = file.statements
      .filter((_statement, index) => block.has(index))
      .map((statement) => statement.getFullText(file))
      .join('')
    add.push(text.replace(/^\s+/, '').trimEnd())
  }
  if (add.length === 0) return undefined
  const block = `${add.join('\n\n')}\n`
  const exported = target.statements.find(ts.isExportAssignment)
  if (!exported) return `${existing.trimEnd()}\n\n${block}`
  const at = exported.getFullStart()
  return `${existing.slice(0, at).trimEnd()}\n\n${block}\n${existing.slice(at).replace(/^\s*\n/, '')}`
}
