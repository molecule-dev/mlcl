import { createSignal } from 'solid-js'
import { A } from '@solidjs/router'
import { createVersion, createI18nFromProvider } from '@molecule/app-solid'
import { Modal } from '@molecule/app-ui-solid'
import { getClassMap } from '@molecule/app-ui'
import { getProvider } from '@molecule/app-i18n'
import { Icon } from '../components/Icon.js'
import { loadContent } from '../config.js'
import { APP_NAME } from '../branding.js'

export function Footer() {
  const cm = getClassMap()
  const { t, locale, setLocale, getLocales } = createI18nFromProvider(getProvider()!)
  const { state: versionState } = createVersion()
  const [privacyOpen, setPrivacyOpen] = createSignal(false)
  const [termsOpen, setTermsOpen] = createSignal(false)
  const [languageOpen, setLanguageOpen] = createSignal(false)

  const locales = () => getLocales().sort((a, b) => a.name.localeCompare(b.name))

  const version = () => {
    const v = versionState().version
    return v ? `v${v}` : 'v1.0.0'
  }

  const openPrivacy = async () => {
    await loadContent('privacyPolicy')
    setPrivacyOpen(true)
  }

  const openTerms = async () => {
    await loadContent('termsOfService')
    setTermsOpen(true)
  }

  return (
    <>
      <section class={cm.footerBar}>
        <A href="/about" class={cm.footerLink}>
          {t('footer.about', { appName: APP_NAME })}
        </A>
        <button
          type="button"
          onClick={openPrivacy}
          class={cm.footerButton}
        >
          {t('footer.privacyPolicy')}
        </button>
        <button
          type="button"
          onClick={openTerms}
          class={cm.footerButton}
        >
          {t('footer.termsOfService')}
        </button>
        <button
          type="button"
          onClick={() => setLanguageOpen(true)}
          class={cm.footerButton}
          aria-label={t('footer.language')}
        >
          <Icon name="globe" size={14} />
          {' '}{locales().find(l => l.code === locale())?.name}
        </button>
        <span class={cm.footerLink}>{version()}</span>
      </section>
      <Modal open={privacyOpen()} onClose={() => setPrivacyOpen(false)} title={t('footer.privacyPolicy')} size="lg">
        <div class={cm.prose} innerHTML={t('content.privacyPolicy', { appName: APP_NAME })} />
      </Modal>
      <Modal open={termsOpen()} onClose={() => setTermsOpen(false)} title={t('footer.termsOfService')} size="lg">
        <div class={cm.prose} innerHTML={t('content.termsOfService')} />
      </Modal>
      <Modal open={languageOpen()} onClose={() => setLanguageOpen(false)} title={t('footer.language')} size="lg">
        <div class={cm.languageGrid}>
          {locales().map(l => (
            <button
              type="button"
              onClick={async () => { await setLocale(l.code); setLanguageOpen(false) }}
              class={l.code === locale() ? cm.languageActive : cm.languageOption}
            >
              {l.name}
            </button>
          ))}
        </div>
      </Modal>
    </>
  )
}
