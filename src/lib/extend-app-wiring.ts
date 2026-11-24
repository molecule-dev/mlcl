/**
 * Add a package's lines to an app project's shared wiring files without regenerating them.
 * `mlcl add <package> --inject` generates the app's i18n bond for the packages it adds; the
 * project's copy already loads every other companion locale bond, so only the missing loaders
 * move across. Without this, a locale bond the command installs is in package.json and nothing
 * loads it, and its strings stay English in every other language.
 *
 * @module
 */
import { ts } from 'ts-morph'

import { applyEdits, importedNames, parse, specifierOf } from './extend-api-wiring.js'
import { getRawRegistry, requirePackageByRole } from './registry.js'

/** The property of the i18n setup call that lists the companion locale bonds' loaders. */
const LOADERS = 'packageLocaleLoaders'

/**
 * The file name of an app's i18n bond (`i18n-default.ts`): the `defaultBond` the registry gives
 * the app i18n core, which is the name inject writes the bond under.
 *
 * @returns The bond's file name, relative to the app's `src/bonds/`.
 * @throws When the registry gives the app i18n core no `defaultBond`.
 */
export function appI18nBondFile(): string {
  const core = requirePackageByRole('app', 'core', 'i18n')
  const bond = getRawRegistry().packages[core]?.defaultBond
  if (!bond) throw new Error(`The registry gives ${core} no defaultBond.`)
  return `${bond}.ts`
}

/** The object literal passed to the i18n setup call: the one that has an `enUi` property. */
function setupOptions(file: ts.SourceFile): ts.ObjectLiteralExpression | undefined {
  let found: ts.ObjectLiteralExpression | undefined
  const visit = (node: ts.Node): void => {
    if (found) return
    if (
      ts.isObjectLiteralExpression(node) &&
      node.properties.some(
        (property) =>
          ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.name) &&
          property.name.text === 'enUi',
      )
    ) {
      found = node
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return found
}

/** The `packageLocaleLoaders` array in the setup call's options, if it has one. */
function loadersOf(options: ts.ObjectLiteralExpression): ts.ArrayLiteralExpression | undefined {
  for (const property of options.properties)
    if (
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === LOADERS &&
      ts.isArrayLiteralExpression(property.initializer)
    )
      return property.initializer
  return undefined
}

/**
 * Add the generated companion locale bonds to an existing app i18n bond (`src/bonds/i18n-default.ts`):
 * each bond whose loader the file does not import yet gets its import and an entry in the setup
 * call's `packageLocaleLoaders`, which is added when the file has none. Everything else in the
 * file stays as it is.
 *
 * @param existing - The project's current i18n bond.
 * @param generated - The i18n bond generated for the packages being added.
 * @returns The current file with the missing loaders added.
 * @throws When the current file has no setup call options (an object with `enUi`) to extend, or
 *   its `packageLocaleLoaders` is not an array.
 */
export function extendAppLocales(existing: string, generated: string): string {
  const current = parse('i18n.ts', existing)
  const addition = parse('i18n.ts', generated)
  const generatedOptions = setupOptions(addition)
  const wanted = new Set(
    (generatedOptions ? loadersOf(generatedOptions)?.elements : undefined)
      ?.filter(ts.isIdentifier)
      .map((element) => element.text) ?? [],
  )
  if (wanted.size === 0) return existing
  const options = setupOptions(current)
  if (!options)
    throw new Error(
      `Cannot extend src/bonds/${appI18nBondFile()}: it has no i18n setup call with enUi to add the locale bonds to.`,
    )
  const list = loadersOf(options)
  if (
    !list &&
    options.properties.some(
      (property) =>
        ts.isPropertyAssignment(property) &&
        ts.isIdentifier(property.name) &&
        property.name.text === LOADERS,
    )
  )
    throw new Error(
      `Cannot extend src/bonds/${appI18nBondFile()}: its ${LOADERS} is not an array literal.`,
    )
  const loaded = new Set(current.statements.filter(ts.isImportDeclaration).map(specifierOf))
  const bound = importedNames(current)
  const imports: string[] = []
  const names: string[] = []
  for (const node of addition.statements.filter(ts.isImportDeclaration)) {
    const from = specifierOf(node)
    const bindings = node.importClause?.namedBindings
    if (loaded.has(from) || !bindings || !ts.isNamedImports(bindings)) continue
    const spec = bindings.elements.find((element) => wanted.has(element.name.text))
    if (!spec) continue
    const exported = (spec.propertyName ?? spec.name).text
    let name = spec.name.text
    while (bound.has(name)) name += 'Added'
    bound.add(name)
    imports.push(`import { ${exported === name ? name : `${exported} as ${name}`} } from '${from}'`)
    names.push(name)
  }
  if (names.length === 0) return existing
  const lastImport = current.statements.filter(ts.isImportDeclaration).at(-1)
  const lastEntry = list?.elements.at(-1)
  const lastProperty = options.properties.at(-1)
  const entries = list
    ? {
        at: lastEntry ? lastEntry.end : list.getStart(current) + 1,
        text: `${lastEntry ? ', ' : ''}${names.join(', ')}`,
      }
    : {
        at: lastProperty ? lastProperty.end : options.getStart(current) + 1,
        text: `${lastProperty ? ',' : ''}\n  ${LOADERS}: [${names.join(', ')}]`,
      }
  return applyEdits(existing, [
    { at: lastImport?.end ?? 0, text: `\n${imports.join('\n')}` },
    entries,
  ])
}
