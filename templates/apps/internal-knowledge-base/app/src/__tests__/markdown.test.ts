import { beforeAll, describe, expect, it } from 'vitest'

import { setProvider } from '@molecule/app-markdown'
import { provider } from '@molecule/app-markdown-marked'

import { extractExcerpt, extractToc, renderMarkdown } from '../lib/markdown.js'

/** The ids of the H1–H3 headings in rendered HTML, in order. */
const headingIds = (html: string): string[] =>
  [...html.matchAll(/<h[1-3][^>]*\sid="([^"]*)"/g)].map((match) => match[1] ?? '')

beforeAll(() => {
  setProvider(provider)
})

describe('article markdown', () => {
  it('links every table-of-contents entry to a heading the article renders', () => {
    const md = [
      '# Runbook',
      '## Setup',
      'Install the agent.',
      '## Setup',
      'Again, on the replica.',
      '### 日本語の手順',
    ].join('\n')
    const toc = extractToc(md)
    const ids = toc.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id !== '')).toBe(true)
    expect(headingIds(renderMarkdown(md))).toEqual(ids)
    expect(toc.map((item) => [item.label, item.level])).toEqual([
      ['Runbook', 1],
      ['Setup', 2],
      ['Setup', 2],
      ['日本語の手順', 3],
    ])
  })

  it('leaves `#` lines inside a code fence out of the table of contents', () => {
    const md = ['## Deploy', '```sh', '# build first', 'npm run build', '```'].join('\n')
    expect(extractToc(md).map((item) => item.label)).toEqual(['Deploy'])
    expect(renderMarkdown(md)).toContain('# build first')
  })

  it('leaves a heading with no text out of the table of contents', () => {
    expect(extractToc('## Steps\n## \n## Done').map((item) => item.label)).toEqual([
      'Steps',
      'Done',
    ])
  })

  it('lists headings down to H3 only, as the sticky table of contents does', () => {
    expect(extractToc('## Two\n#### Four\n### Three').map((item) => item.level)).toEqual([2, 3])
    expect(extractToc('')).toEqual([])
  })

  it('renders an unsafe link as its text and escapes raw HTML', () => {
    const html = renderMarkdown('[click](javascript:alert(1)) <img src=x onerror=alert(1)>')
    expect(html).not.toContain('javascript:')
    expect(html).not.toMatch(/<img[^>]*onerror/)
    expect(html).toContain('click')
    expect(renderMarkdown('')).toBe('')
  })

  it('takes the excerpt from body text, never from a heading or a code block', () => {
    const md = ['# Title', '```', 'SELECT 1;', '```', '', 'The real first line.'].join('\n')
    expect(extractExcerpt(md)).toBe('The real first line.')
    expect(extractExcerpt(`${'a'.repeat(250)}`, 240)).toBe(`${'a'.repeat(240)}…`)
    expect(extractExcerpt('```\nonly code\n```')).toBe('')
  })
})
