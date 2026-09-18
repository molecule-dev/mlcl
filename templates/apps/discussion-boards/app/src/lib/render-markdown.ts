/**
 * Minimal, XSS-safe markdown → HTML renderer for the compose preview.
 *
 * SECURITY: the output of this function is fed to `dangerouslySetInnerHTML`,
 * so every code path that emits HTML must neutralize user input:
 *
 * - {@link escapeHtml} escapes `& < > " '` so user text can never open a tag,
 *   break out of an attribute, or inject an event handler.
 * - {@link sanitizeHref} allows only http(s)/mailto and relative URLs
 *   (`/`, `#`, or a bare path with no scheme); `javascript:`, `data:`,
 *   `vbscript:`, etc. are rejected so a link can never execute script.
 *
 * Kept as a pure, framework-free module so it can be unit-tested directly
 * (see `render-markdown.test.ts`) without mounting React.
 */

/** Escape the five HTML-significant characters for both text and attribute contexts. */
export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * Validate a markdown link target. Returns a safe, attribute-escaped href, or
 * `null` if the scheme is not allowed (caller should render the raw text
 * instead of a link). Allowed: http(s), mailto, and relative URLs (`/`, `#`,
 * or no scheme). Rejected: `javascript:`, `data:`, `vbscript:`, and any other
 * scheme.
 */
export const sanitizeHref = (rawUrl: string): string | null => {
  const url = rawUrl.trim()
  if (!url) return null
  // Relative URLs (path, anchor, query) have no scheme and are safe.
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('?')) {
    return escapeHtml(url)
  }
  // A scheme is `scheme:` at the very start. Control chars (incl. tabs/newlines
  // browsers strip from `javascript:` payloads) are not valid scheme chars, so
  // a string containing them before the `:` is not a recognized safe scheme.
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url)
  if (!schemeMatch) {
    // No scheme at all → treat as a relative URL.
    return escapeHtml(url)
  }
  const scheme = schemeMatch[1]!.toLowerCase()
  const allowed = new Set(['http', 'https', 'mailto'])
  if (!allowed.has(scheme)) return null
  return escapeHtml(url)
}

/** Render a single line of inline markdown (bold/italic/code/links) to safe HTML. */
const renderInline = (raw: string): string =>
  escapeHtml(raw)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text: string, url: string) => {
      // `text` and `url` are slices of the already-escaped line; unescape the
      // url before scheme-validation, then re-escape for the attribute context.
      const decoded = url
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
      const safeHref = sanitizeHref(decoded)
      // Rejected scheme → drop the link, keep the (already-escaped) link text.
      if (safeHref === null) return text
      return `<a href="${safeHref}">${text}</a>`
    })

export const renderMarkdown = (md: string): string => {
  if (!md) return ''
  const lines = md.split(/\n/)
  const out: string[] = []
  let inCode = false
  for (const raw of lines) {
    if (raw.startsWith('```')) {
      out.push(inCode ? '</code></pre>' : '<pre><code>')
      inCode = !inCode
      continue
    }
    if (inCode) {
      out.push(escapeHtml(raw))
      continue
    }
    if (raw.startsWith('# ')) out.push(`<h2>${escapeHtml(raw.slice(2))}</h2>`)
    else if (raw.startsWith('## ')) out.push(`<h3>${escapeHtml(raw.slice(3))}</h3>`)
    else if (raw.startsWith('> ')) out.push(`<blockquote>${escapeHtml(raw.slice(2))}</blockquote>`)
    else if (raw.startsWith('- ')) out.push(`<li>${escapeHtml(raw.slice(2))}</li>`)
    else if (raw.trim().length === 0) out.push('')
    else out.push(`<p>${renderInline(raw)}</p>`)
  }
  return out.join('\n')
}
