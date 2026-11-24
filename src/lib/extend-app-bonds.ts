/** Extend a project's composition root without replacing its configuration or exports. */
import { ts } from 'ts-morph'

import { compareModulePaths } from './format.js'

/**
 * Use TypeScript's syntax tree for import identities and the startup body. Preserve the app's
 * code, including async startup and custom setup arguments; add only missing generated wiring.
 *
 * @param existing - The app's current provider index.
 * @param generated - The new packages' provider index.
 * @returns The current index with the additional providers wired into its startup function.
 * @throws When the current index has no setupProviders function body to extend.
 */
export function extendAppBonds(existing: string, generated: string): string {
  return extendBondsIndex(existing, generated, 'setupProviders')
}

/**
 * The API counterpart of {@link extendAppBonds}: add a package's bond setup to an existing
 * `setupBonds()` without regenerating it. The secrets the new providers read join the
 * existing `resolveAll([...])` list, setup calls the generator places before that call stay
 * before it, and a statement marked `KEEP THIS CALL LAST` (the scaffold's activity capture)
 * stays last.
 *
 * @param existing - The project's current `src/bonds/index.ts`.
 * @param generated - The index the injector generated for the packages being added.
 * @returns The current index with the added providers wired into `setupBonds()`.
 * @throws When the current index has no setupBonds function body to extend.
 */
export function extendApiBonds(existing: string, generated: string): string {
  return extendBondsIndex(existing, generated, 'setupBonds')
}

/** The package that exports the secrets resolver both indexes call. */
const SECRETS_RESOLVER = '@molecule/api-secrets:resolveAll'

/** The comment the scaffold puts above a setup call that must run after every other one. */
const KEEP_LAST_MARKER = 'KEEP THIS CALL LAST'

/**
 * The index's first run of consecutive `export … from` statements, when nothing but whitespace
 * separates them (a comment between two would not survive a re-sort).
 *
 * @param file - The parsed index.
 * @param source - Its text.
 * @returns The run's span and each statement's path and text, or undefined when it has none.
 */
function fromExportRun(
  file: ts.SourceFile,
  source: string,
): { start: number; end: number; entries: Array<{ path: string; text: string }> } | undefined {
  const entries: Array<{ path: string; text: string }> = []
  let start = -1
  let end = -1
  for (const node of file.statements) {
    const from =
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
        ? node.moduleSpecifier.text
        : undefined
    if (from === undefined) {
      if (entries.length) break
      continue
    }
    if (entries.length && source.slice(end, node.getStart(file)).trim() !== '') break
    if (!entries.length) start = node.getStart(file)
    end = node.end
    entries.push({ path: from, text: source.slice(node.getStart(file), node.end) })
  }
  return entries.length ? { start, end, entries } : undefined
}

