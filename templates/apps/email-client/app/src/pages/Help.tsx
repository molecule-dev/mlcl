import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface FaqEntry {
  q: string
  a: string
}

export function Help() {
  const { t } = useTranslation()
  const cm = getClassMap()

  const faqs: FaqEntry[] = [
    {
      q: t('help.faq.compose.q', {}, { defaultValue: 'How do I send my first message?' }),
      a: t(
        'help.faq.compose.a',
        {},
        {
          defaultValue:
            'Click \u201CCompose\u201D from the sidebar (or press \u201Cc\u201D on any inbox view), enter at least one recipient, a subject, and a body, and hit \u201CSend\u201D. The new message appears in your Sent folder immediately.',
        },
      ),
    },
    {
      q: t('help.faq.shortcuts.q', {}, { defaultValue: 'Are there keyboard shortcuts?' }),
      a: t(
        'help.faq.shortcuts.a',
        {},
        {
          defaultValue:
            'Yes. \u201Cj\u201D / \u201Ck\u201D move between threads, \u201Cs\u201D toggles a star, \u201Ce\u201D archives, \u201C#\u201D moves to trash, and \u201C/\u201D focuses the search box. Shortcut documentation lives at any inbox view by pressing \u201C?\u201D.',
        },
      ),
    },
    {
      q: t('help.faq.labels.q', {}, { defaultValue: 'How do labels differ from folders?' }),
      a: t(
        'help.faq.labels.a',
        {},
        {
          defaultValue:
            'Folders are exclusive (a message lives in exactly one): Inbox, Sent, Drafts, Spam, Trash, Archive. Labels are additive \u2014 you can apply many to a single email and filter by combinations from the search bar.',
        },
      ),
    },
    {
      q: t('help.faq.password.q', {}, { defaultValue: 'I forgot my password \u2014 what now?' }),
      a: t(
        'help.faq.password.a',
        {},
        {
          defaultValue:
            'Use the \u201CForgot password?\u201D link on the sign-in page. We will send a reset link valid for one hour to your account email.',
        },
      ),
    },
    {
      q: t('help.faq.export.q', {}, { defaultValue: 'Can I export everything?' }),
      a: t(
        'help.faq.export.a',
        { app: APP_NAME },
        {
          defaultValue:
            'Yes. Settings \u2192 Account \u2192 Data export creates a downloadable archive (mbox + JSON) with every message, label, and contact. There is no premium tier required.',
        },
      ),
    },
    {
      q: t('help.faq.support.q', {}, { defaultValue: 'How do I talk to a human?' }),
      a: t(
        'help.faq.support.a',
        {},
        {
          defaultValue:
            'Send mail to support@courier.example. We answer every message within one business day, weekdays 9\u201317 UTC.',
        },
      ),
    },
  ]

  return (
    <div
      data-mol-id="page-help"
      className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface')}
    >
      <Header />
      <main className={cm.cn(cm.container({ size: 'md' }), cm.sp('py', 12))}>
        <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.sp('mb', 8))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('help.eyebrow', {}, { defaultValue: 'Help center' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('help.title', { app: APP_NAME }, { defaultValue: 'How can we help?' })}
          </h1>
          <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl')}>
            {t(
              'help.subtitle',
              {},
              {
                defaultValue:
                  'Quick answers to the questions we hear most. Anything missing? Open Settings and use the in-app feedback form, or write to support@courier.example.',
              },
            )}
          </p>
        </header>

        <section
          className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}
          data-mol-id="help-faqs"
        >
          {faqs.map((faq, idx) => (
            <details
              key={idx}
              className={cm.cn(
                cm.sp('p', 5),
                'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm',
              )}
              data-mol-id={`help-faq-${idx}`}
            >
              <summary
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('base'),
                  cm.cursorPointer,
                  'text-on-surface',
                )}
              >
                {faq.q}
              </summary>
              <p className={cm.cn(cm.sp('mt', 3), cm.textSize('sm'), 'text-on-surface-variant')}>
                {faq.a}
              </p>
            </details>
          ))}
        </section>

        <footer className={cm.cn(cm.sp('mt', 10), cm.flex({ gap: 'md' }))}>
          <Link
            to="/about"
            data-mol-id="help-about-link"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('help.cta.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
          </Link>
          <Link
            to="/pricing"
            data-mol-id="help-pricing-link"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
            )}
          >
            {t('help.cta.pricing', {}, { defaultValue: 'View pricing' })}
          </Link>
        </footer>
      </main>
      <Footer />
    </div>
  )
}

export default Help
export { Help as HelpPage }
