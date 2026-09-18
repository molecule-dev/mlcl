/**
 * InstructorProfile — public profile for an instructor.
 *
 * Reads /api/instructors/:id (decorated with stats), and
 * /api/instructors/:id/courses (only published courses for the public).
 * The "Recent reviews" section pulls the latest reviews across the
 * instructor's published courses.
 */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import type { TranslateFunction } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CourseTile } from '../components/CourseTile.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { ReviewCard } from '../components/ReviewCard.js'
import { api, type CourseSummary, type Instructor, type Review } from '../lib/api.js'

function timeAgo(t: TranslateFunction, iso?: string): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / (24 * 3600 * 1000))
  if (days < 1) return t('timeAgo.today', {}, { defaultValue: 'today' })
  if (days < 7) return t('timeAgo.days', { count: days }, { defaultValue: '{{count}} days ago' })
  const weeks = Math.floor(days / 7)
  if (weeks < 5)
    return t('timeAgo.weeks', { count: weeks }, { defaultValue: '{{count}} weeks ago' })
  const months = Math.floor(days / 30)
  return t('timeAgo.months', { count: months }, { defaultValue: '{{count}} months ago' })
}

export function InstructorProfile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const params = useParams<{ id: string }>()
  const id = params.id ?? ''
  const [instructor, setInstructor] = useState<Instructor | null>(null)
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    setError(null)
    Promise.all([
      api<Instructor>(`/instructors/${id}`),
      api<CourseSummary[]>(`/instructors/${id}/courses`).catch(() => []),
    ])
      .then(async ([i, c]) => {
        if (!alive) return
        setInstructor(i)
        setCourses(Array.isArray(c) ? c : [])
        // Pull reviews for top 3 published courses to give the profile life.
        const topCourses = (Array.isArray(c) ? c : [])
          .filter((row) => row.status === 'published')
          .slice(0, 3)
        const reviewLists = await Promise.all(
          topCourses.map((row) => api<Review[]>(`/reviews/course/${row.id}`).catch(() => [])),
        )
        if (!alive) return
        setReviews(reviewLists.flat().slice(0, 6))
      })
      .catch((err) => {
        if (!alive) return
        const message = err instanceof Error ? err.message : 'Instructor not found'
        setError(message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id])

  if (loading) {
    return (
      <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
        <Header />
        <main className={cm.cn('flex-1 flex items-center justify-center')}>
          <p
            data-mol-id="instructor-profile-loading"
            className={cm.cn('text-on-surface-variant text-sm')}
          >
            {t('instructorProfile.loading', {}, { defaultValue: 'Loading instructor…' })}
          </p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!instructor || error) {
    return (
      <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
        <Header />
        <main className={cm.cn('flex-1 flex flex-col items-center justify-center gap-4 px-6')}>
          <h1
            data-mol-id="instructor-profile-error"
            className={cm.cn('text-2xl font-extrabold text-on-surface')}
          >
            {t('instructorProfile.notFound', {}, { defaultValue: 'Instructor not found' })}
          </h1>
          <Link
            to="/browse"
            className={'bg-primary-container text-on-primary px-5 py-2.5 rounded-xl font-bold'}
          >
            {t('instructorProfile.backToCatalog', {}, { defaultValue: 'Back to catalog' })}
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  const avatar = instructor.avatar_url ?? `https://i.pravatar.cc/512?u=${instructor.id}`
  const stats = [
    {
      label: t('instructorProfile.rating', {}, { defaultValue: 'Avg rating' }),
      value: (instructor.average_rating ?? 0).toFixed(1),
    },
    {
      label: t('instructorProfile.students', {}, { defaultValue: 'Students' }),
      value:
        (instructor.total_students ?? 0) >= 1000
          ? `${((instructor.total_students ?? 0) / 1000).toFixed(1)}K`
          : (instructor.total_students ?? 0).toString(),
    },
    {
      label: t('instructorProfile.courses', {}, { defaultValue: 'Courses' }),
      value: (instructor.total_courses ?? 0).toString(),
    },
    {
      label: t('nav.reviews', {}, { defaultValue: 'Reviews' }),
      value: (instructor.total_reviews ?? 0).toLocaleString(),
    },
  ]

  return (
    <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
      <Header />
      <main className={cm.cn('flex-1')}>
        <section
          className={cm.cn(
            'relative overflow-hidden bg-gradient-to-br from-primary to-primary-container text-white',
          )}
        >
          <div
            className={cm.cn(
              'absolute -top-40 -right-40 w-96 h-96 bg-surface/10 rounded-full blur-3xl pointer-events-none',
            )}
          ></div>
          <div
            className={cm.cn(
              'absolute -bottom-40 -left-40 w-96 h-96 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none',
            )}
          ></div>
          <div
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 16),
              'max-w-7xl mx-auto relative z-10 grid lg:grid-cols-[180px_1fr] gap-10 items-center',
            )}
          >
            <img
              src={avatar}
              alt={instructor.name}
              className={cm.cn(
                'w-44 h-44 rounded-full object-cover border-[6px] border-surface/20 shadow-2xl',
              )}
            />
            <div>
              <p
                className={cm.cn(
                  'text-[11px] font-black uppercase tracking-widest opacity-80 mb-2',
                )}
              >
                {t('instructorProfile.eyebrow', {}, { defaultValue: 'Instructor' })}
              </p>
              <h1
                data-mol-id="instructor-profile-name"
                className={cm.cn(
                  'text-4xl md:text-5xl font-extrabold tracking-tighter leading-[1.05] mb-3',
                )}
              >
                {instructor.name}
              </h1>
              {instructor.bio && (
                <p
                  data-mol-id="instructor-profile-bio"
                  className={cm.cn('text-lg text-white/85 max-w-xl mb-6')}
                >
                  {instructor.bio}
                </p>
              )}
              <div className={cm.cn('flex flex-wrap gap-8')}>
                {stats.map((s) => (
                  <div key={s.label} data-mol-id={`instructor-stat-${s.label.toLowerCase()}`}>
                    <p
                      className={cm.cn('text-3xl font-extrabold tracking-tighter')}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {s.value}
                    </p>
                    <p
                      className={cm.cn(
                        'text-[10px] font-black uppercase tracking-widest opacity-80 mt-1',
                      )}
                    >
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'max-w-7xl mx-auto')}>
          <div className={cm.cn('grid lg:grid-cols-3 gap-10 items-start')}>
            <div
              className={cm.cn(
                'bg-surface-container-lowest rounded-2xl shadow-sm p-8 lg:sticky lg:top-8',
              )}
            >
              <h2
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                )}
              >
                {t('nav.about', {}, { defaultValue: 'About' })}
              </h2>
              <p className={cm.cn('text-on-surface leading-relaxed')}>
                {instructor.bio ??
                  t(
                    'instructorProfile.bioEmpty',
                    {},
                    { defaultValue: 'This instructor has not written a bio yet.' },
                  )}
              </p>
            </div>
            <div className={cm.cn('lg:col-span-2 space-y-12')}>
              <section>
                <header className={cm.cn('flex items-baseline justify-between mb-6')}>
                  <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
                    {t(
                      'instructorProfile.coursesByName',
                      { name: instructor.name },
                      { defaultValue: 'Courses by {{name}}' },
                    )}
                  </h2>
                  <span
                    data-mol-id="instructor-courses-count"
                    className={cm.cn('text-sm text-on-surface-variant')}
                  >
                    {t(
                      'instructorProfile.coursesCount',
                      { count: courses.length },
                      { defaultValue: '{{count}} courses' },
                    )}
                  </span>
                </header>
                {courses.length === 0 ? (
                  <p
                    data-mol-id="instructor-courses-empty"
                    className={cm.cn('text-on-surface-variant text-sm')}
                  >
                    {t(
                      'instructorProfile.coursesEmpty',
                      {},
                      { defaultValue: 'No published courses from this instructor yet.' },
                    )}
                  </p>
                ) : (
                  <div
                    data-mol-id="instructor-courses-grid"
                    className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-6')}
                  >
                    {courses
                      .filter((c) => c.status === 'published')
                      .map((c) => (
                        <CourseTile
                          key={c.id}
                          id={c.id}
                          title={c.title}
                          instructor={instructor.name}
                          rating={c.rating_avg ?? 0}
                          reviewCount={c.rating_count ?? 0}
                          priceCents={(c.price_cents ?? 0) > 0 ? c.price_cents : undefined}
                          originalPriceCents={c.original_price_cents ?? undefined}
                          imageSeed={c.slug ?? c.id}
                        />
                      ))}
                  </div>
                )}
              </section>
              <section>
                <header className={cm.cn('flex items-baseline justify-between mb-2')}>
                  <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
                    {t('instructorProfile.recentReviews', {}, { defaultValue: 'Recent reviews' })}
                  </h2>
                </header>
                {reviews.length === 0 ? (
                  <p
                    data-mol-id="instructor-reviews-empty"
                    className={cm.cn('text-on-surface-variant text-sm')}
                  >
                    {t('instructorProfile.reviewsEmpty', {}, { defaultValue: 'No reviews yet.' })}
                  </p>
                ) : (
                  <div
                    data-mol-id="instructor-reviews"
                    className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm px-8')}
                  >
                    {reviews.map((r) => (
                      <ReviewCard
                        key={r.id}
                        authorName={`Student ${String(r.userId).slice(0, 6)}`}
                        authorRole={t(
                          'instructorProfile.studentRole',
                          { appName: APP_NAME },
                          { defaultValue: '{{appName}} learner' },
                        )}
                        rating={r.rating}
                        postedAt={timeAgo(t, r.createdAt)}
                        body={r.body ?? r.title ?? ''}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default InstructorProfile
