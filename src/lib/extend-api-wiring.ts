/**
 * Add a package's lines to an API project's shared wiring files (the locale list and the
 * router) without regenerating them. `mlcl add <package> --inject` generates these files for
 * the packages it adds; the project's copies already wire everything else, so only the
 * missing imports and statements move across.
 *
 * @module
 */
import { ts } from 'ts-morph'

const parse = (name: string, source: string): ts.SourceFile =>
  ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true)

const specifierOf = (node: ts.ImportDeclaration): string =>
  (node.moduleSpecifier as ts.StringLiteral).text

/** Every local name a file's imports bind. */
function importedNames(file: ts.SourceFile): Set<string> {
  const names = new Set<string>()
  for (const node of file.statements.filter(ts.isImportDeclaration)) {
    const clause = node.importClause
    if (clause?.name) names.add(clause.name.text)
    const bindings = clause?.namedBindings
    if (bindings && ts.isNamespaceImport(bindings)) names.add(bindings.name.text)
    if (bindings && ts.isNamedImports(bindings))
      for (const spec of bindings.elements) names.add(spec.name.text)
  }
  return names
}

/** Apply non-overlapping insertions, last first, so earlier offsets stay valid. */
function applyEdits(text: string, edits: Array<{ at: number; text: string }>): string {
  for (const edit of [...edits].sort((a, b) => b.at - a.at))
    text = text.slice(0, edit.at) + edit.text + text.slice(edit.at)
  return text
}

/**
 * Merge the generated imports into the existing file: a module the file does not import yet
 * gets the generated declaration, and a module it already imports gains the missing names.
 *
 * @throws When a generated name is already bound to something else in the existing file.
 */
function mergeImports(
  current: ts.SourceFile,
  addition: ts.SourceFile,
  fileName: string,
): Array<{ at: number; text: string }> {
  const edits: Array<{ at: number; text: string }> = []
  const bound = importedNames(current)
  const imports = current.statements.filter(ts.isImportDeclaration)
  const added: string[] = []
  for (const node of addition.statements.filter(ts.isImportDeclaration)) {
    const from = specifierOf(node)
    const prior = imports.find(
      (existing) => specifierOf(existing) === from && !existing.importClause?.isTypeOnly,
    )
    const bindings = node.importClause?.namedBindings
    if (prior && bindings && ts.isNamedImports(bindings)) {
      const priorBindings = prior.importClause?.namedBindings
      const have = new Set(
        priorBindings && ts.isNamedImports(priorBindings)
          ? priorBindings.elements.map((spec) => spec.name.text)
          : [],
      )
      const missing = bindings.elements.filter((spec) => !have.has(spec.name.text))
      if (missing.length === 0) continue
      for (const spec of missing)
        if (bound.has(spec.name.text))
          throw new Error(`Cannot extend ${fileName}: ${spec.name.text} is already defined.`)
      if (!priorBindings || !ts.isNamedImports(priorBindings)) {
        added.push(node.getText(addition))
        continue
      }
      const last = priorBindings.elements.at(-1)
      const at = last ? last.end : priorBindings.getStart(current) + 1
      edits.push({
        at,
        text: `${last ? ', ' : ''}${missing.map((spec) => spec.getText(addition)).join(', ')}`,
      })
      continue
    }
    if (prior) continue
    for (const name of importedNames(parse('import.ts', node.getText(addition))))
      if (bound.has(name)) throw new Error(`Cannot extend ${fileName}: ${name} is already defined.`)
    added.push(node.getText(addition))
  }
  if (added.length > 0) {
    const at = imports.at(-1)?.end ?? 0
    edits.push({ at, text: `\n${added.join('\n')}` })
  }
  return edits
}

/**
 * Add the generated locale bonds to an existing `src/bonds/locales.ts`: each locale package
 * the project does not register yet gets its import and an entry in `localeModules`.
 *
 * @param existing - The project's current locales file.
 * @param generated - The locales file generated for the packages being added.
 * @returns The current file with the missing locale bonds registered.
 * @throws When the current file has no `localeModules` array to extend.
 */
