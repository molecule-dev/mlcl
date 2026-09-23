import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EarningsHeroCard } from '../components/EarningsHeroCard.js'
import { ReviewCard } from '../components/ReviewCard.js'
import { SessionCard, type SessionStatus } from '../components/SessionCard.js'
import { StatTriad } from '../components/StatTriad.js'

type TutorRow = {
  id: string
  user_id: string
  display_name?: string
  rating_average?: number | string
  rating_count?: number | string
  session_count?: number | string
}

type BookingRow = {
  id: string
  tutor_id: string
  student_id: string
  subject?: string | null
  scheduled_at?: string
  duration_hours?: number | string
  status?: string
  total_amount?: number | string
  currency?: string
  hourly_rate?: number | string | null
  tutor_name?: string | null
}

type ReviewRow = {
  id: string
  rating: number | string
  body?: string | null
  reviewer_name?: string | null
  reviewer_id?: string
  created_at?: string
}

function formatStart(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return `Today, ${time}`
  if (isTomorrow) return `Tomorrow, ${time}`
  return (
    d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) +
    ', ' +
    time
  )
}

function relativeTime(iso?: string): string {
  if (!iso) return ''
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function deriveStatus(b: BookingRow): SessionStatus {
  const raw = (b.status ?? 'pending').toLowerCase()
  if (raw === 'cancelled') return 'cancelled'
  if (raw === 'completed') return 'completed'
  if (raw === 'in_progress') return 'in_progress'
  if (b.scheduled_at) {
    const start = new Date(b.scheduled_at).getTime()
    const dur = Number(b.duration_hours ?? 1) * 60 * 60 * 1000
    const now = Date.now()
    if (now < start) return 'upcoming'
    if (now >= start && now <= start + dur) return 'in_progress'
    return 'completed'
  }
  return 'upcoming'
}

export function TutorDashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user } = useAuth<UserProfile>()
  const [tutor, setTutor] = useState<TutorRow | null>(null)
  const [tutorMissing, setTutorMissing] = useState(false)
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const me = (await http.get<TutorRow>('/api/tutors/me')) as { data?: TutorRow | null }
        if (!active) return
        if (me.data?.id) {
          setTutor(me.data)
          const [bookingsRes, reviewsRes] = await Promise.all([
            http.get<BookingRow[]>('/api/bookings?role=tutor'),
            http.get<ReviewRow[]>(`/api/reviews/tutor/${me.data.id}`),
          ])
          if (!active) return
          const bookingsData = (bookingsRes as { data?: BookingRow[] | null }).data
          if (Array.isArray(bookingsData)) setBookings(bookingsData)
          const reviewsData = (reviewsRes as { data?: ReviewRow[] | null }).data
          if (Array.isArray(reviewsData)) setReviews(reviewsData)
        } else {
          setTutorMissing(true)
        }
      } catch (error) {
        // A 404 from /api/tutors/me is the NORMAL answer for a signed-in user who
        // has not created a tutor profile — the same state the `else` branch above
        // handles. It is not a failure, so it must not be logged as one: the noise
        // is what the "renders without console errors" spec catches, and a routine
        // 404 in the console trains readers to ignore real errors. Anything else
        // (network, 5xx, a malformed body) IS a failure and still gets logged.
        if ((error as { status?: number } | undefined)?.status !== 404) {
          logError('TutorDashboard.loadTutor', error)
        }
        if (!active) return
        setTutorMissing(true)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [http])

  const upcoming = useMemo(() => {
    return bookings
      .filter((b) => {
        const s = deriveStatus(b)
        return s === 'upcoming' || s === 'in_progress'
      })
      .sort((a, b) => {
        const at = new Date(a.scheduled_at ?? '').getTime()
        const bt = new Date(b.scheduled_at ?? '').getTime()
        return at - bt
      })
      .slice(0, 5)
  }, [bookings])

  const monthlyEarningsCents = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    return bookings.reduce((sum, b) => {
      if ((b.status ?? '').toLowerCase() !== 'completed') return sum
      const ts = b.scheduled_at ? new Date(b.scheduled_at) : null
      if (!ts || Number.isNaN(ts.getTime())) return sum
      if (ts.getFullYear() !== year || ts.getMonth() !== month) return sum
      const total = Number(b.total_amount ?? 0)
      return sum + (Number.isFinite(total) ? total * 100 : 0)
    }, 0)
  }, [bookings])

  const completedThisMonth = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    return bookings.filter((b) => {
      if ((b.status ?? '').toLowerCase() !== 'completed') return false
      const ts = b.scheduled_at ? new Date(b.scheduled_at) : null
      if (!ts || Number.isNaN(ts.getTime())) return false
      return ts.getFullYear() === year && ts.getMonth() === month
    }).length
  }, [bookings])

  const ratingAvg = Number(tutor?.rating_average ?? 0)
  const ratingCount = Number(tutor?.rating_count ?? 0)
  const tutorName =
    user?.name?.split(' ')?.[0] ??
    tutor?.display_name?.split(' ')?.[0] ??
    t('tutorDashboard.fallbackName', {}, { defaultValue: 'Tutor' })

  const monthLabel = useMemo(() => {
    return new Date().toLocaleDateString(undefined, { month: 'long' })
  }, [])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
        {t('tutorDashboard.loading', {}, { defaultValue: 'Loading dashboard…' })}
      </div>
    )
  }

  if (tutorMissing) {
    return (
      <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), cm.stack(6), 'text-center')}>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'font-display text-3xl md:text-4xl tracking-tight',
          )}
        >
          {t(
            'tutorDashboard.empty.title',
            {},
            { defaultValue: 'Become a tutor to unlock your dashboard.' },
          )}
        </h1>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant max-w-xl mx-auto')}>
          {t(
            'tutorDashboard.empty.body',
            {},
            {
              defaultValue:
                'Set your subjects, hourly rate, and availability — then start earning.',
            },
          )}
        </p>
        <button
          type="button"
          onClick={() => navigate('/become-tutor')}
          data-testid="dashboard-become-tutor"
          className={cm.cn(
            cm.fontWeight('bold'),
            'self-center rounded-full px-6 py-3 bg-primary text-on-primary shadow',
          )}
        >
          {t('tutorDashboard.empty.cta', {}, { defaultValue: 'Become a tutor →' })}
        </button>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.stack(10))}>
      <EarningsHeroCard
        tutorName={tutorName}
        monthLabel={monthLabel}
        earningsCents={monthlyEarningsCents}
        changePercent={0}
        trendCents={[monthlyEarningsCents]}
      />

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }), 'items-start')}>
        <div className={cm.cn(cm.stack(8), 'col-span-1 sm:col-span-2 lg:col-span-6 xl:col-span-8')}>
          <StatTriad
            items={[
              {
                key: 'sessions',
                icon: 'event_available',
                label: t(
                  'tutorDashboard.stats.sessions',
                  {},
                  { defaultValue: 'Sessions this month' },
                ),
                value: String(completedThisMonth),
                tone: 'primary',
              },
              {
                key: 'rating',
                icon: 'star',
                label: t('tutorDashboard.stats.rating', {}, { defaultValue: 'Avg rating' }),
                value: ratingCount > 0 ? ratingAvg.toFixed(2) : '—',
                trend:
                  ratingCount > 0
                    ? t(
                        'common.countReviews',
                        { count: ratingCount },
                        { defaultValue: '{{count}} reviews' },
                      )
                    : undefined,
                tone: 'warning',
              },
              {
                key: 'total-sessions',
                icon: 'forum',
                label: t(
                  'tutorDashboard.stats.totalSessions',
                  {},
                  { defaultValue: 'All-time sessions' },
                ),
                value: String(Number(tutor?.session_count ?? 0)),
                tone: 'verified',
              },
            ]}
          />

          <section className={cm.stack(4)}>
            <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('2xl'),
                  'font-display tracking-tight',
                )}
              >
                {t('tutorDashboard.upcoming', {}, { defaultValue: 'Upcoming sessions' })}
              </h2>
              <Link
                to="/sessions"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:underline decoration-2 underline-offset-4',
                )}
              >
                {t('common.viewAll', {}, { defaultValue: 'View all' })}
              </Link>
            </header>
            <div className={cm.stack(3)} data-testid="dashboard-upcoming">
              {upcoming.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'tutorDashboard.upcomingEmpty',
                    {},
                    {
                      defaultValue:
                        'No upcoming sessions yet — students booking your slots will appear here.',
                    },
                  )}
                </p>
              ) : (
                upcoming.map((b) => (
                  <SessionCard
                    key={b.id}
                    id={b.id}
                    tutorId={b.student_id}
                    tutorName={
                      b.tutor_name ??
                      t('tutorDashboard.studentFallback', {}, { defaultValue: 'Student' })
                    }
                    subject={
                      b.subject ??
                      t('tutorDashboard.tutoringFallback', {}, { defaultValue: 'Tutoring session' })
                    }
                    startsAt={formatStart(b.scheduled_at)}
                    durationMinutes={Math.round(Number(b.duration_hours ?? 1) * 60)}
                    status={deriveStatus(b)}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <aside
          className={cm.cn(cm.stack(8), 'col-span-1 sm:col-span-2 lg:col-span-6 xl:col-span-4')}
        >
          <section className={cm.stack(4)}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xl'),
                'font-display tracking-tight',
              )}
            >
              {t('tutorDashboard.recentReviews', {}, { defaultValue: 'Recent reviews' })}
            </h2>
            <div className={cm.stack(3)} data-testid="dashboard-reviews">
              {reviews.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'tutorDashboard.reviewsEmpty',
                    {},
                    {
                      defaultValue:
                        'You don’t have any reviews yet — they’ll appear here once students rate you.',
                    },
                  )}
                </p>
              ) : (
                reviews
                  .slice(0, 4)
                  .map((r) => (
                    <ReviewCard
                      key={r.id}
                      id={r.id}
                      reviewerName={
                        r.reviewer_name ??
                        t('tutorDashboard.studentFallback', {}, { defaultValue: 'Student' })
                      }
                      rating={Number(r.rating ?? 0)}
                      body={r.body ?? ''}
                      postedAgo={relativeTime(r.created_at)}
                    />
                  ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
