import { useEffect } from 'react'
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation, useVerifyPaymentReturn } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, LoadErrorBanner, Spinner } from '@molecule/app-ui-react'

import LandingFooter from '../components/LandingFooter.js'
import LandingTopNavBar from '../components/LandingTopNavBar.js'

/** Sovereign capabilities unlocked with a paid tier (design checklist). */
const FEATURES = [
  '0% platform cut on reader pledges & subscriptions — keep 100% of reader revenue, settled directly.',
  'Dedicated IP warm-up pool & custom DKIM/DMARC routing for your canonical vanity domain.',
  'Audio essay narration & podcast RSS generator for voice-annotated dispatches.',
  'Automated archive sync bridge — dual-broadcast or sync subscriber states without manual exports.',
  'Sovereignty archive & portable 1-click export in CSV, Markdown, mbox, and JSON feeds.',
]

/** The configuration hand-off (design: What to configure next). */
const NEXT_STEPS = [
  {
    id: 'domain',
    to: '/settings',
    title: 'Verify Custom Root Domain',
    body: 'Attach your canonical domain and DKIM/DMARC records for maximum inbox delivery.',
  },
  {
    id: 'narration',
    to: '/issues/new',
    title: 'Enable Audio Essay Narration',
    body: 'Attach a high-bitrate voiceover directly into your next pending draft.',
  },
  {
    id: 'patrons',
    to: '/pricing',
    title: 'Set Up Founding Patron Tiers',
    body: 'Give earliest readers a named tier with salon access and epistolary notes.',
  },
]

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pageTitle = t('planUpdated.pageTitle', {}, { defaultValue: 'Plan Updated' })
  // The checkout provider returns the buyer here with the payment id in the
  // query (`?provider=…&sessionId=…`). Confirming it from THIS origin, where
  // the session cookie applies, is what actually grants the plan.
  const verification = useVerifyPaymentReturn()

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  if (verification.status === 'verifying') {
    return (
      <ContentPageShell
        dataMolId="page-plan-updated"
        header={<LandingTopNavBar />}
        footer={<LandingFooter />}
        eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
        title={t('planUpdated.verifying', {}, { defaultValue: 'Confirming your payment…' })}
      >
        <Flex align="center" justify="center" className={cm.sp('py', 12)}>
          <Spinner />
        </Flex>
      </ContentPageShell>
    )
  }

  if (verification.status === 'failed') {
    return (
      <ContentPageShell
        dataMolId="page-plan-updated"
        header={<LandingTopNavBar />}
        footer={<LandingFooter />}
        eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
        title={t(
          'planUpdated.verifyFailed',
          {},
          { defaultValue: 'We could not confirm your payment yet.' },
        )}
      >
        <LoadErrorBanner
          data-mol-id="plan-updated-error"
          message={t(
            'planUpdated.verifyFailedBody',
            {},
            { defaultValue: 'Your payment may still be processing. Try again in a moment.' },
          )}
          retryLabel={t('planUpdated.retry', {}, { defaultValue: 'Try again' })}
          retryMolId="plan-updated-retry"
          onRetry={verification.retry}
        />
      </ContentPageShell>
    )
  }

  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      header={<LandingTopNavBar />}
      footer={<LandingFooter />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.message', {}, { defaultValue: 'Your plan has been updated.' })}
      subtitle={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you!' })}
    >
      <div className={cm.cn(cm.textCenter, cm.stack(4))}>
        <span
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'mx-auto h-16 w-16 rounded-full bg-primary/10 text-primary',
          )}
          aria-hidden="true"
        >
          <span className={cm.cn('material-symbols-outlined')} style={{ fontSize: '2rem' }}>
            check_circle
          </span>
        </span>
        <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'planUpdated.body',
            {},
            {
              defaultValue:
                'Your billing change is now active. You can manage your plan any time from the billing page.',
            },
          )}
        </p>
        <Link
          to="/"
          data-mol-id="plan-updated-back"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'mx-auto inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow',
          )}
        >
          {t('planUpdated.actionDefault', {}, { defaultValue: 'Return to Home' })}
        </Link>
      </div>

      {/* Unlocked capabilities + next configuration steps (design) */}
      <div className={cm.cn(cm.stack(8), cm.sp('mt', 12), 'max-w-2xl mx-auto w-full')}>
        <section data-mol-id="plan-updated-features" className={cm.cn(cm.stack(4))}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              "font-['Newsreader'] text-on-background",
            )}
          >
            {t(
              'planUpdated.features.title',
              {},
              { defaultValue: 'Unlocked Sovereign Features & Infrastructure' },
            )}
          </h2>
          <ul className={cm.stack(3)}>
            {FEATURES.map((f, i) => (
              <li key={i} className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-7 h-7 shrink-0 rounded-sm bg-primary-fixed text-primary',
                  )}
                >
                  <span className={cm.fv5b245ffa} aria-hidden>
                    check
                  </span>
                </span>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
                  {t(`planUpdated.features.f${i + 1}`, {}, { defaultValue: f })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="plan-updated-next" className={cm.cn(cm.stack(4))}>
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('semibold'),
              "font-['Newsreader'] text-on-background",
            )}
          >
            {t('planUpdated.next.title', {}, { defaultValue: 'What to configure next' })}
          </h2>
          <ul className={cm.stack(3)}>
            {NEXT_STEPS.map((s) => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  data-mol-id={`plan-updated-next-${s.id}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('p', 4),
                    'rounded-xl bg-surface-container-lowest border border-surface-container-highest hover:border-outline transition-colors',
                  )}
                >
                  <span>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'text-on-surface block',
                      )}
                    >
                      {t(`planUpdated.next.${s.id}.title`, {}, { defaultValue: s.title })}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(`planUpdated.next.${s.id}.body`, {}, { defaultValue: s.body })}
                    </span>
                  </span>
                  <span className={cm.fv5b245ffa + ' text-primary shrink-0'} aria-hidden>
                    arrow_forward
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default PlanUpdated
