/**
 * AppMarkdownMarked bond setup
 *
 * Wires @molecule/app-markdown-marked to @molecule/app-markdown
 */

import { setProvider } from '@molecule/app-markdown'
import { provider } from '@molecule/app-markdown-marked'

export function setupAppMarkdownMarked(): void {
  setProvider(provider)
}
