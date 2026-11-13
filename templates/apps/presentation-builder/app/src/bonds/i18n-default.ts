/**
 * Default i18n bond setup
 *
 * Uses setupI18nDefault from @molecule/app-i18n-default-react. English comes from the app's own
 * locales/en/ui.ts; every other language loads when the app switches to it, from the app's
 * locales/<code>/ui.ts and from each companion locale bond the app installs, listed below.
 * `mlcl add <package> --inject` (or `mlcl inject`) rewrites this file with the new list.
 * Swap to a different i18n provider by replacing this bond.
 */

import { setupI18nDefault as setupI18nProvider } from '@molecule/app-i18n-default-react'
import { loadLocaleModule as aiChatLocales } from '@molecule/app-locales-ai-chat/loader.js'
import { loadLocaleModule as authLocales } from '@molecule/app-locales-auth/loader.js'
import { loadLocaleModule as authShellLocales } from '@molecule/app-locales-auth-shell/loader.js'
import { loadLocaleModule as billingLocales } from '@molecule/app-locales-billing/loader.js'
import { loadLocaleModule as codeEditorLocales } from '@molecule/app-locales-code-editor/loader.js'
import { loadLocaleModule as footerLocales } from '@molecule/app-locales-footer/loader.js'
import { loadLocaleModule as formsLocales } from '@molecule/app-locales-forms/loader.js'
import { loadLocaleModule as httpLocales } from '@molecule/app-locales-http/loader.js'
import { loadLocaleModule as i18nLocales } from '@molecule/app-locales-i18n/loader.js'
import { loadLocaleModule as iconsLocales } from '@molecule/app-locales-icons/loader.js'
import { loadLocaleModule as ideLocales } from '@molecule/app-locales-ide/loader.js'
import { loadLocaleModule as lifecycleLocales } from '@molecule/app-locales-lifecycle/loader.js'
import { loadLocaleModule as livePreviewLocales } from '@molecule/app-locales-live-preview/loader.js'
import { loadLocaleModule as oauthButtonsLocales } from '@molecule/app-locales-oauth-buttons/loader.js'
import { loadLocaleModule as pushLocales } from '@molecule/app-locales-push/loader.js'
import { loadLocaleModule as reactLocales } from '@molecule/app-locales-react/loader.js'
import { loadLocaleModule as routingLocales } from '@molecule/app-locales-routing/loader.js'
import { loadLocaleModule as settingsPanelLocales } from '@molecule/app-locales-settings-panel/loader.js'
import { loadLocaleModule as storageLocales } from '@molecule/app-locales-storage/loader.js'
import { loadLocaleModule as uiLocales } from '@molecule/app-locales-ui/loader.js'
import { loadLocaleModule as utilitiesLocales } from '@molecule/app-locales-utilities/loader.js'
import { loadLocaleModule as versionLocales } from '@molecule/app-locales-version/loader.js'

import { ui as en } from '../locales/en/ui.js'

const lazyLoadUi = (code: string): Promise<Record<string, string>> =>
  import(`../locales/${code}/ui.ts`).then((m: { ui: Record<string, string> }) => m.ui)

export const i18nProvider = setupI18nProvider({
  enUi: en,
  lazyLoadUi,
  packageLocaleLoaders: [
    aiChatLocales,
    authLocales,
    authShellLocales,
    billingLocales,
    codeEditorLocales,
    footerLocales,
    formsLocales,
    httpLocales,
    i18nLocales,
    iconsLocales,
    ideLocales,
    lifecycleLocales,
    livePreviewLocales,
    oauthButtonsLocales,
    pushLocales,
    reactLocales,
    routingLocales,
    settingsPanelLocales,
    storageLocales,
    uiLocales,
    utilitiesLocales,
    versionLocales,
  ],
})

/**
 * Called from bonds/index.ts. `setupI18nProvider` above already bonded the provider, loads each
 * companion locale bond's language when the app switches to it, and persists the choice.
 */
export function setupI18nDefault(): void {
  // Nothing left to wire: see the provider above.
}
