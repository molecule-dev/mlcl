/**
 * `sortImportStatements` must write exactly what the scaffold's own import lint accepts, so a
 * generated file never opens with a `simple-import-sort` warning. The real rule, with the
 * groups the scaffold's ESLint config sets, judges the sorter's output.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { SCAFFOLD_IMPORT_GROUPS, sortImportStatements } from '../format.js'
import { importOrderProblems } from './import-order-lint.js'

/** The rule's complaints about a generated module. */
const importLint = (source: string): string[] => importOrderProblems(source, 'module.ts')

/** The source without whitespace, as a sorted multiset of characters. */
function characters(source: string): string {
  return [...source.replace(/\s+/g, '')].sort().join('')
}

describe('SCAFFOLD_IMPORT_GROUPS', () => {
  it('are the groups the scaffold’s ESLint config gives simple-import-sort', () => {
    const config = readFileSync(
      join(import.meta.dirname, '..', '..', '..', 'templates', 'shared', 'eslint.config.js.tpl'),
      'utf8',
    )
    const declared =
      /'simple-import-sort\/imports':\s*\[\s*'warn',\s*\{\s*groups:\s*(\[.*\]),/.exec(config)?.[1]
    expect(declared).toBeDefined()
    expect(JSON.parse((declared ?? '').replaceAll("'", '"'))).toEqual(SCAFFOLD_IMPORT_GROUPS)
  })
})

describe('sortImportStatements writes what the scaffold’s import lint accepts', () => {
  it('separates a React entry’s CSS imports from its relative imports', () => {
    const entry =
      "import { setupProviders, authClient } from './bonds/index.js'\nimport './index.css'\nimport './theme.css'\n\nsetupProviders()\n"
    const sorted = sortImportStatements(entry, 'module.ts')
    expect(sorted).toBe(
      "import './index.css'\nimport './theme.css'\n\nimport { authClient, setupProviders } from './bonds/index.js'\n\nsetupProviders()\n",
    )
    expect(importLint(sorted)).toEqual([])
  })

  it('moves comments with their imports and keeps a file header in place', () => {
    const source = [
      '/** The app entry. */',
      "import { b } from './b.js'",
      '// The API client.',
      "import { a } from '@molecule/app-http' // shared",
      "import { readFileSync } from 'node:fs'",
      '',
      'a(b, readFileSync)',
      '',
    ].join('\n')
    const sorted = sortImportStatements(source, 'module.ts')
    expect(sorted).toBe(
      [
        '/** The app entry. */',
        "import { readFileSync } from 'node:fs'",
        '',
        '// The API client.',
        "import { a } from '@molecule/app-http' // shared",
        '',
        "import { b } from './b.js'",
        '',
        'a(b, readFileSync)',
        '',
      ].join('\n'),
    )
    expect(importLint(sorted)).toEqual([])
  })

  it('sorts every run of imports, as the rule does', () => {
    const source =
      "import { b } from 'b'\nimport { a } from 'a'\n\nconst x = 1\n\nimport { d } from './d.js'\nimport { c } from './c.js'\n\nexport { a, b, c, d, x }\n"
    const sorted = sortImportStatements(source, 'module.ts')
    expect(sorted).toBe(
      "import { a } from 'a'\nimport { b } from 'b'\n\nconst x = 1\n\nimport { c } from './c.js'\nimport { d } from './d.js'\n\nexport { a, b, c, d, x }\n",
    )
    expect(importLint(sorted)).toEqual([])
  })

  // Read as TypeScript, the JSX text `src/*.ts` opens a comment that runs to `*/`, hiding the second chunk.
  it('parses a .tsx module as TSX, so imports after JSX are still sorted', () => {
    const source = [
      "import { b } from './b.js'",
      "import { a } from './a.js'",
      '',
      'export const View = () => <p>Matches src/*.ts: {a + b}</p>',
      '',
      "import { d } from './d.js'",
      "import { c } from './c.js'",
      '',
      'export const Close = () => <code>*/</code>',
      'export { c, d }',
      '',
    ].join('\n')
    const sorted = sortImportStatements(source, 'View.tsx')
    expect(sorted).toBe(
      [
        "import { a } from './a.js'",
        "import { b } from './b.js'",
        '',
        'export const View = () => <p>Matches src/*.ts: {a + b}</p>',
        '',
        "import { c } from './c.js'",
        "import { d } from './d.js'",
        '',
        'export const Close = () => <code>*/</code>',
        'export { c, d }',
        '',
      ].join('\n'),
    )
    expect(importOrderProblems(sorted, 'View.tsx')).toEqual([])
  })

  it('agrees with the rule on generated import blocks of every shape', () => {
    const paths = [
      './a.js',
      '../a.js',
      '../../a.js',
      './a/b.js',
      './A.js',
      './a-b.js',
      './a_b.js',
      './a.css',
      '.',
      '..',
      './index.js',
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@tanstack/vue-query',
      'Zod',
      'zod',
      'vue',
      '#lib/x.js',
      '$app/state',
      '@molecule/app-ui',
      '@molecule/app-ui-react',
      '@molecule/app-ui/types.js',
      'node:fs',
      'node:path',
      'virtual:pwa-register',
      'a10',
      'a9',
    ]
    const names = ['b', 'a', 'B', 'c10', 'c9', 'Zed', 'x']
    let seed = 20261119
    const random = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
    const pick = <T>(items: readonly T[]): T => {
      const item = items[Math.floor(random() * items.length)]
      if (item === undefined) throw new Error('pick from an empty list')
      return item
    }
    const failures: string[] = []
    for (let n = 0; n < 600; n++) {
      const statements: string[] = []
      const count = 1 + Math.floor(random() * 7)
      for (let i = 0; i < count; i++) {
        const path = pick(paths)
        const specifiers = [
          ...new Set(Array.from({ length: 1 + Math.floor(random() * 3) }, () => pick(names))),
        ].map((name) => `${random() < 0.2 ? 'type ' : ''}${name} as ${name}_${i}`)
        const shape = random()
        let statement =
          shape < 0.15
            ? `import '${path}'`
            : shape < 0.25
              ? `import * as ns${i} from '${path}'`
              : shape < 0.35
                ? `import def${i}, { ${specifiers.join(', ')} } from '${path}'`
                : shape < 0.45
                  ? `import type { ${specifiers.join(', ')} } from '${path}'`
                  : shape < 0.55
                    ? `import {\n  ${specifiers.join(',\n  ')},\n} from '${path}'`
                    : shape < 0.6
                      ? `import def${i} from '${path}'`
                      : `import { ${specifiers.join(', ')} } from '${path}'`
        const comment = random()
        if (comment < 0.1) statement = `// note ${i}\n${statement}`
        else if (comment < 0.15) statement = `${statement} // after ${i}`
        else if (comment < 0.18) statement = `/* block ${i} */ ${statement}`
        else if (comment < 0.2) statement = `/**\n * doc ${i}\n */\n${statement}`
        statements.push(statement)
        if (random() < 0.08) statements.push('')
      }
      const source = `${random() < 0.3 ? '/** File header. */\n' : ''}${statements.join('\n')}\n\nconsole.log(1)\n`
      const sorted = sortImportStatements(source, 'module.ts')
      const problems = importLint(sorted)
      if (
        problems.length > 0 ||
        characters(sorted) !== characters(source) ||
        sortImportStatements(sorted, 'module.ts') !== sorted
      ) {
        failures.push(`${source}\n--- sorted ---\n${sorted}\n${problems.join('; ')}`)
      }
    }
    expect(failures.slice(0, 3)).toEqual([])
  })
})
