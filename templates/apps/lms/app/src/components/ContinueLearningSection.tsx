import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import CourseCard from './CourseCard.js'

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

interface CourseWithProgress extends CourseRow {
  progress: CourseProgress | null
}

/**
 * "Continue Learning" carousel on the dashboard.
 *
 * Was originally three hardcoded demo courses ("Advanced React Patterns",
 * "Machine Learning Fundamentals", "Academic Writing Studio"). Now reads
 * the user's enrollments from `/api/courses` and decorates each card
 * with progress from `/api/courses/:id/progress`. Empty state encourages
 * the user to browse the course catalog.
 */
function ContinueLearningSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [courses, setCourses] = useState<CourseWithProgress[] | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setCourses([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        // ?my=true: only courses the user is enrolled in or instructs.
        // Without this filter the dashboard would show every course in the
        // database for every user (including duplicates if the catalog is
        // seeded), which both leaks data and produces React duplicate-key
        // warnings.
        const res: unknown = await http.get<CourseRow[]>('/api/courses?my=true')
        if (cancelled) return
        const list: CourseRow[] = Array.isArray(res)
          ? (res as CourseRow[])
          : Array.isArray((res as { data?: unknown })?.data)
            ? (res as { data: CourseRow[] }).data
            : []
        const seen = new Set<string>()
        const unique = list.filter((c) => {
          const id = String(c.id)
          if (seen.has(id)) return false
          seen.add(id)
          return true
        })
        const withProgress = await Promise.all(
          unique.slice(0, 8).map(async (course) => {
            try {
              const pRes: unknown = await http.get<CourseProgress>(
                `/api/courses/${course.id}/progress`,
              )
              const progress: CourseProgress | null =
                pRes && typeof pRes === 'object' && 'data' in pRes
                  ? (pRes.data as CourseProgress)
                  : (pRes as CourseProgress)
              return { ...course, progress }
            } catch (_error) {
              // Best-effort progress fetch — fall back to null progress if unavailable
              return { ...course, progress: null }
            }
          }),
        )
        if (!cancelled) setCourses(withProgress)
      } catch (_error) {
        // Network/API error loading courses — show empty state
        if (!cancelled) setCourses([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, isAuthenticated])

  const heading = (
    <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 6))}>
      <h2
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          'text-headline-md font-headline',
        )}
      >
        {t('continueLearningSection.heading', {}, { defaultValue: 'Continue Learning' })}
      </h2>
      <Link
        className={cm.cn(
          cm.textPrimary,
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'hover:underline',
        )}
        to="/courses"
      >
        {t('common.viewAll', {}, { defaultValue: 'View All' })}
      </Link>
    </div>
  )

  if (courses === null) {
    return (
      <section data-mol-id="continue-learning-loading">
        {heading}
        <div className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      </section>
    )
  }

  if (courses.length === 0) {
    return (
      <section data-mol-id="continue-learning-empty">
        {heading}
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl border border-outline-variant/20 bg-surface-container-lowest',
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
            {t(
              'continueLearningSection.empty',
              {},
              { defaultValue: 'No active courses yet. Browse the catalog to get started.' },
            )}
          </p>
          <Link
            to="/courses"
            className={cm.cn(
              cm.sp('mt', 3),
              cm.textPrimary,
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'inline-block hover:underline',
            )}
          >
            {t('continueLearningSection.browse', {}, { defaultValue: 'Browse courses →' })}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section data-mol-id="continue-learning-section">
      {heading}
      <div
        className={cm.cn(cm.flex({}), cm.sp('pb', 6), 'space-x-6 overflow-x-auto hide-scrollbar')}
      >
        {courses.map((course) => {
          const continueTo = `/course/${course.id}`
          const remaining = course.progress
            ? Math.max(
                0,
                (course.progress.totalLessons ?? 0) - (course.progress.completedCount ?? 0),
              )
            : 0
          return (
            <Link
              key={course.id}
              to={continueTo}
              className={cm.cn('contents')}
              onClick={(e) => e.stopPropagation()}
            >
              <CourseCard
                continueTo={continueTo}
                imageSeed={course.id}
                title={course.name}
                lessonsRemaining={remaining}
                progressPercent={course.progress?.percentage ?? 0}
              />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default ContinueLearningSection
export { ContinueLearningSection }
