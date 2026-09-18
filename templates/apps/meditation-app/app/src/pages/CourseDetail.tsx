import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StillpointTopBar } from '../components/StillpointTopBar.js'
import type { ApiCourseDetail, ApiSession } from '../lib/api.js'
import type { CategoryTone } from '../lib/categoryTone.js'
import { getCategoryAccent } from '../lib/categoryTone.js'

function inferTone(slug: string): CategoryTone {
  const s = slug.toLowerCase()
  if (s.includes('sleep')) return 'sleep'
  if (s.includes('focus')) return 'focus'
  if (s.includes('stress') || s.includes('unwind')) return 'stress'
  if (s.includes('walk') || s.includes('body')) return 'body'
  return 'mindfulness'
}

export function CourseDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [course, setCourse] = useState<ApiCourseDetail | null>(null)
  const [sessionMap, setSessionMap] = useState<Map<string, ApiSession>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get<ApiCourseDetail>(`/courses/${id}`)
      .then(async (res) => {
        if (cancelled) return
        const c = res.data
        setCourse(c)
        const sessionIds = (c.days ?? [])
          .map((d) => d.session_id)
          .filter((sid): sid is string => Boolean(sid))
        if (sessionIds.length > 0) {
          const sessions = await Promise.all(
            sessionIds.map((sid) =>
              http
                .get<ApiSession>(`/sessions/${sid}`)
                .then((r) => r.data)
                .catch(() => null),
            ),
          )
          if (cancelled) return
          const map = new Map<string, ApiSession>()
          for (const s of sessions) if (s?.id) map.set(s.id, s)
          setSessionMap(map)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  const tone = course ? inferTone(course.slug) : 'mindfulness'
  const accent = getCategoryAccent(tone)

  if (loading) {
    return (
      <>
        <StillpointTopBar
          title={t('nav.course', {}, { defaultValue: 'Course' })}
          eyebrow={
            <Link
              to="/courses"
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              ← {t('stillpoint.courseDetail.back', {}, { defaultValue: 'Courses' })}
            </Link>
          }
        />
        <div
          data-testid="course-loading"
          className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      </>
    )
  }

  if (error || !course) {
    return (
      <>
        <StillpointTopBar
          title={t('nav.course', {}, { defaultValue: 'Course' })}
          eyebrow={
            <Link
              to="/courses"
              className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
            >
              ← {t('stillpoint.courseDetail.back', {}, { defaultValue: 'Courses' })}
            </Link>
          }
        />
        <div
          data-testid="course-not-found"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-2xl border border-dashed border-outline text-on-surface-variant',
          )}
        >
          {t('stillpoint.courseDetail.notFound', {}, { defaultValue: 'Course not found.' })}
        </div>
      </>
    )
  }

  return (
    <>
      <StillpointTopBar
        title={course.title}
        eyebrow={
          <Link
            to="/courses"
            className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
          >
            ← {t('stillpoint.courseDetail.back', {}, { defaultValue: 'Courses' })}
          </Link>
        }
      />

      <div
        data-testid="course-hero"
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('p', 8),
          'rounded-[2rem] text-white relative overflow-hidden bg-gradient-to-br from-[var(--color-hero-from)] via-primary to-[var(--color-cat-mindfulness)]',
        )}
      >
        <div
          className={cm.cn(
            'absolute -top-24 -left-20 w-80 h-80 bg-surface/10 rounded-full blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            'absolute -bottom-32 -right-20 w-96 h-96 bg-accent/30 rounded-full blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn('relative z-10 max-w-2xl')}>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-white/70',
            )}
          >
            {t(
              'stillpoint.courseDetail.eyebrow',
              { count: course.day_count },
              { defaultValue: '{{count}}-day course' },
            )}
          </span>
          {course.description ? (
            <p className={cm.cn(cm.textSize('lg'), 'text-white/90 mt-3 leading-relaxed')}>
              {course.description}
            </p>
          ) : null}
        </div>
      </div>

      <div
        data-testid="course-curriculum"
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline/30',
        )}
      >
        <h2 className={cm.cn(cm.fontWeight('bold'), 'text-lg text-on-surface tracking-tight mb-4')}>
          {t('stillpoint.courseDetail.curriculumHeading', {}, { defaultValue: 'Curriculum' })}
        </h2>
        {(course.days ?? []).length === 0 ? (
          <div className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant')}>
            {t('stillpoint.courseDetail.noDays', {}, { defaultValue: 'Curriculum coming soon.' })}
          </div>
        ) : (
          <ul className={cm.cn('list-none divide-y divide-outline/30')}>
            {(course.days ?? []).map((d) => {
              const session = d.session_id ? sessionMap.get(d.session_id) : null
              const minutes = session
                ? Math.max(1, Math.round(session.duration_seconds / 60))
                : null
              return (
                <li
                  key={d.id ?? `${d.day_number}-${d.title}`}
                  data-testid={`course-day-${d.day_number}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                    cm.sp('py', 4),
                  )}
                >
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      aria-hidden="true"
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.fontWeight('bold'),
                        'w-9 h-9 rounded-full text-xs',
                      )}
                      style={{ backgroundColor: accent.softBg, color: accent.fg }}
                    >
                      {d.day_number}
                    </span>
                    <div>
                      <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>
                        {d.title ??
                          session?.title ??
                          t(
                            'stillpoint.courseDetail.dayFallback',
                            { number: d.day_number },
                            { defaultValue: 'Day {{number}}' },
                          )}
                      </p>
                      {minutes ? (
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t('common.minutesMin', { minutes }, { defaultValue: '{{minutes}} min' })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {session ? (
                    <Link
                      data-testid={`course-day-begin-${d.day_number}`}
                      to={`/sessions/${session.slug || session.id}`}
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('semibold'),
                        'rounded-full bg-primary text-white hover:bg-primary/90 transition-colors',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cm.cn('material-symbols-outlined text-base')}
                      >
                        play_circle
                      </span>
                      {t('stillpoint.courseDetail.begin', {}, { defaultValue: 'Begin' })}
                    </Link>
                  ) : (
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'uppercase tracking-widest font-bold text-on-surface-variant',
                      )}
                    >
                      {t('stillpoint.courseDetail.locked', {}, { defaultValue: 'Locked' })}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