export function extendApiLocales(existing: string, generated: string): string {
  const current = parse('locales.ts', existing)
  const addition = parse('locales.ts', generated)
  const listOf = (file: ts.SourceFile): ts.ArrayLiteralExpression | undefined => {
    for (const node of file.statements.filter(ts.isVariableStatement))
      for (const declaration of node.declarationList.declarations)
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === 'localeModules' &&
          declaration.initializer &&
          ts.isArrayLiteralExpression(declaration.initializer)
        )
          return declaration.initializer
    return undefined
  }
  const list = listOf(current)
  if (!list) throw new Error('Cannot extend src/bonds/locales.ts: it has no localeModules array.')
  const registered = new Set(
    current.statements
      .filter(ts.isImportDeclaration)
      .filter(
        (node) =>
          node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings),
      )
      .map(specifierOf),
  )
  const bound = importedNames(current)
  const imports: string[] = []
  const names: string[] = []
  for (const node of addition.statements.filter(ts.isImportDeclaration)) {
    const bindings = node.importClause?.namedBindings
    if (!bindings || !ts.isNamespaceImport(bindings)) continue
    const from = specifierOf(node)
    if (registered.has(from)) continue
    let name = bindings.name.text
    while (bound.has(name)) name += 'Added'
    bound.add(name)
    imports.push(`import * as ${name} from '${from}'`)
    names.push(name)
  }
  if (names.length === 0) return existing
  const lastImport = current.statements.filter(ts.isImportDeclaration).at(-1)
  const lastEntry = list.elements.at(-1)
  return applyEdits(existing, [
    { at: lastImport?.end ?? 0, text: `\n${imports.join('\n')}` },
    {
      at: lastEntry ? lastEntry.end : list.getStart(current) + 1,
      text: `${lastEntry ? ', ' : ''}${names.join(', ')}`,
    },
  ])
}

/** A statement's text with whitespace removed, to recognize one the file already has. */
const normalized = (text: string): string => text.replace(/\s+/g, '')

