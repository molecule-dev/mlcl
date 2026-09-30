import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'

interface HelpEntry {
  q: string
  a: string
}

export function Help() {
  const { t } = useTranslation()
  const cm = getClassMap()

  const entries: HelpEntry[] = [
    {
      q: t('help.q.bid', {}, { defaultValue: 'How do I place a bid?' }),
      a: t(
        'help.a.bid',
        {},
        {
          defaultValue:
            'Open any auction page, enter your amount in the “Your bid” field, and press Place bid. Your bid must top the current high bid by at least the minimum increment — the quick +increment buttons fill in a valid amount for you.',
        },
      ),
    },
    {
      q: t('help.q.outbid', {}, { defaultValue: 'What happens if I get outbid?' }),
      a: t(
        'help.a.outbid',
        {},
        {
          defaultValue:
            'You will see a banner on the auction page and (if you have notifications enabled) get an in-app and email alert immediately. Re-bid as many times as you like; only your highest bid is on record.',
        },
      ),
    },
    {
      q: t(
        'help.q.charge',
        { app: APP_NAME },
        { defaultValue: `When does ${APP_NAME} charge my card?` },
      ),
      a: t(
        'help.a.charge',
        {},
        {
          defaultValue:
            'When you win a lot, we authorize your card and hold the funds in escrow. The charge releases to the seller only once delivery is confirmed.',
        },
      ),
    },
    {
      q: t('help.q.sell', {}, { defaultValue: 'How do I list something to sell?' }),
      a: t(
        'help.a.sell',
        {},
        {
          defaultValue:
            'Go to “Sell an item”, paste your photos and provenance notes, set a starting bid and reserve, and choose the auction length (3, 5, 7, or 10 days). We review and publish within one business hour.',
        },
      ),
    },
    {
      q: t('help.q.fees', {}, { defaultValue: 'What are the fees?' }),
      a: t(
        'help.a.fees',
        {},
        {
          defaultValue:
            'Bidders pay no buyer’s premium — what you bid is what you owe. Sellers pay a flat 8% commission on the hammer price. Shipping is calculated per lot.',
        },
      ),
    },
    {
      q: t('help.q.contact', {}, { defaultValue: 'I need a human. How do I contact support?' }),
      a: t(
        'help.a.contact',
        { app: APP_NAME },
        {
          defaultValue: `Email support@${APP_NAME.toLowerCase()}.example and a real person on our concierge team will reply within four business hours.`,
        },
      ),
    },
  ]

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <BrandWordmark as="span" size="md" />
          </Link>
          <Link
            to="/auctions"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {t('help.browseLink', {}, { defaultValue: 'Browse auctions →' })}
          </Link>
        </div>
      </nav>

      <main
        data-mol-id="page-help"
        className={cm.cn(cm.maxW('3xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12), cm.stack(8))}
      >
        <header className={cm.stack(3)}>
          <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
            {t('help.eyebrow', {}, { defaultValue: 'Help centre' })}
          </p>
          <h1 className={cm.cn('text-4xl font-extrabold tracking-tight')}>
            {t('help.title', {}, { defaultValue: 'Frequently asked questions' })}
          </h1>
          <p className={cm.cn('text-lg text-on-surface-variant')}>
            {t(
              'help.lede',
              {},
              {
                defaultValue:
                  'Quick answers to the most common bidding, payment, and selling questions. Still stuck? Email our concierge team — we read every message.',
              },
            )}
          </p>
        </header>

        <section className={cm.stack(4)}>
          {entries.map((entry, idx) => (
            <details
              key={idx}
              className={cm.cn(
                cm.sp('p', 5),
                'rounded-xl border border-outline-variant/40 bg-surface',
              )}
            >
              <summary
                className={cm.cn(
                  'cursor-pointer text-base font-bold tracking-tight text-on-surface',
                )}
              >
                {entry.q}
              </summary>
              <p
                className={cm.cn(cm.sp('mt', 3), 'text-sm text-on-surface-variant leading-relaxed')}
              >
                {entry.a}
              </p>
            </details>
          ))}
        </section>
      </main>
    </div>
  )
}

export default Help
export { Help as HelpPage }
