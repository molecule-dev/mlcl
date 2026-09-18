import DOMPurify from 'dompurify'
import { type CSSProperties, type ElementType, useMemo } from 'react'

/**
 * Render an untrusted HTML string safely.
 *
 * Any user-authored HTML (article bodies, comments, anything that round-trips
 * through the API and is shown to *other* users) is a stored-XSS vector when
 * dropped into the DOM with `dangerouslySetInnerHTML`. `SafeHtml` is the one
 * sanctioned place that calls `dangerouslySetInnerHTML`: it runs the markup
 * through DOMPurify first, stripping `<script>`, `on*=` handlers,
 * `javascript:`/`data:` URLs, and every other known vector — in the real DOM,
 * so even mutation-XSS and entity-encoded tricks are neutralized.
 *
 * This is the render-time backstop; the API also sanitizes on write. The two
 * layers cover each other (defense in depth) so a future code path that stores
 * HTML without going through the sanitizing handler still renders safely.
 */
export interface SafeHtmlProps {
  /** Raw, untrusted HTML to render. */
  html: string
  /** Element tag to render as. Defaults to `div`. */
  as?: ElementType
  /** Class names applied to the wrapper element. */
  className?: string
  /** Inline styles applied to the wrapper element. */
  style?: CSSProperties
}

export function SafeHtml({ html, as = 'div', className, style }: SafeHtmlProps) {
  // PascalCase local so the dynamic tag can be used as a JSX element.
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
