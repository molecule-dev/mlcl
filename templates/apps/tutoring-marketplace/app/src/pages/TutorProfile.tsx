import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ReviewCard } from '../components/ReviewCard.js'

type ReviewRow = {
  id: string
  reviewer_id?: string
  reviewer_name?: string
  rating: number
  body?: string
  created_at?: string
}

type AvailabilityRow = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  recurring?: boolean
}

type TutorDetail = {
  id: string
  name?: string
  display_name?: string
  headline?: string
  bio?: string
  subjects?: string[]
  rate_per_hour_cents?: number
  hourly_rate?: number | string
  rating_average?: number | string
  rating_count?: number
  session_count?: number
  response_minutes?: number
  repeat_student_pct?: number
  verified?: boolean
  reviews?: ReviewRow[]
}

const DAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function tutorRate(t: TutorDetail): number {
  if (typeof t.hourly_rate === 'number') return t.hourly_rate
  if (typeof t.hourly_rate === 'string') {
    const n = Number(t.hourly_rate)
    if (!Number.isNaN(n)) return n
  }
  if (typeof t.rate_per_hour_cents === 'number') return Math.round(t.rate_per_hour_cents / 100)
  return 0
}

function tutorRating(t: TutorDetail): number {
  if (typeof t.rating_average === 'number') return t.rating_average
  if (typeof t.rating_average === 'string') {
    const n = Number(t.rating_average)
    if (!Number.isNaN(n)) return n
  }
  return 0
}

