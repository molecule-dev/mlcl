/**
 * App i18n bond setup.
 *
 * Uses @molecule/app-i18n-default-react to wire the i18n provider with:
 *  - Your app's English UI strings (enUi)
 *  - A per-locale lazy loader for non-English UI strings (lazyLoadUi)
 *  - Companion locale bonds for every @molecule/app-* package this app depends on
 *
 * Locale bonds are per-feature packages (e.g. @molecule/app-locales-auth,
 * @molecule/app-locales-forms) — NOT per-language. Each companion bond ships
 * translations for all 79 supported languages automatically. There are no
 * @molecule/app-locales-en / -es / -fr packages.
 *
 * After adding or removing any @molecule/app-* dependency, re-run:
 *   node scripts/wire-app-locale-bonds.mjs
 * to refresh the packageLocales list below.
 */

import { setupI18nDefault } from '@molecule/app-i18n-default-react'
import * as authLocales from '@molecule/app-locales-auth'
import * as formsLocales from '@molecule/app-locales-forms'
import * as httpLocales from '@molecule/app-locales-http'
import * as i18nLocales from '@molecule/app-locales-i18n'
import * as iconsLocales from '@molecule/app-locales-icons'
import * as reactLocales from '@molecule/app-locales-react'
import * as routingLocales from '@molecule/app-locales-routing'
import * as storageLocales from '@molecule/app-locales-storage'
import * as uiLocales from '@molecule/app-locales-ui'
import * as utilitiesLocales from '@molecule/app-locales-utilities'
import * as versionLocales from '@molecule/app-locales-version'

import { ui as en } from '../locales/en/ui.js'

// Vite code-splits each locale chunk — the template literal must stay here.
const lazyLoadUi = (code: string): Promise<Record<string, string>> =>
  import(`../locales/${code}/ui.ts`).then((m: { ui: Record<string, string> }) => m.ui)

export const i18nProvider = setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [
    authLocales,
    formsLocales,
    httpLocales,
    i18nLocales,
    iconsLocales,
    reactLocales,
    routingLocales,
    storageLocales,
    uiLocales,
    utilitiesLocales,
    versionLocales,
  ],
})
