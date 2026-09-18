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
    'require-catch-binding': {
      meta: {
        type: 'problem',
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
    ignores: ['dist/', 'node_modules/', '.svelte-kit/'],
  },
)
