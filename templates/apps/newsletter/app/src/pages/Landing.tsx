import { useEffect, useState } from 'react'

import { track } from '@molecule/app-analytics'
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
      void track({ name: 'subscriber.subscribed', properties: { source: 'landing' } })
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

  const featureIssue = issues[0]

  return (
    <>
      <LandingTopNavBar />
      <main aria-label={pageTitle} className="bg-background text-on-background">
        {/* HERO — centered serif editorial statement over a framed drafting-room
            visual + live reading-column artifact (design: landing hero) */}
        <section
          data-mol-id="landing-hero"
          className="max-w-7xl mx-auto px-6 md:px-12 pt-28 md:pt-36 pb-16 md:pb-24"
        >
          <div className="max-w-4xl mx-auto text-center mb-12 md:mb-16">
            <p
              className={cm.cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6',
                'bg-primary-fixed text-primary border border-outline-variant/40',
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest',
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden />
              {t('landing.kicker', {}, { defaultValue: 'The Independent Publishing Platform' })}
            </p>
            <h1
              className={cm.cn(
                'font-headline text-4xl md:text-6xl text-on-background tracking-tight',
                'leading-tight md:leading-[1.1] mb-6 font-normal',
              )}
            >
              {t(
                'landing.headline',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'The internet broke reading. We built {{appName}} for writers who refuse to shout.',
                },
              )}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'text-on-surface-variant max-w-2xl mx-auto mb-8 leading-relaxed',
              )}
            >
              {t(
                'landing.subhead',
                {},
                {
                  defaultValue:
                    'A distraction-free newsletter engine engineered for long-form essays, algorithmic independence, and sovereign subscriber patronage — clean markdown, zero tracking bloat, 100% list portability.',
                },
              )}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <SafeLink
                data-mol-id="landing-cta-primary"
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'w-full sm:w-auto justify-center rounded-lg transition-all shadow-sm',
                  'bg-primary-container hover:bg-primary text-on-primary-container',
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                )}
              >
                {t('landing.ctaPrimary', {}, { defaultValue: 'Start Your Publication — Free' })}
                <span className={cm.fv5b245ffa} aria-hidden>
                  arrow_forward
                </span>
              </SafeLink>
              <SafeLink
                data-mol-id="landing-cta-secondary"
                to="/#archive"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  'w-full sm:w-auto justify-center rounded-lg transition-colors',
                  'bg-surface-container-lowest hover:bg-surface-container-low border border-surface-container-highest text-on-surface',
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                )}
              >
                {t('landing.ctaSecondary', {}, { defaultValue: 'Explore Featured Dispatches' })}
                <span className={cm.fv5b245ffa + ' text-tertiary'} aria-hidden>
                  north_east
                </span>
              </SafeLink>
            </div>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'text-tertiary flex items-center justify-center gap-2',
              )}
            >
              <span className={cm.fv5b245ffa + ' text-primary'} aria-hidden>
                verified
              </span>
              {t(
                'landing.assurance',
                {},
                { defaultValue: 'No credit card required · 1-click archive import' },
              )}
            </p>
          </div>

          {/* HERO VISUAL: framed drafting-room artifact + live reading column */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-8">
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-lg border border-surface-container-highest p-3 flex flex-col justify-between overflow-hidden group">
              <div className="relative overflow-hidden rounded-sm aspect-video bg-surface-container-low">
                {/* CSS-composed drafting-room mockup — the design ships a remote
                    photograph we cannot bundle, so the frame holds a typographic
                    still-life built from theme tokens instead. */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3/5 bg-surface-container-lowest rounded-sm border border-outline-variant/40 shadow-lg p-5 md:p-7 text-left transition-transform duration-500 ease-out group-hover:scale-[1.01]">
                    <div className="h-1 w-10 bg-primary-fixed rounded-full mb-4" aria-hidden />
                    <div className="font-headline text-on-surface text-lg md:text-xl mb-3">
                      {t('landing.deskTitle', {}, { defaultValue: 'The morning drafting room' })}
                    </div>
                    <div className="space-y-2 mb-4" aria-hidden>
                      <div className="h-1.5 w-full bg-surface-container-high rounded-full" />
                      <div className="h-1.5 w-11/12 bg-surface-container-high rounded-full" />
                      <div className="h-1.5 w-4/5 bg-surface-container-highest rounded-full" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" aria-hidden />
                      <span className={cm.textSize('xs') + ' text-tertiary'}>
                        {t(
                          'landing.deskMeta',
                          {},
                          { defaultValue: 'Daylight · fountain pen · markdown' },
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-sm border border-surface-container-highest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" aria-hidden />
                  <span className={cm.textSize('xs') + ' text-on-surface'}>
                    {t('landing.liveDraft', {}, { defaultValue: 'Live Draft: The editor’s desk' })}
                  </span>
                </div>
              </div>
              <div className="px-3 pt-3 pb-1 flex items-center justify-between gap-4">
                <span className="font-headline italic text-sm text-tertiary">
                  {t(
                    'landing.frameCaption',
                    {},
                    { defaultValue: '“Long-form craft deserves a quiet canvas.”' },
                  )}
                </span>
                <span className={cm.textSize('xs') + ' text-outline whitespace-nowrap'}>
                  FIG. 01
                </span>
              </div>
            </div>

            {/* Reading-column artifact — the featured live issue, rendered as
                the design's 680px reading-column preview */}
            <div className="lg:col-span-5 bg-surface-container-lowest rounded-lg border border-surface-container-highest p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-surface-container-highest text-tertiary mb-6">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        cm.textSize('xs') + ' uppercase tracking-wider text-primary font-semibold'
                      }
                    >
                      {APP_NAME}
                    </span>
                    <span className="text-surface-variant font-light" aria-hidden>
                      /
                    </span>
                    <span className={cm.textSize('xs')}>
                      {t('landing.issueNo', {}, { defaultValue: 'Latest issue' })}
                    </span>
                  </div>
                  {featureIssue?.publish_at && (
                    <span className={cm.textSize('xs') + ' flex items-center gap-1'}>
                      <span className={cm.fv5b245ffa} aria-hidden>
                        schedule
                      </span>
                      {new Date(featureIssue.publish_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                {loadingIssues ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t('common.loading', {}, { defaultValue: 'Loading...' })}
                  </p>
                ) : featureIssue ? (
                  <>
                    <h3 className="font-headline text-2xl text-on-surface mb-4 leading-snug">
                      {featureIssue.subject}
                    </h3>
                    {featureIssue.preview_text && (
                      <p className="editorial-dropcap text-on-surface-variant leading-relaxed mb-4">
                        {featureIssue.preview_text}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="font-headline text-2xl text-on-surface mb-4 leading-snug">
                      {t(
                        'landing.emptyColumnTitle',
                        {},
                        { defaultValue: 'An interview on quiet protocols' },
                      )}
                    </h3>
                    <p className="editorial-dropcap text-on-surface-variant leading-relaxed mb-4">
                      {t(
                        'landing.emptyColumnBody',
                        {},
                        {
                          defaultValue:
                            'The first dispatch is still at the press. Subscribe below and it will travel directly from the desk to your inbox — no feed, no noise.',
                        },
                      )}
                    </p>
                  </>
                )}
                <blockquote className="my-5 pl-4 border-l-2 border-primary italic font-headline text-tertiary leading-relaxed">
                  {t(
                    'landing.columnQuote',
                    {},
                    {
                      defaultValue:
                        '“Reader attention is not aggregate inventory to be harvested — it is a sovereign sanctuary.”',
                    },
                  )}
                </blockquote>
              </div>
              <div className="pt-4 mt-6 border-t border-surface-container-highest flex items-center justify-between gap-4 text-tertiary">
                <span className={cm.textSize('xs') + ' flex items-center gap-2'}>
                  <span className={cm.fv5b245ffa + ' text-primary'} aria-hidden>
                    headphones
                  </span>
                  {t('landing.audioNote', {}, { defaultValue: 'Audio essay narration' })}
                </span>
                <span
                  className={
                    cm.textSize('xs') +
                    ' px-2 py-0.5 rounded bg-surface-container text-on-surface-variant whitespace-nowrap'
                  }
                >
                  {t('landing.inboxScore', {}, { defaultValue: '99.8% Inbox Score' })}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* MANIFESTO BAND */}
        <section
          id="manifesto"
          data-mol-id="landing-manifesto"
          className="border-y border-surface-container-highest bg-surface-container-low py-16 md:py-20"
        >
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span
              className={
                cm.textSize('xs') +
                ' uppercase tracking-widest text-primary font-semibold mb-4 block'
              }
            >
              {t('landing.manifestoLabel', {}, { defaultValue: 'Manifesto · Principle IV' })}
            </span>
            <blockquote className="font-headline text-2xl md:text-4xl text-on-background italic leading-snug mb-6">
              {t(
                'landing.manifestoQuote',
                {},
                {
                  defaultValue:
                    '“When you remove the predatory noise of the algorithmic feed, what remains is the pure, quiet intimacy of the written word.”',
                },
              )}
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-px bg-outline-variant" aria-hidden />
              <p className={cm.textSize('sm') + ' text-on-surface-variant'}>
                {t(
                  'landing.manifestoAttribution',
                  {},
                  { defaultValue: 'The Editorial Board, Issue No. 01' },
                )}
              </p>
              <div className="w-8 h-px bg-outline-variant" aria-hidden />
            </div>
          </div>
        </section>

        {/* FOUNDATIONS — three uncompromising pillars */}
        <section
          id="features"
          data-mol-id="landing-features"
          className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-28"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 border-b border-surface-container-highest pb-8 gap-6">
            <div>
              <span
                className={
                  cm.textSize('xs') +
                  ' uppercase tracking-wider text-primary font-semibold mb-2 block'
                }
              >
                {t('landing.featuresKicker', {}, { defaultValue: 'System Architecture' })}
              </span>
              <h2 className="font-headline text-3xl md:text-4xl text-on-background">
                {t(
                  'landing.featuresTitle',
                  {},
                  { defaultValue: 'Three Uncompromising Foundations' },
                )}
              </h2>
            </div>
            <p className={cm.textSize('base') + ' text-on-surface-variant max-w-md'}>
              {t(
                'landing.featuresIntro',
                {},
                {
                  defaultValue:
                    'Engineered explicitly for independent practitioners of long-form craft who require sovereign digital autonomy.',
                },
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: 'auto_stories',
                title: t(
                  'landing.foundation1Title',
                  {},
                  { defaultValue: 'Obsessive Typographic Rigor' },
                ),
                body: t(
                  'landing.foundation1Body',
                  {},
                  {
                    defaultValue:
                      'Every edition renders inside an exact reading measure calibrated for ocular ease — precision drop caps, serif headlines, margin footnotes, and a dark mode that inverts gracefully.',
                  },
                ),
                stat: t('landing.foundation1Stat', {}, { defaultValue: 'Reading-first measure' }),
              },
              {
                icon: 'shield_person',
                title: t(
                  'landing.foundation2Title',
                  {},
                  { defaultValue: 'Sovereign Subscriber Graph' },
                ),
                body: t(
                  'landing.foundation2Body',
                  {},
                  {
                    defaultValue:
                      'You own your audience unconditionally — encrypted exports, deliverability on your own domain, and direct patron payments with zero platform lock-in.',
                  },
                ),
                stat: t('landing.foundation2Stat', {}, { defaultValue: '100% export portability' }),
              },
              {
                icon: 'do_not_disturb_on',
                title: t(
                  'landing.foundation3Title',
                  {},
                  { defaultValue: 'Zero Algorithmic Intermediaries' },
                ),
                body: t(
                  'landing.foundation3Body',
                  {},
                  {
                    defaultValue:
                      'No recommendation feeds pitting writers against peers, no ranking downgrades. Every issue delivers chronologically to inboxes and a permanent, ad-free archive.',
                  },
                ),
                stat: t(
                  'landing.foundation3Stat',
                  {},
                  { defaultValue: 'Pure chronological reach' },
                ),
              },
            ].map((f) => (
              <div
                key={f.stat}
                className="bg-surface-container-lowest p-8 rounded-lg border border-surface-container-highest flex flex-col justify-between hover:border-primary-container transition-colors duration-200"
              >
                <div>
                  <div className="w-10 h-10 rounded-sm bg-primary-fixed flex items-center justify-center text-primary mb-6">
                    <span className={cm.fv5b245ffa} aria-hidden>
                      {f.icon}
                    </span>
                  </div>
                  <h3 className={cm.textSize('lg') + ' font-headline text-on-surface mb-3'}>
                    {f.title}
                  </h3>
                  <p
                    className={cm.textSize('sm') + ' text-on-surface-variant leading-relaxed mb-6'}
                  >
                    {f.body}
                  </p>
                </div>
                <div className="pt-4 border-t border-surface-container-highest flex items-center justify-between text-tertiary">
                  <span className={cm.textSize('xs')}>{f.stat}</span>
                  <span className={cm.fv5b245ffa + ' text-primary'} aria-hidden>
                    check_circle
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PUBLIC ISSUES ARCHIVE — the live "written here" showcase */}
        <section
          id="archive"
          data-mol-id="landing-archive"
          className="bg-surface-container-low py-20 border-y border-surface-container-highest"
        >
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="max-w-2xl mb-12">
              <span
                className={
                  cm.textSize('xs') +
                  ' uppercase tracking-wider text-primary font-semibold mb-2 block'
                }
              >
                {t('landing.archiveKicker', {}, { defaultValue: 'The Vanguard' })}
              </span>
              <h2 className="font-headline text-3xl md:text-4xl text-on-background mb-3">
                {t('landing.archiveTitle', {}, { defaultValue: 'Latest issues' })}
              </h2>
              <p className={cm.textSize('base') + ' text-on-surface-variant'}>
                {t(
                  'landing.archiveIntro',
                  {},
                  {
                    defaultValue:
                      'Every dispatched issue lands in inboxes first, then archives here — permanent, ad-free, and readable at a humane measure.',
                  },
                )}
              </p>
            </div>
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
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {issues.map((issue) => (
                  <li key={issue.id} data-mol-id={`landing-archive-issue-${issue.id}`}>
                    <SafeLink
                      to={`/issues/${issue.id}`}
                      className="bg-surface-container-lowest p-6 rounded-lg border border-surface-container-highest flex flex-col justify-between h-full hover:border-outline transition-colors duration-150"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4 gap-2">
                          <span
                            className={
                              cm.textSize('xs') +
                              ' px-2.5 py-1 rounded bg-surface-container text-tertiary'
                            }
                          >
                            {issue.publish_at
                              ? new Date(issue.publish_at).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : ''}
                          </span>
                        </div>
                        <h3 className={cm.textSize('lg') + ' font-headline text-on-surface mb-1'}>
                          {issue.subject}
                        </h3>
                        {issue.preview_text && (
                          <p
                            className={
                              cm.textSize('sm') +
                              ' text-on-surface-variant mb-6 leading-relaxed line-clamp-3'
                            }
                          >
                            {issue.preview_text}
                          </p>
                        )}
                      </div>
                      <div className="pt-4 border-t border-surface-container-highest flex items-center justify-between">
                        <span className={cm.textSize('xs') + ' text-tertiary'}>
                          {t('landing.readIssue', {}, { defaultValue: 'Read issue' })}
                        </span>
                        <span
                          className={
                            cm.textSize('xs') +
                            ' text-primary font-semibold inline-flex items-center gap-1'
                          }
                        >
                          {t('common.readMore', {}, { defaultValue: 'Read' })}
                          <span className={cm.fv5b245ffa} aria-hidden>
                            arrow_forward
                          </span>
                        </span>
                      </div>
                    </SafeLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* FINAL CONVERSION — the subscribe form, framed as the design's
            migration-assurance card */}
        <section
          id="start"
          data-mol-id="landing-start"
          className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center"
        >
          <div className="bg-surface-container-lowest p-8 md:p-14 rounded-xl border border-surface-container-highest shadow-sm">
            <span
              className={
                'inline-flex items-center gap-1.5 ' +
                cm.textSize('xs') +
                ' uppercase tracking-wider text-primary font-semibold mb-4'
              }
            >
              <span className={cm.fv5b245ffa} aria-hidden>
                history_edu
              </span>
              {t('landing.startKicker', {}, { defaultValue: 'Subscribe in ten seconds' })}
            </span>
            <h2 className="font-headline text-2xl md:text-4xl text-on-background mb-4">
              {t(
                'landing.startTitle',
                {},
                { defaultValue: 'Ready to own your audience and write with clarity?' },
              )}
            </h2>
            <p className={cm.textSize('base') + ' text-on-surface-variant max-w-xl mx-auto mb-8'}>
              {t(
                'landing.startBody',
                {},
                {
                  defaultValue:
                    'Join readers getting every new dispatch directly — the quietest, most principled newsletter engine on the web.',
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
                  'inline-block bg-primary-fixed text-primary font-semibold',
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
                className="max-w-md mx-auto flex flex-col sm:flex-row gap-2 mb-4"
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
                    'rounded-lg',
                    cm.textSize('sm'),
                    'bg-surface-container-lowest border border-surface-container-highest text-on-surface focus:border-primary-container outline-none transition-all',
                  )}
                  placeholder={t(
                    'landing.emailPlaceholder',
                    {},
                    { defaultValue: 'you@example.com' },
                  )}
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
                    'rounded-lg',
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'bg-primary-container hover:bg-primary text-on-primary-container transition-colors whitespace-nowrap shadow-sm disabled:opacity-50',
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
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 4), 'text-tertiary')}>
              {t(
                'landing.startMicrocopy',
                {},
                {
                  defaultValue:
                    'One-click unsubscribe, always. Your address is never sold or shared.',
                },
              )}
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  )
}

export default Landing
export { Landing, Landing as LandingPage }
