import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ts } from 'ts-morph'

import { formatGeneratedSource, sortImportStatements } from './format.js'
import type { InferredPackage } from './schema.js'

type Routes = InferredPackage['routes']
type Handler = { file: string; local: string }

async function sourceFile(path: string): Promise<ts.SourceFile | undefined> {
  try {
    return ts.createSourceFile(path, await readFile(path, 'utf8'), ts.ScriptTarget.Latest, true)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}

/** Resolve the plain HTTP functions the package's static handler map mounts. */
function handlerFiles(file: ts.SourceFile, routes: Routes): Map<string, Handler> | undefined {
  const declaration = file.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((item) => ts.isIdentifier(item.name) && item.name.text === 'requestHandlerMap')
  let map = declaration?.initializer
  if (map && (ts.isAsExpression(map) || ts.isSatisfiesExpression(map))) map = map.expression
  if (!map || !ts.isObjectLiteralExpression(map)) return undefined

  const imports = new Map<string, Handler>()
  for (const statement of file.statements.filter(ts.isImportDeclaration)) {
    const names = statement.importClause?.namedBindings
    if (!ts.isStringLiteral(statement.moduleSpecifier) || !names || !ts.isNamedImports(names))
      continue
    const specifier = statement.moduleSpecifier.text
    if (!/^\.\/handlers\/[\w-]+\.js$/.test(specifier)) continue
    for (const binding of names.elements)
      imports.set(binding.name.text, {
        file: specifier.replace(/\.js$/, '.ts'),
        local: (binding.propertyName ?? binding.name).text,
      })
  }

  const needed = new Set(routes.flatMap((route) => [...route.middlewares, route.handler]))
  const files = new Map<string, Handler>()
  for (const field of map.properties) {
    if (!field.name || !ts.isIdentifier(field.name) || !needed.has(field.name.text)) continue
    const value = ts.isShorthandPropertyAssignment(field)
      ? field.name
      : ts.isPropertyAssignment(field)
        ? field.initializer
        : undefined
    const binding = value && ts.isIdentifier(value) ? imports.get(value.text) : undefined
    if (!binding) return undefined
    files.set(field.name.text, binding)
  }
  return files.size === needed.size ? files : undefined
}

/**
 * Copy HTTP code from the package that owns it and bind imports to its public API.
 * An explicit scaffold-router.ts handles packages whose published HTTP adapters
 * are factories. For static maps the existing handler modules are the template.
 *
 * @param srcPath - Directory containing the resource's TypeScript sources.
 * @param name - Registry package name used by public imports.
 * @param exports - Public package exports from the registry scanner.
 * @param routes - The package routes and their middleware order.
 * @returns A standalone Express router when the package offers service-backed handler code.
 */
export async function scanResourceRouter(
  srcPath: string,
  name: string,
  exports: readonly string[],
  routes: Routes,
): Promise<string | undefined> {
  if (!routes.length || routes.some((route) => route.optional)) return undefined
  const explicit = await sourceFile(join(srcPath, 'scaffold-router.ts'))
  if (explicit) return explicit.text

  const map = await sourceFile(join(srcPath, 'requestHandlerMap.ts'))
  const handlers = map && handlerFiles(map, routes)
  if (!handlers) return undefined
  const modules = new Map<string, Set<string>>([['express', new Set(['Router'])]])
  const bodies: string[] = []
  const numericConstants = new Set<string>()
  let usesService = false

  for (const path of new Set([...handlers.values()].map((handler) => handler.file))) {
    const file = await sourceFile(join(srcPath, path))
    if (!file) return undefined
    for (const statement of file.statements) {
      if (!ts.isImportDeclaration(statement)) {
        // Several route files declare the same pagination limit in their own module scope.
        // An identical numeric const has the same meaning when it is shared by those routes.
        if (
          ts.isVariableStatement(statement) &&
          statement.declarationList.flags & ts.NodeFlags.Const
        ) {
          const [declaration, ...rest] = statement.declarationList.declarations
          if (
            !rest.length &&
            declaration.initializer &&
            ts.isNumericLiteral(declaration.initializer)
          ) {
            const text = statement.getText(file)
            if (numericConstants.has(text)) continue
            numericConstants.add(text)
          }
        }
        bodies.push(statement.getFullText(file).trim())
        continue
      }
      if (!ts.isStringLiteral(statement.moduleSpecifier)) return undefined
      const specifier = statement.moduleSpecifier.text
      const clause = statement.importClause
      const bindings = clause?.namedBindings
      if (!bindings || !ts.isNamedImports(bindings) || clause.name) return undefined
      const local = specifier.startsWith('.')
      const target = local ? name : specifier
      const names = modules.get(target) ?? new Set<string>()
      for (const binding of bindings.elements) {
        if (local && !exports.includes((binding.propertyName ?? binding.name).text))
          return undefined
        if (specifier === '../service.js' && !clause.isTypeOnly && !binding.isTypeOnly)
          usesService = true
        names.add(`${clause.isTypeOnly ? 'type ' : ''}${binding.getText(file)}`)
      }
      modules.set(target, names)
    }
  }
  if (!usesService) return undefined

  const imports = [...modules].map(([from, names]) => {
    const bindings = [...names]
    if (bindings.every((name) => name.startsWith('type ')))
      return `import type { ${bindings.map((name) => name.slice(5)).join(', ')} } from '${from}'`
    return `import { ${bindings.join(', ')} } from '${from}'`
  })
  const mounts = routes.map((route) => {
    const functions = [...route.middlewares, route.handler].map((key) => handlers.get(key)!.local)
    return `router.${route.method}(${[JSON.stringify(route.path), ...functions].join(', ')})`
  })
  const source = [
    imports.join('\n'),
    `// Edit paths, request fields and JSON here. The services in ${name} own storage.`,
    ...bodies,
    ['const router = Router()', '', ...mounts, '', 'export default router'].join('\n'),
  ].join('\n\n')
  return formatGeneratedSource(sortImportStatements(source, 'router.ts'), 'router.ts')
}
