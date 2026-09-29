import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from '../components/SafeLink.js'

/** The delivery rhythms a reader can restore by resubscribing (design:
 *  "Granular Delivery Rhythm"). Informational — the flip itself has already
 *  happened by the time this renders. */
const DELIVERY_CHANNELS = [
  {
    id: 'weekly',
    tagKey: 'unsubscribe.rhythm.weekly.tag',
    tagDefault: 'Core Edition',
    titleKey: 'unsubscribe.rhythm.weekly.title',
    titleDefault: 'Weekly Essays & Dispatches',
    bodyKey: 'unsubscribe.rhythm.weekly.body',
    bodyDefault:
      'Full unabridged essays delivered on publishing mornings, with footnote annotations.',
  },
  {
    id: 'monthly',
    tagKey: 'unsubscribe.rhythm.monthly.tag',
    tagDefault: 'Digest',
    titleKey: 'unsubscribe.rhythm.monthly.title',
    titleDefault: 'Monthly Curated Compendium',
    bodyKey: 'unsubscribe.rhythm.monthly.body',
    bodyDefault:
      'A single summary email at month-end: index highlights, citations, and reader dialogue.',
  },
  {
    id: 'audio',
    tagKey: 'unsubscribe.rhythm.audio.tag',
    tagDefault: 'Private Podcast RSS',
    titleKey: 'unsubscribe.rhythm.audio.title',
    titleDefault: 'Spoken Audio Editions',
    bodyKey: 'unsubscribe.rhythm.audio.body',
    bodyDefault: 'Author narrations and ambient salon discussions formatted for podcast players.',
  },
  {
    id: 'patron',
    tagKey: 'unsubscribe.rhythm.patron.tag',
    tagDefault: 'Patronage',
    titleKey: 'unsubscribe.rhythm.patron.title',
    titleDefault: 'Founding Patron Salons & Epistolary Notes',
    bodyKey: 'unsubscribe.rhythm.patron.body',
    bodyDefault:
      'Occasional unedited drafts, travel missives, and quarterly intimate salon invitations.',
  },
]

/**
 * Unsubscribe — the target of the unsubscribe link on the rendered public
 * issue (/unsubscribe/:token?issue=<id>). A thin page: it calls the API,
 * which flips the subscriber's status to `unsubscribed` (and records the
 * click on that issue's send when the issue param is present), then shows a
 * plain confirmation. The token is the subscriber's deterministic demo token
 * (see the API's subscribers.ts for how it is derived).
 */
