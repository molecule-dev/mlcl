/**
 * The registry's copy of each package's README Quick Start: written by sync-registry from the
 * source, returned by search on its first hits, so finding a package and seeing its call needs no
 * README read (harness eval `find`, 2026-11-23: three npm documents, about 1 s, per search in an
 * empty directory).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { quickStartOf, searchPackages } from '../package-search.js'
import { carriesQuickStart, expectedQuickStart, syncQuickStart } from '../registry-quick-start.js'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A package directory whose `src/index.ts` module JSDoc has `example` as its `@example`. */
function packageDir(example?: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'mlcl-quick-start-'))
  dirs.push(dir)
  mkdirSync(join(dir, 'src'))
  // The README is formatted by the prettier config its path resolves (molecule's style), so the copy is too.
  writeFileSync(join(dir, '.prettierrc.json'), JSON.stringify({ semi: false, singleQuote: true }))
  const tag =
    example === undefined
      ? ''
      : ` *\n * @example\n * \`\`\`typescript\n${example
          .split('\n')
          .map((line) => ` * ${line}`)
          .join('\n')}\n * \`\`\`\n`
  writeFileSync(
    join(dir, 'src', 'index.ts'),
    `/**\n * Sends email.\n${tag} *\n * @module\n */\nexport * from './provider.js'\n`,
  )
  return dir
}

describe('the registry Quick Start', () => {
  it('is carried for every type but features and locales', () => {
    for (const type of ['core', 'provider', 'utility', 'resource', 'native'])
      expect(carriesQuickStart({ type })).toBe(true)
    for (const type of ['feature', 'locales', undefined])
      expect(carriesQuickStart({ type })).toBe(false)
  })

  it('is the code the generated README shows: the module example, formatted', async () => {
    // Unformatted on purpose: the README runs through prettier, and so must the copy.
    const dir = packageDir(
      "import {sendMail} from '@molecule/api-emails'\nawait sendMail( message )",
    )
    expect(await expectedQuickStart({ type: 'core' }, dir)).toBe(
      "import { sendMail } from '@molecule/api-emails'\nawait sendMail(message)",
    )
    expect(quickStartOf('## Quick Start\n\n```ts\nrun()\n```\n\n## Type\n')).toBe('run()')
  })

  it('is added, replaced when the example changes, and removed when it goes', async () => {
    const entry: { type: string; quickStart?: string } = { type: 'core' }
    expect(await syncQuickStart(entry, packageDir('await sendMail(message)'))).toBe(true)
    expect(entry.quickStart).toBe('await sendMail(message)')
    expect(await syncQuickStart(entry, packageDir('await sendMail(message)'))).toBe(false)
    expect(await syncQuickStart(entry, packageDir('await sendMail(other)'))).toBe(true)
    expect(entry.quickStart).toBe('await sendMail(other)')
    expect(await syncQuickStart(entry, packageDir())).toBe(true)
    expect(entry).toEqual({ type: 'core' })
  })

  it('is kept when the source is not here, and never kept for a feature', async () => {
    const entry = { type: 'core', quickStart: 'kept' }
    const absent = join(tmpdir(), 'mlcl-no-such-package')
    expect(await expectedQuickStart(entry, absent)).toBeNull()
    expect(await syncQuickStart(entry, absent)).toBe(false)
    expect(entry.quickStart).toBe('kept')
    const feature: { type: string; quickStart?: string } = { type: 'feature', quickStart: 'stale' }
    expect(await syncQuickStart(feature, packageDir('render()'))).toBe(true)
    expect(feature).toEqual({ type: 'feature' })
  })

  it('reaches the first three search hits only (OLD MUSTFAIL)', () => {
    const entries = ['a', 'b', 'c', 'd'].map((letter, index) => ({
      name: `@molecule/api-emails-${letter}`,
      stack: 'api' as const,
      category: 'email',
      label: `Email ${letter}`,
      description: `email ${'x'.repeat(4 - index)}`,
      quickStart: `call(${letter})`,
    }))
    const hits = searchPackages(entries, 'email')
    expect(hits).toHaveLength(4)
    expect(hits.slice(0, 3).every((hit) => hit.quickStart?.startsWith('call('))).toBe(true)
    expect(hits[3]).not.toHaveProperty('quickStart')
  })
})
