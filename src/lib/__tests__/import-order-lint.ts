/**
 * The scaffold's own import-order rule (`simple-import-sort`, with the groups the scaffold's ESLint
 * config sets), run on one script. Tests ask it, not mlcl's sorter, whether generated imports are in
 * order: a sorter checked against itself passes whatever it does.
 *
 * @module
 */
import { Linter } from 'eslint'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import tseslint from 'typescript-eslint'

import { SCAFFOLD_IMPORT_GROUPS } from '../format.js'

const linter = new Linter({ configType: 'flat' })

/**
 * What the scaffold's import-order rule reports for one script.
 *
 * @param source - A whole module, or a component's `<script>` block.
 * @param fileName - The file the script belongs to: a `.tsx`/`.jsx` name allows JSX.
 * @returns The rule's messages (a parse error included); empty when the imports are in order.
 */
export function importOrderProblems(source: string, fileName: string): string[] {
  const jsx = /\.[jt]sx$/.test(fileName)
  const config: Linter.Config[] = [
    {
      files: ['**/*.ts', '**/*.tsx'],
      plugins: { 'simple-import-sort': simpleImportSort },
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx } },
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      rules: {
        'simple-import-sort/imports': [
          'warn',
          { groups: SCAFFOLD_IMPORT_GROUPS.map((group) => [...group]) },
        ],
      },
    },
  ]
  return linter
    .verify(source, config, jsx ? 'module.tsx' : 'module.ts')
    .map((message) => message.message)
}
