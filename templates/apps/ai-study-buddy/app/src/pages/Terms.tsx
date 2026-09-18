import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyValues?: Record<string, string>
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'use',
    titleKey: 'terms.useTitle',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.useBody',
    bodyDefault:
      'Generated quizzes, flashcards, and tutor sessions are intended for individual study. You may not redistribute proprietary content, scrape the API, or impersonate other learners.',
  },
  {
    id: 'content',
    titleKey: 'terms.contentTitle',
    titleDefault: 'Your content',
    bodyKey: 'terms.contentBody',
    bodyDefault:
      'You retain ownership of the courses, decks, notes, and chat messages you create. We process them solely to deliver the learning experience and to keep your data safe.',
  },
  {
    id: 'termination',
    titleKey: 'terms.terminationTitle',
    titleDefault: 'Termination',
    bodyKey: 'terms.terminationBody',
    bodyDefault:
      'You can delete your account at any time from Settings. We may suspend abusive accounts after notice. On termination we delete your study data within thirty days.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'terms.contactBody',
    bodyValues: { app: APP_NAME },
    bodyDefault: 'Questions? Reach the {{app}} team via the address listed on the marketing site.',
  },
]

export function Terms() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
      subtitle={t(
        'terms.intro',
        { app: APP_NAME },
        {
          defaultValue:
            'By creating an account on {{app}}, you agree to study respectfully, keep your account credentials private, and use the platform for personal learning purposes.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`terms-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, s.bodyValues ?? {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
