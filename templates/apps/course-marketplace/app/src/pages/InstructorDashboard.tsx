/**
 * InstructorDashboard — owner studio for the signed-in instructor.
 *
 * Reads:
 *   - /api/instructors/me        → profile (name + is_instructor flag)
 *   - /api/instructors/:id/courses → owner sees drafts + published
 *   - /api/instructors/:id/stats   → KPIs (totals)
 *   - /api/instructors/:id/earnings → revenue per course
 *
 * If the user hasn't become an instructor yet (is_instructor=false),
 * surfaces a primary CTA that POSTs /api/instructors/me/become and
 * reloads. Otherwise renders the courses table with quick links to
 * the per-course editor.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CourseHeroBanner } from '../components/CourseHeroBanner.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'
import { api, type CourseSummary, type Instructor } from '../lib/api.js'

interface InstructorStats {
  instructor_id: string
  totalCourses: number
  publishedCourses: number
  totalEnrollments: number
  totalReviews: number
  averageRating: number
  totalLessons: number
}

interface InstructorEarnings {
  instructor_id: string
  total_cents: number
  currency: string
  courses: Array<{
    course_id: string
    title: string
    enrollments: number
    price_cents: number
    total_cents: number
  }>
}

function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function InstructorDashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth<UserProfile>()

  const [me, setMe] = useState<Instructor | null>(null)
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [stats, setStats] = useState<InstructorStats | null>(null)
  const [earnings, setEarnings] = useState<InstructorEarnings | null>(null)
  const [loading, setLoading] = useState(true)
  const [becoming, setBecoming] = useState(false)
  const [creatingCourse, setCreatingCourse] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const profile = await api<Instructor>('/instructors/me')
      setMe(profile)
      if (profile.is_instructor && profile.id) {
        const [c, s, e] = await Promise.all([
          api<CourseSummary[]>(`/instructors/${profile.id}/courses`).catch(() => []),
          api<InstructorStats>(`/instructors/${profile.id}/stats`).catch(() => null),
          api<InstructorEarnings>(`/instructors/${profile.id}/earnings`).catch(() => null),
        ])
        setCourses(Array.isArray(c) ? c : [])
        setStats(s ?? null)
        setEarnings(e ?? null)
      } else {
        setCourses([])
        setStats(null)
        setEarnings(null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load instructor dashboard'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const becomeInstructor = async () => {
    if (becoming) return
    setBecoming(true)
    try {
      await api<Instructor>('/instructors/me/become', {
        method: 'POST',
        body: { bio: `New to teaching on ${APP_NAME}.` },
      })
      await load()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to become an instructor'
      setError(message)
    } finally {
      setBecoming(false)
    }
  }

  // Create a draft course server-side, then jump straight into the editor
  // for the new course id. Using a literal "new" id was scaffolded but the
  // editor validates uuid-only ids and 404'd, so the link was dead.
  const createCourseAndOpen = async () => {
    if (creatingCourse) return
    setCreatingCourse(true)
    setError(null)
    try {
      const draft = await api<CourseSummary>('/courses', {
        method: 'POST',
        body: {
          title: t('instructorDashboard.newCourseTitle', {}, { defaultValue: 'Untitled course' }),
          description: '',
          category: 'general',
          price_cents: 0,
        },
      })
      navigate(`/instructor/courses/${draft.id}/edit`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create course'
      setError(message)
    } finally {
      setCreatingCourse(false)
    }
  }

  const earningsByCourse = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of earnings?.courses ?? []) {
      map.set(String(e.course_id), e.total_cents)
    }
    return map
  }, [earnings])

  if (loading) {
    return (
      <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
        <Header />
        <main className={cm.cn('flex-1 flex items-center justify-center')}>
          <p
            data-mol-id="instructor-dashboard-loading"
            className={cm.cn('text-on-surface-variant text-sm')}
          >
            {t('instructorDashboard.loading', {}, { defaultValue: 'Loading instructor studio…' })}
          </p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!me?.is_instructor) {
    return (
      <div className={cm.cn('min-h-screen flex flex-col bg-background')}>
        <Header />
        <main className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'max-w-3xl mx-auto w-full flex-1')}>
          <div
            data-mol-id="become-instructor-card"
            className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm p-12 text-center')}
          >
            <span
              className={cm.cn('material-symbols-outlined text-5xl text-primary mb-3')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              workspace_premium
            </span>
            <h1 className={cm.cn('text-3xl font-extrabold text-on-surface mb-3')}>
              {t('instructorDashboard.become.title', {}, { defaultValue: 'Become an instructor' })}
            </h1>
            <p
              className={cm.cn(
                'text-on-surface-variant text-sm mb-6 max-w-md mx-auto leading-relaxed',
              )}
            >
              {t(
                'instructorDashboard.become.body',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Publish your first course on {{appName}}. Once you accept the instructor agreement we will set up your studio.',
                },
              )}
            </p>
            {error && (
              <p data-mol-id="become-error" className={cm.cn('text-sm text-error mb-3')}>
                {error}
              </p>
            )}
            <button
              type="button"
              data-mol-id="become-instructor-btn"
              onClick={becomeInstructor}
              disabled={becoming}
              className={cm.cn(
                'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-primary-container text-on-primary hover:bg-primary disabled:opacity-50 transition-colors',
              )}
            >
              {becoming
                ? t('instructorDashboard.becoming', {}, { defaultValue: 'Setting up your studio…' })
                : t('instructorDashboard.becomeCta', {}, { defaultValue: 'Become an instructor' })}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const KPIS = [
    {
      id: 'students',
      icon: 'group',
      label: 'Total students',
      value: stats?.totalEnrollments?.toLocaleString() ?? '0',
      accent: 'primary' as const,
    },
    {
      id: 'revenue',
      icon: 'paid',
      label: 'Lifetime revenue',
      value: dollars(Number(earnings?.total_cents ?? 0)),
      accent: 'gold' as const,
    },
    {
      id: 'rating',
      icon: 'star',
      label: 'Avg rating',
      value: stats?.averageRating ? stats.averageRating.toFixed(2) : '—',
      accent: 'green' as const,
    },
    {
      id: 'lessons',
      icon: 'play_circle',
      label: 'Lessons authored',
      value: stats?.totalLessons?.toLocaleString() ?? '0',
      accent: 'primary' as const,
    },
  ]

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
          eyebrow={t('instructorDashboard.eyebrow', {}, { defaultValue: 'Instructor studio' })}
          title={t(
            'instructorDashboard.title',
            {
              name:
                me.name ??
                user?.name ??
                t('instructorDashboard.fallbackName', {}, { defaultValue: 'instructor' }),
            },
            { defaultValue: 'Welcome back, {{name}}' },
          )}
          subtitle={t(
            'instructorDashboard.subtitle',
            { count: stats?.publishedCourses ?? 0, total: stats?.totalEnrollments ?? 0 },
            {
              defaultValue: 'You have {{count}} published courses reaching {{total}} students.',
            },
          )}
          ctaLabel={
            creatingCourse
              ? t('instructorDashboard.creating', {}, { defaultValue: 'Creating draft…' })
              : t('instructorDashboard.cta', {}, { defaultValue: 'Create new course' })
          }
          ctaOnClick={createCourseAndOpen}
          ctaDisabled={creatingCourse}
          icon="library_books"
        />

        <section
          data-mol-id="instructor-kpis"
          className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6')}
        >
          {KPIS.map((k) => (
            <div
              key={k.id}
              data-mol-id={`kpi-${k.id}`}
              className={cm.cn(
                'bg-surface-container-lowest rounded-2xl shadow-sm p-6 border-l-4',
                k.accent === 'primary' && 'border-primary',
                k.accent === 'gold' && 'border-[var(--color-lectura-gold)]',
                k.accent === 'green' && 'border-[var(--color-lectura-green)]',
              )}
            >
              <div className={cm.cn('flex items-center justify-between mb-3')}>
                <div
                  className={cm.cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    k.accent === 'primary' && 'bg-primary-fixed text-primary',
                    k.accent === 'gold' &&
                      'bg-[var(--color-lectura-gold-bg)] text-[var(--color-lectura-gold)]',
                    k.accent === 'green' &&
                      'bg-[var(--color-lectura-green-bg)] text-[var(--color-lectura-green)]',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[20px]')}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    {k.icon}
                  </span>
                </div>
              </div>
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t(`instructorDashboard.kpi.${k.id}`, {}, { defaultValue: k.label })}
              </p>
              <p
                className={cm.cn('text-3xl font-extrabold text-on-surface mt-1 tracking-tighter')}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {k.value}
              </p>
            </div>
          ))}
        </section>

        <section
          className={cm.cn('bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden')}
        >
          <header
            className={cm.cn(
              'flex items-center justify-between px-8 py-5 border-b border-outline-variant/15',
            )}
          >
            <div>
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('instructorDashboard.yourCourses', {}, { defaultValue: 'Your courses' })}
              </p>
              <h2 className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface mt-1')}>
                {t(
                  'instructorDashboard.coursesCount',
                  { count: courses.length },
                  { defaultValue: '{{count}} active courses' },
                )}
              </h2>
            </div>
            <button
              type="button"
              onClick={createCourseAndOpen}
              disabled={creatingCourse}
              data-mol-id="instructor-new-course"
              className={
                'inline-flex items-center gap-2 bg-primary-container text-on-primary px-4 py-2 rounded-full text-sm font-bold hover:bg-primary transition-colors shadow-md disabled:opacity-60'
              }
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
              {creatingCourse
                ? t('instructorDashboard.creating', {}, { defaultValue: 'Creating draft…' })
                : t('instructorDashboard.newCourse', {}, { defaultValue: 'New course' })}
            </button>
          </header>
          {courses.length === 0 ? (
            <p
              data-mol-id="instructor-courses-empty"
              className={cm.cn('px-8 py-12 text-center text-on-surface-variant text-sm')}
            >
              {t(
                'instructorDashboard.coursesEmpty',
                {},
                { defaultValue: 'No courses yet — start with “New course”.' },
              )}
            </p>
          ) : (
            <table data-mol-id="instructor-courses-table" className={cm.cn('w-full text-sm')}>
              <thead className={cm.cn('bg-surface-container-low/40')}>
                <tr
                  className={cm.cn(
                    'text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  <th className={cm.cn('px-8 py-3')}>
                    {t('form.title', {}, { defaultValue: 'Title' })}
                  </th>
                  <th className={cm.cn('px-3 py-3 text-right')}>
                    {t('instructorDashboard.col.students', {}, { defaultValue: 'Students' })}
                  </th>
                  <th className={cm.cn('px-3 py-3 text-right')}>
                    {t('form.rating', {}, { defaultValue: 'Rating' })}
                  </th>
                  <th className={cm.cn('px-3 py-3 text-right')}>
                    {t('instructorDashboard.col.revenue', {}, { defaultValue: 'Revenue' })}
                  </th>
                  <th className={cm.cn('px-8 py-3 text-right')}>
                    {t('nav.status', {}, { defaultValue: 'Status' })}
                  </th>
                </tr>
              </thead>
              <tbody className={cm.cn('divide-y divide-outline-variant/15')}>
                {courses.map((c) => (
                  <tr
                    key={c.id}
                    data-mol-id={`instructor-course-row-${c.id}`}
                    className={cm.cn('hover:bg-surface-container-low/40 transition-colors')}
                  >
                    <td className={cm.cn('px-8 py-4')}>
                      <Link
                        to={`/instructor/courses/${c.id}/edit`}
                        className={'font-bold text-on-surface hover:text-primary transition-colors'}
                      >
                        {c.title}
                      </Link>
                    </td>
                    <td
                      className={cm.cn('px-3 py-4 text-right text-on-surface')}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {(c.total_enrollments ?? 0).toLocaleString()}
                    </td>
                    <td
                      className={cm.cn('px-3 py-4 text-right text-on-surface')}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {c.rating_avg && c.rating_avg > 0 ? c.rating_avg.toFixed(1) : '—'}
                    </td>
                    <td
                      className={cm.cn('px-3 py-4 text-right text-on-surface font-bold')}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {dollars(earningsByCourse.get(String(c.id)) ?? 0)}
                    </td>
                    <td className={cm.cn('px-8 py-4 text-right')}>
                      <span
                        className={cm.cn(
                          'inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full',
                          c.status === 'published'
                            ? 'bg-[var(--color-lectura-green-bg)] text-[var(--color-lectura-green)]'
                            : c.status === 'archived'
                              ? 'bg-surface-container-high text-on-surface-variant'
                              : 'bg-secondary-container text-on-secondary-container',
                        )}
                      >
                        {c.status ?? 'draft'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default InstructorDashboard
