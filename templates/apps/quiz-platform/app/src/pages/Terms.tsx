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
  bodyKey: string
  bodyDefault: string
}

const SECTIONS: Section[] = [
  {
    id: 'account',
    titleKey: 'nav.yourAccount',
    titleDefault: 'Your account',
    bodyKey: 'terms.account.body',
    bodyDefault:
      'You are responsible for the content you publish, the questions you author, and any games you host. Do not impersonate other people.',
  },
  {
    id: 'billing',
    titleKey: 'settings.billing',
    titleDefault: 'Billing',
    bodyKey: 'terms.billing.body',
    bodyDefault:
      'Paid plans renew automatically until cancelled from Settings. You can cancel at any time; access continues until the end of the current billing period.',
  },
  {
    id: 'acceptable',
    titleKey: 'terms.acceptable.title',
    titleDefault: 'Acceptable use',
    bodyKey: 'terms.acceptable.body',
    bodyDefault:
      'No harassment, no copyrighted media you do not own, no scraping our APIs. We may suspend accounts that abuse the service.',
  },
]

export function Terms() {
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
        data-mol-id="page-terms"
        data-testid="terms-page"
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
          {t('terms.title', {}, { defaultValue: 'Terms of service' })}
        </h1>
        <p className={cm.cn(cm.sp('mb', 8), 'text-sm text-on-surface-variant')}>
          {t(
            'terms.intro',
            { app: APP_NAME },
            {
              defaultValue:
                'By using {{app}} you agree to the rules below. If you cannot accept them, please do not use the service.',
            },
          )}
        </p>
        <div className={cm.cn(cm.stack(8))}>
          {SECTIONS.map((s) => (
            <section key={s.id} data-mol-id={`terms-${s.id}`} className={cm.cn(cm.stack(2))}>
              <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
                {t(s.titleKey, {}, { defaultValue: s.titleDefault })}
              </h2>
              <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                {t(s.bodyKey, {}, { defaultValue: s.bodyDefault })}
              </p>
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

export default Terms
