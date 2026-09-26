/**
 * CourseDetail — public catalog view for a single course.
 *
 * Reads /api/courses/:id (decorated with instructor name + rating
 * counts), /api/lessons/course/:id (full curriculum, with locked
 * video URLs for non-enrolled visitors), and
 * /api/reviews/course/:id (public reviews list). The aside checks
 * whether the caller is already enrolled (`/api/enrollments`) — if
 * so, the CTA flips to "Continue learning" and links into the lesson
 * player. Otherwise it kicks off a Stripe Checkout session via
 * `/api/checkout/create-session` (or the free-enrollment fast-path
 * for `price_cents = 0`).
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import type { UserProfile } from '@molecule/app-auth'
import type { TranslateFunction } from '@molecule/app-i18n'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { ReviewCard } from '../components/ReviewCard.js'
import {
  api,
  type CourseSummary,
  type EnrolledCourse,
  type Lesson,
  type Review,
} from '../lib/api.js'

function formatDollars(cents: number | null | undefined): string {
  return `$${(Number(cents ?? 0) / 100).toFixed(2)}`
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

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

export function CourseDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth<UserProfile>()
  const params = useParams<{ id: string }>()
  const courseId = params.id ?? ''

  const [course, setCourse] = useState<CourseSummary | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [enrollment, setEnrollment] = useState<EnrolledCourse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [enrollBusy, setEnrollBusy] = useState(false)
  const [enrollError, setEnrollError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setLoadError(null)
    Promise.all([
      api<CourseSummary>(`/courses/${courseId}`).catch((err) => {
        throw err
      }),
      api<Lesson[]>(`/lessons/course/${courseId}`).catch(() => [] as Lesson[]),
      api<Review[]>(`/reviews/course/${courseId}`).catch(() => [] as Review[]),
      user
        ? api<EnrolledCourse[]>('/enrollments').catch(() => [] as EnrolledCourse[])
        : Promise.resolve([] as EnrolledCourse[]),
    ])
      .then(([c, l, r, enrollments]) => {
        if (!alive) return
        setCourse(c)
        setLessons(Array.isArray(l) ? l : [])
        setReviews(Array.isArray(r) ? r : [])
        const matchEnrollment = Array.isArray(enrollments)
          ? (enrollments.find((e) => String(e.course_id) === courseId) ?? null)
          : null
        setEnrollment(matchEnrollment)
      })
      .catch((err: unknown) => {
        if (!alive) return
        const message = err instanceof Error ? err.message : 'Failed to load course'
        setLoadError(message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [courseId, user])

  const totalLectures = lessons.length
  const totalSeconds = useMemo(
    () => lessons.reduce((s, l) => s + Number(l.duration_sec ?? 0), 0),
    [lessons],
  )
  const totalHours = Math.max(1, Math.round(totalSeconds / 3600))
  const firstFreePreview = useMemo(
    () => lessons.find((l) => l.free_preview === true) ?? null,
    [lessons],
  )

  // Group lessons into a single section for now (DB schema doesn't carry
  // section names; can be derived from a lesson `section_title` later).
  const grouped: { id: string; title: string; lessons: Lesson[]; duration: string }[] =
    useMemo(() => {
      if (lessons.length === 0) return []
      const totalDurationLabel = t(
        'courseDetail.minutes',
        { count: Math.floor(totalSeconds / 60) },
        { defaultValue: '{{count}} min' },
      )
      return [
        {
          id: 'curriculum',
          title: t('courseDetail.fullCurriculum', {}, { defaultValue: 'Full curriculum' }),
          lessons,
          duration: totalDurationLabel,
        },
      ]
    }, [lessons, totalSeconds, t])

  const [openSection, setOpenSection] = useState<string | null>('curriculum')

  const startCheckout = async () => {
    if (!course) return
    setEnrollError(null)
    if (!user) {
      // Same shape AuthGuard uses — Login restores `state.from` after sign-in.
      navigate('/login', { state: { from: { pathname: `/courses/${courseId}` } } })
      return
    }
    setEnrollBusy(true)
    try {
      const res = await api<{
        url?: string
        free?: boolean
        enrollmentId?: string
        error?: string
      }>('/checkout/create-session', {
        method: 'POST',
        body: { course_id: courseId },
      })
      if (res.free && res.enrollmentId) {
        track({
          name: 'course.enrolled',
          properties: { courseId: String(courseId), status: 'free' },
        })
        navigate(`/my-learning`)
        return
      }
      if (res.url) {
        track({
          name: 'course.checkout_started',
          properties: { courseId: String(courseId) },
        })
        window.location.href = res.url
        return
      }
      setEnrollError(
        res.error ??
          t('nav.couldNotStartCheckout', {}, { defaultValue: 'Could not start checkout.' }),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed'
      setEnrollError(message)
    } finally {
      setEnrollBusy(false)
    }
  }

  if (loading) {
    return (
      <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
        <Header />
        <main className={cm.cn('flex-1 flex items-center justify-center')}>
          <p
            data-mol-id="course-detail-loading"
            className={cm.cn('text-on-surface-variant text-sm')}
          >
            {t('courseDetail.loading', {}, { defaultValue: 'Loading course…' })}
          </p>
        </main>
        <Footer />
      </div>
    )
  }

  if (loadError || !course) {
    return (
      <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
        <Header />
        <main className={cm.cn('flex-1 flex flex-col items-center justify-center gap-4 px-6')}>
          <h1
            data-mol-id="course-detail-error"
            className={cm.cn('text-2xl font-extrabold text-on-surface')}
          >
            {t('courseDetail.notFoundTitle', {}, { defaultValue: 'Course unavailable' })}
          </h1>
          <p className={cm.cn('text-on-surface-variant')}>
            {loadError ??
              t(
                'courseDetail.notFoundBody',
                {},
                { defaultValue: 'This course may have been removed or is not yet published.' },
              )}
          </p>
          <Link
            to="/browse"
            className={'bg-primary-container text-on-primary px-5 py-2.5 rounded-xl font-bold'}
          >
            {t('courseDetail.browseCatalog', {}, { defaultValue: 'Browse catalog' })}
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  const priceCents = Number(course.price_cents ?? 0)
  const originalCents = Number(course.original_price_cents ?? 0)
  const showOriginal = originalCents > priceCents
  const discountPct = showOriginal
    ? Math.round(((originalCents - priceCents) / originalCents) * 100)
    : 0

  const enrollLabel = enrollment
    ? t('courseDetail.continueLearning', {}, { defaultValue: 'Continue learning' })
    : priceCents === 0
      ? t('courseDetail.enrollFree', {}, { defaultValue: 'Enroll for free' })
      : t('courseDetail.enrollNow', {}, { defaultValue: 'Enroll now' })

  const onEnroll = () => {
    if (enrollment) {
      const firstLesson = lessons[0]
      if (firstLesson) navigate(`/lesson/${firstLesson.id}`)
      else navigate(`/my-learning`)
      return
    }
    void startCheckout()
  }

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
              'absolute -bottom-32 -left-20 w-80 h-80 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none',
            )}
          ></div>
          <div
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 16),
              'max-w-7xl mx-auto relative z-10 grid lg:grid-cols-[1fr_400px] gap-12 items-start',
            )}
          >
            <div>
              <p
                className={cm.cn(
                  'text-[11px] font-black uppercase tracking-widest opacity-80 mb-3',
                )}
              >
                {t(
                  'courseDetail.eyebrow',
                  { category: course.category ?? 'Course', appName: APP_NAME },
                  { defaultValue: '{{category}} · {{appName}}' },
                )}
              </p>
              <h1
                data-mol-id="course-title"
                className={cm.cn(
                  'text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter leading-[1.05] mb-4',
                )}
              >
                {course.title}
              </h1>
              {course.description && (
                <p className={cm.cn('text-lg text-white/85 mb-6 max-w-2xl leading-relaxed')}>
                  {course.description}
                </p>
              )}
              <div className={cm.cn('flex flex-wrap items-center gap-x-6 gap-y-2 text-sm')}>
                <span className={cm.cn('flex items-center gap-1.5')}>
                  <span
                    className={cm.cn(
                      'material-symbols-outlined text-tertiary-fixed-dim text-[18px] filled-icon',
                    )}
                  >
                    star
                  </span>
                  <span className={cm.cn('font-bold')}>{(course.rating_avg ?? 0).toFixed(1)}</span>
                  <span className={cm.cn('opacity-80')}>
                    {t(
                      'courseDetail.reviewCount',
                      { count: (course.rating_count ?? 0).toLocaleString() },
                      { defaultValue: '({{count}} reviews)' },
                    )}
                  </span>
                </span>
                <span className={cm.cn('opacity-80')}>
                  {t(
                    'courseDetail.students',
                    { count: (course.total_enrollments ?? 0).toLocaleString() },
                    { defaultValue: '{{count}} students enrolled' },
                  )}
                </span>
                {course.published_at && (
                  <span className={cm.cn('opacity-80')}>
                    {t(
                      'courseDetail.published',
                      { when: new Date(course.published_at).toLocaleDateString() },
                      { defaultValue: 'Published {{when}}' },
                    )}
                  </span>
                )}
              </div>
              {course.instructor_id && (
                <div className={cm.cn('mt-6 flex items-center gap-3')}>
                  <img
                    src={
                      course.instructor_avatar_url ??
                      `https://i.pravatar.cc/96?u=${course.instructor_id}`
                    }
                    alt={course.instructor_name ?? 'Instructor'}
                    className={cm.cn(
                      'w-10 h-10 rounded-full border-2 border-surface/30 object-cover',
                    )}
                  />
                  <div>
                    <Link
                      to={`/instructors/${course.instructor_id}`}
                      data-mol-id="course-instructor-link"
                      className={cm.cn('text-sm font-bold hover:underline')}
                    >
                      {course.instructor_name ?? `${APP_NAME} instructor`}
                    </Link>
                    <p className={cm.cn('text-xs opacity-80')}>
                      {t(
                        'courseDetail.instructorRole',
                        { appName: APP_NAME },
                        { defaultValue: 'Lead instructor on {{appName}}' },
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <aside
              className={cm.cn(
                'bg-surface-container-lowest text-on-surface rounded-2xl shadow-2xl overflow-hidden lg:sticky lg:top-8',
              )}
            >
              <div className={cm.cn('relative aspect-video')}>
                <img
                  src={
                    course.thumbnail_url ??
                    `https://picsum.photos/seed/${course.slug ?? course.id}/640/360`
                  }
                  alt={course.title}
                  className={cm.cn('w-full h-full object-cover')}
                />
                {firstFreePreview && (
                  <Link
                    to={`/lesson/${firstFreePreview.id}`}
                    data-mol-id="preview-video"
                    className={cm.cn(
                      'absolute inset-0 flex items-center justify-center bg-foreground/30 hover:bg-foreground/40 transition-colors',
                    )}
                    aria-label={t(
                      'courseDetail.previewVideo',
                      {},
                      { defaultValue: 'Preview video' },
                    )}
                  >
                    <span
                      className={cm.cn(
                        'w-16 h-16 bg-surface/95 rounded-full flex items-center justify-center shadow-lg',
                      )}
                    >
                      <span
                        className={cm.cn(
                          'material-symbols-outlined text-3xl text-primary filled-icon',
                        )}
                      >
                        play_arrow
                      </span>
                    </span>
                  </Link>
                )}
              </div>
              <div className={cm.cn('p-6 space-y-4')}>
                <div className={cm.cn('flex items-baseline gap-3')}>
                  <span
                    data-mol-id="course-price"
                    className={cm.cn('text-3xl font-extrabold text-on-surface')}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {priceCents === 0
                      ? t('nav.free', {}, { defaultValue: 'Free' })
                      : formatDollars(priceCents)}
                  </span>
                  {showOriginal && priceCents > 0 && (
                    <span
                      className={cm.cn('text-base text-on-surface-variant line-through')}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatDollars(originalCents)}
                    </span>
                  )}
                  {showOriginal && priceCents > 0 && (
                    <span
                      className={cm.cn(
                        'ml-auto bg-[var(--color-lectura-green-bg)] text-[var(--color-lectura-green)] text-xs font-bold px-2 py-1 rounded uppercase tracking-widest',
                      )}
                    >
                      {t(
                        'courseDetail.percentOff',
                        { percent: discountPct },
                        { defaultValue: '{{percent}}% off' },
                      )}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onEnroll}
                  disabled={enrollBusy}
                  data-mol-id="enroll-now"
                  className={
                    'block w-full text-center py-4 rounded-xl bg-primary-container text-on-primary font-bold shadow-[0px_8px_24px_rgba(99,54,224,0.25)] hover:bg-primary hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                  }
                >
                  {enrollBusy
                    ? t('courseDetail.checkoutPending', {}, { defaultValue: 'Starting checkout…' })
                    : enrollLabel}
                </button>
                {enrollError && (
                  <p data-mol-id="enroll-error" className={cm.cn('text-xs text-error text-center')}>
                    {enrollError}
                  </p>
                )}
                {!enrollment && firstFreePreview && (
                  <Link
                    to={`/lesson/${firstFreePreview.id}`}
                    data-mol-id="preview-cta"
                    className={cm.cn(
                      'w-full block text-center py-4 rounded-xl bg-surface-container-low text-on-surface font-bold border border-outline-variant/20 hover:bg-surface-container-high transition-colors',
                    )}
                  >
                    {t('courseDetail.watchFreePreview', {}, { defaultValue: 'Watch free preview' })}
                  </Link>
                )}
                <p className={cm.cn('text-xs text-on-surface-variant text-center')}>
                  {t('courseDetail.guarantee', {}, { defaultValue: '30-day money-back guarantee' })}
                </p>
                <ul className={cm.cn('space-y-2 text-sm pt-4 border-t border-outline-variant/20')}>
                  <li className={cm.cn('flex items-center gap-2')}>
                    <span className={cm.cn('material-symbols-outlined text-[18px] text-primary')}>
                      play_circle
                    </span>
                    {t(
                      'courseDetail.includes.video',
                      { hours: totalHours },
                      { defaultValue: '{{hours}} hours of on-demand video' },
                    )}
                  </li>
                  <li className={cm.cn('flex items-center gap-2')}>
                    <span className={cm.cn('material-symbols-outlined text-[18px] text-primary')}>
                      workspace_premium
                    </span>
                    {t(
                      'courseDetail.includes.cert',
                      {},
                      { defaultValue: 'Certificate of completion' },
                    )}
                  </li>
                  <li className={cm.cn('flex items-center gap-2')}>
                    <span className={cm.cn('material-symbols-outlined text-[18px] text-primary')}>
                      all_inclusive
                    </span>
                    {t('courseDetail.includes.lifetime', {}, { defaultValue: 'Lifetime access' })}
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'max-w-7xl mx-auto')}>
          <div className={cm.cn('grid lg:grid-cols-3 gap-10 items-start')}>
            <div className={cm.cn('lg:col-span-2 space-y-12')}>
              {course.description && (
                <div>
                  <h2
                    className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface mb-4')}
                  >
                    {t('courseDetail.about', {}, { defaultValue: 'About this course' })}
                  </h2>
                  <p
                    data-mol-id="course-description"
                    className={cm.cn('text-on-surface leading-relaxed')}
                  >
                    {course.description}
                  </p>
                </div>
              )}

              <div>
                <div className={cm.cn('flex items-baseline justify-between mb-5')}>
                  <h2 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
                    {t('courseDetail.curriculum', {}, { defaultValue: 'Curriculum' })}
                  </h2>
                  <p
                    data-mol-id="curriculum-stats"
                    className={cm.cn('text-sm text-on-surface-variant')}
                  >
                    {t(
                      'courseDetail.curriculumStats',
                      { lectures: totalLectures, hours: totalHours },
                      { defaultValue: '{{lectures}} lectures · {{hours}}h total' },
                    )}
                  </p>
                </div>
                {grouped.length === 0 ? (
                  <p
                    data-mol-id="curriculum-empty"
                    className={cm.cn('text-on-surface-variant text-sm')}
                  >
                    {t(
                      'courseDetail.curriculumEmpty',
                      {},
                      {
                        defaultValue:
                          'Lessons will appear here once the instructor publishes them.',
                      },
                    )}
                  </p>
                ) : (
                  <div
                    className={cm.cn(
                      'bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden',
                    )}
                  >
                    {grouped.map((sec) => {
                      const open = openSection === sec.id
                      return (
                        <div
                          key={sec.id}
                          className={cm.cn('border-b border-outline-variant/15 last:border-0')}
                        >
                          <button
                            type="button"
                            onClick={() => setOpenSection(open ? null : sec.id)}
                            className={
                              'w-full flex items-center justify-between gap-3 px-6 py-5 hover:bg-surface-container-low transition-colors'
                            }
                            aria-expanded={open}
                          >
                            <span className={cm.cn('flex items-center gap-3')}>
                              <span
                                className={cm.cn(
                                  'material-symbols-outlined text-on-surface-variant transition-transform',
                                  open && 'rotate-90',
                                )}
                                aria-hidden="true"
                              >
                                chevron_right
                              </span>
                              <span className={cm.cn('font-bold text-on-surface text-left')}>
                                {sec.title}
                              </span>
                            </span>
                            <span
                              className={cm.cn(
                                'text-xs text-on-surface-variant font-medium uppercase tracking-widest',
                              )}
                            >
                              {sec.lessons.length} · {sec.duration}
                            </span>
                          </button>
                          {open && (
                            <ul
                              className={cm.cn(
                                'bg-surface-container-low/40 divide-y divide-outline-variant/15',
                              )}
                            >
                              {sec.lessons.map((lesson, i) => {
                                const canPlay = lesson.free_preview === true || !!enrollment
                                const inner = (
                                  <>
                                    <span
                                      className={cm.cn(
                                        'material-symbols-outlined text-[20px]',
                                        canPlay ? 'text-primary' : 'text-on-surface-variant',
                                      )}
                                      aria-hidden="true"
                                    >
                                      {canPlay ? 'play_circle' : 'lock'}
                                    </span>
                                    <span className={cm.cn('flex-1 text-sm text-on-surface')}>
                                      {lesson.title}
                                      {lesson.free_preview === true && (
                                        <span
                                          className={cm.cn(
                                            'ml-2 text-[10px] uppercase tracking-widest font-bold text-primary',
                                          )}
                                        >
                                          {t(
                                            'courseDetail.freePreview',
                                            {},
                                            { defaultValue: 'Free preview' },
                                          )}
                                        </span>
                                      )}
                                    </span>
                                    <span
                                      className={cm.cn('text-xs text-on-surface-variant')}
                                      style={{ fontVariantNumeric: 'tabular-nums' }}
                                    >
                                      {formatDuration(Number(lesson.duration_sec ?? 0))}
                                    </span>
                                  </>
                                )
                                return (
                                  <li
                                    key={lesson.id ?? i}
                                    data-mol-id={`lesson-row-${lesson.id}`}
                                    className={cm.cn(
                                      'px-12 py-3 hover:bg-surface-container-low transition-colors',
                                    )}
                                  >
                                    {canPlay ? (
                                      <Link
                                        to={`/lesson/${lesson.id}`}
                                        className={cm.cn('flex items-center gap-3')}
                                      >
                                        {inner}
                                      </Link>
                                    ) : (
                                      <div className={cm.cn('flex items-center gap-3')}>
                                        {inner}
                                      </div>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <h2
                  className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface mb-5')}
                >
                  {t('courseDetail.reviews', {}, { defaultValue: 'Recent reviews' })}
                </h2>
                {reviews.length === 0 ? (
                  <p
                    data-mol-id="reviews-empty"
                    className={cm.cn('text-on-surface-variant text-sm')}
                  >
                    {t(
                      'courseDetail.reviewsEmpty',
                      {},
                      {
                        defaultValue:
                          'Be the first to leave a review after you complete the course.',
                      },
                    )}
                  </p>
                ) : (
                  <div
                    data-mol-id="course-reviews"
                    className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm px-8')}
                  >
                    {reviews.slice(0, 6).map((r) => (
                      <ReviewCard
                        key={r.id}
                        authorName={`Student ${String(r.userId).slice(0, 6)}`}
                        authorRole={t(
                          'courseDetail.studentRole',
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
              </div>
            </div>

            <aside
              className={cm.cn(
                'bg-surface-container-lowest rounded-2xl shadow-sm p-8 space-y-6 lg:sticky lg:top-8',
              )}
            >
              <div>
                <h3
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3',
                  )}
                >
                  {t('courseDetail.thisCourse', {}, { defaultValue: 'About this course' })}
                </h3>
                <dl className={cm.cn('space-y-3 text-sm')}>
                  {[
                    {
                      k: t('courseDetail.level', {}, { defaultValue: 'Level' }),
                      v: course.level ?? 'beginner',
                    },
                    {
                      k: t('courseDetail.lectures', {}, { defaultValue: 'Lectures' }),
                      v: totalLectures.toString(),
                    },
                    {
                      k: t('form.duration', {}, { defaultValue: 'Duration' }),
                      v: `${totalHours}h`,
                    },
                    {
                      k: t('footer.language', {}, { defaultValue: 'Language' }),
                      v: t('courseDetail.languageEnglish', {}, { defaultValue: 'English' }),
                    },
                  ].map((row) => (
                    <div key={row.k} className={cm.cn('flex justify-between')}>
                      <dt className={cm.cn('text-on-surface-variant')}>{row.k}</dt>
                      <dd className={cm.cn('font-bold text-on-surface')}>{row.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              {course.instructor_id && (
                <div className={cm.cn('border-t border-outline-variant/20 pt-6')}>
                  <h3
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-4',
                    )}
                  >
                    {t('courseDetail.instructor', {}, { defaultValue: 'Instructor' })}
                  </h3>
                  <Link
                    to={`/instructors/${course.instructor_id}`}
                    className={'flex items-center gap-4 group'}
                  >
                    <img
                      src={
                        course.instructor_avatar_url ??
                        `https://i.pravatar.cc/128?u=${course.instructor_id}`
                      }
                      alt={course.instructor_name ?? 'Instructor'}
                      className={cm.cn('w-14 h-14 rounded-full object-cover')}
                    />
                    <div>
                      <p
                        className={cm.cn(
                          'font-bold text-on-surface group-hover:text-primary transition-colors',
                        )}
                      >
                        {course.instructor_name ?? `${APP_NAME} instructor`}
                      </p>
                      <p className={cm.cn('text-xs text-on-surface-variant')}>
                        {t('courseDetail.viewProfile', {}, { defaultValue: 'View profile →' })}
                      </p>
                    </div>
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default CourseDetail
