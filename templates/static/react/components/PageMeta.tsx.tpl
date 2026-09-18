import { useEffect } from 'react'

import { APP_NAME } from '../branding.js'

/** What a page says about itself: its `<title>` and description. */
export interface PageMetaValues {
  title: string
  description: string
}

let current: PageMetaValues = { title: '', description: '' }

/**
 * The metadata of the page that rendered last. The build entry reads it right
 * after `renderToStaticMarkup`, so it lands in each page's `<head>`; the
 * browser gets it through the effect below.
 *
 * @returns Title and description, empty strings when no page set them.
 */
export function readPageMeta(): PageMetaValues {
  return current
}

/** Clears the last page's metadata — the build entry calls it before each render. */
export function resetPageMeta(): void {
  current = { title: '', description: '' }
}

/**
 * Declares a page's title and description. Render it once per page. At build
 * time the prerender writes both into the static HTML; in the browser they
 * update `document.title` and the description meta on navigation.
 */
export function PageMeta({ title, description }: PageMetaValues) {
  current = { title, description }
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
    const meta = document.querySelector('meta[name="description"]')
    if (meta && description) meta.setAttribute('content', description)
  }, [title, description])
  return null
}
