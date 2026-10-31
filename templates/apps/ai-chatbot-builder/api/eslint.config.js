import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

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
        schema: [],
        messages: {
          useListRoute:
            'Use `useListRoute` from `@molecule/app-routing-react-router` (see the package doc) so the URL and rendered list stay in step and paging and filter resets are handled.',
        },
      },
      create(context) {
        const source = context.sourceCode
        const routerPackages = new Set(['react-router', 'react-router-dom'])
        const listKeys = new Set([
          'page',
          'cursor',
          'offset',
          'feed',
          'filter',
          'category',
          'tag',
          'view',
          'tab',
          'sort',
          'search',
          'query',
          'q',
          'topic',
          'author',
          'favorited',
        ])
        const hookVariables = new Set()
        const paramsVariables = new Set()
        const reads = []
        let importsListRoute = false
        const variableFor = (node, name) => {
          let scope = source.getScope(node)
          while (scope) {
            const variable = scope.set.get(name)
            if (variable) return variable
            scope = scope.upper
          }
          return null
        }
        const importedName = (specifier) => specifier.imported.name ?? specifier.imported.value
        return {
          ImportDeclaration(node) {
            const module = node.source.value
            if (
              module === '@molecule/app-routing-react-router' &&
              node.importKind !== 'type' &&
              node.specifiers.some(
                (specifier) =>
                  specifier.type === 'ImportSpecifier' &&
                  specifier.importKind !== 'type' &&
                  importedName(specifier) === 'useListRoute',
              )
            ) {
              importsListRoute = true
            }
            if (!routerPackages.has(module) || node.importKind === 'type') return
            for (const specifier of node.specifiers) {
              if (
                specifier.type === 'ImportSpecifier' &&
                specifier.importKind !== 'type' &&
                importedName(specifier) === 'useSearchParams'
              ) {
                const variable = variableFor(specifier, specifier.local.name)
                if (variable) hookVariables.add(variable)
              }
            }
          },
          VariableDeclarator(node) {
            if (
              node.id.type !== 'ArrayPattern' ||
              node.id.elements[0]?.type !== 'Identifier' ||
              node.init?.type !== 'CallExpression' ||
              node.init.callee.type !== 'Identifier' ||
              !hookVariables.has(variableFor(node.init.callee, node.init.callee.name))
            ) {
              return
            }
            const variable = variableFor(node.id, node.id.elements[0].name)
            if (variable) paramsVariables.add(variable)
          },
          CallExpression(node) {
            if (
              node.callee.type !== 'MemberExpression' ||
              node.callee.computed ||
              node.callee.property.type !== 'Identifier' ||
              node.callee.property.name !== 'get' ||
              node.callee.object.type !== 'Identifier' ||
              node.arguments[0]?.type !== 'Literal' ||
              typeof node.arguments[0].value !== 'string' ||
              !listKeys.has(node.arguments[0].value.toLowerCase())
            ) {
              return
            }
            reads.push({
              node,
              variable: variableFor(node.callee.object, node.callee.object.name),
            })
          },
          'Program:exit'() {
            if (importsListRoute) return
            const read = reads.find((candidate) => paramsVariables.has(candidate.variable))
            if (read) context.report({ node: read.node, messageId: 'useListRoute' })
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
      'molecule-local/router-commits-with-url': 'error',
      'molecule-local/url-lists-use-list-route': 'warn',
      'molecule-local/require-catch-binding': 'warn',
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
