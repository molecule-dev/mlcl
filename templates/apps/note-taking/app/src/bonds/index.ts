import { setupAllDefaultBonds } from '@molecule/app-bonds-default-react'

import { setupAppAiCopilotDefault } from './app-ai-copilot-default.js'
import { setupAppAnalytics } from './app-analytics.js'
import { setupAppCommandPaletteCmdk } from './app-command-palette-cmdk.js'
import { setupAppDragDropDndkit } from './app-drag-drop-dndkit.js'
import { setupAppFileUploadFilepond } from './app-file-upload-filepond.js'
import { setupAppKeyboardShortcutsHotkeys } from './app-keyboard-shortcuts-hotkeys.js'
import { setupAppMarkdownReactMarkdown } from './app-markdown-react-markdown.js'
import { setupAppRealtimeSocketio } from './app-realtime-socketio.js'
import { setupAppRichTextQuill } from './app-rich-text-quill.js'
import { setupAppThemeCssVariables } from './app-theme-css-variables.js'
import { setupAppTreeViewDefault } from './app-tree-view-default.js'
import { setupAppVirtualScrollTanstack } from './app-virtual-scroll-tanstack.js'
import { authClient, setupAuthDefault } from './auth-default.js'
import { setupHttpDefault } from './http-default.js'
import { i18nProvider } from './i18n-default.js'

export { themeProvider } from './app-theme-css-variables.js'
export { authClient, i18nProvider }

/**
 * Initialize all providers.
 * Call this during application startup, before mounting the app.
 */
export async function setupProviders(): Promise<void> {
  setupAllDefaultBonds()
  setupAppThemeCssVariables()
  setupAppAiCopilotDefault()
  await setupAppCommandPaletteCmdk()
  await setupAppDragDropDndkit()
  setupAppFileUploadFilepond()
  await setupAppKeyboardShortcutsHotkeys()
  setupAppMarkdownReactMarkdown()
  await setupAppRealtimeSocketio()
  setupAppRichTextQuill()
  setupAppTreeViewDefault()
  await setupAppVirtualScrollTanstack()
  setupAuthDefault()
  setupHttpDefault()
  // Analytics: env-driven (VITE_POSTHOG_KEY) + auto-tracked auth/route/http
  // events. Silent no-op when no key is configured — never breaks the app.
  setupAppAnalytics()
}
