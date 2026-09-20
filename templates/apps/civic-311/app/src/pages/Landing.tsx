import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, CITY_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import MiniMap from '../components/MiniMap.js'
import { categoryIcon, useCategoryLabel } from '../lib/issues.js'

interface CommunityIssue {
  id: string
  category: string
  derived_address: string
  status: string
}

interface Stats {
  total: number
  resolved: number
  open: number
}

/**
 * Public landing page for CivicPulse — what the 311 is, a live-ish look at
 * the community map (read from /api/issues when reachable; the page is
 * anonymous so the fetch degrades to a static hero when the API requires
 * auth), and the three-beat how-it-works. Signed-out visitors land here;
 * the header's sign-in leads into the app.
 */
export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const categoryLabel = useCategoryLabel()
  const [recent, setRecent] = useState<CommunityIssue[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, resolved: 0, open: 0 })

  useEffect(() => {
    document.title = t(
      'landing.pageTitle',
      { appName: APP_NAME, city: CITY_NAME },
      { defaultValue: '{{appName}} — report it, watch it, fix it' },
    )
  }, [t])

  useEffect(() => {
    let cancelled = false
    async function load() {
      // Best-effort: anonymous listing may 401 — the landing page stays
      // meaningful without it.
      try {
        const res = await http.get('/api/issues?limit=6')
        const raw = Array.isArray(res)
          ? (res as CommunityIssue[])
          : Array.isArray((res as { data?: unknown })?.data)
            ? (res as { data: CommunityIssue[] }).data
            : []
        if (cancelled || raw.length === 0) return
        setRecent(raw)
        setStats({
          total: raw.length,
          resolved: raw.filter((i) => i.status === 'resolved').length,
          open: raw.filter((i) => !['resolved', 'dismissed'].includes(i.status)).length,
        })
      } catch (_error) {
        // intentional noop — static hero remains
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [http])

  const steps = [
    {
      icon: 'photo_camera',
      title: t('landing.step1Title', {}, { defaultValue: 'Snap + pin it' }),
      body: t(
        'landing.step1Body',
        {},
        {
          defaultValue:
            'Pick a category, add a photo, and drop a pin on the city grid — the block address fills itself in.',
        },
      ),
    },
    {
      icon: 'content_paste_search',
      title: t('landing.step2Title', {}, { defaultValue: 'Skip the duplicates' }),
      body: t(
        'landing.step2Body',
        {},
        {
          defaultValue:
            'We check open reports nearby before you submit. See the same pothole already filed? Confirm it instead.',
        },
      ),
    },
    {
      icon: 'verified',
      title: t('landing.step3Title', {}, { defaultValue: 'Watch it get fixed' }),
      body: t(
        'landing.step3Body',
        {},
        {
          defaultValue:
            'Every report moves through submitted → acknowledged → in review → resolved, with the city\u2019s response on the record.',
        },
      ),
    },
  ]

  return (
    <div className={cm.cn(cm.surface, 'text-on-surface')}>
      <Header />
      <main data-mol-id="landing-page">
        {/* Hero */}
        <section
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 10 }),
            cm.sp('px', 8),
            cm.sp('py', 16),
            'flex-wrap',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 5 }), cm.maxW('xl'))}>
            <p
              data-mol-id="landing-hero-tagline"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-primary uppercase tracking-widest',
              )}
            >
              {t(
                'landing.heroKicker',
                { city: CITY_NAME },
                { defaultValue: '{{city}} 311, made simple' },
              )}
            </p>
            <h1
              data-mol-id="landing-hero-title"
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('extrabold'),
                'tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.heroTitle',
                {},
                { defaultValue: 'See something broken? Report it in a minute.' },
              )}
            </h1>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant')}>
              {t(
                'landing.heroSubtitle',
                { city: CITY_NAME },
                {
                  defaultValue:
                    'Potholes, streetlights, graffiti, missed pickup — {{city}} residents report it with a photo and a map pin, confirm each other\u2019s reports, and watch every fix move through the city\u2019s workflow.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ gap: 3 }), 'flex-wrap')}>
              <Link
                data-mol-id="landing-cta-signup"
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 6),
                  'rounded-lg py-3 font-semibold text-sm transition-colors',
                  'bg-primary text-on-primary hover:opacity-90',
                )}
              >
                {t('landing.ctaSignup', {}, { defaultValue: 'Start reporting' })}
              </Link>
              <Link
                data-mol-id="landing-cta-explore"
                to="/explore"
                className={cm.cn(
                  cm.sp('px', 6),
                  'rounded-lg py-3 font-semibold text-sm transition-colors',
                  'border border-outline-variant text-on-surface hover:bg-surface-container-low',
                )}
              >
                {t('landing.ctaExplore', {}, { defaultValue: 'Explore the map' })}
              </Link>
            </div>
            {stats.total > 0 && (
              <div
                data-mol-id="landing-stats"
                className={cm.cn(cm.flex({ gap: 6 }), cm.textSize('sm'), 'text-on-surface-variant')}
              >
                <span>
                  <strong className="text-on-surface">{stats.open}</strong>{' '}
                  {t('landing.statOpen', {}, { defaultValue: 'open now' })}
                </span>
                <span>
                  <strong className="text-on-surface">{stats.resolved}</strong>{' '}
                  {t('landing.statResolved', {}, { defaultValue: 'resolved' })}
                </span>
              </div>
            )}
          </div>
          <div
            data-mol-id="landing-map-preview"
            className={cm.cn(cm.w('[380px]'), cm.maxW('full'))}
          >
            <MiniMap
              pins={recent.map((i) => ({
                id: i.id,
                x: 20 + (hash(i.id) % 60),
                y: 20 + (hash(i.derived_address) % 60),
                color: `var(--color-cat-${i.category})`,
              }))}
            />
          </div>
        </section>

        {/* How it works */}
        <section
          className={cm.cn(cm.sp('px', 8), cm.sp('pb', 16), cm.stack(8))}
          data-mol-id="landing-how-it-works"
        >
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t('landing.howItWorks', {}, { defaultValue: 'How it works' })}
          </h2>
          <div className={cm.cn(cm.flex({ gap: 6 }), 'flex-wrap')}>
            {steps.map((s, i) => (
              <div
                key={s.icon}
                data-mol-id={`landing-step-${i + 1}`}
                className={cm.cn(
                  cm.flex1,
                  cm.sp('p', 6),
                  'min-w-[240px] rounded-xl bg-surface-container-low border border-outline-variant/40',
                  cm.stack(3),
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-primary', 'text-3xl')}
                  aria-hidden
                >
                  {s.icon}
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>{s.title}</h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent community reports */}
        {recent.length > 0 && (
          <section
            className={cm.cn(cm.sp('px', 8), cm.sp('pb', 16), cm.stack(6))}
            data-mol-id="landing-recent"
          >
            <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
              {t('landing.recentTitle', {}, { defaultValue: 'Recently reported' })}
            </h2>
            <div className={cm.cn(cm.flex({ gap: 4 }), 'flex-wrap')}>
              {recent.slice(0, 4).map((issue) => (
                <div
                  key={issue.id}
                  data-mol-id="landing-recent-item"
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.stack(2),
                    'min-w-[220px] rounded-lg border border-outline-variant/40',
                  )}
                >
                  <span className={cm.cn('flex items-center gap-2 text-sm font-medium')}>
                    <span
                      className="material-symbols-outlined"
                      style={{ color: `var(--color-cat-${issue.category})` }}
                      aria-hidden
                    >
                      {categoryIcon(issue.category)}
                    </span>
                    {categoryLabel(issue.category)}
                  </span>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {issue.derived_address}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}

/** Tiny deterministic jitter so preview pins don't all stack. */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997
  return h
}

export default Landing
