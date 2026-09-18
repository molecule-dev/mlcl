/**
 * SitemapXml bond setup
 *
 * Wires @molecule/api-sitemap-xml to @molecule/api-sitemap
 */

import { setProvider } from '@molecule/api-sitemap'
import { provider } from '@molecule/api-sitemap-xml'

export function setupSitemapXml(): void {
  setProvider(provider)
}
