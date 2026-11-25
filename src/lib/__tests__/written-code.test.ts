import { describe, expect, it } from 'vitest'

import { codeLines, writtenCode } from '../written-code.js'

describe('codeLines', () => {
  it('keeps the code and leaves out blank lines and comments', () => {
    const text = [
      '/**',
      ' * Wires the provider.',
      ' */',
      "import { setProvider } from '@molecule/api-uploads'",
      '',
      '// the default store',
      "import { provider } from '@molecule/api-uploads-filesystem'",
      '/* one line */',
      'export function setup(): void {',
      '  setProvider(provider)',
      '}',
    ].join('\n')
    expect(codeLines(text)).toEqual([
      "import { setProvider } from '@molecule/api-uploads'",
      "import { provider } from '@molecule/api-uploads-filesystem'",
      'export function setup(): void {',
      '  setProvider(provider)',
      '}',
    ])
  })
})

describe('writtenCode', () => {
  const files: Record<string, string> = {
    'src/bonds/a.ts': 'a()\nb()',
    'src/bonds/long.ts': Array.from({ length: 30 }, (_, i) => `line${i}()`).join('\n'),
    'migrations/1.sql': 'create table t (id text);',
    'src/bonds/c.ts': 'c()',
  }
  const read = (path: string): string => files[path] ?? ''

  it('shows a short source file, names a long one and a file that is not source code', () => {
    expect(writtenCode(Object.keys(files), read)).toEqual([
      { path: 'src/bonds/a.ts', lines: ['a()', 'b()'] },
      { path: 'src/bonds/long.ts', lines: [] },
      { path: 'migrations/1.sql', lines: [] },
      { path: 'src/bonds/c.ts', lines: ['c()'] },
    ])
  })

  it('stops showing code once the report holds its total', () => {
    expect(writtenCode(['src/bonds/a.ts', 'src/bonds/c.ts'], read, { maxLines: 2 })).toEqual([
      { path: 'src/bonds/a.ts', lines: ['a()', 'b()'] },
      { path: 'src/bonds/c.ts', lines: [] },
    ])
  })
})
