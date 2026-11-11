import { readFileSync } from 'node:fs'
import { URL } from 'node:url'

import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

import preferDeclaredClients from './eslint-rules/prefer-declared-clients.mjs'

// API timestamps are data; an app may intentionally format a datetime input.
// Read this config's own workspace manifest, never a hoisted parent manifest.
let apiWorkspace = false
try {
  const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
  apiWorkspace = Object.keys({
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
    ...manifest.peerDependencies,
  }).some((name) => name.startsWith('@molecule/api-'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

// `eslint-plugin-security` is deliberately NOT wired in. The classes its
// low-false-positive rules target (raw SQL, direct fs access, eval) are removed
// by this stack's architecture (DataStore abstraction, secrets bond), and its
// remaining rules (detect-object-injection, detect-non-literal-fs-filename,
// detect-possible-timing-attacks) are noisy enough that they get globally
// disabled in practice. The real vulnerability surface — vulnerable dependencies
// and leaked credentials — is covered by `npm audit` + Dependabot + gitleaks in
// .github/workflows/security.yml. See SECURITY.md → "Why not eslint-plugin-security?".

/**
 * Local rule enforcing "no silent error swallows": every `catch` must bind the
 * error so it can be logged, re-thrown, or — as a documented `catch (_error)`
 * noop — intentionally ignored. Set to 'warn' so it surfaces as an advisory in
 * your editor / CI without blocking the build; paired with no-unused-vars
 * `caughtErrors` it also flags a bound-but-ignored error.
 */
const moleculeLocal = {
  rules: {
    'prefer-declared-clients': preferDeclaredClients,
    // A datastore lookup has no update context. Use ESLint's AST and bindings to
    // catch an existence-only duplicate check before a same-table update. The
    // compiler cannot know that the query also matches the unchanged row.
    'unique-update-excludes-self': {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          selfConflict:
            "This '{{fields}}' existence check can reject an unchanged value before the update at line {{line}}. Exclude { field: 'id', operator: '!=', value: {{id}} } in the lookup, or pass {{id}} to the helper and reject only another row.",
        },
      },
      create(context) {
        const source = context.sourceCode
        const functions = new Set([
          'FunctionDeclaration',
          'FunctionExpression',
          'ArrowFunctionExpression',
        ])
        const calls = []
        const checks = []
        const unwrap = (node) => {
          while (
            node &&
            [
              'AwaitExpression',
              'TSAsExpression',
              'TSNonNullExpression',
              'TSTypeAssertion',
              'ChainExpression',
            ].includes(node.type)
          )
            node = node.argument ?? node.expression
          return node
        }
        const variable = (node) => {
          if (node?.type !== 'Identifier') return null
          for (let scope = source.getScope(node); scope; scope = scope.upper) {
            const found = scope.set.get(node.name)
            if (found) return found
          }
          return null
        }
        const value = (node, bindings = new Map(), seen = new Set()) => {
          node = unwrap(node)
          if (node?.type !== 'Identifier') return node
          const binding = variable(node)
          if (!binding || seen.has(binding)) return node
          seen.add(binding)
          if (bindings.has(binding)) return value(bindings.get(binding), bindings, seen)
          const definition = binding.defs[0]
          if (
            binding.defs.length === 1 &&
            definition.type === 'Variable' &&
            definition.node.parent.kind === 'const' &&
            definition.node.id.type === 'Identifier' &&
            !binding.references.some((ref) => ref.isWrite() && !ref.init)
          )
            return value(definition.node.init, bindings, seen)
          return node
        }
        const key = (node) => (node?.computed ? node.property?.value : node?.property?.name)
        const imported = (node, name) => {
          node = unwrap(node)
          const identifier = node?.type === 'MemberExpression' ? node.object : node
          const definition = variable(identifier)?.defs[0]
          if (
            definition?.type !== 'ImportBinding' ||
            definition.parent.source.value !== '@molecule/api-database' ||
            definition.parent.importKind === 'type' ||
            definition.node.importKind === 'type'
          )
            return false
          return node.type === 'MemberExpression'
            ? definition.node.type === 'ImportNamespaceSpecifier' && key(node) === name
            : definition.node.imported?.name === name
        }
        const enclosingFunction = (node) => {
          for (let parent = node.parent; parent; parent = parent.parent)
            if (functions.has(parent.type)) return parent
          return null
        }
        const same = (left, right, bindings) => {
          left = value(left, bindings)
          right = value(right)
          if (!left || !right) return false
          if (left === right) return true
          if (left.type === 'Literal' && right.type === 'Literal') return left.value === right.value
          if (left.type === 'MemberExpression' && right.type === 'MemberExpression')
            return (
              key(left) !== undefined &&
              key(left) === key(right) &&
              same(left.object, right.object, bindings)
            )
          return (
            left.type === 'Identifier' &&
            right.type === 'Identifier' &&
            variable(left) !== null &&
            variable(left) === variable(right)
          )
        }
        const property = (node, name) =>
          node?.properties?.find(
            (prop) =>
              prop.type === 'Property' &&
              !prop.computed &&
              (prop.key.name ?? prop.key.value) === name,
          )?.value
        // Deliberately bounded to local helpers returning only existence, not
        // arbitrary application logic or a guessed name such as *Taken().
        const lookup = (node, bindings = new Map(), seen = new Set()) => {
          node = value(node, bindings)
          if (!node || seen.has(node)) return null
          seen = new Set([...seen, node])
          if (
            node.type === 'UnaryExpression' &&
            node.operator === '!' &&
            node.argument.type === 'UnaryExpression' &&
            node.argument.operator === '!'
          )
            return lookup(node.argument.argument, bindings, seen)
          if (node.type !== 'CallExpression') return null
          if (
            node.callee.type === 'Identifier' &&
            node.callee.name === 'Boolean' &&
            !variable(node.callee)?.defs.length &&
            node.arguments.length === 1
          )
            return lookup(node.arguments[0], bindings, seen)
          if (imported(node.callee, 'findOne')) {
            const array = value(node.arguments[1], bindings)
            if (array?.type !== 'ArrayExpression' || !array.elements.length) return null
            const conditions = array.elements.map((entry) => {
              const field = value(property(entry, 'field'), bindings)
              const operator = value(property(entry, 'operator'), bindings)
              if (
                field?.type !== 'Literal' ||
                typeof field.value !== 'string' ||
                operator?.type !== 'Literal' ||
                !['=', '!='].includes(operator.value)
              )
                return null
              return {
                field: field.value,
                operator: operator.value,
                value: property(entry, 'value'),
              }
            })
            if (
              conditions.some((entry) => !entry) ||
              !conditions.some((entry) => entry.operator === '=')
            )
              return null
            return { table: node.arguments[0], conditions, bindings }
          }
          let fn = value(node.callee, bindings)
          if (fn?.type === 'Identifier') {
            const binding = variable(fn)
            const definition = binding?.defs[0]
            if (
              binding?.defs.length !== 1 ||
              definition.type !== 'FunctionName' ||
              binding.references.some((ref) => ref.isWrite() && !ref.init)
            )
              return null
            fn = definition.node
          }
          if (!functions.has(fn?.type)) return null
          let returned = fn.body
          if (returned.type === 'BlockStatement') {
            const statements = returned.body
            if (
              !statements.length ||
              statements.at(-1).type !== 'ReturnStatement' ||
              statements
                .slice(0, -1)
                .some(
                  (statement) =>
                    statement.type !== 'VariableDeclaration' || statement.kind !== 'const',
                )
            )
              return null
            returned = statements.at(-1).argument
          }
          const args = new Map(bindings)
          for (const [i, param] of fn.params.entries()) {
            if (param.type !== 'Identifier') return null
            // Resolve caller arguments before binding parameters (including a
            // recursive invocation of the same helper).
            args.set(variable(param), value(node.arguments[i], bindings))
          }
          return lookup(returned, args, seen)
        }
        const endsWithReturn = (block) => {
          const last = block.type === 'BlockStatement' ? block.body.at(-1) : block
          return last?.type === 'ReturnStatement'
        }
        const duplicateBranch = (block) => {
          if (!endsWithReturn(block)) return false
          const duplicateText = (node) => {
            if (!node || functions.has(node.type)) return false
            if (node.type === 'Literal' && typeof node.value === 'string')
              return /\b(?:already (?:been )?(?:taken|used|registered|exists|in use)|duplicate|uniqueness)\b/i.test(
                node.value,
              )
            return (source.visitorKeys[node.type] ?? []).some((key) => {
              const next = node[key]
              return Array.isArray(next) ? next.some(duplicateText) : duplicateText(next)
            })
          }
          const clientError = (node) =>
            node?.type === 'Literal' &&
            typeof node.value === 'number' &&
            node.value >= 400 &&
            node.value < 500
          const stack = [block]
          while (stack.length) {
            const node = stack.pop()
            if (!node || functions.has(node.type)) continue
            if (
              node.type === 'CallExpression' &&
              node.callee.type === 'Identifier' &&
              clientError(node.arguments[1]) &&
              node.arguments.some(duplicateText)
            )
              return true
            if (
              node.type === 'CallExpression' &&
              node.callee.type === 'MemberExpression' &&
              ['json', 'send', 'end'].includes(key(node.callee))
            ) {
              const status = node.callee.object
              if (
                status.type === 'CallExpression' &&
                status.callee.type === 'MemberExpression' &&
                key(status.callee) === 'status' &&
                clientError(status.arguments[0]) &&
                node.arguments.some(duplicateText)
              )
                return true
            }
            if (
              node.type === 'ObjectExpression' &&
              clientError(property(node, 'statusCode')) &&
              duplicateText(property(node, 'body'))
            )
              return true
            for (const child of source.visitorKeys[node.type] ?? []) {
              const next = node[child]
              if (Array.isArray(next)) stack.push(...next)
              else if (next) stack.push(next)
            }
          }
          return false
        }
        const comparesCurrent = (test, query, operators, conjunction = '&&') => {
          test = unwrap(test)
          if (test?.type === 'LogicalExpression' && test.operator === conjunction)
            return (
              comparesCurrent(test.left, query, operators, conjunction) ||
              comparesCurrent(test.right, query, operators, conjunction)
            )
          if (test?.type !== 'BinaryExpression' || !operators.includes(test.operator)) return false
          return [
            [test.left, test.right],
            [test.right, test.left],
          ].some(
            ([next, current]) =>
              current.type === 'MemberExpression' &&
              query.conditions.some(
                (condition) =>
                  condition.field === key(current) && same(condition.value, next, query.bindings),
              ),
          )
        }
        const changedValueGuard = (node, query) => {
          let child = node
          for (
            let parent = node.parent;
            parent && !functions.has(parent.type);
            child = parent, parent = parent.parent
          ) {
            if (parent.type === 'BlockStatement') {
              const prior = parent.body[parent.body.indexOf(child) - 1]
              if (
                prior?.type === 'IfStatement' &&
                !prior.alternate &&
                endsWithReturn(prior.consequent) &&
                comparesCurrent(prior.test, query, ['==', '==='])
              )
                return true
            }
            if (parent.type !== 'IfStatement') continue
            const differs = parent.consequent === child ? ['!=', '!=='] : ['==', '===']
            if (
              comparesCurrent(
                parent.test,
                query,
                differs,
                parent.consequent === child ? '&&' : '||',
              )
            )
              return true
          }
          return false
        }
        const childOf = (node, ancestor) => {
          for (let child = node; child?.parent; child = child.parent)
            if (child.parent === ancestor) return child
          return null
        }
        const canReachWrite = (check, write) => {
          if (enclosingFunction(write) !== enclosingFunction(check)) return false
          for (
            let parent = check.parent;
            parent && !functions.has(parent.type);
            parent = parent.parent
          ) {
            const writeChild = childOf(write, parent)
            if (
              parent.type === 'IfStatement' &&
              writeChild &&
              childOf(check, parent) !== writeChild
            )
              return false
            if (
              parent.type === 'SwitchStatement' &&
              writeChild &&
              childOf(check, parent) !== writeChild
            )
              return false
            if (parent.type === 'BlockStatement' && !writeChild && endsWithReturn(parent))
              return false
          }
          return true
        }
        return {
          CallExpression(node) {
            if (imported(node.callee, 'updateById')) calls.push(node)
          },
          IfStatement(node) {
            checks.push(node)
          },
          'Program:exit'() {
            for (const check of checks) {
              if (!duplicateBranch(check.consequent)) continue
              const query = lookup(check.test)
              if (!query || changedValueGuard(check, query)) continue
              const write = calls.find(
                (call) =>
                  call.range[0] > check.range[1] &&
                  canReachWrite(check, call) &&
                  same(query.table, call.arguments[0], query.bindings),
              )
              if (
                !write ||
                query.conditions.some(
                  (condition) =>
                    condition.field === 'id' &&
                    condition.operator === '!=' &&
                    same(condition.value, write.arguments[1], query.bindings),
                )
              )
                continue
              context.report({
                node: check.test,
                messageId: 'selfConflict',
                data: {
                  fields: query.conditions
                    .filter((condition) => condition.operator === '=')
                    .map((condition) => condition.field)
                    .join(', '),
                  line: write.loc.start.line,
                  id: source.getText(write.arguments[1]),
                },
              })
            }
          },
        }
      },
    },
    // The bond owns the runtime setting, so this rule only moves router imports.
    // Type-only imports cannot render a router and are deliberately left alone.
    // `HydratedRouter` and the DOM `RouterProvider` (`react-router/dom`, re-exported by
    // `react-router-dom`) move to the bond's `/dom` entry, which keeps `react-dom` out
    // of its main entry.
    'router-commits-with-url': {
      meta: {
        type: 'problem',
        fixable: 'code',
        schema: [],
        messages: {
          synchronous:
            "Import this router from '{{module}}', whose wrapper sets useTransitions={false} so the URL and rendered page change together.",
          namespace:
            "Import router components directly from '@molecule/app-routing-react-router' instead of a React Router namespace (namespace uses are not tracked), because its wrappers set useTransitions={false} so the URL and rendered page change together.",
          dynamic:
            "Import router components directly from '@molecule/app-routing-react-router' instead of a dynamic React Router import (dynamic module uses are not tracked), because its wrappers set useTransitions={false} so the URL and rendered page change together.",
        },
      },
      create(context) {
        const source = context.sourceCode
        const packages = new Set(['react-router', 'react-router-dom', 'react-router/dom'])
        const routers = new Set([
          'BrowserRouter',
          'HashRouter',
          'MemoryRouter',
          'Router',
          'RouterProvider',
          'HydratedRouter',
          'unstable_HistoryRouter',
        ])
        const bond = '@molecule/app-routing-react-router'
        const domEntries = new Set(['react-router/dom', 'react-router-dom'])
        const target = (module, name) =>
          name === 'HydratedRouter' || (name === 'RouterProvider' && domEntries.has(module))
            ? `${bond}/dom`
            : bond
        // Moved specifiers grouped by the bond entry each one moves to, in source order.
        const byTarget = (specifiers, module, nameOf) => {
          const groups = new Map()
          for (const specifier of specifiers) {
            const destination = target(module, nameOf(specifier))
            groups.set(destination, [...(groups.get(destination) ?? []), specifier])
          }
          return [...groups]
        }
        const importedName = (specifier) => specifier.imported.name ?? specifier.imported.value
        const exportedLocal = (specifier) => specifier.local.name ?? specifier.local.value
        const declaration = (specifiers, module, semicolon) => {
          const parts = specifiers
            .filter((specifier) => specifier.type !== 'ImportSpecifier')
            .map((specifier) => source.getText(specifier))
          const named = specifiers.filter((specifier) => specifier.type === 'ImportSpecifier')
          if (named.length > 0)
            parts.push(`{ ${named.map((specifier) => source.getText(specifier)).join(', ')} }`)
          return `import ${parts.join(', ')} from '${module}'${semicolon}`
        }
        const exportDeclaration = (specifiers, module, semicolon) =>
          `export { ${specifiers.map((specifier) => source.getText(specifier)).join(', ')} } from '${module}'${semicolon}`
        const moduleName = (node) => {
          if (node.type === 'Literal') return node.value
          if (node.type === 'TemplateLiteral' && node.expressions.length === 0)
            return node.quasis[0].value.cooked ?? node.quasis[0].value.raw
          return null
        }
        return {
          ImportDeclaration(node) {
            if (!packages.has(moduleName(node.source)) || node.importKind === 'type') return
            if (
              node.specifiers.some((specifier) => specifier.type === 'ImportNamespaceSpecifier')
            ) {
              context.report({ node, messageId: 'namespace' })
              return
            }
            const module = moduleName(node.source)
            const moved = node.specifiers.filter(
              (specifier) =>
                specifier.type === 'ImportSpecifier' &&
                specifier.importKind !== 'type' &&
                routers.has(importedName(specifier)),
            )
            if (moved.length === 0) return
            context.report({
              node: moved[0],
              messageId: 'synchronous',
              data: { module: target(module, importedName(moved[0])) },
              fix(fixer) {
                const semicolon = source.getText(node).trimEnd().endsWith(';') ? ';' : ''
                const bondImports = byTarget(moved, module, importedName).map(
                  ([destination, specifiers]) => declaration(specifiers, destination, semicolon),
                )
                const remaining = node.specifiers.filter((specifier) => !moved.includes(specifier))
                if (remaining.length > 0)
                  bondImports.unshift(declaration(remaining, module, semicolon))
                return fixer.replaceText(node, bondImports.join('\n'))
              },
            })
          },
          ExportNamedDeclaration(node) {
            if (
              !node.source ||
              !packages.has(moduleName(node.source)) ||
              node.exportKind === 'type'
            )
              return
            const module = moduleName(node.source)
            const moved = node.specifiers.filter(
              (specifier) =>
                specifier.type === 'ExportSpecifier' &&
                specifier.exportKind !== 'type' &&
                routers.has(exportedLocal(specifier)),
            )
            if (moved.length === 0) return
            context.report({
              node: moved[0],
              messageId: 'synchronous',
              data: { module: target(module, exportedLocal(moved[0])) },
              fix(fixer) {
                const semicolon = source.getText(node).trimEnd().endsWith(';') ? ';' : ''
                const bondExports = byTarget(moved, module, exportedLocal).map(
                  ([destination, specifiers]) =>
                    exportDeclaration(specifiers, destination, semicolon),
                )
                const remaining = node.specifiers.filter((specifier) => !moved.includes(specifier))
                if (remaining.length > 0)
                  bondExports.push(exportDeclaration(remaining, module, semicolon))
                return fixer.replaceText(node, bondExports.join('\n'))
              },
            })
          },
          ExportAllDeclaration(node) {
            if (!packages.has(moduleName(node.source)) || node.exportKind === 'type') return
            context.report({ node, messageId: 'namespace' })
          },
          ImportExpression(node) {
            if (!packages.has(moduleName(node.source))) return
            context.report({ node, messageId: 'dynamic' })
          },
        }
      },
    },
    'url-lists-use-list-route': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            "Warn when a component's local state controls a list component or list-fetching hook, including array callbacks, derived values and request options. Reactive URL reads, inline JSX iterations and opaque cross-file prop chains are outside this rule.",
        },
        schema: [],
        messages: {
          useListRoute:
            'Use `useListRoute` from `@molecule/app-routing-react-router` (see the package doc) so the URL and rendered list stay in step and paging and filter resets are handled.',
        },
      },
      create(context) {
        const source = context.sourceCode
        const states = []
        const collections = []
        const variableFor = (node, name) => {
          let scope = source.getScope(node)
          while (scope) {
            const variable = scope.set.get(name)
            if (variable) return variable
            scope = scope.upper
          }
          return null
        }
        const isFunction = (node) =>
          node?.type === 'FunctionDeclaration' ||
          node?.type === 'FunctionExpression' ||
          node?.type === 'ArrowFunctionExpression'
        const functionName = (node) => {
          if (node.id?.type === 'Identifier') return node.id.name
          if (node.parent?.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier')
            return node.parent.id.name
          return ''
        }
        const componentFor = (node) => {
          for (let current = node.parent; current; current = current.parent) {
            if (isFunction(current) && /^[A-Z]/.test(functionName(current))) return current
          }
          return null
        }
        const within = (node, ancestor) => {
          for (let current = node; current; current = current.parent) {
            if (current === ancestor) return true
          }
          return false
        }
        const isListFetchingHook = (name) => {
          if (
            [
              'useQuery',
              'useInfiniteQuery',
              'useSuspenseQuery',
              'useSearchParams',
              'useListRoute',
            ].includes(name)
          )
            return false
          return (
            /^use[A-Z]/.test(name) &&
            (/(?:List|Search|Results)(?:Query)?$/.test(name) || /^use[A-Z][A-Za-z]*s$/.test(name))
          )
        }
        const isListStateKey = (key) => {
          const normalized = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
          return /(?:^|_)(?:q|query|search|filter|sort|page|category|status|tag|folder|range|tab|mood|method|receipted|date|type|state|stage|priority|severity|domain|shelf|order|direction|limit|offset)(?:$|_)/.test(
            normalized,
          )
        }
        const isScalarState = (call) => {
          const initial = call.arguments[call.callee.name === 'useReducer' ? 1 : 0]
          return (
            !initial ||
            (!['ArrayExpression', 'ObjectExpression'].includes(initial.type) &&
              !(initial.type === 'Literal' && initial.value === null))
          )
        }
        const method = (node) =>
          node?.type === 'MemberExpression' && !node.computed ? node.property.name : null
        const transforms = new Set(['filter', 'sort', 'toSorted', 'slice', 'map', 'flatMap'])
        const controls = new Set(['filter', 'sort', 'toSorted', 'slice'])
        const listAttribute = (attribute) =>
          attribute?.type === 'JSXAttribute' &&
          attribute.parent.name.type === 'JSXIdentifier' &&
          /(?:List|Results|Table|Grid|Catalog)$/.test(attribute.parent.name.name)
        const reads = (variable, owner) =>
          variable.references
            .filter((reference) => reference.isRead() && within(reference.identifier, owner))
            .map((reference) => reference.identifier)

        // Follow the result, not the mere presence of .filter/useQuery. Counts,
        // form validation and chart calculations do not prove a rendered list.
        const rendered = (value, owner, seen = new Set()) => {
          if (seen.has(value)) return false
          seen.add(value)
          const parent = value.parent
          if (!parent || value === owner) return false
          if (parent.type === 'VariableDeclarator' && parent.init === value) {
            const variable =
              parent.id.type === 'Identifier' && variableFor(parent.id, parent.id.name)
            return variable && reads(variable, owner).some((read) => rendered(read, owner, seen))
          }
          if (parent.type === 'JSXExpressionContainer') {
            const attribute = parent.parent
            return (
              listAttribute(attribute) && /^(?:items|rows|data|children)$/.test(attribute.name.name)
            )
          }
          if (parent.type === 'MemberExpression' && parent.object === value) {
            const call = parent.parent
            if (call?.type !== 'CallExpression' || call.callee !== parent)
              return (
                ['data', 'items', 'rows', 'results'].includes(method(parent)) &&
                rendered(parent, owner, seen)
              )
            if (transforms.has(method(parent))) return rendered(call, owner, seen)
            if (method(parent) === 'then') {
              const callback = call.arguments[0]
              if (!callback) return false
              if (
                collections.some(
                  (collection) =>
                    collection.owner === owner &&
                    collection.setter.references.some((ref) => within(ref.identifier, callback)) &&
                    reads(collection.variable, owner).some((read) => rendered(read, owner, seen)),
                )
              )
                return true
              return rendered(call, owner, seen)
            }
            return false
          }
          if (
            parent.type === 'CallExpression' &&
            parent.arguments.includes(value) &&
            parent.callee.type === 'Identifier'
          ) {
            const setter = variableFor(parent.callee, parent.callee.name)
            return collections.some(
              (collection) =>
                collection.owner === owner &&
                collection.setter === setter &&
                reads(collection.variable, owner).some((read) => rendered(read, owner, seen)),
            )
          }
          if (parent.type === 'ReturnStatement' || (isFunction(parent) && parent.body === value)) {
            let callback = parent
            while (callback && !isFunction(callback)) callback = callback.parent
            const call = callback?.parent
            return (
              call?.type === 'CallExpression' &&
              call.callee.type === 'Identifier' &&
              call.callee.name === 'useMemo' &&
              call.arguments[0] === callback &&
              rendered(call, owner, seen)
            )
          }
          if (
            [
              'ChainExpression',
              'AwaitExpression',
              'TSAsExpression',
              'TSNonNullExpression',
              'ConditionalExpression',
              'LogicalExpression',
              'SpreadElement',
              'ArrayExpression',
            ].includes(parent.type)
          )
            return rendered(parent, owner, seen)
          return false
        }
        const hasListConsumer = (reference, owner, seen = new Set()) => {
          if (seen.has(reference)) return false
          seen.add(reference)
          let optionKey = null
          for (let node = reference; node && node !== owner; node = node.parent) {
            const parent = node.parent
            if (!parent) return false
            if (isFunction(parent)) {
              const call = parent.parent
              if (
                call?.type !== 'CallExpression' ||
                !controls.has(method(call.callee)) ||
                !call.arguments.includes(parent)
              )
                return false
            }
            if (parent.type === 'VariableDeclarator' && parent.init === node) {
              const variable =
                parent.id.type === 'Identifier' && variableFor(parent.id, parent.id.name)
              if (
                variable &&
                reads(variable, owner).some((read) => hasListConsumer(read, owner, seen))
              )
                return true
              return false
            }
            if (parent.type === 'Property' && parent.value === node && optionKey === null) {
              optionKey = parent.key.type === 'Identifier' ? parent.key.name : parent.key.value
            }
            if (
              parent.type === 'CallExpression' &&
              node === parent.arguments[0] &&
              parent.callee.type === 'Identifier' &&
              isListFetchingHook(parent.callee.name) &&
              typeof optionKey === 'string' &&
              isListStateKey(optionKey)
            )
              return true
            if (
              parent.type === 'CallExpression' &&
              parent.arguments.includes(node) &&
              (controls.has(method(parent.callee)) ||
                ((method(parent.callee) === 'get' || parent.callee.name === 'fetch') &&
                  typeof optionKey === 'string' &&
                  isListStateKey(optionKey))) &&
              rendered(parent, owner)
            )
              return true
            if (parent.type === 'JSXExpressionContainer') {
              const attribute = parent.parent
              const opening = attribute?.type === 'JSXAttribute' ? attribute.parent : null
              if (
                opening?.type === 'JSXOpeningElement' &&
                opening.name.type === 'JSXIdentifier' &&
                /(?:List|Results|Table|Grid|Catalog)$/.test(opening.name.name) &&
                attribute.name.type === 'JSXIdentifier' &&
                isListStateKey(attribute.name.name)
              )
                return true
            }
          }
          return false
        }
        return {
          VariableDeclarator(node) {
            if (
              node.id.type !== 'ArrayPattern' ||
              node.init?.type !== 'CallExpression' ||
              node.init.callee.type !== 'Identifier' ||
              !['useState', 'useReducer'].includes(node.init.callee.name)
            )
              return
            const first = node.id.elements[0]
            const owner = componentFor(node)
            if (first?.type !== 'Identifier' || !owner) return
            const variable = variableFor(first, first.name)
            if (!variable) return
            if (node.init.arguments[0]?.type === 'ArrayExpression') {
              const second = node.id.elements[1]
              const setter = second?.type === 'Identifier' && variableFor(second, second.name)
              if (setter) collections.push({ variable, setter, owner })
            }
            if (isScalarState(node.init)) states.push({ node: first, variable, owner })
          },
          'Program:exit'() {
            const reported = new Set()
            for (const state of states) {
              if (reported.has(state.variable)) continue
              const consumed = state.variable.references.some(
                (reference) =>
                  within(reference.identifier, state.owner) &&
                  hasListConsumer(reference.identifier, state.owner),
              )
              if (consumed) {
                reported.add(state.variable)
                context.report({ node: state.node, messageId: 'useListRoute' })
              }
            }
          },
        }
      },
    },
    // A favorite/follow/like/bookmark button or a setting switch that shows the toggled value at
    // once and saves each click with its own request: a second click races the first, so a slower
    // response (or a refetch of older data) flips the button back. `useOptimisticValue` sends the
    // saves in order and keeps the newest choice. Structural only: a `useState` setter writes the
    // toggled value (`!current` or a variable holding it) before a request that receives it, is
    // chosen by it, or chooses its HTTP method between DELETE and a write.
    'server-toggles-use-optimistic-value': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            'Warn when a React module saves a toggled value with its own request instead of useOptimisticValue.',
        },
        schema: [],
        messages: {
          useOptimisticValue:
            'This shows a toggled value at once and saves it with its own request, so a pending guard can drop the next click, or a slower response/refetch can replace it. Use `useOptimisticValue` from `@molecule/app-react`. {{rewrite}}',
          awaitRefetch:
            '{{location}}: This toggle waits for its save and a query refetch before changing the control. Use `useOptimisticValue` from `@molecule/app-react`: seed value from the loaded record, move this save into commit and return the confirmed value, render the hook value, and call update(current => !current) on click. Enable the control only after its initial record loads and keep it mounted during refetches. Preserve authentication checks; pending saves must not discard clicks.',
        },
      },
      create(context) {
        const helpers = new Set(['useOptimisticValue', 'createOptimisticValue'])
        let reactModule = false
        const candidates = []
        const submitHandlers = new Set()
        const helperCommits = new Set()
        const localCalls = new Set(['confirm', 'confirmDialog', 'alert', 'prompt'])
        const isFunction = (node) =>
          node?.type === 'FunctionDeclaration' ||
          node?.type === 'FunctionExpression' ||
          node?.type === 'ArrowFunctionExpression'
        const enclosingFunction = (node) => {
          let current = node.parent
          while (current && !isFunction(current)) current = current.parent
          return current ?? null
        }
        const unwrap = (node) => {
          let current = node
          while (
            current &&
            (current.type === 'AwaitExpression' ||
              current.type === 'TSAsExpression' ||
              current.type === 'TSSatisfiesExpression' ||
              current.type === 'TSTypeAssertion' ||
              current.type === 'TSNonNullExpression' ||
              current.type === 'ChainExpression')
          )
            current = current.type === 'AwaitExpression' ? current.argument : current.expression
          return current
        }
        const variableFor = (node) => {
          if (node?.type !== 'Identifier') return null
          let scope = context.sourceCode.getScope(node)
          while (scope) {
            if (scope.set.has(node.name)) return scope.set.get(node.name)
            scope = scope.upper
          }
          return null
        }
        const functionFor = (node) => {
          const expression = unwrap(node)
          if (isFunction(expression)) return expression
          const definition = variableFor(expression)?.defs[0]
          const value =
            definition?.type === 'FunctionName' ? definition.node : definition?.node.init
          return isFunction(value) ? value : null
        }
        const callName = (node) => {
          const callee = unwrap(node?.callee)
          return callee?.type === 'Identifier'
            ? callee.name
            : callee?.type === 'MemberExpression'
              ? callee.computed
                ? callee.property.value
                : callee.property.name
              : null
        }
        // Promise use alone does not imply persistence (animations, dialogs and analytics
        // also return promises). Recognize HTTP/mutation methods, application save actions,
        // and imported API clients. This remains a structural warning, not a whole-program
        // proof that an arbitrarily named custom function reaches a server.
        const persistenceCall = (node) => {
          if (node?.type !== 'CallExpression') return false
          if (setters.has(variableFor(unwrap(node.callee)))) return false
          const name = callName(node)
          if (typeof name !== 'string' || localCalls.has(name)) return false
          if (
            [
              'fetch',
              'post',
              'put',
              'patch',
              'delete',
              'request',
              'mutate',
              'mutateasync',
            ].includes(name.toLowerCase())
          )
            return true
          if (
            /^(?:save|persist|update|toggle|favorite|unfavorite|follow|unfollow|like|unlike|bookmark|unbookmark|star|unstar)(?:$|[A-Z_])/.test(
              name,
            ) ||
            /^set[A-Z]/.test(name) ||
            /^(?:api|http|client)(?:Post|Put|Patch|Delete|Request|Mutate)(?:$|[A-Z_])/.test(name)
          )
            return true
          const definition = variableFor(unwrap(node.callee))?.defs[0]
          const source =
            definition?.type === 'ImportBinding' ? definition.parent.source.value : null
          return (
            typeof source === 'string' && /(?:^|[/@-])(?:api|http|client)(?:$|[/.-])/.test(source)
          )
        }
        // `!value` or `!record.field`: the opposite of a value read now. A call's negation
        // (`!confirm()`) is a question, not a toggled value.
        const negatedRead = (node) =>
          unwrap(node)?.type === 'UnaryExpression' &&
          unwrap(node).operator === '!' &&
          ['Identifier', 'MemberExpression'].includes(unwrap(unwrap(node).argument)?.type)
        // `const next = !favorited` inside the function: names that hold a toggled value.
        const toggledNames = (fn) => {
          const names = new Set()
          const visit = (node) => {
            if (!node || typeof node.type !== 'string') return
            if (node !== fn && isFunction(node)) return
            if (
              node.type === 'VariableDeclarator' &&
              node.id.type === 'Identifier' &&
              negatedRead(node.init)
            )
              names.add(variableFor(node.id))
            for (const key of Object.keys(node)) {
              if (key === 'parent') continue
              const value = node[key]
              if (Array.isArray(value)) value.forEach(visit)
              else if (value && typeof value.type === 'string') visit(value)
            }
          }
          visit(fn.body)
          return names
        }
        const toggled = (node, names, seen = new Set()) => {
          const expression = unwrap(node)
          if (!expression || seen.has(expression) || seen.size > 24) return false
          const next = new Set(seen).add(expression)
          if (negatedRead(expression)) return true
          if (expression.type === 'ObjectExpression')
            return expression.properties.some(
              (property) => property.type === 'Property' && toggled(property.value, names, next),
            )
          if (expression.type !== 'Identifier') return false
          const variable = variableFor(expression)
          if (names.has(variable)) return true
          const definition = variable?.defs[0]
          // A previous immutable alias can hold an object containing the flipped field.
          // Mutable values and destructuring stay unknown.
          return (
            definition?.node.type === 'VariableDeclarator' &&
            definition.node.id.type === 'Identifier' &&
            definition.parent?.kind === 'const' &&
            definition.node.range[1] <= expression.range[0] &&
            toggled(definition.node.init, names, next)
          )
        }
        // `{ notifications: !settings.notifications }`: a field set to the opposite of itself.
        const selfToggle = (property) => {
          if (property.type !== 'Property' || !negatedRead(property.value)) return false
          const read = unwrap(unwrap(property.value).argument)
          const key = property.key.type === 'Identifier' ? property.key.name : property.key.value
          const field = read.type === 'MemberExpression' ? read.property.name : read.name
          return key === field
        }
        // Awaited, or chained with then/catch/finally, directly or through the variable it is stored in.
        const promiseUsed = (node, fn, seen = new Set()) => {
          if (seen.has(node)) return false
          seen.add(node)
          let current = node
          while (
            current.parent &&
            [
              'TSAsExpression',
              'TSSatisfiesExpression',
              'TSTypeAssertion',
              'TSNonNullExpression',
              'ChainExpression',
            ].includes(current.parent.type)
          )
            current = current.parent
          const parent = current.parent
          if (parent?.type === 'AwaitExpression') return true
          if (
            parent?.type === 'MemberExpression' &&
            parent.object === current &&
            ['then', 'catch', 'finally'].includes(parent.property.name) &&
            parent.parent?.type === 'CallExpression'
          )
            return true
          if (parent?.type === 'ReturnStatement' || (parent === fn && fn.expression)) return true
          if (parent?.type === 'ConditionalExpression' && parent.test !== current)
            return promiseUsed(parent, fn, seen)
          if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
            const variable = context.sourceCode
              .getDeclaredVariables(parent)
              .find((entry) => entry.name === parent.id.name)
            return (variable?.references ?? []).some(
              (reference) =>
                reference.identifier !== parent.id && promiseUsed(reference.identifier, fn, seen),
            )
          }
          return false
        }
        const methodLiteral = (node) =>
          node?.type === 'Literal' && typeof node.value === 'string'
            ? node.value.toUpperCase()
            : null
        // The `useState` setters of this module: `const [value, setValue] = useState(…)`.
        const setters = new Set()
        const states = new Map()
        const effects = []
        const walk = (node, visit, nested = false) => {
          if (!node || typeof node.type !== 'string') return
          if (!nested && isFunction(node)) return
          visit(node)
          for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
            const value = node[key]
            if (Array.isArray(value)) value.forEach((child) => walk(child, visit, nested))
            else walk(value, visit, nested)
          }
        }
        const writesBefore = (fn, save) => {
          const writes = []
          walk(fn.body, (node) => {
            const state = node.type === 'CallExpression' && states.get(variableFor(node.callee))
            const argument = node.arguments?.[0]
            if (!state || !argument || node.range[0] >= save.range[0]) return
            let awaited = false
            walk(
              argument,
              (part) => {
                if (part.type === 'AwaitExpression') awaited = true
              },
              true,
            )
            // Busy flags and feedback resets are not the value being saved.
            if (awaited || ['Literal', 'ArrayExpression'].includes(unwrap(argument)?.type)) return
            writes.push({ state, argument, node })
          })
          return writes
        }
        const droppedOrRefetched = (fn, save) => {
          const writes = writesBefore(fn, save)
          let guarded = false
          walk(fn.body, (node) => {
            if (node.type !== 'IfStatement' || node.range[0] >= save.range[0]) return
            const flag = variableFor(unwrap(node.test))
            const busy = [...states.values()].find((state) => state.variable === flag)
            if (!busy) return
            let returns = false
            walk(node.consequent, (part) => {
              if (part.type === 'ReturnStatement') returns = true
            })
            guarded ||=
              returns &&
              busy.setter.references.some((reference) => {
                const call = reference.identifier.parent
                return (
                  call?.type === 'CallExpression' &&
                  enclosingFunction(call) === fn &&
                  call.arguments[0]?.value === true
                )
              })
          })
          const refetched = writes.some(({ state }) =>
            effects.some((effect) => {
              let replaces = false
              // Direct prop hydration can repeat while the control is active. An async
              // initial load alone does not prove that: readiness, dependencies and
              // cancellation belong to the separate action-ready analysis.
              walk(effect.body, (node) => {
                if (
                  node.type === 'CallExpression' &&
                  variableFor(node.callee) === state.setter &&
                  !isFunction(unwrap(node.arguments[0]))
                )
                  replaces = true
              })
              return replaces
            }),
          )
          // A busy guard beside an unrelated POST (panel analytics, for example) does not
          // establish that the local flag is server-backed. Require a server seed too.
          return (
            (guarded &&
              writes.some(
                ({ state }) =>
                  state.seed &&
                  !['Literal', 'ArrayExpression', 'ObjectExpression'].includes(state.seed.type),
              )) ||
            refetched
          )
        }
        const serialized = (fn) => {
          const call = fn.parent
          if (
            call?.type !== 'CallExpression' ||
            callName(call) !== 'then' ||
            call.callee.type !== 'MemberExpression'
          )
            return false
          let result = call
          while (
            result.parent?.type === 'MemberExpression' &&
            ['catch', 'finally'].includes(result.parent.property.name) &&
            result.parent.parent?.type === 'CallExpression'
          )
            result = result.parent.parent
          const assignment = result.parent
          return (
            assignment?.type === 'AssignmentExpression' &&
            assignment.operator === '=' &&
            assignment.right === result &&
            context.sourceCode.getText(assignment.left) ===
              context.sourceCode.getText(call.callee.object)
          )
        }
        // A revision setter after the save invalidates a query whose hook reads that revision.
        // Do not infer a refetch from a setter name, an arbitrary callback or a form reset.
        const queryRead = (node, query, seen = new Set()) => {
          const value = unwrap(node)
          if (!value || seen.has(value) || seen.size > 16) return false
          const next = new Set(seen).add(value)
          if (value.type === 'MemberExpression') {
            const field = value.computed ? value.property.value : value.property.name
            const definition = variableFor(unwrap(value.object))?.defs[0]
            if (field === 'data' && unwrap(definition?.node.init) === query) return true
            return queryRead(value.object, query, next)
          }
          const definition = variableFor(value)?.defs[0]
          return (
            definition?.parent?.kind === 'const' && queryRead(definition.node.init, query, next)
          )
        }
        const saveReadsQuery = (fn, save, query) => {
          let reads = false
          const inspect = (node) =>
            walk(node, (part) => {
              reads ||= queryRead(part, query)
            })
          inspect(save)
          for (let at = save.parent; at && at !== fn; at = at.parent)
            if (['IfStatement', 'ConditionalExpression'].includes(at.type)) inspect(at.test)
          return reads
        }
        const refreshAfter = (fn, save) => {
          let refresh = false
          walk(fn.body, (node) => {
            if (node.type !== 'CallExpression' || node.range[0] <= save.range[1]) return
            const state = states.get(variableFor(node.callee))
            if (!state) return
            refresh ||= state.variable.references.some((reference) => {
              let at = reference.identifier.parent
              while (at && !isFunction(at)) {
                if (
                  at.type === 'CallExpression' &&
                  /^use[A-Z]/.test(callName(at) ?? '') &&
                  !['useState', 'useRef', 'useMemo', 'useCallback', 'useEffect'].includes(
                    callName(at),
                  ) &&
                  saveReadsQuery(fn, save, at)
                )
                  return true
                at = at.parent
              }
              return false
            })
          })
          return refresh
        }
        const oppositeRequests = (branch) => {
          if (branch.type !== 'IfStatement' || !branch.alternate) return false
          const methods = (body) => {
            const result = new Set()
            walk(body, (part) => {
              if (persistenceCall(part)) result.add(callName(part)?.toUpperCase())
            })
            return result
          }
          const yes = methods(branch.consequent)
          const no = methods(branch.alternate)
          return ['POST', 'PUT', 'PATCH'].some(
            (write) => (yes.has('DELETE') && no.has(write)) || (no.has('DELETE') && yes.has(write)),
          )
        }
        // The rewrite uses the component's own state, updater, request and response reads.
        // It is advice, never an automatic edit: auth guards and app-specific callbacks stay.
        const rewriteFor = (fn, save) => {
          let unverifiedResource = null
          const fromSave = (expression, seen = new Set()) => {
            const node = unwrap(expression)
            if (!node) return false
            if (node.range[0] <= save.range[0] && node.range[1] >= save.range[1]) return true
            const variable = variableFor(node)
            if (!variable || seen.has(variable) || seen.size >= 8) return false
            seen.add(variable)
            const definition = variable.defs[0]
            if (definition?.type === 'Variable' && definition.parent?.kind === 'const')
              return fromSave(definition.node.init, seen)
            const callback = definition?.type === 'Parameter' ? variable.scope.block : null
            const then = callback?.parent
            return !!(
              then?.type === 'CallExpression' &&
              then.arguments[0] === callback &&
              callback.params[0] === definition.name &&
              callName(then) === 'then' &&
              fromSave(then.callee.object, seen)
            )
          }
          walk(
            fn.body,
            (node) => {
              if (node.type !== 'CallExpression' || node.parent?.type !== 'VariableDeclarator')
                return
              if (!fromSave(node.arguments[0])) return
              const definition = variableFor(node.callee)?.defs[0]
              if (
                definition?.type === 'ImportBinding' &&
                definition.parent?.source?.value === '@molecule/app-http' &&
                (definition.node.imported?.name ?? definition.node.imported?.value) ===
                  'unwrapSingle'
              )
                unverifiedResource = context.sourceCode.getText(node)
            },
            true,
          )
          if (unverifiedResource)
            return `First verify the saved resource read by ${unverifiedResource}. unwrapSingle unwraps data, not named resource keys: a response body { record: value } remains { record: value }. If the API uses a named envelope, select its actual field before notifying the parent or returning confirmed values. For a bare resource body, keep that resource directly. This single-file scan cannot prove that field, so it cannot supply a runnable migration for this save. Then move the verified save into useOptimisticValue, keep the control mounted, and key it by record identity.`
          if (writesBefore(fn, save).some(({ state }) => state.seed?.type === 'ObjectExpression'))
            return 'Keep the control disabled while this request is pending, or queue each intent with useOptimisticValue. Its commit must choose one request from the desired field value and return the saved result. Preserve auth checks and the server response shape; verify both directions with a delayed first response.'
          const writes = writesBefore(fn, save)
          const selected = [...new Map(writes.map((write) => [write.state.setter, write])).values()]
          if (!selected.length)
            return 'Move the optimistic state and this save into the hook; keep auth/loading guards, but remove pending guards.'
          // A row parameter cannot be lifted into a component hook. A UI event used only
          // for propagation/default handling stays in the click handler, though: it is
          // neither a save dependency nor a record identity (and needs no extracted row).
          const parameterReads = context.sourceCode.getDeclaredVariables(fn).filter(
            (variable) =>
              variable.defs.some((definition) => definition.type === 'Parameter') &&
              variable.references.some((reference) => {
                if (!reference.isRead()) return false
                const member = reference.identifier.parent
                const call = member?.parent
                const statement = call?.parent
                return !(
                  member?.type === 'MemberExpression' &&
                  member.object === reference.identifier &&
                  !member.computed &&
                  ['preventDefault', 'stopPropagation'].includes(member.property.name) &&
                  call?.type === 'CallExpression' &&
                  call.callee === member &&
                  statement?.type === 'ExpressionStatement' &&
                  statement.range[1] < save.range[0]
                )
              }),
          )
          if (parameterReads.length)
            return `In this component, move ${selected.map(({ state }) => state.name).join(', ')} out of the per-click setters (${selected.map(({ state }) => state.setter.name).join(', ')}). The handler reads ${parameterReads.map((variable) => variable.name).join(', ')}, which is not available at the hook call site: keep event handling in the click handler, pass the desired data to update, or extract a control keyed by record identity. Put its server-backed fields in useOptimisticValue and move this request into commit: ${context.sourceCode.getText(save)}. Render the hook's value and use a functional update so each click starts from the latest intent. Keep auth/initial-loading guards, remove pending guards, and return the saved flag and count from commit.`
          const allNames = new Set(
            context.sourceCode.getScope(fn).variables.map((variable) => variable.name),
          )
          for (const scope of context.sourceCode.scopeManager.scopes)
            for (const variable of scope.variables) allNames.add(variable.name)
          const fresh = (base) => {
            let name = base
            while (allNames.has(name)) name += 'Value'
            allNames.add(name)
            return name
          }
          const controller = fresh('optimisticValue')
          const desired = fresh('desiredValue')
          const current = fresh('currentValue')
          const confirmed = fresh('confirmedValue')
          const held = toggledNames(fn)
          const aliases = new Map()
          for (const { state, argument } of selected) {
            if (unwrap(argument)?.type === 'Identifier' && held.has(variableFor(unwrap(argument))))
              aliases.set(variableFor(unwrap(argument)), state.name)
            if (unwrap(argument)?.type === 'ObjectExpression')
              for (const property of unwrap(argument).properties) {
                if (
                  property.type === 'Property' &&
                  unwrap(property.value)?.type === 'Identifier' &&
                  held.has(variableFor(unwrap(property.value)))
                )
                  aliases.set(
                    variableFor(unwrap(property.value)),
                    `${state.name}.${property.key.name ?? property.key.value}`,
                  )
              }
          }
          const stateReads = new Map(selected.map(({ state }) => [state.variable, state.name]))
          const scalarFlips = new Set(
            selected
              .filter(({ argument }) => {
                const value = unwrap(argument)
                if (negatedRead(value) || aliases.has(variableFor(value))) return true
                if (!isFunction(value)) return false
                const result =
                  value.body.type === 'BlockStatement'
                    ? value.body.body.find((statement) => statement.type === 'ReturnStatement')
                        ?.argument
                    : value.body
                return (
                  negatedRead(result) &&
                  variableFor(unwrap(unwrap(result).argument)) === variableFor(value.params[0])
                )
              })
              .map(({ state }) => state.variable),
          )
          const render = (node, mode, parameter, field) => {
            const replacements = []
            const visit = (part) => {
              if (!part || typeof part.type !== 'string') return
              if (mode === 'commit' && part.type === 'CallExpression') {
                const state = selected.find(
                  ({ state }) => state.setter === variableFor(part.callee),
                )?.state
                if (state && part.arguments[0]) {
                  const argument = unwrap(part.arguments[0])
                  const value = isFunction(argument)
                    ? `(${render(argument, mode)})(${confirmed}.${state.name})`
                    : render(argument, mode)
                  replacements.push([
                    part.range[0],
                    part.range[1],
                    `${confirmed} = { ...${confirmed}, ${state.name}: ${value} }`,
                  ])
                  return
                }
                if (
                  part.callee.type === 'MemberExpression' &&
                  ['catch', 'finally'].includes(callName(part))
                ) {
                  replacements.push([
                    part.range[0],
                    part.range[1],
                    render(part.callee.object, mode),
                  ])
                  return
                }
              }
              if (mode === 'commit' && negatedRead(part)) {
                const read = unwrap(unwrap(part).argument)
                const variable =
                  read.type === 'Identifier' ? variableFor(read) : variableFor(read.object)
                if (stateReads.has(variable)) {
                  const suffix = read.type === 'MemberExpression' ? `.${read.property.name}` : ''
                  replacements.push([
                    part.range[0],
                    part.range[1],
                    `${desired}.${stateReads.get(variable)}${suffix}`,
                  ])
                  return
                }
              }
              if (part.type === 'Identifier') {
                const variable = variableFor(part)
                // Only reads: object keys, declarations and member names are not variable reads.
                if (
                  variable?.references.some(
                    (reference) => reference.identifier === part && reference.isRead(),
                  )
                ) {
                  let value
                  if (parameter && variable === parameter) value = `${current}.${field}`
                  else if (mode === 'commit' && aliases.has(variable))
                    value = `${desired}.${aliases.get(variable)}`
                  else if (stateReads.has(variable)) {
                    value = `${mode === 'commit' ? desired : current}.${stateReads.get(variable)}`
                    if (mode === 'commit' && scalarFlips.has(variable)) value = `!${value}`
                  }
                  if (value)
                    replacements.push([
                      part.range[0],
                      part.range[1],
                      part.parent?.type === 'Property' && part.parent.shorthand
                        ? `${part.name}: ${value}`
                        : value,
                    ])
                }
              }
              for (const key of context.sourceCode.visitorKeys[part.type] ?? []) {
                const value = part[key]
                if (Array.isArray(value)) value.forEach(visit)
                else visit(value)
              }
            }
            visit(node)
            let text = context.sourceCode.getText(node)
            for (const [start, end, value] of replacements.sort((a, b) => b[0] - a[0]))
              text = text.slice(0, start - node.range[0]) + value + text.slice(end - node.range[0])
            return text
          }
          let statement = save
          while (statement.parent && statement.parent.type !== 'BlockStatement')
            statement = statement.parent
          const block = statement.parent
          const success =
            block?.type === 'BlockStatement' ? block.body.slice(block.body.indexOf(statement)) : []
          const commitLines = success.map((line) => {
            if (line.type === 'ReturnStatement' && line.argument)
              return `await ${render(line.argument, 'commit')};`
            const expression = line.type === 'ExpressionStatement' && unwrap(line.expression)
            const chain = ['then', 'catch', 'finally'].includes(callName(expression))
            return `${chain && line.expression.type !== 'AwaitExpression' ? 'await ' : ''}${render(line, 'commit')}`
          })
          // Carry declarations the request uses (endpoint/path/etc.), but not toggled aliases.
          const declarations = []
          walk(fn.body, (node) => {
            if (
              node.type === 'VariableDeclaration' &&
              node.range[1] < statement.range[0] &&
              node.declarations.every(
                (declaration) =>
                  declaration.id.type === 'Identifier' && !held.has(variableFor(declaration.id)),
              )
            )
              declarations.push(render(node, 'commit'))
          })
          const updates = selected.map(({ state, argument }) => {
            const update = unwrap(argument)
            return `${state.name}: ${isFunction(update) ? `(${render(update, 'update')})(${current}.${state.name})` : render(argument, 'update')}`
          })
          const updateLocals = new Set()
          const collectLocals = (node) =>
            walk(
              node,
              (part) => {
                const variable = variableFor(part)
                const declaration = variable?.defs[0]?.node
                if (
                  declaration?.type !== 'VariableDeclarator' ||
                  !declaration.init ||
                  enclosingFunction(declaration) !== fn ||
                  updateLocals.has(declaration)
                )
                  return
                updateLocals.add(declaration)
                collectLocals(declaration.init)
              },
              true,
            )
          for (const { argument } of selected) collectLocals(argument)
          const aliasesForUpdate = [...updateLocals]
            .sort((a, b) => a.range[0] - b.range[0])
            .map((node) => {
              const field = aliases.get(variableFor(node.id))
              return `const ${node.id.name} = ${field ? `!${current}.${field}` : render(node.init, 'update')};`
            })
          const seeds = selected.map(
            ({ state }) =>
              `${state.name}: ${state.seed && state.seed.type !== 'Literal' ? (isFunction(state.seed) ? `(${context.sourceCode.getText(state.seed)})()` : context.sourceCode.getText(state.seed)) : state.name}`,
          )
          const kept = selected.filter(({ state }) => !state.seed || state.seed.type === 'Literal')
          const nullable = kept.filter(({ state }) => state.seed?.value === null)
          const guard = nullable.map(
            ({ state }) => `if (!${desired}.${state.name}) return ${desired};`,
          )
          return `Rewrite the state in this component (keep auth/initial-loading checks):\n\`\`\`tsx\nconst ${controller} = useOptimisticValue({\n  value: { ${seeds.join(', ')} },\n  commit: async (${desired}) => {\n    ${guard.join('\n    ')}\n    let ${confirmed} = ${desired};\n    ${[...declarations, ...commitLines].join('\n    ')}\n    return ${confirmed};\n  },\n});\n${selected.map(({ state }) => `const ${kept.some((entry) => entry.state === state) ? `optimistic${state.name[0].toUpperCase()}${state.name.slice(1)}` : state.name} = ${controller}.value.${state.name};`).join('\n')}\n// In the click handler, replace its local setters/save/rollback with:\n${controller}.update((${current}) => {\n  ${nullable.map(({ state }) => `if (!${current}.${state.name}) return ${current};`).join('\n  ')}\n  ${aliasesForUpdate.join('\n  ')}\n  return { ${updates.join(', ')} };\n});\n\`\`\`\nRemove the pending guard/disabled-on-pending flag and effects that copy props into the replaced display setters (${selected.map(({ state }) => state.setter.name).join(', ')}). ${kept.length ? 'Keep the original query state/setter for loading server data. Use the optimistic alias above for rendering AND loading guards; do not clear an already-loaded record before a same-record refetch, and keep its control mounted. ' : ''}Let commit reject on failure. Key the mounted control by record identity, and render/enable it only after its initial record loads.`
        }
        // Shown at once: a setter called with the toggled value before the save starts
        // (`setFavorited(next)`, `setItems((prev) => … !item.checked …)`). An awaited response
        // applied by the setter is the save itself, so the walk stops at `await`. A toggle that
        // waits for the server before it changes what is shown cannot flip back.
        const shownBefore = (fn, held, save) => {
          let found = false
          const mentionsToggle = (node) => {
            if (found || !node || typeof node.type !== 'string') return
            if (node.type === 'AwaitExpression') return
            if (toggled(node, held)) {
              found = true
              return
            }
            for (const key of Object.keys(node)) {
              if (key === 'parent') continue
              const value = node[key]
              if (Array.isArray(value)) value.forEach(mentionsToggle)
              else if (value && typeof value.type === 'string') mentionsToggle(value)
            }
          }
          const visit = (node) => {
            if (found || !node || typeof node.type !== 'string') return
            if (isFunction(node)) return
            if (
              node.type === 'CallExpression' &&
              node.callee.type === 'Identifier' &&
              setters.has(variableFor(node.callee)) &&
              node.range[0] < save.range[0]
            )
              node.arguments.forEach(mentionsToggle)
            for (const key of Object.keys(node)) {
              if (key === 'parent') continue
              const value = node[key]
              if (Array.isArray(value)) value.forEach(visit)
              else if (value && typeof value.type === 'string') visit(value)
            }
          }
          visit(fn.body)
          return found
        }
        return {
          VariableDeclarator(node) {
            const callee = node.init?.type === 'CallExpression' ? node.init.callee : null
            const hook =
              callee?.type === 'Identifier'
                ? callee.name
                : callee?.type === 'MemberExpression'
                  ? callee.property.name
                  : null
            if (hook !== 'useState' || node.id.type !== 'ArrayPattern') return
            const setter = node.id.elements[1]
            if (setter?.type === 'Identifier') {
              const variable = variableFor(setter)
              setters.add(variable)
              const value = node.id.elements[0]
              if (value?.type === 'Identifier')
                states.set(variable, {
                  setter: variable,
                  variable: variableFor(value),
                  name: value.name,
                  seed: node.init.arguments[0],
                })
            }
          },
          ImportDeclaration(node) {
            if (node.source.value === 'react') reactModule = true
            for (const specifier of node.specifiers) {
              const name = specifier.imported?.name ?? specifier.local?.name
              if (helpers.has(name)) helpers.add(specifier.local.name)
              if (String(node.source.value).includes('analytics'))
                localCalls.add(specifier.local.name)
            }
          },
          JSXAttribute(node) {
            if (node.name.name !== 'onSubmit') return
            const fn = functionFor(node.value?.expression)
            const collect = (handler) => {
              if (!handler || submitHandlers.has(handler)) return
              submitHandlers.add(handler)
              const visit = (node) => {
                if (!node || typeof node.type !== 'string' || isFunction(node)) return
                if (node.type === 'CallExpression') collect(functionFor(node.callee))
                for (const key of Object.keys(node)) {
                  if (key === 'parent') continue
                  const value = node[key]
                  if (Array.isArray(value)) value.forEach(visit)
                  else if (value && typeof value.type === 'string') visit(value)
                }
              }
              visit(handler.body)
            }
            collect(fn)
          },
          JSXElement() {
            reactModule = true
          },
          JSXFragment() {
            reactModule = true
          },
          CallExpression(node) {
            candidates.push({ kind: 'call', node })
            if (callName(node) === 'useEffect') {
              const effect = functionFor(node.arguments[0])
              if (effect) effects.push(effect)
            }
            if (helpers.has(callName(node))) {
              const options = unwrap(node.arguments[0])
              if (options?.type === 'ObjectExpression') {
                for (const property of options.properties) {
                  if (property.type !== 'Property') continue
                  const key = property.key.name ?? property.key.value
                  if (key !== 'commit') continue
                  const fn = functionFor(property.value)
                  if (fn) helperCommits.add(fn)
                }
              }
            }
          },
          ConditionalExpression(node) {
            candidates.push({ kind: 'choice', node })
          },
          Property(node) {
            const key = node.key.type === 'Identifier' ? node.key.name : node.key.value
            if (key !== 'method' || node.value.type !== 'ConditionalExpression') return
            const methods = [node.value.consequent, node.value.alternate].map(methodLiteral)
            if (
              methods.includes('DELETE') &&
              methods.some((method) => ['POST', 'PUT', 'PATCH'].includes(method))
            )
              candidates.push({ kind: 'method', node })
          },
          'Program:exit'() {
            if (!reactModule) return
            const reported = new Set()
            const names = new Map()
            const namesFor = (fn) => {
              if (!names.has(fn)) names.set(fn, toggledNames(fn))
              return names.get(fn)
            }
            for (const { kind, node } of candidates) {
              const fn = enclosingFunction(node)
              if (
                !fn ||
                reported.has(fn) ||
                submitHandlers.has(fn) ||
                helperCommits.has(fn) ||
                serialized(fn)
              )
                continue
              let hit = false
              const refetch = kind === 'call' && refreshAfter(fn, node)
              if (kind === 'method') {
                const object = node.parent
                const usedAsRequestOptions = (expression) => {
                  const request = expression.parent
                  return (
                    persistenceCall(request) &&
                    request.arguments.includes(expression) &&
                    promiseUsed(request, fn)
                  )
                }
                if (object?.type === 'ObjectExpression') {
                  hit = usedAsRequestOptions(object)
                  if (!hit && object.parent?.type === 'VariableDeclarator') {
                    const variable = variableFor(object.parent.id)
                    hit = (variable?.references ?? []).some((reference) =>
                      usedAsRequestOptions(reference.identifier),
                    )
                  }
                }
              }
              if (kind === 'call') {
                const held = namesFor(fn)
                hit =
                  persistenceCall(node) &&
                  (node.arguments.some(
                    (argument) =>
                      toggled(argument, held) ||
                      (argument.type === 'ObjectExpression' &&
                        argument.properties.some(
                          (property) =>
                            selfToggle(property) ||
                            (property.type === 'Property' && toggled(property.value, held)),
                        )),
                  ) ||
                    droppedOrRefetched(fn, node) ||
                    (() => {
                      let branch = node.parent
                      while (branch && branch !== fn) {
                        if (
                          ['IfStatement', 'ConditionalExpression'].includes(branch.type) &&
                          ((refetch && oppositeRequests(branch)) ||
                            [...states.values()].some((state) =>
                              state.variable.references.some(
                                (reference) =>
                                  reference.identifier.range[0] >= branch.test.range[0] &&
                                  reference.identifier.range[1] <= branch.test.range[1],
                              ),
                            ))
                        )
                          return true
                        branch = branch.parent
                      }
                      return false
                    })()) &&
                  promiseUsed(node, fn)
              }
              if (kind === 'choice') {
                const branches = [node.consequent, node.alternate].map(unwrap)
                const methods = branches.map((branch) => callName(branch)?.toUpperCase())
                const deleteAndWrite =
                  methods.includes('DELETE') &&
                  methods.some((method) => ['POST', 'PUT', 'PATCH'].includes(method))
                hit =
                  (toggled(unwrap(node.test), namesFor(fn)) || deleteAndWrite) &&
                  branches.every(persistenceCall) &&
                  (promiseUsed(node, fn) ||
                    [node.consequent, node.alternate].every(
                      (branch) => branch.type === 'AwaitExpression',
                    ))
              }
              const optimistic = shownBefore(fn, namesFor(fn), node)
              if (!hit || (!optimistic && !refetch)) continue
              reported.add(fn)
              context.report({
                node,
                messageId: optimistic ? 'useOptimisticValue' : 'awaitRefetch',
                data: optimistic
                  ? { rewrite: rewriteFor(fn, node) }
                  : {
                      location: `${context.filename}:${node.loc.start.line}:${node.loc.start.column + 1}`,
                    },
              })
            }
          },
        }
      },
    },
    'require-catch-binding': {
      meta: {
        type: 'problem',
        fixable: 'code',
        docs: {
          description:
            'Require a binding in catch clauses so the error is never silently swallowed',
        },
        schema: [],
        messages: {
          missing:
            'Bind the caught error: `catch (error)` to log/re-throw it, or `catch (_error)` + a comment for an intentional noop.',
        },
      },
      create(context) {
        return {
          CatchClause(node) {
            if (node.param) return
            context.report({
              node,
              messageId: 'missing',
              fix(fixer) {
                const source = context.sourceCode
                const names = new Set(
                  source.scopeManager.scopes.flatMap((scope) => [
                    ...scope.variables.map((variable) => variable.name),
                    ...scope.references.map((reference) => reference.identifier.name),
                  ]),
                )
                // Scope names include escaped identifiers and references inside closures.
                // Direct eval can read unknown names, so leave it for manual handling.
                if (
                  source.scopeManager.scopes.some((scope) =>
                    scope.references.some(
                      ({ identifier }) =>
                        identifier.name === 'eval' &&
                        identifier.range[0] >= node.body.range[0] &&
                        identifier.range[1] <= node.body.range[1],
                    ),
                  )
                )
                  return null
                let name = '_error'
                for (let suffix = 1; names.has(name); suffix++) name = `_error${suffix}`
                return fixer.insertTextAfter(source.getFirstToken(node), ` (${name})`)
              },
            })
          },
        }
      },
    },
  },
}

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
      'molecule-local': moleculeLocal,
    },
    rules: {
      'molecule-local/prefer-declared-clients': 'error',
      'molecule-local/unique-update-excludes-self': 'error',
      'molecule-local/router-commits-with-url': 'error',
      'molecule-local/url-lists-use-list-route': 'warn',
      'molecule-local/server-toggles-use-optimistic-value': 'warn',
      'molecule-local/require-catch-binding': 'warn',
      // A full date-time prefix without its milliseconds or UTC marker loses
      // information: two updates in one second can serialize as the same value.
      // Use ESLint's standard syntax rule rather than another timestamp helper.
      // Date-only keys and clock-only display slices remain valid.
      ...(apiWorkspace
        ? {
            'no-restricted-syntax': [
              'error',
              {
                selector:
                  'CallExpression[callee.object.callee.property.name="toISOString"][callee.property.name=/^(slice|substring|substr)$/][arguments.0.value=0][arguments.1.value>=19][arguments.1.value<24]',
                message:
                  'Keep the full toISOString() timestamp, including milliseconds and UTC (Z); truncating it hides same-second updates. Remove the slice/substring/substr call. Use date-only or clock formatting for display.',
              },
            ],
          }
        : {}),
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          // The companion the other two patterns always implied. Handlers strip
          // secrets from a row with an omit-destructure —
          // `const { correct_answer: _correctAnswer, ...safe } = question` — where
          // the binding exists precisely so the key is DROPPED and is never read.
          // Without this the deliberate `_` prefix meant nothing for variables and
          // the pattern warned in a freshly-scaffolded project.
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // A `declare global { namespace Express { … } }` augmentation (or a
      // `declare module 'express-serve-static-core'`) is the standard way to
      // type `req.<field>`. It is a type-only declaration, not the runtime
      // namespacing this rule exists to discourage, so it is allowed; every
      // other namespace is still an error.
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [['^node:'], ['^[^.]'], ['^@molecule/'], ['^\\.']],
        },
      ],
      'simple-import-sort/exports': 'warn',
      '@typescript-eslint/no-import-type-side-effects': 'warn',
      '@typescript-eslint/naming-convention': [
        'warn',
        { selector: 'interface', format: ['PascalCase'] },
        { selector: 'typeAlias', format: ['PascalCase'] },
        { selector: 'enum', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['PascalCase'] },
        {
          // snake_case is allowed: handlers routinely destructure snake_case DB
          // columns / query params (e.g. const { space_id, parent_id } = req.query),
          // which the flagship templates do pervasively. Without this the build
          // verifier (eslint --max-warnings 0) fails working code that merely
          // mirrors the template convention.
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
          leadingUnderscore: 'allowSingleOrDouble',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'snake_case'],
          leadingUnderscore: 'allowSingleOrDouble',
          trailingUnderscore: 'allow',
        },
        {
          // snake_case allowed here for the SAME reason as the `variable`
          // selector above, which has permitted it since the flagship fleet
          // landed: these names mirror DB columns / query params. A handler that
          // destructures `{ space_id }` into a variable was already fine, but
          // the helper that TAKES `space_id` as a parameter was not — the same
          // convention, failing on which side of the call it appeared. That
          // inconsistency failed `npm run lint` in 12 freshly-scaffolded
          // projects' own test suites.
          selector: 'parameter',
          format: ['camelCase', 'snake_case'],
          leadingUnderscore: 'allowSingleOrDouble',
        },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
      ],
    },
  },
  {
    // Components live in .tsx — relax explicit return types there.
    files: ['**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    // Same relaxation for test files, and for the same reason `.tsx` gets it: a
    // test double's return type IS its object literal (`makeRes()` returning
    // `{ statusCode, status(), json() }`), so spelling it out restates the body
    // and then drifts from it. The molecule monorepo's own eslint config has
    // carried this exact override for `**/__tests__/**` since the rule landed;
    // the shipped template config simply never got it, which left 386 warnings
    // across the fleet's test suites — i.e. `npm run lint` failed in a
    // freshly-scaffolded project before the user wrote a line.
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    // Accessibility gate (eslint-plugin-jsx-a11y): the full `recommended`
    // ruleset at its native ERROR severity. Errors on purpose — a warning
    // gate nobody fails is decoration; a11y regressions the linter can see
    // statically (missing alt text, unlabeled controls, invalid ARIA,
    // mouse-only interactions) must fail lint the same way a type error
    // fails the build. Scoped to JSX files because this config is shared by
    // the app AND api workspaces and jsx-a11y is only meaningful where JSX
    // is written. What eslint can't see statically (color contrast,
    // rendered focus order) is covered by the axe-core smoke in
    // e2e/a11y.spec.ts.
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Same ERROR severity as recommended; only the control/text search depth
      // is raised (default 2). Template forms nest the label text in styled
      // spans (<label><span><span>{t('…')}</span></span></label>), which a
      // depth-2 scan can't see even though screen readers read it fine. A
      // label with NO text at any depth still fails.
      'jsx-a11y/label-has-associated-control': ['error', { depth: 25 }],
      // A scrolling container must be keyboard-reachable (axe `scrollable-region-focusable`),
      // and the WCAG pattern for it is `tabIndex={0}` on a NAMED `role="region"`. The rule's default
      // allows tabIndex on no non-interactive role but `tabpanel`, so that pattern would not lint;
      // `region` is added and nothing else — a tabIndex on a bare div or any other role still fails.
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        {
          roles: ['tabpanel', 'region'],
          tags: [],
          allowExpressionValues: true,
        },
      ],
    },
  },
  {
    // react-hooks applies to BOTH .ts and .tsx: custom hooks (use*.ts, lib/api.ts)
    // legitimately live in .ts files and must be linted for hook correctness. The
    // plugin is inert on non-hook files (api .ts has no hooks), so this is safe for
    // the shared app+api config — and it means a react-hooks/exhaustive-deps disable
    // in a .ts file resolves instead of erroring "rule definition not found".
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // Set rules explicitly rather than spreading reactHooks.configs.*,
      // whose shape varies across plugin versions.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    // public/*.js ships to the browser as written (no bundler): it runs with
    // the browser's globals. Without them the template's own site.js failed
    // lint with `'document' is not defined` as soon as a build edited it, and
    // the builder spent a fix round on the lint config (x440, 2026-09-29).
    files: ['public/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        getComputedStyle: 'readonly',
        matchMedia: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        HTMLElement: 'readonly',
        Element: 'readonly',
        innerWidth: 'readonly',
        innerHeight: 'readonly',
        scrollX: 'readonly',
        scrollY: 'readonly',
        scrollTo: 'readonly',
        scrollBy: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '.svelte-kit/'],
  },
)
