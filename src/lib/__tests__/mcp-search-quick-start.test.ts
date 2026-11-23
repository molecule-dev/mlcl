/**
 * `search_packages` gives its first hits' Quick Start, so "which package, and how do I call it" is
 * one tool call. In the harness eval `find` (2026-11-23) both harnesses searched and then read
 * one or two READMEs only to copy their Quick Start; Codex took four tool calls where the agent
 * without Molecule took one.
 */
import { describe, expect, it } from 'vitest'

import {
  QUICK_START_HITS,
  quickStartOf,
  withQuickStarts,
} from '../../../mcp/src/search-quick-start.js'

const readme = (name: string, code: string): string =>
  `# @molecule/${name}\n\nWhat it does.\n\n## Quick Start\n\n\`\`\`ts\n${code}\n\`\`\`\n\n## Type\n\n\`core\`\n`

const hits = (...names: string[]): string =>
  JSON.stringify(
    names.map((name) => ({ name: `@molecule/${name}`, install: `npx mlcl add @molecule/${name}` })),
  )

describe('quickStartOf', () => {
  it('reads the first code block under the Quick Start heading', () => {
    expect(
      quickStartOf(readme('api-emails', "import { sendMail } from '@molecule/api-emails'")),
    ).toBe("import { sendMail } from '@molecule/api-emails'")
  })

  it('is undefined for a README without one, and never reads a later section', () => {
    expect(quickStartOf('# @molecule/x\n\n## Type\n\n```ts\nnot it\n```\n')).toBeUndefined()
    expect(
      quickStartOf('# @molecule/x\n\n## Quick Start\n\nNo code.\n\n## API\n\n```ts\nnot it\n```\n'),
    ).toBeUndefined()
  })
})

describe('withQuickStarts', () => {
  it('adds the Quick Start to the first hits only, read without the scope (OLD MUSTFAIL)', async () => {
    const asked: string[] = []
    const out = JSON.parse(
      await withQuickStarts(
        hits('api-email-templates', 'api-emails', 'api-emails-resend', 'api-emails-sendgrid'),
        async (short) => {
          asked.push(short)
          return readme(short, `call(${short})`)
        },
      ),
    ) as { name: string; quickStart?: string }[]
    expect(QUICK_START_HITS).toBe(3)
    expect(asked).toEqual(['api-email-templates', 'api-emails', 'api-emails-resend'])
    expect(out.map((hit) => hit.quickStart)).toEqual([
      'call(api-email-templates)',
      'call(api-emails)',
      'call(api-emails-resend)',
      undefined,
    ])
    expect(out[3]).toEqual({
      name: '@molecule/api-emails-sendgrid',
      install: 'npx mlcl add @molecule/api-emails-sendgrid',
    })
  })

  it('answers without a snippet when a README fails or is slower than the bound', async () => {
    const started = Date.now()
    const out = JSON.parse(
      await withQuickStarts(
        hits('slow', 'broken'),
        (short) =>
          short === 'slow'
            ? new Promise((resolve) => setTimeout(() => resolve(readme(short, 'late')), 5_000))
            : Promise.reject(new Error('npm is down')),
        50,
      ),
    ) as { name: string; quickStart?: string }[]
    expect(Date.now() - started).toBeLessThan(2_000)
    expect(out.map((hit) => [hit.name, hit.quickStart])).toEqual([
      ['@molecule/slow', undefined],
      ['@molecule/broken', undefined],
    ])
  })

  it('passes a CLI message that is not a result through unchanged', async () => {
    const message = 'Unknown framework "x". Known: react'
    expect(await withQuickStarts(message, async () => readme('x', 'y'))).toBe(message)
    expect(await withQuickStarts('[]', async () => readme('x', 'y'))).toBe('[]')
  })
})
