import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { StillpointTopBar } from '../components/StillpointTopBar.js'
import type { ApiCourse } from '../lib/api.js'
import type { CategoryTone } from '../lib/categoryTone.js'
import { getCategoryAccent } from '../lib/categoryTone.js'

function inferTone(course: ApiCourse): CategoryTone {
  const slug = course.slug.toLowerCase()
  if (slug.includes('sleep')) return 'sleep'
  if (slug.includes('focus') || slug.includes('attention')) return 'focus'
  if (slug.includes('stress') || slug.includes('unwind') || slug.includes('anxiety'))
    return 'stress'
  if (slug.includes('walk') || slug.includes('body') || slug.includes('movement')) return 'body'
  return 'mindfulness'
}

export function Courses() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [courses, setCourses] = useState<ApiCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiCourse[]>('/courses')
      .then((res) => {
        if (cancelled) return
        setCourses(Array.isArray(res.data) ? res.data : [])
        setError(null)
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
  }, [http])

  return (
    <>
      <StillpointTopBar
        title={t('stillpoint.courses.heading', {}, { defaultValue: 'Courses' })}
        eyebrow={
          <span data-testid="courses-eyebrow">
            {t(
              'stillpoint.courses.eyebrow',
              { count: courses.length },
              { defaultValue: '{{count}} multi-day journeys' },
            )}
          </span>
        }
      />

      {error ? (
        <div
          data-testid="courses-error"
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl border border-error text-error')}
        >
          {t('stillpoint.courses.loadError', {}, { defaultValue: "We couldn't load courses." })}
        </div>
      ) : null}

      {loading ? (
        <div
          data-testid="courses-loading"
          className={cm.cn(cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}
        >
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : courses.length === 0 ? (
        <div
          data-testid="courses-empty"
          className={cm.cn(
            cm.sp('p', 12),
            cm.textCenter,
            'rounded-2xl border border-dashed border-outline text-on-surface-variant',
          )}
        >
          {t('stillpoint.courses.empty', {}, { defaultValue: 'No courses yet.' })}
        </div>
      ) : (
        <div data-testid="courses-grid" className={cm.cn('grid grid-cols-1 md:grid-cols-2 gap-5')}>
          {courses.map((c) => {
            const tone = inferTone(c)
            const accent = getCategoryAccent(tone)
            return (
              <Link
                key={c.id}
                data-testid={`course-card-${c.slug}`}
                to={`/courses/${c.slug}`}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'md' }),
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline/20 hover:-translate-y-0.5 hover:shadow-md transition-all',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'w-12 h-12 rounded-xl shadow-sm',
                    )}
                    style={{ backgroundColor: accent.softBg, color: accent.fg }}
                  >
                    <span
                      aria-hidden="true"
                      className={cm.cn('material-symbols-outlined text-2xl')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {accent.icon}
                    </span>
                  </span>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      'text-[10px] uppercase tracking-widest rounded-full',
                    )}
                    style={{ backgroundColor: accent.softBg, color: accent.fg }}
                  >
                    {t(
                      'stillpoint.courses.dayCount',
                      { count: c.day_count },
                      { defaultValue: '{{count}}-day' },
                    )}
                  </span>
                  {c.is_premium ? (
                    <span
                      className={cm.cn(
                        'text-[10px] uppercase tracking-widest font-bold text-accent',
                      )}
                    >
                      {t('stillpoint.courses.premium', {}, { defaultValue: 'Pro' })}
                    </span>
                  ) : null}
                </div>
                <div>
                  <h3
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-xl text-on-surface tracking-tight',
                    )}
                  >
                    {c.title}
                  </h3>
                  {c.description ? (
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.sp('mt', 2),
                        'text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {c.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
