import { useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CourseTileCard } from '../components/CourseTileCard.js'
import type { CourseRow } from '../lib/api.js'

type FilterKey = 'all' | 'enrolled' | 'teaching' | 'browse'

interface MeIdentity {
  id?: string
}

interface AuthUser {
  id: string
  email?: string
}

export function Courses() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<AuthUser>()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [browseCourses, setBrowseCourses] = useState<CourseRow[]>([])
  const [me, setMe] = useState<MeIdentity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({ code: '', title: '', term: '', description: '' })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get<CourseRow[]>('/api/courses'),
      http.get<CourseRow[]>('/api/courses?my=false'),
    ])
      .then(([mine, browse]) => {
        if (cancelled) return
        setCourses(mine.data)
        setBrowseCourses(browse.data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load courses')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // Pull the signed-in user's id once so we can split mine into "enrolled vs teaching"
  // — the /courses endpoint already filters but the tabs need the local split.
  useEffect(() => {
    let cancelled = false
    http
      .get<{ data?: MeIdentity } | MeIdentity>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = (res.data as { data?: MeIdentity })?.data ?? (res.data as MeIdentity)
        setMe(body)
      })
      .catch(() => {
        // /users/me may not exist on every variant — fall back to the cookie-backed
        // auth state. Post-M1-1 the bearer is in-memory + an httpOnly cookie, not
        // localStorage, so useAuth() is the real source of truth for the user id.
        if (cancelled) return
        if (user?.id) setMe({ id: user.id })
        // else: tabs just won't split enrolled vs teaching
      })
    return () => {
      cancelled = true
    }
  }, [http, user])

  const tabs: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t('courses.filterAll', {}, { defaultValue: 'All courses' }) },
    { key: 'enrolled', label: t('courses.filterEnrolled', {}, { defaultValue: 'Enrolled' }) },
    { key: 'teaching', label: t('courses.filterTeaching', {}, { defaultValue: 'Teaching' }) },
    { key: 'browse', label: t('courses.filterBrowse', {}, { defaultValue: 'Browse catalogue' }) },
  ]

  const visible = useMemo(() => {
    if (filter === 'browse') {
      const myIds = new Set(courses.map((c) => c.id))
      return browseCourses.filter((c) => !myIds.has(c.id))
    }
    if (filter === 'teaching' && me?.id) return courses.filter((c) => c.instructor_id === me.id)
    if (filter === 'enrolled' && me?.id) return courses.filter((c) => c.instructor_id !== me.id)
    return courses
  }, [filter, courses, browseCourses, me])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.code.trim() || !form.title.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await http.post<CourseRow>('/api/courses', {
        code: form.code.trim(),
        title: form.title.trim(),
        term: form.term.trim() || null,
        description: form.description.trim(),
        is_published: true,
      })
      setCourses((prev) => [res.data, ...prev])
      setForm({ code: '', title: '', term: '', description: '' })
      setShowCreate(false)
      // Domain event: a course went live in the catalogue.
      void track({
        name: 'course.created',
        properties: { courseId: res.data.id, code: res.data.code },
      })
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create course')
    } finally {
      setCreating(false)
    }
  }

  const handleEnroll = async (courseId: string) => {
    try {
      await http.post(`/api/courses/${courseId}/enroll`, {})
      // Domain event: enrollment is the app's core student funnel.
      void track({ name: 'course.enrolled', properties: { courseId } })
      const next = await http.get<CourseRow[]>('/api/courses')
      setCourses(next.data)
    } catch (err: unknown) {
      console.error('Enroll failed', err)
    }
  }

  return (
    <div className={cm.stack(8)} data-testid="courses-root">
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div className={cm.stack(1)}>
          <span className={cm.cn('text-[11px] font-black uppercase tracking-widest text-primary')}>
            {t('courses.eyebrow', {}, { defaultValue: 'Courses' })}
          </span>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t('courses.title', {}, { defaultValue: 'Your learning library' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-xl')}>
            {t(
              'courses.body',
              {},
              {
                defaultValue:
                  'Resume what you started, prep next week, or browse offerings you can drop into.',
              },
            )}
          </p>
        </div>
        <button
          type="button"
          data-testid="courses-create-button"
          onClick={() => setShowCreate((v) => !v)}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 2 }),
            cm.fontWeight('bold'),
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/20',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
          {t('courses.create', {}, { defaultValue: 'Create course' })}
        </button>
      </header>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          data-testid="courses-create-form"
          className={cm.cn(
            cm.sp('p', 6),
            cm.stack(4),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/15',
          )}
        >
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('courses.fieldCode', {}, { defaultValue: 'Course code' })}
              </span>
              <input
                required
                data-testid="courses-create-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="MTH 101"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface-container-low border-0 text-on-surface focus:ring-2 focus:ring-primary/30 outline-none',
                )}
              />
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.title', {}, { defaultValue: 'Title' })}
              </span>
              <input
                required
                data-testid="courses-create-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Introduction to Calculus"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface-container-low border-0 text-on-surface focus:ring-2 focus:ring-primary/30 outline-none',
                )}
              />
            </label>
            <label className={cm.stack(1)}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('courses.fieldTerm', {}, { defaultValue: 'Term' })}
              </span>
              <input
                value={form.term}
                onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
                placeholder="Spring 2026"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface-container-low border-0 text-on-surface focus:ring-2 focus:ring-primary/30 outline-none',
                )}
              />
            </label>
            <label className={cm.cn(cm.stack(1), 'md:col-span-2')}>
              <span
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.description', {}, { defaultValue: 'Description' })}
              </span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.textSize('sm'),
                  'rounded-xl bg-surface-container-low border-0 text-on-surface focus:ring-2 focus:ring-primary/30 outline-none',
                )}
              />
            </label>
          </div>
          {createError ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
              {createError}
            </p>
          ) : null}
          <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
            <button
              type="submit"
              disabled={creating}
              data-testid="courses-create-submit"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-50 transition-colors',
              )}
            >
              {creating
                ? t('common.creatingEllipsis', {}, { defaultValue: 'Creating…' })
                : t('courses.createSubmit', {}, { defaultValue: 'Create course' })}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors',
              )}
            >
              {t('common.cancel', {}, { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      )}

      <nav className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'flex-wrap')}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.fontWeight('semibold'),
              cm.textSize('sm'),
              'rounded-full transition-colors',
              filter === tab.key
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {error ? (
        <div
          role="alert"
          className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-error-container text-on-error-container')}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('courses.loading', {}, { defaultValue: 'Loading courses…' })}
        </div>
      ) : visible.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('p', 8),
            cm.textCenter,
            'rounded-2xl bg-surface-container-lowest text-on-surface-variant',
          )}
        >
          {filter === 'browse'
            ? t(
                'courses.noBrowse',
                {},
                {
                  defaultValue: 'No courses to browse — you are enrolled in everything published.',
                },
              )
            : t(
                'courses.noCourses',
                {},
                { defaultValue: 'No courses yet — create one with the button above.' },
              )}
        </div>
      ) : (
        <section
          data-testid="courses-list"
          className={cm.cn(
            cm.grid({ cols: 1, gap: 'lg' }),
            'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3',
          )}
        >
          {visible.map((course) => (
            <div key={course.id} className={cm.stack(2)}>
              <CourseTileCard
                id={course.id}
                title={course.title}
                code={course.code}
                instructor={course.term ?? ''}
                level="INTERMEDIATE"
                imageSeed={`vc-courses-${course.id}`}
                progressPercent={0}
                lessonsRemaining={undefined}
                enrolled={filter !== 'browse'}
              />
              {filter === 'browse' ? (
                <button
                  type="button"
                  data-testid={`courses-enroll-${course.id}`}
                  onClick={() => handleEnroll(course.id)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.fontWeight('semibold'),
                    cm.textSize('sm'),
                    'self-start rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors',
                  )}
                >
                  {t('courses.enroll', {}, { defaultValue: 'Enroll in this course' })}
                </button>
              ) : null}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

export default Courses
