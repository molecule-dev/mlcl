---
name: security
description: Security must-dos when handling user-supplied content. READ THIS before rendering any user-authored HTML / rich text, before storing a *_html field, or whenever you reach for dangerouslySetInnerHTML.
---

# Security

## Rendering user-supplied HTML is stored XSS unless you sanitize it

Any HTML a user authors — post bodies, comments, rich-text fields,
contract or email templates, anything that round-trips through the API and is
later shown to **other** users — is a **stored cross-site-scripting (XSS)**
vector the moment it is dropped into the DOM with React's
`dangerouslySetInnerHTML`. A malicious client can POST raw markup straight to
the API (bypassing whatever escaping the editor does), and it then runs in
**every** viewer's browser: `<script>`, `<img src=x onerror=...>`,
`<a href="javascript:...">`, SVG/`<iframe>` payloads, and so on.

A zod `.max(...)` length cap is **NOT** sanitization — it limits size, it does
not strip a single tag. Storing client HTML verbatim and rendering it is the
single most common critical bug in user-generated-content apps.

**The rule:** any path that renders user-supplied HTML must go through BOTH
layers below (defense in depth — each covers the other if one is bypassed):

### Layer 1 — sanitize on persist (API, mandatory, no new dependency)

Before you store a `*_html` field, run it through a server-side sanitizer in
the create AND update handler. Create `api/src/lib/sanitize-html.ts` (this is a
dependency-free regex floor — no jsdom/library needed on the API):

```typescript
// api/src/lib/sanitize-html.ts
/** Code-bearing elements: drop the tag AND its contents. */
const BLOCK_ELEMENTS = ['script', 'style', 'noscript', 'template', 'xmp']

/** Structurally dangerous elements: drop the tag, keep inner text. */
const STRIP_TAGS = [
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'form',
  'svg',
  'math',
  'frame',
  'frameset',
  'applet',
]

/** URL-bearing attributes whose values can smuggle a dangerous scheme. */
const URL_ATTRS = 'href|src|xlink:href|action|formaction|background|poster|data'

/** Strip XSS vectors from untrusted HTML before persisting or rendering. */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  let out = html

  // 1. Drop code-bearing blocks (tag + contents), then any orphan tags.
  for (const tag of BLOCK_ELEMENTS) {
    out = out.replace(new RegExp('<' + tag + '\\b[^>]*>[\\s\\S]*?</' + tag + '\\s*>', 'gi'), '')
    out = out.replace(new RegExp('</?' + tag + '\\b[^>]*>', 'gi'), '')
  }

  // 2. Drop dangerous structural tags (open + close), keep inner text.
  for (const tag of STRIP_TAGS) {
    out = out.replace(new RegExp('</?' + tag + '\\b[^>]*>', 'gi'), '')
  }

  // 3. Strip on*= event-handler attributes (three quoting variants).
  out = out.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
  out = out.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
  out = out.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '')

  // 4. Neutralize javascript:/vbscript: URLs in URL-bearing attributes.
  const schemeAttr = new RegExp(
    '(\\s(?:' + URL_ATTRS + ')\\s*=\\s*)(["\']?)\\s*(?:javascript|vbscript)\\s*:[^"\'>\\s]*',
    'gi',
  )
  out = out.replace(schemeAttr, (_m, prefix, quote) => prefix + quote + '#')

  // 5. Neutralize script-capable data: URLs (raster image data URLs are kept).
  const dataAttr = new RegExp(
    '(\\s(?:' +
      URL_ATTRS +
      ')\\s*=\\s*)(["\']?)\\s*data\\s*:\\s*(?:text/html|image/svg\\+xml|application/[^;,"\'>\\s]+)[^"\'>\\s]*',
    'gi',
  )
  out = out.replace(dataAttr, (_m, prefix, quote) => prefix + quote + '#')

  return out
}
```

Call it in the handler before every write of an HTML field:

```typescript
// api/src/handlers/notes.ts
import { sanitizeHtml } from '../lib/sanitize-html.js'

// on create:
const created = await create('notes', {
  user_id: userId,
  title: parsed.data.title,
  body_html: sanitizeHtml(parsed.data.body_html ?? ''),
})

// on update — sanitize the field if it is present in the patch:
if (typeof updates.body_html === 'string') {
  updates.body_html = sanitizeHtml(updates.body_html)
}
```

### Layer 2 — render only through a shared SafeHtml primitive (App)

There must be **exactly one** sanctioned place in the whole app that calls
`dangerouslySetInnerHTML`: a shared `SafeHtml` component that runs the markup
through DOMPurify first (in the real DOM, so even mutation-XSS and
entity-encoded tricks are neutralized). Create
`app/src/components/SafeHtml.tsx`:

```tsx
// app/src/components/SafeHtml.tsx
import DOMPurify from 'dompurify'
import { type CSSProperties, type ElementType, useMemo } from 'react'

export interface SafeHtmlProps {
  /** Raw, untrusted HTML to render. */
  html: string
  /** Element tag to render as. Defaults to `div`. */
  as?: ElementType
  className?: string
  style?: CSSProperties
}

/**
 * The ONLY sanctioned dangerouslySetInnerHTML sink. Runs untrusted HTML
 * through DOMPurify, stripping <script>, on*= handlers, javascript:/data:
 * URLs, and every other known vector — in the real DOM.
 */
export function SafeHtml({ html, as = 'div', className, style }: SafeHtmlProps) {
  const Tag = as
  const clean = useMemo(() => {
    // DOMPurify needs a DOM; in any non-browser context return nothing
    // rather than emit unsanitized markup (fail safe).
    if (typeof window === 'undefined') return ''
    return DOMPurify.sanitize(html ?? '')
  }, [html])

  return (
    <Tag
      className={className}
      style={style}
      // Sanctioned sink: `clean` is DOMPurify-sanitized above.
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}

export default SafeHtml
```

Render with it — never call `dangerouslySetInnerHTML` anywhere else:

```tsx
import { SafeHtml } from '../components/SafeHtml.js'
// ...
;<SafeHtml html={note.body_html} className={cm.cn('prose')} />
```

`DOMPurify` is the `dompurify` package. If it is not already in the project,
add it to `app/package.json` (exact-pinned). The Layer-1 server floor needs no
dependency and is the mandatory minimum even if you skip the render backstop.

### Prefer not rendering HTML at all

If the content is plain text or markdown, render it as **text** — `{value}` in
JSX is auto-escaped by React and is safe by construction. Only reach for HTML
rendering when rich text is a genuine product requirement. Markdown should be
converted to HTML and then passed through `SafeHtml` (never rendered raw).

### Optional backstop — Content-Security-Policy

As a third, app-wide layer you can set a strict `Content-Security-Policy`
response header from the API (e.g. `default-src 'self'; script-src 'self'`),
which blocks inline scripts and event-handler execution even if a sink is
missed. This is a backstop, not a substitute for Layers 1 + 2.

## Rule of thumb

- Wrote `dangerouslySetInnerHTML` outside the single `SafeHtml` component? **Bug.**
- Stored a `*_html` / rich-text field without `sanitizeHtml(...)` on the API write path? **Bug.**
- A `.max(...)` cap is your only "protection" on user HTML? **Bug** — that's a length limit, not sanitization.
