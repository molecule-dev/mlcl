import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AppShell } from '../components/AppShell.js'
import TopNavBar from '../components/TopNavBar.js'

interface CourseRow {
  id: string
  name: string
  description?: string | null
  instructor_id?: string | null
  status?: string | null
}

interface CourseProgress {
  courseId: string
  completedLessonIds: string[]
  completedCount: number
  totalLessons: number
  percentage: number
}

interface UiCourse extends CourseRow {
  enrolled: boolean
  progress: CourseProgress | null
}

const unwrapList = <T,>(res: unknown): T[] => {
  if (Array.isArray(res)) return res as T[]
  if (
    res &&
    typeof res === 'object' &&
    'data' in res &&
    Array.isArray((res as { data: unknown }).data)
  )
    return (res as { data: T[] }).data
  return []
}

const unwrap = <T,>(res: unknown): T | null => {
  if (res && typeof res === 'object' && 'data' in res) return (res as { data: T }).data ?? null
  return (res as T) ?? null
}

/**
 * Course catalog page.
 *
 * Renders two sections:
 *
 *   1. **My courses** — courses the signed-in user is enrolled in or
 *      instructs (from `/api/courses?my=true`), each card decorated with
 *      `/api/courses/:id/progress`. Continue button jumps into
 *      `/course/:id` (CourseDetail).
 *
 *   2. **Browse catalog** — every other course not in the "my" set,
 *      filtered to `status === 'published'` so drafts aren't visible to
 *      students. Each card has an Enroll button that POSTs to
 *      `/api/enrollments` and then refreshes both lists.
 *
 * Without this page `/courses` was aliased to `<DashboardPage />`, so
 * the "Continue Learning · View All" link, the CourseDetail "Back to
 * courses" link, and the SideNavBar Courses entry all dumped users back
 * to the dashboard instead of letting them browse / enroll.
 */
function CoursesPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [searchParams] = useSearchParams()
  const query = (searchParams.get('q') ?? '').trim().toLowerCase()
  const [allCourses, setAllCourses] = useState<CourseRow[] | null>(null)
  const [myCourses, setMyCourses] = useState<UiCourse[] | null>(null)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async (): Promise<void> => {
    setError(null)
    try {
      const [allRes, myRes] = await Promise.all([
        http.get<CourseRow[]>('/api/courses').catch(() => null),
        http.get<CourseRow[]>('/api/courses?my=true').catch(() => null),
      ])
      const all = unwrapList<CourseRow>(allRes)
      const mine = unwrapList<CourseRow>(myRes)
      const withProgress: UiCourse[] = await Promise.all(
        mine.map(async (c) => {
          const pRes = await http
            .get<CourseProgress>(`/api/courses/${c.id}/progress`)
            .catch(() => null)
          const progress = unwrap<CourseProgress>(pRes)
          return { ...c, enrolled: true, progress }
        }),
      )
      setMyCourses(withProgress)
      setAllCourses(all)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setMyCourses([])
      setAllCourses([])
    }
  }

  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const matchesQuery = useMemo(
    () =>
      (c: CourseRow): boolean =>
        !query ||
        c.name.toLowerCase().includes(query) ||
        (c.description ?? '').toLowerCase().includes(query),
    [query],
  )

  const myIds = useMemo(() => new Set((myCourses ?? []).map((c) => c.id)), [myCourses])
  const myFiltered = useMemo(
    () => (myCourses ?? []).filter(matchesQuery),
    [myCourses, matchesQuery],
  )
  const browse = useMemo(
    () =>
      (allCourses ?? []).filter(
        (c) => !myIds.has(c.id) && (c.status === 'published' || !c.status) && matchesQuery(c),
      ),
    [allCourses, myIds, matchesQuery],
  )

  const enroll = async (courseId: string): Promise<void> => {
    setEnrolling(courseId)
    try {
      const profileRes: unknown = await http.get('/api/profile/me').catch(() => null)
      const me = unwrap<{ id: string; email: string }>(profileRes)
      if (!me?.email) throw new Error('Missing profile')
      await http.post('/api/enrollments', {
        course_id: courseId,
        student_email: me.email,
      })
      track({ name: 'course.enrolled', properties: { courseId } })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setEnrolling(null)
    }
  }

  const loading = myCourses === null || allCourses === null

  return (
    <AppShell
      desktopTopBar={
        <TopNavBar contextCrumb={t('coursesPage.crumb', {}, { defaultValue: 'Courses' })} />
      }
      className={cm.cn(cm.surface, 'font-body text-on-surface antialiased')}
      contentClassName={cm.cn(cm.stack(10), cm.sp('px', 8), cm.sp('pb', 12), 'pt-6 md:pt-24')}
      contentMolId="courses-page"
    >
      <header className={cm.stack(2)}>
        <h1 className={cm.cn(cm.textSize('4xl'), cm.fontWeight('extrabold'), 'tracking-tight')}>
          {t('coursesPage.heading', {}, { defaultValue: 'Courses' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-2xl')}>
          {t(
            'coursesPage.subheading',
            {},
            { defaultValue: 'Pick up where you left off, or enroll in something new.' },
          )}
        </p>
        {query ? (
          <p
            className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
            data-mol-id="courses-search-summary"
          >
            {t(
              'coursesPage.searchSummary',
              { query: searchParams.get('q') ?? '' },
              { defaultValue: 'Showing results for “{{query}}”.' },
            )}{' '}
            <button
              type="button"
              className={cm.cn(cm.textPrimary, 'hover:underline')}
              data-mol-id="courses-search-clear"
              onClick={() => navigate('/courses')}
            >
              {t('coursesPage.searchClear', {}, { defaultValue: 'Clear search' })}
            </button>
          </p>
        ) : null}
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error-container/30 text-on-error-container border border-outline-variant/20',
          )}
          role="alert"
          data-mol-id="courses-error"
        >
          {error}
        </div>
      ) : null}

      <section className={cm.stack(6)} data-mol-id="my-courses">
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('coursesPage.myHeading', {}, { defaultValue: 'My courses' })}
        </h2>
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : myFiltered.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('p', 6),
              cm.textSize('sm'),
              'text-on-surface-variant rounded-2xl border border-outline-variant/20 bg-surface-container-lowest',
            )}
            data-mol-id="my-courses-empty"
          >
            {query
              ? t(
                  'coursesPage.myEmptyFiltered',
                  {},
                  { defaultValue: 'None of your courses match this search.' },
                )
              : t(
                  'coursesPage.myEmpty',
                  {},
                  {
                    defaultValue:
                      'You are not enrolled in any courses yet. Pick one from the catalog below.',
                  },
                )}
          </p>
        ) : (
          <div className={cm.cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3')}>
            {myFiltered.map((course) => (
              <article
                key={course.id}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(4),
                  'rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm',
                )}
                data-mol-id={`my-course-${course.id}`}
              >
                <div className={cm.stack(1)}>
                  <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{course.name}</h3>
                  {course.description ? (
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant line-clamp-2')}>
                      {course.description}
                    </p>
                  ) : null}
                </div>
                <div className={cm.stack(2)}>
                  <div
                    className={cm.cn(
                      cm.flex({ justify: 'between' }),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                    )}
                  >
                    <span className={cm.textPrimary}>
                      {t(
                        'coursesPage.progressLabel',
                        { percent: course.progress?.percentage ?? 0 },
                        { defaultValue: '{{percent}}% complete' },
                      )}
                    </span>
                    <span className={'text-on-surface-variant'}>
                      {t(
                        'coursesPage.progressFraction',
                        {
                          done: course.progress?.completedCount ?? 0,
                          total: course.progress?.totalLessons ?? 0,
                        },
                        { defaultValue: '{{done}}/{{total}} lessons' },
                      )}
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      cm.roundedFull,
                      cm.w('full'),
                      'h-1.5 bg-surface-container-highest overflow-hidden',
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.h('full'),
                        'bg-gradient-to-r from-primary to-primary-container',
                      )}
                      style={{ width: `${course.progress?.percentage ?? 0}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className={cm.cn(
                    cm.button(),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    cm.w('full'),
                    'py-2.5 bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-all',
                  )}
                  data-mol-id={`btn-continue-${course.id}`}
                  onClick={() => navigate(`/course/${course.id}`)}
                >
                  {t('coursesPage.continue', {}, { defaultValue: 'Continue course' })}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={cm.stack(6)} data-mol-id="catalog">
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('coursesPage.catalogHeading', {}, { defaultValue: 'Browse catalog' })}
        </h2>
        {loading ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : browse.length === 0 ? (
          <p
            className={cm.cn(
              cm.sp('p', 6),
              cm.textSize('sm'),
              'text-on-surface-variant rounded-2xl border border-outline-variant/20 bg-surface-container-lowest',
            )}
            data-mol-id="catalog-empty"
          >
            {query
              ? t(
                  'coursesPage.catalogEmptyFiltered',
                  {},
                  { defaultValue: 'No catalog courses match this search.' },
                )
              : t(
                  'coursesPage.catalogEmpty',
                  {},
                  { defaultValue: 'No new courses available right now. Check back soon.' },
                )}
          </p>
        ) : (
          <div className={cm.cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3')}>
            {browse.map((course) => (
              <article
                key={course.id}
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(4),
                  'rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm',
                )}
                data-mol-id={`catalog-course-${course.id}`}
              >
                <div className={cm.stack(1)}>
                  <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{course.name}</h3>
                  {course.description ? (
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant line-clamp-3')}>
                      {course.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={cm.cn(
                    cm.button(),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    cm.w('full'),
                    'py-2.5 bg-surface-container-low text-primary rounded-xl hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                  data-mol-id={`btn-enroll-${course.id}`}
                  disabled={enrolling === course.id}
                  onClick={() => void enroll(course.id)}
                >
                  {enrolling === course.id
                    ? t('coursesPage.enrolling', {}, { defaultValue: 'Enrolling…' })
                    : t('coursesPage.enroll', {}, { defaultValue: 'Enroll' })}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}

export default CoursesPage
export { CoursesPage as Courses, CoursesPage }