function extendBondsIndex(existing: string, generated: string, setupName: string): string {
  const parse = (source: string): ts.SourceFile =>
    ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true)
  const current = parse(existing)
  const addition = parse(generated)
  const setup = current.statements.find(
    (node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) && node.name?.text === setupName,
  )
  if (!setup?.body)
    throw new Error(`Cannot extend src/bonds/index.ts: export a ${setupName} function with a body.`)
  const incoming = addition.statements.find(
    (node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) && node.name?.text === setupName,
  )
  const imports = current.statements.filter(ts.isImportDeclaration)
  const origins = new Map<string, string>()
  const occupied = new Set<string>()
  const publicNames = new Set<string>([setupName])
  for (const node of current.statements) {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause
      if (clause?.name) occupied.add(clause.name.text)
      if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings))
        occupied.add(clause.namedBindings.name.text)
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings))
        for (const spec of clause.namedBindings.elements) {
          occupied.add(spec.name.text)
          if (!clause.isTypeOnly && !spec.isTypeOnly)
            origins.set(
              `${(node.moduleSpecifier as ts.StringLiteral).text}:${(spec.propertyName ?? spec.name).text}`,
              spec.name.text,
            )
        }
    }
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause))
      for (const spec of node.exportClause.elements)
        if (!node.isTypeOnly && !spec.isTypeOnly) publicNames.add(spec.name.text)
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
      occupied.add(node.name.text)
      if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
        publicNames.add(node.name.text)
    }
    if (ts.isVariableStatement(node))
      for (const declaration of node.declarationList.declarations)
        if (ts.isIdentifier(declaration.name)) {
          occupied.add(declaration.name.text)
          if (node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
            publicNames.add(declaration.name.text)
        }
  }
  const rename = new Map<string, string>()
  const needed = new Map<string, ts.ImportSpecifier[]>()
  for (const node of addition.statements.filter(ts.isImportDeclaration)) {
    const from = (node.moduleSpecifier as ts.StringLiteral).text
    const names = node.importClause?.namedBindings
    if (!names || !ts.isNamedImports(names)) continue
    for (const spec of names.elements) {
      const exported = (spec.propertyName ?? spec.name).text
      const origin = `${from}:${exported}`
      let local = origins.get(origin)
      if (!local) {
        local = spec.name.text
        while (occupied.has(local)) local += 'Added'
        occupied.add(local)
        origins.set(origin, local)
        needed.set(from, [
          ...(needed.get(from) ?? []),
          ts.factory.createImportSpecifier(
            false,
            exported === local ? undefined : ts.factory.createIdentifier(exported),
            ts.factory.createIdentifier(local),
          ),
        ])
      }
      rename.set(spec.name.text, local)
    }
  }
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })
  const edits: Array<{ start: number; end: number; text: string }> = []
  const addedImports: string[] = []
  for (const [from, specs] of needed) {
    const prior = imports.find(
      (node) =>
        (node.moduleSpecifier as ts.StringLiteral).text === from &&
        !node.importClause?.isTypeOnly &&
        node.importClause?.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings),
    )
    if (
      prior?.importClause &&
      prior.importClause.namedBindings &&
      ts.isNamedImports(prior.importClause.namedBindings)
    ) {
      const node = ts.factory.updateImportDeclaration(
        prior,
        prior.modifiers,
        ts.factory.updateImportClause(
          prior.importClause,
          false,
          prior.importClause.name,
          ts.factory.updateNamedImports(prior.importClause.namedBindings, [
            ...prior.importClause.namedBindings.elements,
            ...specs,
          ]),
        ),
        prior.moduleSpecifier,
        prior.attributes,
      )
      edits.push({
        start: prior.getStart(current),
        end: prior.end,
        text: printer.printNode(ts.EmitHint.Unspecified, node, current),
      })
    } else
      addedImports.push(
        `import { ${specs.map((spec) => printer.printNode(ts.EmitHint.Unspecified, spec, addition)).join(', ')} } from ${JSON.stringify(from)};`,
      )
  }
  // Only rewrite the new statements: the application's existing aliases and property names
  // retain their meaning. A renamed shorthand keeps its public object key.
  const rewrite: ts.TransformerFactory<ts.Node> = (context) => {
    const visit: ts.Visitor = (node) => {
      if (ts.isShorthandPropertyAssignment(node) && rename.has(node.name.text))
        return ts.factory.createPropertyAssignment(
          node.name.text,
          ts.factory.createIdentifier(rename.get(node.name.text)!),
        )
      if (
        ts.isIdentifier(node) &&
        rename.has(node.text) &&
        !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) &&
        !(ts.isPropertyAssignment(node.parent) && node.parent.name === node)
      )
        return ts.factory.createIdentifier(rename.get(node.text)!)
      return ts.visitEachChild(node, visit, context)
    }
    return (node) => ts.visitNode(node, visit)!
  }
  const called = new Set<string>()
  const collect = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression))
      called.add(node.expression.text)
    ts.forEachChild(node, collect)
  }
  collect(setup.body)
  // The call a statement makes, unwrapping `await`.
  const callOf = (node: ts.Node): ts.CallExpression | undefined => {
    const expression = ts.isExpressionStatement(node) ? node.expression : undefined
    const call = expression && ts.isAwaitExpression(expression) ? expression.expression : expression
    return call && ts.isCallExpression(call) ? call : undefined
  }
  // Local names each file gives the secrets resolver.
  const resolverNames = (file: ts.SourceFile): Set<string> => {
    const names = new Set<string>()
    for (const node of file.statements.filter(ts.isImportDeclaration)) {
      const bindings = node.importClause?.namedBindings
      if (!bindings || !ts.isNamedImports(bindings)) continue
      for (const spec of bindings.elements)
        if (
          `${(node.moduleSpecifier as ts.StringLiteral).text}:${(spec.propertyName ?? spec.name).text}` ===
          SECRETS_RESOLVER
        )
          names.add(spec.name.text)
    }
    return names
  }
  const currentResolvers = resolverNames(current)
  const incomingResolvers = resolverNames(addition)
  const resolves = (node: ts.Node, names: Set<string>): ts.CallExpression | undefined => {
    const call = callOf(node)
    return call && ts.isIdentifier(call.expression) && names.has(call.expression.text)
      ? call
      : undefined
  }
  const stringKeys = (call: ts.CallExpression): string[] | undefined => {
    const list = call.arguments[0]
    if (!list) return undefined
    if (!ts.isArrayLiteralExpression(list)) return undefined
    return list.elements.filter(ts.isStringLiteralLike).map((element) => element.text)
  }
  const existingResolve = setup.body.statements.find((node) => resolves(node, currentResolvers))
  const keepLast = setup.body.statements.find((node) =>
    (ts.getLeadingCommentRanges(existing, node.getFullStart()) ?? []).some((range) =>
      existing.slice(range.pos, range.end).includes(KEEP_LAST_MARKER),
    ),
  )
  // Calls the generator puts before the secrets resolve (the secrets provider itself) stay
  // before the project's resolve; the rest go after the project's own calls.
  const beforeResolve: string[] = []
  const calls: string[] = []
  let pastResolve = false
  for (const statement of incoming?.body?.statements ?? []) {
    const resolve = resolves(statement, incomingResolvers)
    if (resolve && existingResolve) {
      pastResolve = true
      const target = resolves(existingResolve, currentResolvers)!
      const list = target.arguments[0]
      const keys = stringKeys(resolve) ?? []
      // A bare resolveAll() already resolves every registered secret.
      if (!list || keys.length === 0) continue
      if (!ts.isArrayLiteralExpression(list))
        throw new Error(
          `Cannot extend src/bonds/index.ts: add ${keys.join(', ')} to the resolveAll() call by hand.`,
        )
      const have = new Set(stringKeys(target) ?? [])
      const missing = keys.filter((key) => !have.has(key)).map((key) => JSON.stringify(key))
      if (missing.length === 0) continue
      const last = list.elements.at(-1)
      const at = last ? last.end : list.getStart(current) + 1
      edits.push({ start: at, end: at, text: `${last ? ', ' : ''}${missing.join(', ')}` })
      continue
    }
    const transformed = ts.transform(statement, [rewrite])
    const node = transformed.transformed[0]
    const call = callOf(node)
    if (!call || !ts.isIdentifier(call.expression) || !called.has(call.expression.text))
      (existingResolve && !pastResolve ? beforeResolve : calls).push(
        printer.printNode(ts.EmitHint.Unspecified, node, addition),
      )
    transformed.dispose()
  }
  // Insert above a statement, keeping its leading comments attached to it.
  const lineStartAbove = (node: ts.Node): number => {
    const comments = ts.getLeadingCommentRanges(existing, node.getFullStart()) ?? []
    const first = comments[0]?.pos ?? node.getStart(current)
    return existing.lastIndexOf('\n', first - 1) + 1
  }
  const indentOf = (node: ts.Node): string => {
    const start = node.getStart(current)
    return existing.slice(existing.lastIndexOf('\n', start - 1) + 1, start)
  }
  // A generated `export … from` joins the index's own run of them, in the order the scaffold's
  // `simple-import-sort/exports` rule keeps: placed after the imports instead, it starts a second
  // run, and the blank line between the two is a lint warning in every extended project.
  const exports: string[] = []
  const fromExports: Array<{ path: string; text: string }> = []
  for (const node of addition.statements.filter(ts.isExportDeclaration)) {
    if (!node.exportClause || !ts.isNamedExports(node.exportClause)) continue
    const specs = node.exportClause.elements.filter((spec) => !publicNames.has(spec.name.text))
    if (!specs.length) continue
    const names = specs.map((spec) => {
      const local = (spec.propertyName ?? spec.name).text
      const renamed = node.moduleSpecifier ? local : (rename.get(local) ?? local)
      return renamed === spec.name.text ? renamed : `${renamed} as ${spec.name.text}`
    })
    const text = `export { ${names.join(', ')} }${node.moduleSpecifier ? ` from ${node.moduleSpecifier.getText(addition)}` : ''};`
    if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier))
      fromExports.push({ path: node.moduleSpecifier.text, text })
    else exports.push(text)
  }
  const run = fromExportRun(current, existing)
  if (run && fromExports.length) {
    const merged = [...run.entries, ...fromExports].sort((a, b) =>
      compareModulePaths(a.path, b.path),
    )
    edits.push({
      start: run.start,
      end: run.end,
      text: merged.map((entry) => entry.text).join('\n'),
    })
  } else exports.unshift(...fromExports.map((entry) => entry.text))
  if (addedImports.length || exports.length) {
    const start = imports.at(-1)?.end ?? 0
    edits.push({ start, end: start, text: `\n${[...addedImports, ...exports].join('\n')}\n` })
  }
  if (beforeResolve.length && existingResolve) {
    const start = lineStartAbove(existingResolve)
    const indent = indentOf(existingResolve)
    edits.push({
      start,
      end: start,
      text: beforeResolve.map((call) => `${indent}${call}\n`).join(''),
    })
  }
  if (calls.length && keepLast) {
    const start = lineStartAbove(keepLast)
    const indent = indentOf(keepLast)
    edits.push({
      start,
      end: start,
      text: `${calls.map((call) => `${indent}${call}\n`).join('')}\n`,
    })
  } else if (calls.length) {
    const last = setup.body.statements.at(-1)
    const start = last && ts.isReturnStatement(last) ? last.getStart(current) : setup.body.end - 1
    edits.push({ start, end: start, text: `\n${calls.join('\n')}\n` })
  }
  for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end))
    existing = existing.slice(0, edit.start) + edit.text + existing.slice(edit.end)
  return existing
}
