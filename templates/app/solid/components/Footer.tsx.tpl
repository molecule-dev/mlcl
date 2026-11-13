import { A } from '@solidjs/router'
import { createSignal, For, Show } from 'solid-js'

import { createI18n, createVersion } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Modal } from '@molecule/app-ui-solid'

import { APP_NAME } from '../branding.js'
import { Icon } from '../components/Icon.js'
import { loadContent } from '../config.js'

/**
 * HTML-escapes an interpolation value before it enters a translation whose
 * result is rendered as HTML (`innerHTML`). Text children are safe by
 * construction, but values interpolated into HTML strings are not — an
 * `appName` containing markup would otherwise execute inside the legal
 * content.
 */
const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/**
 * App-shell footer — About link, Privacy/Terms modals, language picker, version.
 *
 * Privacy/Terms HTML is loaded lazily through the `loadContent` callback of
 * the app's config, then rendered from the bonded i18n catalog
 * (`content.privacyPolicy`, `content.termsOfService`). Those keys are EMPTY
 * by default (the app supplies its real legal HTML); until it does, the
 * modal shows a clear `footer.legalNotConfigured` placeholder rather than a
 * silently-blank modal.
 */
export function Footer() {
  const cm = getClassMap()
  const { t, locale, setLocale, getLocales } = createI18n()
  const { state: versionState } = createVersion()
  const [privacyOpen, setPrivacyOpen] = createSignal(false)
  const [termsOpen, setTermsOpen] = createSignal(false)
  const [languageOpen, setLanguageOpen] = createSignal(false)

  const locales = () => getLocales().sort((a, b) => a.name.localeCompare(b.name))

  const version = () =>
    t(
      'footer.version',
      { version: versionState().version || '1.0.0' },
      { defaultValue: 'v{{version}}' },
    )

  const aboutLabel = () =>
    t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })

  const legalNotConfigured = () =>
    t('footer.legalNotConfigured', undefined, {
      defaultValue: 'This content has not been configured yet. The app owner must provide it.',
    })

  const openPrivacy = async (): Promise<void> => {
    await loadContent('privacyPolicy')
    setPrivacyOpen(true)
  }

  const openTerms = async (): Promise<void> => {
    await loadContent('termsOfService')
    setTermsOpen(true)
  }

  return (
    <>
      {/* `<footer>` (contentinfo landmark), not a bare <section> — axe's
          `region` rule requires all page content inside landmarks, and
          screen-reader users jump to the footer by landmark. */}
      <footer class={cm.footerBar}>
        <A href="/about" class={cm.footerLink}>
          {aboutLabel()}
        </A>
        <button type="button" onClick={openPrivacy} class={cm.footerButton}>
          {t('footer.privacyPolicy', undefined, { defaultValue: 'Privacy Policy' })}
        </button>
        <button type="button" onClick={openTerms} class={cm.footerButton}>
          {t('footer.termsOfService', undefined, { defaultValue: 'Terms of Service' })}
        </button>
        <button
          type="button"
          onClick={() => setLanguageOpen(true)}
          class={cm.footerButton}
          aria-label={t('footer.language', undefined, { defaultValue: 'Language' })}
        >
          <Icon name="globe" size={14} /> {locales().find((l) => l.code === locale())?.name}
        </button>
        <span class={cm.footerLink}>{version()}</span>
      </footer>
      <Modal
        open={privacyOpen()}
        onClose={() => setPrivacyOpen(false)}
        title={t('footer.privacyPolicy', undefined, { defaultValue: 'Privacy Policy' })}
        size="lg"
      >
        <Show
          when={t(
            'content.privacyPolicy',
            { appName: escapeHtml(APP_NAME) },
            { defaultValue: '' },
          ).trim()}
          fallback={<p class={cm.prose}>{legalNotConfigured()}</p>}
        >
          <div
            class={cm.prose}
            innerHTML={t(
              'content.privacyPolicy',
              { appName: escapeHtml(APP_NAME) },
              { defaultValue: '' },
            )}
          />
        </Show>
      </Modal>
      <Modal
        open={termsOpen()}
        onClose={() => setTermsOpen(false)}
        title={t('footer.termsOfService', undefined, { defaultValue: 'Terms of Service' })}
        size="lg"
      >
        <Show
          when={t(
            'content.termsOfService',
            { appName: escapeHtml(APP_NAME) },
            { defaultValue: '' },
          ).trim()}
          fallback={<p class={cm.prose}>{legalNotConfigured()}</p>}
        >
          <div
            class={cm.prose}
            innerHTML={t(
              'content.termsOfService',
              { appName: escapeHtml(APP_NAME) },
              { defaultValue: '' },
            )}
          />
        </Show>
      </Modal>
      <Modal
        open={languageOpen()}
        onClose={() => setLanguageOpen(false)}
        title={t('footer.language', undefined, { defaultValue: 'Language' })}
        size="lg"
      >
        <div class={cm.languageGrid}>
          <For each={locales()}>
            {(l) => (
              <button
                type="button"
                onClick={async () => {
                  await setLocale(l.code)
                  setLanguageOpen(false)
                }}
                class={l.code === locale() ? cm.languageActive : cm.languageOption}
              >
                {l.name}
              </button>
            )}
          </For>
        </div>
      </Modal>
    </>
  )
}
