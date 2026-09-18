import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Section {
  id: string
  titleKey: string
  titleDefault: string
  bodyKey?: string
  bodyDefault?: string
  listKeys?: Array<{ key: string; default: string }>
}

const SECTIONS: Section[] = [
  {
    id: 'collect',
    titleKey: 'privacy.collect.title',
    titleDefault: 'What we store',
    listKeys: [
      {
        key: 'privacy.collect.account',
        default: 'Account: email, hashed password, display name, last sign-in.',
      },
      {
        key: 'privacy.collect.quizzes',
        default:
          'Quiz content: titles, questions, answers, cover images, and the categories you tag them with.',
      },
      {
        key: 'privacy.collect.gameplay',
        default:
          'Gameplay: per-session answers, scores, and leaderboard rankings, retained per your subscription tier.',
      },
      {
        key: 'privacy.collect.billing',
        default:
          'Billing: subscription status and the Stripe identifiers required to operate your plan.',
      },
    ],
  },
  {
    id: 'share',
    titleKey: 'privacy.share.title',
    titleDefault: 'Who can see your data',
    bodyKey: 'privacy.share.body',
    bodyDefault:
      'Only you and the players you invite to a session. Server logs are retained for 30 days for incident response and then deleted.',
  },
  {
    id: 'rights',
    titleKey: 'privacy.rights.title',
    titleDefault: 'Your controls',
    bodyKey: 'privacy.rights.body',
    bodyDefault:
      'Delete your account from Settings to permanently remove all of your data within 30 days.',
  },
]

export function Privacy() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface font-body',
      )}
    >
      <Header />
      <main
        data-mol-id="page-privacy"
        data-testid="privacy-page"
        className={cm.cn(cm.flex1, cm.mxAuto, 'w-full max-w-3xl', cm.sp('px', 6), cm.sp('py', 12))}
      >
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'font-label uppercase tracking-widest text-primary',
          )}
        >
          {t('nav.legal', {}, { defaultValue: 'Legal' })}
        </p>
        <h1
          className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight mb-3 font-display')}
        >
          {t('privacy.title', {}, { defaultValue: 'Privacy notice' })}
        </h1>
        <p className={cm.cn(cm.sp('mb', 8), 'text-sm text-on-surface-variant')}>
          {t(
            'privacy.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} respects your privacy. This page summarises the data we store, why we store it, and how to remove it.',
            },
          )}
        </p>
        <div className={cm.cn(cm.stack(8))}>
          {SECTIONS.map((s) => (
            <section key={s.id} data-mol-id={`privacy-${s.id}`} className={cm.cn(cm.stack(2))}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
                {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
              </h2>
              {s.listKeys ? (
                <ul
                  className={cm.cn(
                    cm.stack(2),
                    cm.prose,
                    'text-on-surface-variant list-disc list-inside',
                  )}
                >
                  {s.listKeys.map((item) => (
                    <li key={item.key}>{t(item.key, {}, { defaultValue: item.default })}</li>
                  ))}
                </ul>
              ) : null}
              {s.bodyKey ? (
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(s.bodyKey, {}, { defaultValue: s.bodyDefault ?? '' })}
                </p>
              ) : null}
            </section>
          ))}
        </div>
        <p className={cm.cn(cm.sp('mt', 8), 'text-xs')}>
          <Link to="/" className={cm.cn('text-primary font-bold')}>
            {t('auth.backToHomeArrow', {}, { defaultValue: '← Back to home' })}
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  )
}

export default Privacy
