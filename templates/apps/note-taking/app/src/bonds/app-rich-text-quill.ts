/**
 * AppRichTextQuill bond setup
 *
 * Wires @molecule/app-rich-text-quill to @molecule/app-rich-text
 */

import { setProvider } from '@molecule/app-rich-text'
import { provider } from '@molecule/app-rich-text-quill'

export function setupAppRichTextQuill(): void {
  setProvider(provider)
}
