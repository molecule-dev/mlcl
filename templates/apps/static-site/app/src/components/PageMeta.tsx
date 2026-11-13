import { createContext, useContext, useEffect } from 'react'

import { APP_NAME } from '../branding.js'

/** What a page says about itself: its `<title>` and description. */
export interface PageMetaValues {
  title: string
  description: string
}

/**
 * The metadata sink for one server render. Each render owns its value, so
 * concurrent lazy pages cannot overwrite another request's title or description.
 * The browser updates its document through the effect below.
 */
export const PageMetaContext = createContext<PageMetaValues | null>(null)

/**
 * Declares a page's title and description. Render it once per page. At build
 * time the prerender writes both into the static HTML; in the browser they
 * update `document.title` and the description meta on navigation.
 */
export function PageMeta({ title, description }: PageMetaValues) {
  const meta = useContext(PageMetaContext)
  if (meta) {
    meta.title = title
    meta.description = description
  }
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME
    const meta = document.querySelector('meta[name="description"]')
    if (meta && description) meta.setAttribute('content', description)
  }, [title, description])
  return null
}