function Unsubscribe() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const issueId = searchParams.get('issue') ?? ''
  const [state, setState] = useState<'working' | 'done' | 'error'>('working')

  useEffect(() => {
    if (!token) {
      setState('error')
      return
    }
    const url =
      issueId != ''
        ? `/api/subscribers/unsubscribe/${encodeURIComponent(token)}?issue=${encodeURIComponent(issueId)}`
        : `/api/subscribers/unsubscribe/${encodeURIComponent(token)}`
    let active = true
    fetch(url)
      .then((r) => {
        if (!active) return
        setState(r.ok ? 'done' : 'error')
        if (r.ok) {
          void track({
            name: 'subscriber.unsubscribed',
            properties: { source: 'unsubscribe-page', issue_id: issueId || undefined },
          })
        }
      })
      .catch(() => {
        if (active) setState('error')
      })
    return () => {
      active = false
    }
  }, [token, issueId])

  useEffect(() => {
    document.title = `${t('unsubscribe.pageTitle', {}, { defaultValue: 'Unsubscribed' })} · ${APP_NAME}`
  }, [t])

  return (
    <main
      aria-label={t('unsubscribe.pageTitle', {}, { defaultValue: 'Unsubscribed' })}
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.stack(6),
      )}
    >
      {state === 'working' ? (
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loading', {}, { defaultValue: 'Loading...' })}
        </p>
      ) : state === 'done' ? (
        <>
          <div className={cm.cn(cm.stack(4), 'text-center max-w-md')}>
            <h1
              className={cm.cn(
                cm.textSize('2xl'),
                'font-black',
                "font-['Newsreader'] text-on-background",
              )}
            >
              {t('unsubscribe.doneTitle', {}, { defaultValue: "You're unsubscribed." })}
            </h1>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t(
                'unsubscribe.doneBody',
                {},
                {
                  defaultValue:
                    'This email will not receive future issues. No further action needed.',
                },
              )}
            </p>
            <p
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                cm.textSize('xs'),
                'text-tertiary',
              )}
            >
              <span className={cm.fv5b245ffa} aria-hidden>
                verified_user
              </span>
              {t(
                'unsubscribe.zeroDarkPatterns',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Zero dark patterns: {{appName}} never hides unsubscribe controls or delays processing.',
                },
              )}
            </p>
          </div>

          {/* Granular Delivery Rhythm — what a returning reader can restore */}
          <section
            data-mol-id="unsubscribe-rhythm"
            aria-label={t(
              'unsubscribe.rhythm.title',
              {},
              { defaultValue: 'Granular Delivery Rhythm' },
            )}
            className={cm.cn(cm.stack(4), 'w-full max-w-2xl text-left')}
          >
            <h2
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('semibold'),
                "font-['Newsreader'] text-on-background",
              )}
            >
              {t('unsubscribe.rhythm.title', {}, { defaultValue: 'Granular Delivery Rhythm' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'unsubscribe.rhythm.intro',
                {},
                {
                  defaultValue:
                    'If you ever return, you choose exactly which dispatches enter your inbox — the full firehose is not the only option.',
                },
              )}
            </p>
            <ul className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2')}>
              {DELIVERY_CHANNELS.map((c) => (
                <li
                  key={c.id}
                  data-mol-id={`unsubscribe-rhythm-${c.id}`}
                  className={cm.cn(
                    cm.stack(1),
                    cm.sp('p', 4),
                    'rounded-xl bg-surface-container-lowest border border-surface-container-highest',
                  )}
                >
                  <span
                    className={cm.cn(
                      'self-start px-2 py-0.5 rounded bg-surface-container text-tertiary',
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                    )}
                  >
                    {t(c.tagKey, {}, { defaultValue: c.tagDefault })}
                  </span>
                  <h3
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    {t(c.titleKey, {}, { defaultValue: c.titleDefault })}
                  </h3>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t(c.bodyKey, {}, { defaultValue: c.bodyDefault })}
                  </p>
                </li>
              ))}
            </ul>
            <SafeLink
              data-mol-id="unsubscribe-resubscribe"
              to="/"
              className={cm.cn(
                'self-start inline-flex items-center gap-2 rounded-full bg-surface-container text-on-surface px-5 py-2.5 hover:bg-surface-container-high transition-colors',
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
              )}
            >
              {t('unsubscribe.resubscribe', {}, { defaultValue: 'Resubscribe or adjust rhythm' })}
            </SafeLink>
          </section>
        </>
      ) : (
        <>
          <h1
            className={cm.cn(
              cm.textSize('2xl'),
              'font-black',
              "font-['Newsreader'] text-on-background",
            )}
          >
            {t('unsubscribe.errorTitle', {}, { defaultValue: 'That link is not valid.' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('base'),
              'text-on-surface-variant',
              'text-center max-w-md',
            )}
          >
            {t(
              'unsubscribe.errorBody',
              {},
              { defaultValue: 'The unsubscribe link is unknown or expired. Nothing was changed.' },
            )}
          </p>
        </>
      )}
      <SafeLink to="/" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
        {t('publicIssue.backHome', {}, { defaultValue: 'Back to the publication' })}
      </SafeLink>
    </main>
  )
}

export default Unsubscribe
export { Unsubscribe, Unsubscribe as UnsubscribePage }
