/// <reference types="vite/client" />

/**
 * The site's posts, read from `content/posts/*.md` by ../vite-content-plugin.ts
 * at build time (and live in the dev server). Import it through src/content.ts.
 */
declare module 'virtual:site-content' {
  import type { SiteContent } from '../vite-content-plugin.js'

  const content: SiteContent
  export default content
}
