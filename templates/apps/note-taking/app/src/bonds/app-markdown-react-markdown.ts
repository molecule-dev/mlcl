/**
 * AppMarkdownReactMarkdown bond setup
 *
 * Wires @molecule/app-markdown-react-markdown to @molecule/app-markdown
 */

import { setProvider } from '@molecule/app-markdown'
import { provider } from '@molecule/app-markdown-react-markdown'

export function setupAppMarkdownReactMarkdown(): void {
  setProvider(provider)
}
