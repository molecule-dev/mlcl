/**
 * TemplatingHandlebars bond setup
 *
 * Wires @molecule/api-templating-handlebars to @molecule/api-templating
 */

import { setProvider } from '@molecule/api-templating'
import { provider } from '@molecule/api-templating-handlebars'

export function setupTemplatingHandlebars(): void {
  setProvider(provider)
}
