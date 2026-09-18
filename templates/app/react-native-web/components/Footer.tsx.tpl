import { useState } from 'react'
import { Link } from 'react-router'
import { useVersion, useTranslation } from '@molecule/app-react'
import { Modal } from '@molecule/app-ui-react-native'
import { Icon } from './Icon.js'
import { getClassMap } from '@molecule/app-ui'
import { loadContent } from '../config.js'
import { APP_NAME } from '../branding.js'

export function Footer() {
  const cm = getClassMap()
  const { t, locale, setLocale, locales } = useTranslation()
  const { state: versionState } = useVersion()
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)

  const version = versionState.version
    ? `v${versionState.version}`
    : 'v1.0.0'

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
      <section className={cm.footerBar}>
        <Link to="/about" className={cm.footerLink}>
          {t('footer.about', { appName: APP_NAME })}
        </Link>
        <button
          type="button"
          onClick={openPrivacy}
          className={cm.footerButton}
        >
          {t('footer.privacyPolicy')}
        </button>
        <button
          type="button"
          onClick={openTerms}
          className={cm.footerButton}
        >
          {t('footer.termsOfService')}
        </button>
        <button
          type="button"
          onClick={() => setLanguageOpen(true)}
          className={cm.footerButton}
          aria-label={t('footer.language')}
        >
          <Icon name="globe" size={14} />
          {' '}{locales.find(l => l.code === locale)?.name}
        </button>
        <span className={cm.footerLink}>{version}</span>
      </section>
      <Modal open={privacyOpen} onClose={() => setPrivacyOpen(false)} title={t('footer.privacyPolicy')} size="lg">
        <div className={cm.prose} dangerouslySetInnerHTML={{ __html: t('content.privacyPolicy', { appName: APP_NAME }) }} />
      </Modal>
      <Modal open={termsOpen} onClose={() => setTermsOpen(false)} title={t('footer.termsOfService')} size="lg">
        <div className={cm.prose} dangerouslySetInnerHTML={{ __html: t('content.termsOfService') }} />
      </Modal>
      <Modal open={languageOpen} onClose={() => setLanguageOpen(false)} title={t('footer.language')} size="lg">
        <div className={cm.languageGrid}>
          {locales.sort((a, b) => a.name.localeCompare(b.name)).map(l => (
            <button
              key={l.code}
              type="button"
              onClick={async () => { await setLocale(l.code); setLanguageOpen(false) }}
              className={l.code === locale ? cm.languageActive : cm.languageOption}
            >
              {l.name}
            </button>
          ))}
        </div>
      </Modal>
    </>
  )
}