/** The router declaration (`export const router = …`) in a router file. */
function routerDeclaration(file: ts.SourceFile): ts.VariableStatement | undefined {
  return file.statements.find(
    (node): node is ts.VariableStatement =>
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some(
        (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === 'router',
      ),
  )
}

/**
 * Whether a generated router mounts anything: a statement after its `router` declaration.
 *
 * @param content - The router file.
 * @returns True when the router mounts routes or middleware.
 */
export function mountsRoutes(content: string): boolean {
  const file = parse('router.ts', content)
  const declaration = routerDeclaration(file)
  return Boolean(declaration && file.statements.indexOf(declaration) < file.statements.length - 1)
}

/** Whether a statement installs an authorization's `verifyMiddleware()`. */
const isAuthGate = (node: ts.Statement, file: ts.SourceFile): boolean =>
  ts.isExpressionStatement(node) && /\.verifyMiddleware\(/.test(node.getText(file))

/** The first words of the header the router generator writes. */
const GENERATED_HEADER_START = '// Generated by mlcl create from the packages you selected'

/** Header lines that list one package's mounted routes (`//   @molecule/<pkg> (Name): …`). */
const MOUNT_LINE = /^\/\/ {3}@molecule\//

/**
 * Add the generated mounts to an existing generated router: the missing imports, any new
 * authorization gate (placed with the router's other gates, before every route), the new
 * route statements (after the existing ones) and their lines in the header comment.
 *
 * @param existing - The project's current router.
 * @param generated - The router generated for the packages being added.
 * @returns The current router with the new package's routes mounted.
 * @throws When the current router has no `router` declaration to extend.
 */
export function extendApiRouter(existing: string, generated: string): string {
  const current = parse('router.ts', existing)
  const addition = parse('router.ts', generated)
  const declaration = routerDeclaration(current)
  const incoming = routerDeclaration(addition)
  if (!declaration || !incoming)
    throw new Error('Cannot extend src/App/router.ts: it has no `router` declaration.')
  const have = new Set(current.statements.map((node) => normalized(node.getText(current))))
  const after = addition.statements.slice(addition.statements.indexOf(incoming) + 1)
  const gates: string[] = []
  const routes: string[] = []
  for (const node of after) {
    const text = node.getText(addition)
    if (have.has(normalized(text))) continue
    ;(isAuthGate(node, addition) ? gates : routes).push(text)
  }
  if (gates.length === 0 && routes.length === 0) return existing
  const edits = mergeImports(current, addition, 'src/App/router.ts')
  if (gates.length > 0) {
    const anchor =
      [...current.statements].reverse().find((node) => isAuthGate(node, current)) ?? declaration
    edits.push({ at: anchor.end, text: `\n${gates.join('\n')}` })
  }
  if (routes.length > 0) edits.push({ at: existing.length, text: `\n${routes.join('\n\n')}\n` })
  // The header lists what the router mounts; add the new packages' lines to it.
  const headerEnd = current.statements[0]?.getStart(current) ?? 0
  const header = existing.slice(0, headerEnd).split('\n')
  const generatedHeader = generated
    .slice(0, addition.statements[0]?.getStart(addition) ?? 0)
    .split('\n')
  const newMounts = generatedHeader.filter(
    (line) => MOUNT_LINE.test(line) && !header.includes(line),
  )
  const merged = applyEdits(existing, edits)
  if (!header.some((line) => line.includes(GENERATED_HEADER_START))) return merged
  if (newMounts.length > 0) {
    const none = header.findIndex((line) => line.startsWith('// It mounts no package routes'))
    let lastMount = -1
    header.forEach((line, index) => {
      if (MOUNT_LINE.test(line)) lastMount = index
    })
    const intro = generatedHeader.find((line) => line.startsWith('// Mounted here'))
    if (none >= 0) header.splice(none, 1, ...(intro ? [intro] : []), ...newMounts)
    else if (lastMount >= 0) header.splice(lastMount + 1, 0, ...newMounts)
  }
  // A paragraph the generator adds for one package (the account functions of the user
  // resource) comes across with it.
  const lastComment = header.reduce(
    (last, line, index) => (line.startsWith('//') ? index : last),
    -1,
  )
  const notes = generatedHeader.filter(
    (line) =>
      line.startsWith('// ') &&
      !MOUNT_LINE.test(line) &&
      !line.startsWith('// It mounts no package routes') &&
      !line.startsWith('// Mounted here') &&
      !header.includes(line),
  )
  if (notes.length > 0) header.splice(lastComment + 1, 0, ...notes.flatMap((line) => ['//', line]))
  return header.join('\n') + merged.slice(headerEnd)
}

/**
 * Point a `setupBonds()`'s `resolveAll([...])` list at a swapped provider's secrets: the
 * replaced provider's keys leave the list and the new provider's join it. `resolveAll` copies
 * only the keys it is given from `.env` into `process.env`, so a swap that left the list alone
 * started the new provider without its key. A bare `resolveAll()` (every registered secret)
 * is left as it is.
 *
 * @param source - The project's `src/bonds/index` source.
 * @param removed - The replaced provider's secret names.
 * @param added - The new provider's secret names.
 * @returns The source with the list updated.
 */
export function swapResolvedSecrets(
  source: string,
  removed: readonly string[],
  added: readonly string[],
): string {
  const file = parse('index.ts', source)
  const resolvers = new Set<string>()
  for (const node of file.statements.filter(ts.isImportDeclaration)) {
    const bindings = node.importClause?.namedBindings
    if (specifierOf(node) !== '@molecule/api-secrets' || !bindings || !ts.isNamedImports(bindings))
      continue
    for (const spec of bindings.elements)
      if ((spec.propertyName ?? spec.name).text === 'resolveAll') resolvers.add(spec.name.text)
  }
  const lists: ts.ArrayLiteralExpression[] = []
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      resolvers.has(node.expression.text) &&
      node.arguments[0] &&
      ts.isArrayLiteralExpression(node.arguments[0])
    )
      lists.push(node.arguments[0])
    ts.forEachChild(node, visit)
  }
  visit(file)
  let result = source
  for (const list of lists.reverse()) {
    if (!list.elements.every(ts.isStringLiteralLike)) continue
    const keys = list.elements.map((element) => (element as ts.StringLiteralLike).text)
    const next = [
      ...keys.filter((key) => !removed.includes(key) || added.includes(key)),
      ...added.filter((key) => !keys.includes(key)),
    ]
    if (next.join('\n') === keys.join('\n')) continue
    result =
      result.slice(0, list.getStart(file)) +
      `[${next.map((key) => `'${key}'`).join(', ')}]` +
      result.slice(list.end)
  }
  return result
}
