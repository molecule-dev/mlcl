import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

/**
 * Local rules enforcing AGENTS.md Rule 14 (no silent error swallows).
 * `require-catch-binding` forbids bindingless `catch {` so every error can be
 * logged or explicitly ignored; combined with no-unused-vars `caughtErrors:'all'`
 * + `caughtErrorsIgnorePattern:'^_'`, a catch must either use the error or be a
 * `catch (_error)` documented noop.
 */
const moleculeLocal = {
  rules: {
    'require-catch-binding': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Require a binding in catch clauses so the error can be logged or explicitly ignored',
        },
        schema: [],
        messages: {
          missing:
            'Bind the caught error: `catch (error)` to log it, or `catch (_error)` + a comment for an intentional noop (AGENTS Rule 14 — no silent error swallows).',
        },
      },
      create(context) {
        return {
          CatchClause(node) {
            if (!node.param) context.report({ node, messageId: 'missing' })
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
      'molecule-local/require-catch-binding': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
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
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allowSingleOrDouble',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allowSingleOrDouble',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allowSingleOrDouble',
        },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
      ],
    },
  },
  {
    // Repo tooling under scripts/ is plain Node ESM, not library source: it uses
    // the runtime globals directly and its helpers are local. Mirrors the same
    // block molecule and molecule-dev/api already carry — without it these files
    // reported 62 `no-undef` for `console`/`process` alone, which is why
    // `npm run lint` never covered scripts/ at all.
    files: ['scripts/**/*.{mjs,js}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      'packages/**/dist/',
      'packages/**/node_modules/',
      // Every templates/apps/*/{api,app} is a SELF-CONTAINED project with its own
      // eslint.config.js + tsconfig.json. Linting them from mlcl's root config
      // makes typescript-eslint see multiple candidate TSConfig roots and refuse
      // to parse — 28,485 fatal errors, one per file, enough output to crash
      // ESLint's own formatter. They are linted with their OWN config instead, by
      // `npm run verify:template-lint` (scripts/verify-template-lint.mjs), which
      // is also what a user's scaffolded project runs.
      'templates/apps/',
      'templates/**/node_modules/',
      'templates/**/dist/',
      'templates/**/.polish/',
      'test-app/',
      'src-legacy/',
      'build-legacy/',
    ],
  },
)
