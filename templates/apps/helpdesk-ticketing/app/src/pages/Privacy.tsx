/**
 * Public privacy policy page. Real-content sections (data we collect,
 * how we use it, sub-processors, retention, your rights) so the page is
 * not a boilerplate stub. Every string flows through `t()`.
 *
 * @returns The rendered privacy page.
 */
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
  bodyValues?: Record<string, string>
}

const SECTIONS: Section[] = [
  {
    id: 'collect',
    titleKey: 'privacy.collect.title',
    titleDefault: 'What we collect',
    bodyKey: 'privacy.collect.body',
    bodyDefault:
      'Account data (email, hashed password, name, OAuth identifiers when you sign in via Google / GitHub / GitLab), workspace data (tickets, replies, knowledge-base articles, macros, SLA policies), and operational data (request logs, error traces, usage metrics needed to keep the service reliable).',
  },
  {
    id: 'use',
    titleKey: 'privacy.use.title',
    titleDefault: 'How we use it',
    bodyKey: 'privacy.use.body',
    bodyDefault:
      'To run {{app}} for you (sign-in, ticket routing, replies, search), to send transactional emails (password reset, billing receipts), and to detect abuse. We do not sell your data and do not use customer data to train third-party models.',
    bodyValues: { app: APP_NAME },
  },
  {
    id: 'subprocessors',
    titleKey: 'privacy.subprocessors.title',
    titleDefault: 'Sub-processors',
    bodyKey: 'privacy.subprocessors.body',
    bodyDefault:
      'We use Stripe (payments), Mailgun (transactional email), Amazon S3 (file uploads), and our infrastructure provider (compute & database). Each is bound by a data-processing agreement that limits use to providing the service.',
  },
  {
    id: 'retention',
    titleKey: 'privacy.retention.title',
    titleDefault: 'Retention',
    bodyKey: 'privacy.retention.body',
    bodyDefault:
      'Tickets, replies, articles, macros, and SLA policies are kept until you delete them or close the workspace. Account records are kept for 30 days after deletion to allow undo, then permanently purged. Backups roll off 30 days after that.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.rights.title',
    titleDefault: 'Your rights',
    bodyKey: 'privacy.rights.body',
    bodyDefault:
      'You can request export or deletion of your account data at any time from Settings. We respond to verified requests within 30 days. EU/UK users have GDPR rights (access, correction, erasure, restriction, portability, objection); California users have CCPA rights.',
  },
  {
    id: 'contact',
    titleKey: 'nav.contact',
    titleDefault: 'Contact',
    bodyKey: 'privacy.contact.body',
    bodyDefault:
      'Questions or requests? Email privacy@{{app}}.example or use the in-app feedback channel; both reach the same inbox.',
    bodyValues: { app: APP_NAME },
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
          defaultValue:
            'This policy explains what {{app}} collects when your team uses our helpdesk platform, how we use it, and the choices you have.',
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
              {t(s.bodyKey, s.bodyValues ?? {}, { defaultValue: s.bodyDefault })}
            </p>
          </section>
        ))}
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
          {t('privacy.lastUpdated', {}, { defaultValue: 'Last updated: 2026-05-01' })}
        </p>
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
