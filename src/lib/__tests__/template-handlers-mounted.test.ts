// @vitest-environment node
/**
 * Every template's `api/src/handlers/index.ts` is LIVE: `App/router.ts` imports and mounts it.
 *
 * The scaffolded AGENTS.md tells the model to register a new endpoint in
 * `api/src/handlers/index.ts`. Eighteen templates mounted each handler router straight from
 * `App/router.ts` and never imported the aggregator, so in those apps that file was dead: a route
 * registered there as instructed answered 404, and personal-finance's own `/export` router
 * (listed only there) was never served. `wireTemplateApiRouters` does not cover for it — a
 * scaffold of cloud-file-manager kept `App/router.ts` as the template wrote it.
 *
 * A handler `App/router.ts` mounts itself, beside the aggregator, is allowed: some must run
 * before `verifyMiddleware()` (contract-management's public signing page) or before the default
 * `/users` routes (two-factor, debug helpers), which the aggregator's position cannot give them.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const APPS = join(dirname(fileURLToPath(import.meta.url)), '../../../templates/apps')

/**
 * What is wrong with one template's handler wiring, or an empty list when nothing is.
 *
 * @param routerSource - The template's `api/src/App/router.ts`.
 * @returns One line per problem.
 */
export function handlerWiringProblems(routerSource: string): string[] {
  const { statements } = ts.createSourceFile('router.ts', routerSource, ts.ScriptTarget.Latest)
  const aggregator = statements
    .filter(ts.isImportDeclaration)
    .find(
      (declaration) =>
        ts.isStringLiteral(declaration.moduleSpecifier) &&
        declaration.moduleSpecifier.text === '../handlers/index.js' &&
        !declaration.importClause?.isTypeOnly &&
        declaration.importClause?.name,
    )?.importClause?.name?.text
  if (!aggregator) return ["App/router.ts does not import '../handlers/index.js'"]

  const mounted = statements.some((statement) => {
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) {
      return false
    }
    const { expression, arguments: args } = statement.expression
    if (
      !ts.isPropertyAccessExpression(expression) ||
      !ts.isIdentifier(expression.expression) ||
      expression.expression.text !== 'router' ||
      expression.name.text !== 'use'
    ) {
      return false
    }
    const first = args[0]
    // The aggregator owns its API prefixes. A scoped mount changes every route's URL.
    if (first && ts.isStringLiteralLike(first) && first.text !== '/') return false
    return args.some((arg) => ts.isIdentifier(arg) && arg.text === aggregator)
  })
  return mounted ? [] : [`App/router.ts imports ${aggregator} but never mounts it`]
}

describe('template handler aggregators are mounted', () => {
  const apps = readdirSync(APPS).filter((app) =>
    existsSync(join(APPS, app, 'api/src/handlers/index.ts')),
  )

  it('covers the fleet', () => {
    expect(apps.length).toBeGreaterThan(100)
  })

  it.each(apps)('%s mounts handlers/index.ts', (app) => {
    const router = readFileSync(join(APPS, app, 'api/src/App/router.ts'), 'utf8')
    expect(handlerWiringProblems(router)).toEqual([])
  })

  it('names the dead-aggregator shape it guards against', () => {
    const dead = [
      "import filesRouter from '../handlers/files.js'",
      'export const router = Router()',
      "router.use('/files', filesRouter)",
    ].join('\n')
    expect(handlerWiringProblems(dead)).toEqual([
      "App/router.ts does not import '../handlers/index.js'",
    ])
    const unmounted =
      "import templateHandlers from '../handlers/index.js'\nexport const router = Router()"
    expect(handlerWiringProblems(unmounted)).toEqual([
      'App/router.ts imports templateHandlers but never mounts it',
    ])
  })

  it('refuses an aggregator mount that appears only in a block comment', () => {
    const source = [
      "import templateHandlers from '../handlers/index.js'",
      'export const router = Router()',
      '/*',
      'router.use(templateHandlers)',
      '*/',
    ].join('\n')
    expect(handlerWiringProblems(source)).toEqual([
      'App/router.ts imports templateHandlers but never mounts it',
    ])
  })

  it('accepts a root mount formatted over multiple lines', () => {
    const source = [
      "import templateHandlers from '../handlers/index.js'",
      'export const router = Router()',
      'router.use(',
      '  "/",',
      '  templateHandlers,',
      ')',
    ].join('\n')
    expect(handlerWiringProblems(source)).toEqual([])
  })
})
