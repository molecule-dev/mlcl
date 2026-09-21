import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import LandingFooter from '../components/LandingFooter.js'
import LandingTopNavBar from '../components/LandingTopNavBar.js'
import { SafeLink } from '../components/SafeLink.js'

interface IssueSummary {
  id: string
  subject: string
  preview_text?: string | null
  publish_at?: string | null
}

function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const pageTitle = t(
    'landing.pageTitle',
    { appName: APP_NAME },
    { defaultValue: '{{appName}} — a newsletter about newsletters' },
  )
  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  const [email, setEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const [issues, setIssues] = useState<IssueSummary[]>([])
  const [loadingIssues, setLoadingIssues] = useState(true)

  useEffect(() => {
    let active = true
    // The public archive — published issues straight from the API. On a
    // scaffolded project this is populated by the demo seed; failures fall
    // back to an empty archive rather than blocking the page.
    fetch('/api/issues?limit=10')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((body: { data?: IssueSummary[] }) => {
        if (active) setIssues(Array.isArray(body?.data) ? body.data : [])
      })
      .catch(() => {
        if (active) setIssues([])
      })
      .finally(() => {
        if (active) setLoadingIssues(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleSubscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) return
    setSubscribing(true)
    setSubscribeError(null)
    try {
      const res = await fetch('/api/subscribers/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSubscribed(true)
      setEmail('')
    } catch (err) {
      setSubscribeError(
        err instanceof Error
          ? err.message
          : t('landing.subscribeFailed', {}, { defaultValue: 'Subscription failed — try again.' }),
      )
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <>
      <LandingTopNavBar />
      <main aria-label={pageTitle}>
        {/* Hero + subscribe-by-email form — the public face of the publication */}
        <section
          data-mol-id="landing-hero"
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center' }),
            cm.sp('px', 6),
            'pt-40 pb-24 text-center',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-[var(--color-status-published)] mb-4',
            )}
          >
            {t('landing.kicker', {}, { defaultValue: 'A weekly newsletter' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              'font-black',
              "font-['Newsreader'] tracking-tight text-on-background max-w-2xl",
            )}
          >
            {t(
              'landing.headline',
              {},
              { defaultValue: 'Ship a newsletter your readers actually open.' },
            )}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.sp('mt', 4),
              'text-on-surface-variant max-w-xl leading-relaxed',
            )}
          >
            {t(
              'landing.subhead',
              {},
              {
                defaultValue:
                  'Issues, subscribers, and open-rate analytics — the whole creator stack, from first draft to paid tier.',
              },
            )}
          </p>
          {subscribed ? (
            <p
              id="landing-subscribed"
              data-mol-id="landing-subscribed"
              role="status"
              className={cm.cn(
                cm.sp('mt', 8),
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.roundedFull,
                'bg-primary-container text-on-primary-container font-semibold',
              )}
            >
              {t(
                'landing.subscribed',
                {},
                { defaultValue: "You're on the list — see you Friday." },
              )}
            </p>
          ) : (
            <form
              data-mol-id="landing-subscribe-form"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('mt', 8),
                'w-full max-w-md',
              )}
              onSubmit={(e) => void handleSubscribe(e)}
            >
              <label className="sr-only" htmlFor="landing-subscribe-email">
                {t('landing.emailLabel', {}, { defaultValue: 'Email address' })}
              </label>
              <input
                id="landing-subscribe-email"
                type="email"
                required
                data-mol-id="landing-subscribe-email"
                className={cm.cn(
                  cm.flex1,
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.roundedFull,
                  cm.textSize('sm'),
                  'bg-surface-container-lowest border border-outline-variant focus:border-primary outline-none',
                )}
                placeholder={t('landing.emailPlaceholder', {}, { defaultValue: 'you@example.com' })}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type="submit"
                id="landing-subscribe-submit"
                data-mol-id="landing-subscribe-submit"
                disabled={subscribing}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.roundedFull,
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-primary text-on-primary hover:bg-primary-container transition-all disabled:opacity-50',
                )}
              >
                {subscribing
                  ? t('common.subscribing', {}, { defaultValue: 'Subscribing…' })
                  : t('landing.subscribe', {}, { defaultValue: 'Subscribe' })}
              </button>
            </form>
          )}
          {subscribeError && (
            <p role="alert" className={cm.cn(cm.textSize('sm'), cm.sp('mt', 3), 'text-error')}>
              {subscribeError}
            </p>
          )}
        </section>

        {/* Public issues archive */}
        <section
          id="archive"
          data-mol-id="landing-archive"
          className={cm.cn(cm.sp('px', 6), 'pb-28 max-w-3xl mx-auto')}
        >
          <h2
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('bold'),
              "font-['Newsreader'] text-on-background mb-8",
            )}
          >
            {t('landing.archiveTitle', {}, { defaultValue: 'Latest issues' })}
          </h2>
          {loadingIssues ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loading', {}, { defaultValue: 'Loading...' })}
            </p>
          ) : issues.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'landing.archiveEmpty',
                {},
                { defaultValue: 'No published issues yet — the first one is being written.' },
              )}
            </p>
          ) : (
            <ul className={cm.stack(6)}>
              {issues.map((issue) => (
                <li key={issue.id} data-mol-id={`landing-archive-issue-${issue.id}`}>
                  <SafeLink
                    to={`/issues/${issue.id}`}
                    className={cm.cn(
                      cm.flex({ direction: 'col' }),
                      cm.sp('p', 6),
                      'rounded-xl',
                      'bg-surface-container-low hover:bg-surface-container transition-all',
                    )}
                  >
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {issue.publish_at
                        ? new Date(issue.publish_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : ''}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('lg'),
                        cm.fontWeight('semibold'),
                        "font-['Newsreader'] text-on-surface",
                      )}
                    >
                      {issue.subject}
                    </span>
                    {issue.preview_text && (
                      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {issue.preview_text}
                      </span>
                    )}
                  </SafeLink>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <LandingFooter />
    </>
  )
}

export default Landing
export { Landing, Landing as LandingPage }
