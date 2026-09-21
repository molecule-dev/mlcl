import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { SafeLink } from '../components/SafeLink.js'

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
          <h1
            className={cm.cn(
              cm.textSize('2xl'),
              'font-black',
              "font-['Newsreader'] text-on-background",
            )}
          >
            {t('unsubscribe.doneTitle', {}, { defaultValue: "You're unsubscribed." })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('base'),
              'text-on-surface-variant',
              'text-center max-w-md',
            )}
          >
            {t(
              'unsubscribe.doneBody',
              {},
              {
                defaultValue:
                  'This email will not receive future issues. No further action needed.',
              },
            )}
          </p>
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
