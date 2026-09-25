import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { buildSite, outputFileOf } from '../build.js'
import { markdownBlocks } from '../provenance.js'

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** A throwaway app root holding the given posts (and optional transcript folders). */
function appWith(
  posts: Record<string, string>,
  transcripts: Record<string, Record<string, string>> = {},
): string {
  const root = mkdtempSync(join(tmpdir(), 'thin-build-'))
  mkdirSync(join(root, 'content', 'posts'), { recursive: true })
  for (const [name, text] of Object.entries(posts)) {
    writeFileSync(join(root, 'content', 'posts', name), text)
  }
  for (const [slug, files] of Object.entries(transcripts)) {
    const dir = join(root, 'content', 'transcripts', slug)
    mkdirSync(dir, { recursive: true })
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text)
  }
  return root
}

const post = (title: string, date: string, extra = '', body = 'Some words here.'): string =>
  `---\ntitle: '${title}'\ndate: ${date}\ndescription: 'About ${title}.'\n${extra}---\n\n${body}\n`

describe('outputFileOf', () => {
  it('writes a page path as its directory index and a file path as itself', () => {
    expect(outputFileOf('/')).toBe('index.html')
    expect(outputFileOf('/about/')).toBe('about/index.html')
    expect(outputFileOf('/feed.xml')).toBe('feed.xml')
  })
})

describe('buildSite on the template content', () => {
  it('writes every page and file the site promises', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'thin-dist-'))
    const { files, posts } = await buildSite({
      root: APP,
      outDir,
      basePath: '/',
      siteUrl: 'https://example.com',
    })
    expect(posts.length).toBeGreaterThan(0)
    for (const file of [
      'index.html',
      '404.html',
      'tags/index.html',
      'about/index.html',
      'feed.xml',
      'atom.xml',
      'sitemap.xml',
      'llms.txt',
      'posts.json',
      'styles.css',
      'site.js',
    ]) {
      expect(files, file).toContain(file)
    }
    for (const p of posts) {
      expect(files).toContain(`${p.slug}/index.html`)
      expect(files).toContain(`${p.slug}.md`)
    }
  })

  it('never publishes a draft', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'thin-dist-'))
    const { files, posts } = await buildSite({ root: APP, outDir })
    expect(posts.some((p) => p.frontMatter.draft === true)).toBe(false)
    expect(files.some((f) => f.includes('unfinished-thoughts-on-editors'))).toBe(false)
    expect(readFileSync(join(outDir, 'feed.xml'), 'utf8')).not.toContain(
      'unfinished-thoughts-on-editors',
    )
  })
})

describe('buildSite with BASE_PATH', () => {
  it('puts every href, asset and absolute URL under the base path', async () => {
    const root = appWith({ 'hello.md': post('Hello', '2026-01-02', 'tags: [intro]\n') })
    const outDir = mkdtempSync(join(tmpdir(), 'thin-dist-'))
    await buildSite({ root, outDir, basePath: '/blog', siteUrl: 'https://example.com' })
    const home = readFileSync(join(outDir, 'index.html'), 'utf8')
    const hrefs = [...home.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]!)
    const local = hrefs.filter((h) => h.startsWith('/'))
    expect(local.length).toBeGreaterThan(5)
    for (const href of local) expect(href.startsWith('/blog/'), href).toBe(true)
    expect(readFileSync(join(outDir, 'sitemap.xml'), 'utf8')).toContain(
      'https://example.com/blog/hello/',
    )
  })
})

describe('content rules', () => {
  it('drops the template placeholders once a real post exists', async () => {
    const root = appWith({
      'sample.md': post('Sample', '2026-01-01', 'templateDemo: true\n'),
      'mine.md': post('Mine', '2026-01-03'),
    })
    const { posts } = await buildSite({ root, outDir: mkdtempSync(join(tmpdir(), 'thin-dist-')) })
    expect(posts.map((p) => p.slug)).toEqual(['mine'])
  })

  it('fails the build on a post missing a required field, naming the file', async () => {
    const root = appWith({ 'broken.md': '---\ntitle: Broken\n---\n\nNo date.\n' })
    await expect(
      buildSite({ root, outDir: mkdtempSync(join(tmpdir(), 'thin-dist-')) }),
    ).rejects.toThrow(/broken\.md/)
  })

  it('escapes content in pages', async () => {
    const root = appWith({ 'x.md': post('A <b>bold</b> & brave title', '2026-01-02') })
    const outDir = mkdtempSync(join(tmpdir(), 'thin-dist-'))
    await buildSite({ root, outDir })
    const html = readFileSync(join(outDir, 'x', 'index.html'), 'utf8')
    expect(html).toContain('A &lt;b&gt;bold&lt;/b&gt; &amp; brave title')
    expect(html).not.toContain('<b>bold</b> & brave')
  })
})

describe('provenance', () => {
  it('splits a post into top-level blocks, keeping code fences whole', () => {
    const blocks = markdownBlocks('---\ntitle: x\n---\n\nOne.\n\n```\na\n\nb\n```\n\n## Two\n')
    expect(blocks).toEqual(['One.', '```\na\n\nb\n```', '## Two'])
  })

  it('writes provenance.json only for a post with a transcripts folder', async () => {
    const aiParagraph =
      'Reading logs first saves you from overthinking. You will not waste time tracing through conditional branches the code never hit, or wondering about race conditions that did not occur.'
    const humanParagraph = 'I wrote this closing line myself, after a long walk around the lake.'
    const exported = [
      ' ▐▛███▜▌   Claude Code v2.1.281',
      '▝▜█████▛▘  Haiku 4.5 · Claude Max',
      '  ▘▘ ▝▝    ~/blog',
      '',
      '',
      '❯ Write a paragraph about reading logs before code.',
      '',
      `● ${aiParagraph}`,
      '',
    ].join('\n')
    const root = appWith(
      {
        'logs.md': post('Logs', '2026-01-03', '', `${aiParagraph}\n\n${humanParagraph}`),
        'plain.md': post('Plain', '2026-01-02'),
      },
      { logs: { 'session.txt': exported, 'notes.bin': 'not a transcript' } },
    )
    const outDir = mkdtempSync(join(tmpdir(), 'thin-dist-'))
    await buildSite({ root, outDir })
    expect(existsSync(join(outDir, 'plain', 'provenance.json'))).toBe(false)
    const provenance = JSON.parse(readFileSync(join(outDir, 'logs', 'provenance.json'), 'utf8'))
    expect(provenance.spans).toHaveLength(2)
    expect(provenance.spans[0].origin).toBe('ai')
    expect(provenance.spans[0].prompt).toBe('Write a paragraph about reading logs before code.')
    expect(provenance.spans[1].origin).toBe('human')
    expect(provenance.aiShare).toBeGreaterThan(0)
    expect(provenance.aiShare).toBeLessThan(1)
  })
})
