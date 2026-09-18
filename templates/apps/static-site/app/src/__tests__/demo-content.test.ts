import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CONTENT_DIR, DEMO_FIELD, loadSiteContent } from '../../vite-content-plugin.js'

/**
 * The posts this template ships with are placeholders. They must never end up
 * published next to the site owner's real writing — a live run once served all
 * thirteen of them as someone's blog while the posts they had supplied were
 * nowhere on the site. Marked posts therefore drop out the moment an unmarked
 * one exists, and an unmarked post is never the one dropped.
 */
describe('template sample posts', () => {
  let root = ''

  const writePost = async (
    name: string,
    front: { title: string; date: string; demo?: boolean; draft?: boolean },
  ): Promise<void> => {
    const lines = [
      '---',
      `title: '${front.title}'`,
      `date: ${front.date}`,
      `description: '${front.title} description'`,
      'tags: [meta]',
    ]
    if (front.demo) lines.push(`${DEMO_FIELD}: true`)
    if (front.draft) lines.push('draft: true')
    lines.push('---', '', `Body of ${front.title}.`, '')
    await writeFile(join(root, CONTENT_DIR, name), lines.join('\n'))
  }

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'static-site-content-'))
    await mkdir(join(root, CONTENT_DIR), { recursive: true })
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('keeps the samples while they are all the site has', async () => {
    await writePost('sample-a.md', { title: 'Sample A', date: '2026-01-01', demo: true })
    await writePost('sample-b.md', { title: 'Sample B', date: '2026-01-02', demo: true })

    const { posts } = await loadSiteContent(root)

    expect(posts.map((post) => post.slug)).toEqual(['sample-b', 'sample-a'])
  })

  it('leaves every sample out as soon as one real post exists', async () => {
    await writePost('sample-a.md', { title: 'Sample A', date: '2026-01-01', demo: true })
    await writePost('sample-b.md', { title: 'Sample B', date: '2026-01-02', demo: true })
    await writePost('mine.md', { title: 'Mine', date: '2025-12-01' })

    const { posts } = await loadSiteContent(root)

    expect(posts.map((post) => post.slug)).toEqual(['mine'])
  })

  it('never drops a post the owner wrote', async () => {
    await writePost('sample-a.md', { title: 'Sample A', date: '2026-01-01', demo: true })
    await writePost('mine-one.md', { title: 'Mine One', date: '2026-02-01' })
    await writePost('mine-two.md', { title: 'Mine Two', date: '2026-02-02' })

    const { posts } = await loadSiteContent(root)

    expect(posts.map((post) => post.slug)).toEqual(['mine-two', 'mine-one'])
  })

  it('still excludes drafts, marked or not', async () => {
    await writePost('sample-a.md', { title: 'Sample A', date: '2026-01-01', demo: true })
    await writePost('sample-draft.md', {
      title: 'Sample Draft',
      date: '2026-01-03',
      demo: true,
      draft: true,
    })
    await writePost('mine-draft.md', { title: 'Mine Draft', date: '2026-02-01', draft: true })

    const { posts } = await loadSiteContent(root)

    expect(posts.map((post) => post.slug)).toEqual(['sample-a'])
  })

  it('never serves samples and real posts side by side', async () => {
    await writePost('sample-a.md', { title: 'Sample A', date: '2026-01-01', demo: true })
    await writePost('mine.md', { title: 'Mine', date: '2026-02-01' })

    const { posts } = await loadSiteContent(root)
    const marked = posts.filter((post) => post.markdown.includes(`${DEMO_FIELD}: true`))

    expect(marked.length === 0 || marked.length === posts.length).toBe(true)
  })
})
