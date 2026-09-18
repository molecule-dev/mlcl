import { describe, expect, it } from 'vitest'

import { escapeHtml, renderMarkdown, sanitizeHref } from './render-markdown.js'

describe('escapeHtml', () => {
  it('escapes all five HTML-significant characters, including both quote styles', () => {
    expect(escapeHtml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &#39;')
  })
})

describe('sanitizeHref', () => {
  it('allows http/https/mailto and relative URLs', () => {
    expect(sanitizeHref('https://example.com')).toBe('https://example.com')
    expect(sanitizeHref('http://example.com')).toBe('http://example.com')
    expect(sanitizeHref('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(sanitizeHref('/threads/1')).toBe('/threads/1')
    expect(sanitizeHref('#anchor')).toBe('#anchor')
    expect(sanitizeHref('relative/path')).toBe('relative/path')
  })

  it('rejects javascript:, data:, and vbscript: schemes', () => {
    expect(sanitizeHref('javascript:alert(1)')).toBeNull()
    expect(sanitizeHref('JavaScript:alert(1)')).toBeNull()
    expect(sanitizeHref('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(sanitizeHref('vbscript:msgbox(1)')).toBeNull()
  })

  it('escapes quotes in returned hrefs so they cannot break out of the attribute', () => {
    expect(sanitizeHref('/x"y')).toBe('/x&quot;y')
  })
})

describe('renderMarkdown — XSS hardening', () => {
  it('does NOT produce an executable javascript: href', () => {
    const html = renderMarkdown('[x](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('href="javascript')
    // The link is dropped; the (escaped) link text survives.
    expect(html).toContain('x')
    expect(html).not.toContain('<a ')
  })

  it('does NOT produce an executable javascript: href when URL-encoded', () => {
    const html = renderMarkdown('[click](javascript:alert%28document.cookie%29)')
    expect(html).not.toContain('href="javascript')
    expect(html).not.toContain('<a ')
  })

  it('cannot break out of the href attribute into an event handler', () => {
    const html = renderMarkdown('[x](" onmouseover="alert(1))')
    // The single <a> tag's attribute list (everything between `<a ` and the
    // first `>`) must contain NO raw double-quote: the attacker's `"` were
    // escaped to &quot;, so they can't terminate href="..." and start a new
    // attribute. Any `onmouseover=` text is inert *inside* the quoted value.
    const tag = /<a\s[^>]*>/.exec(html)?.[0] ?? ''
    expect(tag).toContain('href="')
    // Strip the entities, then confirm exactly the two delimiting quotes remain
    // (the ones the renderer wrote), i.e. no unescaped quote leaked through.
    const withoutEntities = tag.replace(/&quot;|&#39;|&amp;|&lt;|&gt;/g, '')
    expect((withoutEntities.match(/"/g) ?? []).length).toBe(2)
    // The attacker's quotes survive only as escaped entities.
    expect(tag).toContain('&quot;')
  })

  it('escapes angle brackets so raw script tags cannot be injected', () => {
    const html = renderMarkdown('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes quotes in plain text (not just angle brackets)', () => {
    const html = renderMarkdown('he said "hi" and it\'s fine')
    expect(html).toContain('&quot;')
    expect(html).toContain('&#39;')
  })

  it('still renders safe http links normally', () => {
    const html = renderMarkdown('[docs](https://example.com)')
    expect(html).toContain('<a href="https://example.com">docs</a>')
  })

  it('still renders relative links', () => {
    const html = renderMarkdown('[home](/c)')
    expect(html).toContain('<a href="/c">home</a>')
  })

  it('still renders bold, italic, inline code, headings, quotes, lists, code blocks', () => {
    expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>')
    expect(renderMarkdown('*it*')).toContain('<em>it</em>')
    expect(renderMarkdown('`c`')).toContain('<code>c</code>')
    expect(renderMarkdown('# Title')).toContain('<h2>Title</h2>')
    expect(renderMarkdown('## Sub')).toContain('<h3>Sub</h3>')
    expect(renderMarkdown('> quote')).toContain('<blockquote>quote</blockquote>')
    expect(renderMarkdown('- item')).toContain('<li>item</li>')
    expect(renderMarkdown('```\ncode\n```')).toContain('<pre><code>')
  })

  it('escapes HTML inside code blocks', () => {
    const html = renderMarkdown('```\n<img src=x onerror=alert(1)>\n```')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })
})
