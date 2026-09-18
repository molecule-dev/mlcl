import { Link } from 'react-router'

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
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'collection',
    titleKey: 'privacy.collection.title',
    titleDefault: 'What we collect',
    bodyKey: 'privacy.collection.account',
    bodyDefault:
      'Your account email and display name; translation projects, segments, glossary terms, and translation memory entries you create; aggregate usage analytics (page navigations, feature toggles).',
  },
  {
    id: 'processors',
    titleKey: 'privacy.processors.title',
    titleDefault: 'Subprocessors',
    bodyKey: 'privacy.processors.body',
    bodyDefault:
      'When you click Translate or Suggest, your source text is forwarded to Anthropic (Claude) and DeepL for translation, then returned to your workspace. Both providers are bound by their own data-processing terms; nothing is retained for retraining.',
  },
  {
    id: 'deletion',
    titleKey: 'privacy.deletion.title',
    titleDefault: 'Deleting your data',
    bodyKey: 'privacy.deletion.body',
    bodyDefault:
      'You can delete a project, segment, glossary term, or memory entry at any time from the relevant page. Deleting your account from Settings purges every workspace-scoped row from our database.',
  },
]

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal' })}
      title={t('privacy.title', {}, { defaultValue: 'Privacy policy' })}
      subtitle={t(
        'privacy.intro',
        { app: APP_NAME },
        {
          defaultValue: `${APP_NAME} stores the source and target text you upload only as long as needed to deliver the translation workspace. We never sell your data, and we never use customer text to train external AI models.`,
        },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        {SECTIONS.map((s) => (
          <section key={s.id} data-mol-id={`privacy-${s.id}`} className={cm.cn(cm.stack(2))}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
              {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
            </h2>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(s.bodyKey, {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t('privacy.lastUpdated', {}, { defaultValue: 'Last updated: 2026-05-01' })}
        </p>
        <Link
          to="/"
          data-mol-id="privacy-back-home"
          className={cm.cn(
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'text-primary hover:underline',
          )}
        >
          {t('auth.backToHomeArrow', {}, { defaultValue: '← Back to home' })}
        </Link>
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
