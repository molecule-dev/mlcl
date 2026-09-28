import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ReviewCard } from '../components/ReviewCard.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ProfileMe {
  id: string
  name: string | null
  email: string | null
  username: string | null
  planKey: string
  createdAt: string
  preferences: { bio?: string }
}

interface OverviewStats {
  finished_books: number
  pages_read: number
  avg_rating: number
  by_shelf: Record<string, number>
}

interface ReviewRow {
  id: string
  book_id: string
  title: string
  author: string
  cover_style: string
  rating: number | null
  review: string | null
  finished_at: string | null
}

function formatJoinDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function planLabel(plan: string): string {
  if (!plan || plan === 'free') return 'Free'
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

function initialsOf(name: string | null, email: string | null): string {
  const source = name?.trim() || email || ''
  const parts = source.split(/\s+|@/).filter(Boolean)
  const letters = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase())
  return letters.join('') || '?'
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [me, setMe] = useState<ProfileMe | null>(null)
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [meResp, overviewResp, reviewsResp] = await Promise.all([
          http.get('/profile/me'),
          http.get('/reports/overview'),
          http.get('/reviews'),
        ])
        if (cancelled) return
        setMe(unwrapSingle<ProfileMe>(meResp))
        setStats(unwrapSingle<OverviewStats>(overviewResp))
        setReviews(unwrapList<ReviewRow>(reviewsResp))
        setError(null)
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [http])

  const recentReviews = reviews.slice(0, 4)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, 'space-y-8')}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('profile.eyebrow', {}, { defaultValue: 'Your profile' })}
        </p>
        <h1 className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight', cm.sp('mt', 2))}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : !me ? null : (
        <>
          <section
            className={cm.cn(cm.sp('p', 8), 'rounded-[2rem] text-white relative overflow-hidden')}
            style={{
              background:
                'linear-gradient(135deg, var(--color-gradient-hero-start), var(--color-gradient-hero-end))',
            }}
          >
            <div
              className={cm.cn(
                'absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
              )}
            />
            <div
              className={cm.cn('absolute -left-10 top-10 w-40 h-40 rounded-full blur-3xl')}
              style={{ background: 'rgba(217,119,6,0.3)' }}
            />
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'relative z-10')}>
              <div
                className={cm.cn(
                  'w-24 h-24 rounded-full flex items-center justify-center text-4xl font-extrabold text-white shadow-lg',
                )}
                style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
              >
                {initialsOf(me.name, me.email)}
              </div>
              <div className={cm.flex1}>
                <h2
                  className={cm.cn('text-3xl font-extrabold tracking-tight')}
                  data-testid="profile-name"
                >
                  {me.name || me.email}
                </h2>
                <p className={cm.cn('text-white/85 mt-1')} data-testid="profile-email">
                  {me.email}
                </p>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 4))}>
                  <span
                    className={cm.cn(
                      'px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full bg-surface/20 backdrop-blur-md',
                    )}
                    data-testid="profile-plan"
                  >
                    {planLabel(me.planKey)}
                  </span>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      'text-sm font-semibold',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      auto_stories
                    </span>
                    {t(
                      'profile.heroReading',
                      { count: stats?.by_shelf?.reading ?? 0 },
                      { defaultValue: '{{count}} books in progress' },
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className={cm.grid({ cols: 4, gap: 'md' })}>
            {[
              {
                label: t('profile.stat.finished', {}, { defaultValue: 'Books finished' }),
                value: String(stats?.finished_books ?? 0),
                accent: 'var(--mol-color-primary)',
              },
              {
                label: t('profile.stat.pages', {}, { defaultValue: 'Pages read' }),
                value: String(stats?.pages_read ?? 0),
                accent: 'var(--mol-color-secondary)',
              },
              {
                label: t('profile.stat.avgRating', {}, { defaultValue: 'Avg rating' }),
                value:
                  (stats?.avg_rating ?? 0) > 0 ? `${(stats?.avg_rating ?? 0).toFixed(1)}★` : '—',
                accent: 'var(--color-achievement)',
              },
              {
                label: t('nav.reviews', {}, { defaultValue: 'Reviews' }),
                value: String(reviews.length),
                accent: 'var(--color-flame)',
              },
            ].map((s) => (
              <div
                key={s.label}
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.accentCard({ tone: 'custom' }),
                  'bg-surface-container-lowest rounded-2xl shadow-sm hover:-translate-y-0.5 transition-transform',
                )}
                style={{ ['--mol-accent' as string]: s.accent }}
              >
                <p className={cm.accentCardLabel({ tone: 'custom' })}>{s.label}</p>
                <p className={cm.cn('text-3xl font-extrabold mt-2 text-on-surface')}>{s.value}</p>
              </div>
            ))}
          </section>

          <section
            className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm', cm.sp('p', 6))}
          >
            <div className={cm.flex({ align: 'center', justify: 'between' })}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {t('profile.reviewsEyebrow', {}, { defaultValue: 'From your shelf' })}
                </p>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
                  {t('profile.reviewsHeading', {}, { defaultValue: 'Recently reviewed' })}
                </h3>
              </div>
              <Link to="/reviews" className={cm.cn('text-sm font-bold', cm.textPrimary)}>
                {t('profile.reviewsLink', {}, { defaultValue: 'See all →' })}
              </Link>
            </div>
            {recentReviews.length === 0 ? (
              <p className={cm.cn(cm.sp('mt', 5), cm.textCenter, 'text-on-surface-variant')}>
                {t(
                  'profile.reviewsEmpty',
                  {},
                  {
                    defaultValue: 'No reviews yet — finish a book and write the first one.',
                  },
                )}
              </p>
            ) : (
              <div className={cm.cn(cm.sp('mt', 5), 'space-y-4')}>
                {recentReviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    bookId={r.book_id}
                    title={r.title}
                    author={r.author}
                    coverStyle={r.cover_style}
                    rating={r.rating}
                    review={r.review}
                    finishedAt={r.finished_at}
                    compact
                  />
                ))}
              </div>
            )}
          </section>

          <section className={cm.grid({ cols: 2, gap: 'md' })}>
            <div
              className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm', cm.sp('p', 6))}
            >
              <h3
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nav.about', {}, { defaultValue: 'About' })}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('base'),
                  cm.sp('mt', 3),
                  'text-on-surface leading-relaxed',
                )}
              >
                {me.preferences?.bio ||
                  t(
                    'profile.bioEmpty',
                    {},
                    { defaultValue: 'Add a short bio in Settings to introduce yourself.' },
                  )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('mt', 4),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface-variant',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')}>calendar_today</span>
                {t(
                  'profile.joinedDate',
                  { date: formatJoinDate(me.createdAt) },
                  { defaultValue: 'Member since {{date}}' },
                )}
              </div>
            </div>

            <div
              className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm', cm.sp('p', 6))}
            >
              <h3
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('settings.account', {}, { defaultValue: 'Account' })}
              </h3>
              <div className={cm.cn(cm.sp('mt', 4), 'space-y-2')}>
                <Link
                  to="/settings"
                  className={cm.cn(
                    'flex items-center justify-between p-3 rounded-xl hover:bg-surface-container transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.fontWeight('semibold'),
                    )}
                  >
                    <span className="material-symbols-outlined text-on-surface-variant">
                      settings
                    </span>
                    {t('profile.action.settings', {}, { defaultValue: 'Account settings' })}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </Link>
                <Link
                  to="/notifications"
                  className={cm.cn(
                    'flex items-center justify-between p-3 rounded-xl hover:bg-surface-container transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.fontWeight('semibold'),
                    )}
                  >
                    <span className="material-symbols-outlined text-on-surface-variant">
                      notifications
                    </span>
                    {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </Link>
                <Link
                  to="/pricing"
                  className={cm.cn(
                    'flex items-center justify-between p-3 rounded-xl hover:bg-surface-container transition-colors',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.fontWeight('semibold'),
                    )}
                  >
                    <span className="material-symbols-outlined text-on-surface-variant">
                      workspace_premium
                    </span>
                    {t('profile.action.plan', {}, { defaultValue: 'Manage subscription' })}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
