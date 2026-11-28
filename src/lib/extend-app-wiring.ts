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

/** What an app with managed locales loads its locale bonds through, and where it comes from. */
const PACKAGE_LOCALES = 'loadPackageLocales'
const PACKAGE_LOCALES_MODULE = '../locales/packages.js'

/** A locale bond's own loader, which lists all of its languages: `@molecule/app-locales-auth/loader.js`. */
const BOND_LOADER = /^@molecule\/app-locales-[^/]+\/loader\.js$/

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

/**
 * The object literal passed to the i18n setup call: the one that has an `enUi` property, or the
 * `primaryUi` an app with managed locales passes when its primary language is not English.
 */
function setupOptions(file: ts.SourceFile): ts.ObjectLiteralExpression | undefined {
  let found: ts.ObjectLiteralExpression | undefined
  const visit = (node: ts.Node): void => {
    if (found) return
    if (
      ts.isObjectLiteralExpression(node) &&
      node.properties.some(
        (property) =>
          (ts.isPropertyAssignment(property) &&
            ts.isIdentifier(property.name) &&
            property.name.text === 'enUi') ||
          (ts.isShorthandPropertyAssignment(property) && property.name.text === 'primaryUi'),
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
  if (wanted.has(PACKAGE_LOCALES)) return usePackageLocales(existing)
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

/**
 * Point the i18n bond of an app with managed locales at `loadPackageLocales` from its generated
 * locales/packages.ts, which imports only the languages the app offers. A bond mlcl 2.2.15 wrote
 * imports each locale bond's `loader.js`, which lists all 79 languages, so its build carries 79
 * chunks for every bond: those imports and their `packageLocaleLoaders` entries go, and any
 * other loader in the list stays. A bond that already uses it comes back unchanged.
 *
 * @param existing - The project's current i18n bond.
 * @returns The bond loading its locale bonds through `loadPackageLocales`.
 * @throws When the file has no i18n setup call options to change, or its
 *   `packageLocaleLoaders` is not an array.
 */
export function usePackageLocales(existing: string): string {
  const current = parse('i18n.ts', existing)
  const options = setupOptions(current)
  if (!options)
    throw new Error(
      `Cannot update src/bonds/${appI18nBondFile()}: it has no i18n setup call to load the locale bonds in.`,
    )
  const imports = current.statements.filter(ts.isImportDeclaration)
  const bondImports = imports.filter((node) => BOND_LOADER.test(specifierOf(node)))
  const hasModule = imports.some((node) => specifierOf(node) === PACKAGE_LOCALES_MODULE)
  if (bondImports.length === 0 && hasModule) return existing
  const removed = new Set(
    bondImports.flatMap((node) => {
      const bindings = node.importClause?.namedBindings
      return bindings && ts.isNamedImports(bindings)
        ? bindings.elements.map((element) => element.name.text)
        : []
    }),
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
      `Cannot update src/bonds/${appI18nBondFile()}: its ${LOADERS} is not an array literal.`,
    )
  const kept = (list?.elements ?? [])
    .filter((element) => !(ts.isIdentifier(element) && removed.has(element.text)))
    .map((element) => element.getText(current))
  if (!kept.includes(PACKAGE_LOCALES)) kept.unshift(PACKAGE_LOCALES)
  const replacements: Array<{ start: number; end: number; text: string }> = bondImports.map(
    (node) => ({
      start: node.getStart(current),
      end: node.end + (existing[node.end] === '\n' ? 1 : 0),
      text: '',
    }),
  )
  const lastProperty = options.properties.at(-1)
  replacements.push(
    list
      ? { start: list.getStart(current), end: list.end, text: `[${kept.join(', ')}]` }
      : {
          start: lastProperty ? lastProperty.end : options.getStart(current) + 1,
          end: lastProperty ? lastProperty.end : options.getStart(current) + 1,
          text: `${lastProperty ? ',' : ''}\n  ${LOADERS}: [${kept.join(', ')}]`,
        },
  )
  if (!hasModule) {
    const last = imports.filter((node) => !bondImports.includes(node)).at(-1)
    const at = last ? last.end : 0
    replacements.push({
      start: at,
      end: at,
      text: `\nimport { ${PACKAGE_LOCALES} } from '${PACKAGE_LOCALES_MODULE}'`,
    })
  }
  let text = existing
  for (const { start, end, text: insert } of replacements.sort((a, b) => b.start - a.start))
    text = text.slice(0, start) + insert + text.slice(end)
  // The header mlcl 2.2.15 wrote names the list this replaces.
  return text.replace(
    /( \* Every other language) loads when the app switches to it, from the app's\n \* locales\/<code>\/ui\.ts and from each companion locale bond the app installs, listed below\.\n \* `([^`\n]+) add <package> --inject` \(or `[^`\n]+ inject`\) rewrites this file with the new list\.\n \* Swap/,
    (_match, start: string, command: string) =>
      `${start} this app offers loads when the app switches to it, from the app's\n * locales/<code>/ui.ts and from the companion locale bonds in locales/packages.ts.\n * \`${command} locale add <code>\` adds a language, and \`${command} add <package> --inject\`\n * a locale bond, to both. Swap`,
  )
}