function relativeTime(iso: string | undefined): string {
  if (!iso) return ''
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diff = Date.now() - ts
  const days = Math.floor(diff / 86_400_000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

const FALLBACK_TUTOR: TutorDetail = {
  id: 'demo-rivera',
  display_name: 'Dr. Maya Rivera',
  headline: 'PhD in physics from MIT. I help students see the structure beneath the formulas.',
  bio: "Hi, I'm Maya. I’ve taught physics and calculus for nine years — to high schoolers, undergrads, and the occasional career switcher. Sessions are paced to your goals: AP/IB exam crunch, conceptual remediation, or research-style problem solving. I’ll send you a small worked-example pack after each session so the ideas stick.",
  subjects: ['Physics', 'Calculus', 'AP Physics C', 'IB Physics HL', 'Linear algebra'],
  rate_per_hour_cents: 9500,
  rating_average: 4.95,
  rating_count: 312,
  session_count: 1284,
  response_minutes: 12,
  repeat_student_pct: 78,
  verified: true,
}

const FALLBACK_REVIEWS: ReviewRow[] = [
  {
    id: 'r-1',
    reviewer_name: 'Priya Patel',
    rating: 5,
    body: 'Patient and clear. Made calc concepts feel intuitive.',
  },
]

export function TutorProfile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [tutor, setTutor] = useState<TutorDetail | null>(null)
  const [availability, setAvailability] = useState<AvailabilityRow[]>([])
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    if (!id) {
      setTutor(FALLBACK_TUTOR)
      return
    }
    let active = true
    Promise.all([
      http.get<TutorDetail>(`/api/tutors/${id}`),
      http.get<AvailabilityRow[]>(`/api/tutors/${id}/availability`),
    ])
      .then(([tutorRes, availRes]) => {
        if (!active) return
        const data = (tutorRes as { data?: TutorDetail | null }).data
        const slots = (availRes as { data?: AvailabilityRow[] | null }).data
        setTutor(data && Object.keys(data).length > 0 ? data : FALLBACK_TUTOR)
        setAvailability(Array.isArray(slots) ? slots : [])
        // Funnel event: a tutor profile rendered with real catalog data.
        if (data?.id) void track({ name: 'tutor.viewed', properties: { tutorId: data.id } })
      })
      .catch(() => {
        if (!active) return
        setErrored(true)
        setTutor(FALLBACK_TUTOR)
      })
    return () => {
      active = false
    }
  }, [http, id])

  const availabilityByDay = useMemo<Array<{ day: string; slots: string[] }>>(() => {
    const out: Array<{ day: string; slots: string[] }> = []
    for (let dow = 1; dow <= 7; dow++) {
      const realDow = dow === 7 ? 0 : dow
      const slots: string[] = []
      for (const slot of availability) {
        if (slot.day_of_week === realDow) {
          const [sh] = slot.start_time.split(':').map(Number) as [number]
          const [eh] = slot.end_time.split(':').map(Number) as [number]
          for (let h = sh; h < eh; h++) {
            slots.push(`${String(h).padStart(2, '0')}:00`)
          }
        }
      }
      out.push({ day: DAY_LABELS_SHORT[realDow] ?? '', slots })
    }
    return out
  }, [availability])

  const reviewsToRender = useMemo<ReviewRow[]>(() => {
    if (tutor?.reviews && tutor.reviews.length > 0) return tutor.reviews
    if (tutor && tutor.id !== FALLBACK_TUTOR.id) return []
    return FALLBACK_REVIEWS
  }, [tutor])

  if (!tutor) {
    return (
      <div className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
        {t('tutorProfile.loading', {}, { defaultValue: 'Loading tutor profile…' })}
      </div>
    )
  }

  const displayName = tutor.display_name ?? tutor.name ?? 'Tutor'
  const ratePerHour = tutorRate(tutor)
  const ratingValue = tutorRating(tutor)

  return (
    <div className={cm.cn(cm.sp('px', 6), cm.sp('py', 8), cm.stack(8))}>
      {errored && (
        <div
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'rounded-full px-3 py-1 self-start bg-warning-light text-warning',
          )}
        >
          {t('tutorProfile.fallback', {}, { defaultValue: 'Showing curated demo profile' })}
        </div>
      )}

      <header
        className={cm.cn(
          'relative overflow-hidden rounded-[2rem] text-on-primary shadow-xl',
          cm.sp('p', 10),
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--mol-color-primary-dark) 0%, var(--mol-color-primary) 60%, #7c3aed 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -right-24 -top-24 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
          )}
        />
        <div
          className={cm.cn(
            cm.flex({ gap: 'lg' }),
            'flex-col md:flex-row md:items-end relative z-10',
          )}
        >
          <div
            className={cm.cn(
              'rounded-full overflow-hidden ring-4 ring-white/40 shadow-xl shrink-0',
            )}
            style={{ width: 144, height: 144 }}
          >
            <img
              src={`https://i.pravatar.cc/288?u=${encodeURIComponent(tutor.id)}`}
              alt={displayName}
              className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
            />
          </div>
          <div className={cm.cn(cm.flex1, cm.stack(2))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'opacity-85 uppercase tracking-widest',
              )}
            >
              {t('tutorProfile.eyebrow', {}, { defaultValue: 'Tutor profile' })}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'font-display text-4xl md:text-5xl tracking-tight',
                )}
              >
                {displayName}
              </h1>
              {tutor.verified && (
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'rounded-full px-3 py-1 backdrop-blur-md uppercase tracking-widest',
                  )}
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <span
                    aria-hidden="true"
                    className={cm.cn('material-symbols-outlined text-base')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                  {t('tutorProfile.verifiedBadge', {}, { defaultValue: 'Verified' })}
                </span>
              )}
            </div>
            <p className={cm.cn(cm.textSize('lg'), 'opacity-90 max-w-2xl')}>
              {tutor.headline ??
                t('tutorProfile.fallbackHeadline', {}, { defaultValue: 'Experienced tutor.' })}
            </p>
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'lg' }), cm.sp('mt', 3))}>
              <Stat
                label={t('form.rating', {}, { defaultValue: 'Rating' })}
                value={`${ratingValue.toFixed(2)}★`}
              />
              <Stat
                label={t('tutorProfile.stat.sessions', {}, { defaultValue: 'Sessions' })}
                value={(tutor.session_count ?? 0).toLocaleString()}
              />
              <Stat
                label={t('tutorProfile.stat.response', {}, { defaultValue: 'Avg response' })}
                value={t(
                  'tutorProfile.stat.responseValue',
                  { mins: tutor.response_minutes ?? 30 },
                  { defaultValue: '{{mins}} min' },
                )}
              />
              <Stat
                label={t('tutorProfile.stat.repeats', {}, { defaultValue: 'Repeat students' })}
                value={t(
                  'tutorProfile.stat.repeatsValue',
                  { pct: tutor.repeat_student_pct ?? 65 },
                  { defaultValue: '{{pct}}%' },
                )}
              />
            </div>
          </div>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'end', gap: 'sm' }),
              cm.sp('p', 5),
              'rounded-2xl backdrop-blur-md shrink-0',
            )}
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'opacity-85 uppercase tracking-widest',
              )}
            >
              {t('form.rate', {}, { defaultValue: 'Rate' })}
            </p>
            <p
              className={cm.cn(
                cm.fontWeight('bold'),
                'font-display text-4xl tracking-tight tabular-nums',
              )}
            >
              ${ratePerHour}
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'opacity-80')}>
                {t('tutorProfile.perHour', {}, { defaultValue: ' / hr' })}
              </span>
            </p>
            <Link
              to={`/book/${tutor.id}`}
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-full px-6 py-3 bg-surface shadow-lg hover:scale-[1.03] transition-transform',
              )}
              style={{ color: 'var(--mol-color-primary-dark)' }}
            >
              {t('tutorProfile.bookCta', {}, { defaultValue: 'Book a session' })}
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                arrow_forward
              </span>
            </Link>
            <Link
              to={`/messages?with=${tutor.id}`}
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.flex({ align: 'center', gap: 'xs' }),
                'rounded-full px-6 py-3 backdrop-blur-md border border-surface/40 hover:bg-surface/15 transition-colors',
              )}
            >
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                chat
              </span>
              {t('tutorProfile.messageCta', {}, { defaultValue: 'Message tutor' })}
            </Link>
          </div>
        </div>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <div className={cm.cn(cm.stack(8), 'col-span-1 sm:col-span-2 lg:col-span-6 xl:col-span-8')}>
          <section className={cm.stack(3)}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('2xl'),
                'font-display tracking-tight',
              )}
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'leading-[1.7] text-on-surface-variant')}>
              {tutor.bio ?? FALLBACK_TUTOR.bio}
            </p>
          </section>

          <section className={cm.stack(3)}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('2xl'),
                'font-display tracking-tight',
              )}
            >
              {t('tutorProfile.subjects', {}, { defaultValue: 'Subjects' })}
            </h2>
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }))}>
              {(tutor.subjects ?? []).map((s) => (
                <span
                  key={s}
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-full px-3 py-1.5',
                  )}
                  style={{
                    backgroundColor: 'var(--chalk-booked-light)',
                    color: 'var(--mol-color-primary-dark)',
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </section>

          <section className={cm.stack(3)}>
            <h2
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('2xl'),
                'font-display tracking-tight',
              )}
            >
              {t('tutorProfile.reviews', {}, { defaultValue: 'Recent reviews' })}
            </h2>
            <div className={cm.stack(3)}>
              {reviewsToRender.length === 0 ? (
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('p', 6),
                    'rounded-2xl border border-outline-variant/20 text-on-surface-variant text-center',
                  )}
                >
                  {t(
                    'tutorProfile.reviews.empty',
                    {},
                    { defaultValue: 'No reviews yet — be the first.' },
                  )}
                </p>
              ) : (
                reviewsToRender.map((rv) => (
                  <ReviewCard
                    key={rv.id}
                    id={rv.id}
                    reviewerName={rv.reviewer_name ?? 'Student'}
                    rating={Number(rv.rating) || 0}
                    body={rv.body ?? ''}
                    postedAgo={relativeTime(rv.created_at)}
                    subject=""
                  />
                ))
              )}
            </div>
          </section>
        </div>

        <aside className={cm.cn('col-span-1 sm:col-span-2 lg:col-span-6 xl:col-span-4')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(4),
              'bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm sticky top-24',
            )}
          >
            <header className={cm.stack(1)}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('tutorProfile.availability', {}, { defaultValue: 'Availability this week' })}
              </p>
              <h3
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  'font-display tracking-tight',
                )}
              >
                {t(
                  'tutorProfile.availabilityHeadline',
                  {},
                  { defaultValue: 'Pick a slot to start' },
                )}
              </h3>
            </header>
            <div className={cm.stack(2)}>
              {availabilityByDay.map((row) => (
                <div
                  key={row.day}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.sp('p', 3),
                    'rounded-xl bg-surface-container-low',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant w-12',
                    )}
                  >
                    {row.day}
                  </span>
                  <div
                    className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }), 'justify-end flex-1')}
                  >
                    {row.slots.length === 0 ? (
                      <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic')}>
                        {t('tutorProfile.noSlots', {}, { defaultValue: 'No slots' })}
                      </span>
                    ) : (
                      row.slots.map((slot) => (
                        <Link
                          key={slot}
                          to={`/book/${tutor.id}?day=${row.day}&time=${encodeURIComponent(slot)}`}
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.fontWeight('semibold'),
                            // 36px compact tap target (cm.touchTargetCompact floor)
                            'rounded-full px-3 py-2 min-h-[36px] inline-flex items-center transition-colors',
                          )}
                          style={{
                            backgroundColor: 'var(--chalk-available-light)',
                            color: 'var(--chalk-available)',
                          }}
                        >
                          {slot}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Link
              to={`/book/${tutor.id}`}
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                'rounded-xl py-3 text-on-primary transition-transform hover:scale-[1.02]',
              )}
              style={{ backgroundColor: 'var(--mol-color-primary)' }}
            >
              {t('tutorProfile.bookFull', {}, { defaultValue: 'See full schedule' })}
              <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                arrow_forward
              </span>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const cm = getClassMap()
  return (
    <div className={cm.stack(1)}>
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'opacity-80 uppercase tracking-widest',
        )}
      >
        {label}
      </p>
      <p
        className={cm.cn(
          cm.fontWeight('bold'),
          'font-display text-2xl tracking-tight tabular-nums',
        )}
      >
        {value}
      </p>
    </div>
  )
}
