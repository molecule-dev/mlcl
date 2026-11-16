/** Extend an app's composition root without replacing its configuration or exports. */
import { ts } from 'ts-morph'

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
  const parse = (source: string): ts.SourceFile =>
    ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true)
  const current = parse(existing)
  const addition = parse(generated)
  const setup = current.statements.find(
    (node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) && node.name?.text === 'setupProviders',
  )
  if (!setup?.body)
    throw new Error(
      'Cannot extend src/bonds/index.ts: export a setupProviders function with a body.',
    )
  const incoming = addition.statements.find(
    (node): node is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(node) && node.name?.text === 'setupProviders',
  )
  const imports = current.statements.filter(ts.isImportDeclaration)
  const origins = new Map<string, string>()
  const occupied = new Set<string>()
  const publicNames = new Set<string>(['setupProviders'])
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
  const calls: string[] = []
  for (const statement of incoming?.body?.statements ?? []) {
    const transformed = ts.transform(statement, [rewrite])
    const node = transformed.transformed[0]
    const expression = ts.isExpressionStatement(node) ? node.expression : null
    const call = expression && ts.isAwaitExpression(expression) ? expression.expression : expression
    if (
      !call ||
      !ts.isCallExpression(call) ||
      !ts.isIdentifier(call.expression) ||
      !called.has(call.expression.text)
    )
      calls.push(printer.printNode(ts.EmitHint.Unspecified, node, addition))
    transformed.dispose()
  }
  const exports: string[] = []
  for (const node of addition.statements.filter(ts.isExportDeclaration)) {
    if (!node.exportClause || !ts.isNamedExports(node.exportClause)) continue
    const specs = node.exportClause.elements.filter((spec) => !publicNames.has(spec.name.text))
    if (!specs.length) continue
    const names = specs.map((spec) => {
      const local = (spec.propertyName ?? spec.name).text
      const renamed = node.moduleSpecifier ? local : (rename.get(local) ?? local)
      return renamed === spec.name.text ? renamed : `${renamed} as ${spec.name.text}`
    })
    exports.push(
      `export { ${names.join(', ')} }${node.moduleSpecifier ? ` from ${node.moduleSpecifier.getText(addition)}` : ''};`,
    )
  }
  if (addedImports.length || exports.length) {
    const start = imports.at(-1)?.end ?? 0
    edits.push({ start, end: start, text: `\n${[...addedImports, ...exports].join('\n')}\n` })
  }
  if (calls.length) {
    const last = setup.body.statements.at(-1)
    const start = last && ts.isReturnStatement(last) ? last.getStart(current) : setup.body.end - 1
    edits.push({ start, end: start, text: `\n${calls.join('\n')}\n` })
  }
  for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end))
    existing = existing.slice(0, edit.start) + edit.text + existing.slice(edit.end)
  return existing
}
