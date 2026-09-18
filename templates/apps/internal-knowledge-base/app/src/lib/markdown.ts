/**
 * Minimal markdown → HTML conversion. Not a full CommonMark renderer —
 * just enough to render the basic blocks the editor actually emits
 * (headings, paragraphs, bullets/numbered lists, fenced code, blockquote,
 * inline emphasis, inline code, links, images, horizontal rule). The full
 * pipeline lives behind `@molecule/app-markdown` for richer syntax;
 * this is what ships in the editor save path so freshly-saved articles
 * render legibly without bonding a heavier markdown provider.
 *
 * Outputs HTML that is *escaped first* and then has block / inline
 * markers reinjected as tags, so user content cannot break out into
 * arbitrary HTML.
 */

const ESCAPE_RE = /[&<>"']/g
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(s: string): string {
  return s.replace(ESCAPE_RE, (c) => ESCAPE_MAP[c] ?? c)
}

function inline(text: string): string {
  let out = escapeHtml(text)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" />')
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  return out
}

export function renderMarkdown(md: string): string {
  if (!md) return ''
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const html: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''

    if (line.startsWith('```')) {
      const buf: string[] = []
      i += 1
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        buf.push(lines[i] ?? '')
        i += 1
      }
      i += 1
      html.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`)
      continue
    }

    if (/^---+\s*$/.test(line)) {
      html.push('<hr />')
      i += 1
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1]?.length ?? 1
      const text = heading[2] ?? ''
      const slug = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      html.push(`<h${level} id="${slug}">${inline(text)}</h${level}>`)
      i += 1
      continue
    }

    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        buf.push((lines[i] ?? '').replace(/^>\s?/, ''))
        i += 1
      }
      html.push(`<blockquote><p>${inline(buf.join(' '))}</p></blockquote>`)
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? '')) {
        buf.push((lines[i] ?? '').replace(/^\s*[-*]\s+/, ''))
        i += 1
      }
      html.push(`<ul>${buf.map((b) => `<li>${inline(b)}</li>`).join('')}</ul>`)
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? '')) {
        buf.push((lines[i] ?? '').replace(/^\s*\d+\.\s+/, ''))
        i += 1
      }
      html.push(`<ol>${buf.map((b) => `<li>${inline(b)}</li>`).join('')}</ol>`)
      continue
    }

    if (line.trim() === '') {
      i += 1
      continue
    }

    // Paragraph: gather contiguous non-empty lines that aren't a block start
    const buf: string[] = []
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() !== '' &&
      !/^(#{1,6}\s+|>\s?|\s*[-*]\s+|\s*\d+\.\s+|```|---+\s*$)/.test(lines[i] ?? '')
    ) {
      buf.push(lines[i] ?? '')
      i += 1
    }
    html.push(`<p>${inline(buf.join(' '))}</p>`)
  }
  return html.join('\n')
}

/**
 * Extract a flat list of headings (H1/H2/H3 only — same level cap as the
 * sticky table-of-contents in `ArticleView`).
 */
export function extractToc(md: string): { id: string; label: string; level: 1 | 2 | 3 }[] {
  if (!md) return []
  const out: { id: string; label: string; level: 1 | 2 | 3 }[] = []
  for (const line of md.split('\n')) {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (!heading) continue
    const level = heading[1]?.length as 1 | 2 | 3
    const label = heading[2] ?? ''
    const id = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    out.push({ id, label, level })
  }
  return out
}

/**
 * First non-heading paragraph, trimmed and length-capped, used as the
 * excerpt in list views when the API row doesn't carry one.
 */
export function extractExcerpt(md: string, max = 240): string {
  if (!md) return ''
  for (const line of md.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('#')) continue
    if (trimmed.startsWith('```')) continue
    if (trimmed.length <= max) return trimmed
    return `${trimmed.slice(0, max)}…`
  }
  return ''
}
