/**
 * Server-side HTML sanitizer — the trust-boundary floor for any
 * user-supplied `body_html` we persist and later render via
 * `dangerouslySetInnerHTML`.
 *
 * Rich-text editors POST an HTML string, but a malicious client can POST
 * arbitrary markup straight to the API (bypassing the editor's escaping),
 * so we MUST scrub it before storage — never trust client HTML verbatim.
 * Stored XSS is the classic failure here: one poisoned article runs
 * script in every teammate's browser that opens it.
 *
 * This is a conservative, dependency-free floor (same shape as
 * `@molecule/api-oembed`'s sanitizer): it removes the executable element
 * types plus event-handler and dangerous-URL vectors, and leaves benign
 * formatting alone. The client render path adds a DOMPurify backstop
 * (`SafeHtml`), so the two layers cover each other — defense in depth.
 * The floor matches plain-text attack shapes; entity/encoding tricks are
 * caught by the DOMPurify ceiling at render time.
 */

/** Code-bearing elements: drop the tag AND its contents. */
const BLOCK_ELEMENTS = ['script', 'style', 'noscript', 'template', 'xmp']

/**
 * Structurally dangerous elements: drop the tag (open + close), keeping
 * any inner text. These can frame, embed, redirect, or carry script.
 */
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

/**
 * Strip XSS vectors from a user-supplied HTML string before it is
 * persisted or rendered.
 *
 * Removes:
 * - `<script>` / `<style>` / `<noscript>` / `<template>` / `<xmp>` blocks
 *   (tag + contents).
 * - `<iframe>` / `<object>` / `<embed>` / `<svg>` / `<form>` (and other
 *   frame/embed) tags — open and close — keeping inner text.
 * - `on*=` event-handler attributes (any quoting style).
 * - `javascript:` / `vbscript:` URLs, and script-capable `data:` URLs
 *   (`data:text/html`, `data:image/svg+xml`, `data:application/*`), in any
 *   URL-bearing attribute. Raster `data:image/png|jpeg|gif|webp|avif` URLs
 *   are preserved.
 *
 * @param html - Raw, untrusted HTML.
 * @returns Sanitized HTML safe to store and render.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return ''
  let out = html

  // 1. Drop code-bearing blocks, tag + contents (paired, then orphans).
  for (const tag of BLOCK_ELEMENTS) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), '')
    out = out.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi'), '')
  }

  // 2. Drop dangerous structural element tags (open + close), keep inner text.
  for (const tag of STRIP_TAGS) {
    out = out.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi'), '')
  }

  // 3. Strip on*= event-handler attributes. Three quoting variants.
  out = out.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
  out = out.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
  out = out.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '')

  // 4. Neutralize javascript:/vbscript: URLs in URL-bearing attributes.
  const schemeAttr = new RegExp(
    `(\\s(?:${URL_ATTRS})\\s*=\\s*)(["']?)\\s*(?:javascript|vbscript)\\s*:[^"'>\\s]*`,
    'gi',
  )
  out = out.replace(schemeAttr, (_m, prefix: string, quote: string) => `${prefix}${quote}#`)

  // 5. Neutralize script-capable data: URLs (keep raster image data URLs).
  const dataAttr = new RegExp(
    `(\\s(?:${URL_ATTRS})\\s*=\\s*)(["']?)\\s*data\\s*:\\s*(?:text/html|image/svg\\+xml|application/[^;,"'>\\s]+)[^"'>\\s]*`,
    'gi',
  )
  out = out.replace(dataAttr, (_m, prefix: string, quote: string) => `${prefix}${quote}#`)

  return out
}
