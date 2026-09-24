/**
 * MyLearning — authenticated dashboard listing the caller's enrollments.
 *
 * Reads /api/enrollments (decorated with progress + lesson counts).
 * The first-load triggers seedDemoForUser server-side so the page has
 * realistic content immediately. Stat triad is computed from the
 * fetched enrollments. Per-card "Continue" link resolves to the
 * first incomplete lesson (or the course detail page if there is no
 * curriculum yet).
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LoadErrorBanner } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { CourseHeroBanner } from '../components/CourseHeroBanner.js'
import { EnrolledCourseCard } from '../components/EnrolledCourseCard.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { api, type EnrolledCourse, type Lesson } from '../lib/api.js'

const FILTERS = ['all', 'in-progress', 'completed', 'not-started'] as const

export function MyLearning() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')
  const [enrollments, setEnrollments] = useState<EnrolledCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [continueHrefByCourse, setContinueHrefByCourse] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const rows = await api<EnrolledCourse[]>('/enrollments')
      const safe = Array.isArray(rows) ? rows : []
      setEnrollments(safe)
      // Pre-resolve "continue from" link for each course by finding the
      // first incomplete lesson. Done in parallel; falls back to course
      // detail page if /lessons/course/:id fails or the course is empty.
      const entries = await Promise.all(
        safe.map(async (e) => {
          const courseId = String(e.course_id)
          try {
            const lessons = await api<Lesson[]>(`/lessons/course/${courseId}`)
            const ordered = [...lessons].sort(
              (a, b) =>
                Number(a.sort_order ?? a.order_index ?? 0) -
                Number(b.sort_order ?? b.order_index ?? 0),
            )
            const next = ordered.find((l) => l.is_completed !== true) ?? ordered[0]
            if (next) return [courseId, `/lesson/${next.id}`] as const
            // intentional noop: lesson-fetch failure falls through to course detail URL
          } catch (_error) {
            // ignore; fall through to course detail
          }
          return [courseId, `/courses/${courseId}`] as const
        }),
      )
      const map: Record<string, string> = {}
      for (const [k, v] of entries) map[k] = v
      setContinueHrefByCourse(map)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load your library. Try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    return enrollments.filter((e) => {
      const total = Number(e.lessons_total ?? 0)
      const done = Number(e.lessons_completed ?? 0)
      if (filter === 'all') return true
      if (filter === 'completed') return total > 0 && done >= total
      if (filter === 'in-progress') return done > 0 && done < total
      if (filter === 'not-started') return done === 0
      return true
    })
  }, [enrollments, filter])

  const stats = useMemo(() => {
    const enrolled = enrollments.length
    const completed = enrollments.filter(
      (e) =>
        Number(e.lessons_completed ?? 0) >= Number(e.lessons_total ?? 0) &&
        (e.lessons_total ?? 0) > 0,
    ).length
    // Hours learned: sum duration_min × completion ratio across enrollments.
    const minutes = enrollments.reduce((sum, e) => {
      const duration = Number(e.duration_min ?? 0)
      const total = Number(e.lessons_total ?? 0)
      const done = Number(e.lessons_completed ?? 0)
      if (total === 0) return sum
      return sum + (duration * done) / total
    }, 0)
    return { enrolled, completed, hours: Math.max(0, Math.round(minutes / 60)) }
  }, [enrollments])

  const STATS_TRIAD = [
    {
      icon: 'menu_book',
      value: stats.enrolled,
      labelKey: 'myLearning.stats.enrolled',
      labelDefault: 'Enrolled',
      accent: 'primary' as const,
    },
    {
      icon: 'task_alt',
      value: stats.completed,
      labelKey: 'myLearning.stats.completed',
      labelDefault: 'Completed',
      accent: 'green' as const,
    },
    {
      icon: 'schedule',
      value: stats.hours,
      labelKey: 'myLearning.stats.hours',
      labelDefault: 'Hours learned',
      accent: 'gold' as const,
    },
  ]

  const filterLabels: Record<(typeof FILTERS)[number], string> = {
    all: t('status.all', {}, { defaultValue: 'All' }),
    'in-progress': t('status.inProgress', {}, { defaultValue: 'In progress' }),
    completed: t('common.completed', {}, { defaultValue: 'Completed' }),
    'not-started': t('myLearning.filter.notStarted', {}, { defaultValue: 'Not started' }),
  }

  const inProgress = enrollments.find(
    (e) =>
      Number(e.lessons_completed ?? 0) > 0 &&
      Number(e.lessons_completed ?? 0) < Number(e.lessons_total ?? 0),
  )
  const heroCta = inProgress
    ? (continueHrefByCourse[String(inProgress.course_id)] ?? `/courses/${inProgress.course_id}`)
    : enrollments[0]
      ? `/courses/${enrollments[0].course_id}`
      : '/browse'

  return (
    <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
      <Header />
      <main
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 12),
          'max-w-7xl mx-auto w-full flex-1 space-y-12',
        )}
      >
        <CourseHeroBanner
          eyebrow={t(
            'myLearning.hero.eyebrow',
            { name: user?.name ?? t('myLearning.fallbackName', {}, { defaultValue: 'learner' }) },
            { defaultValue: 'Welcome back, {{name}}' },
          )}
          title={t('myLearning.hero.title', {}, { defaultValue: 'Pick up where you left off.' })}
          subtitle={t(
            'myLearning.hero.subtitle',
            { count: stats.enrolled },
            {
              defaultValue: '{{count}} courses in your library. Keep the momentum going.',
            },
          )}
          ctaLabel={t('myLearning.hero.cta', {}, { defaultValue: 'Continue learning' })}
          ctaTo={heroCta}
          icon="auto_stories"
        />

        <section data-mol-id="my-learning-stats">
          <div className={cm.cn('flex flex-wrap gap-4')}>
            {STATS_TRIAD.map((stat) => (
              <div
                key={stat.labelKey}
                data-mol-id={`stat-${stat.labelKey}`}
                className={cm.cn(
                  'flex items-center gap-4 px-6 py-5 rounded-2xl bg-surface-container-lowest shadow-sm flex-1 min-w-[220px] border-l-4',
                  stat.accent === 'primary' && 'border-primary',
                  stat.accent === 'green' && 'border-[var(--color-lectura-green)]',
                  stat.accent === 'gold' && 'border-[var(--color-lectura-gold)]',
                )}
              >
                <div
                  className={cm.cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    stat.accent === 'primary' && 'bg-primary-fixed text-primary',
                    stat.accent === 'green' &&
                      'bg-[var(--color-lectura-green-bg)] text-[var(--color-lectura-green)]',
                    stat.accent === 'gold' &&
                      'bg-[var(--color-lectura-gold-bg)] text-[var(--color-lectura-gold)]',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {stat.icon}
                  </span>
                </div>
                <div>
                  <p
                    className={cm.cn('text-3xl font-extrabold text-on-surface tracking-tighter')}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className={cm.cn(
                      'text-[10px] font-black uppercase tracking-widest text-on-surface-variant mt-1',
                    )}
                  >
                    {t(stat.labelKey, {}, { defaultValue: stat.labelDefault })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section data-mol-id="my-learning-list">
          <div
            className={cm.cn(
              'flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2 border-surface-container-high pb-4 mb-8',
            )}
          >
            <div className={cm.cn('flex flex-wrap gap-2')}>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  data-mol-id={`filter-${f}`}
                  onClick={() => setFilter(f)}
                  className={cm.cn(
                    'whitespace-nowrap px-4 py-2.5 text-sm min-h-[40px] transition-colors',
                    filter === f
                      ? 'text-primary font-bold border-b-2 border-primary -mb-[18px]'
                      : 'text-on-surface-variant font-medium hover:text-primary',
                  )}
                  aria-pressed={filter === f}
                >
                  {filterLabels[f]}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <p
              data-mol-id="my-learning-loading"
              className={cm.cn('text-on-surface-variant text-sm py-12 text-center')}
            >
              {t('myLearning.loading', {}, { defaultValue: 'Loading your library…' })}
            </p>
          ) : loadError ? (
            <LoadErrorBanner
              data-mol-id="my-learning-error"
              message={t(
                'myLearning.error.title',
                {},
                { defaultValue: 'Could not load your library' },
              )}
              detail={loadError}
              onRetry={load}
              retryLabel={t('common.retry', {}, { defaultValue: 'Try again' })}
              retryMolId="my-learning-retry"
            />
          ) : filtered.length === 0 ? (
            <div
              data-mol-id="my-learning-empty"
              className={cm.cn(
                'bg-surface-container-lowest rounded-2xl shadow-sm p-12 text-center',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-5xl text-primary mb-3')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_stories
              </span>
              <p className={cm.cn('text-lg font-bold text-on-surface mb-2')}>
                {t(
                  'myLearning.empty.title',
                  {},
                  { defaultValue: 'No courses match this filter yet' },
                )}
              </p>
              <p className={cm.cn('text-on-surface-variant text-sm mb-4')}>
                {t(
                  'myLearning.empty.body',
                  {},
                  { defaultValue: 'Browse new courses to add to your archive.' },
                )}
              </p>
              <Link
                to="/browse"
                className={
                  'inline-block bg-primary-container text-on-primary px-5 py-2.5 rounded-xl font-bold'
                }
              >
                {t('myLearning.empty.cta', {}, { defaultValue: 'Browse catalog' })}
              </Link>
            </div>
          ) : (
            <div className={cm.cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6')}>
              {filtered.map((e) => (
                <EnrolledCourseCard
                  key={e.enrollment_id ?? e.course_id}
                  id={String(e.course_id)}
                  title={e.title ?? 'Course'}
                  instructor={e.instructor_name ?? `${APP_NAME} instructor`}
                  lessonsTotal={Number(e.lessons_total ?? 0)}
                  lessonsCompleted={Number(e.lessons_completed ?? 0)}
                  imageSeed={e.slug ?? String(e.course_id)}
                  continueHref={
                    continueHrefByCourse[String(e.course_id)] ?? `/courses/${e.course_id}`
                  }
                  certificateHref={`/my-learning/${e.course_id}/certificate`}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default MyLearning
