import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CourseHeaderProps {
  course: { id: string; name: string; instructor_id?: string | null }
  modules: Array<{
    id: string
    title: string
    order: number
    lessons: Array<{ completed: boolean }>
  }>
  activeModuleIdx: number
  onModuleChange: (idx: number) => void
}

interface UserSummary {
  id: string
  name?: string | null
}

/**
 * Course-detail page header.
 *
 * Was hardcoded to "Dr. James Park / 142 students / 4.8 stars / 56
 * reviews". The schema doesn't model ratings or reviews, so those
 * pieces are removed entirely. The instructor display fetches the
 * real user record by `instructor_id`, and student count derives from
 * `enrollments`.
 */
function CourseHeader({ course, modules, activeModuleIdx, onModuleChange }: CourseHeaderProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [instructor, setInstructor] = useState<UserSummary | null>(null)
  const [studentCount, setStudentCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (course.instructor_id) {
        try {
          const res: unknown = await http.get<UserSummary>(
            `/api/profile/users/${encodeURIComponent(course.instructor_id)}`,
          )
          if (!cancelled) {
            const data: UserSummary =
              res && typeof res === 'object' && 'data' in res
                ? (res.data as UserSummary)
                : (res as UserSummary)
            setInstructor(data ?? null)
          }
        } catch (_error) {
          // Instructor profile unavailable — omit the instructor display
          if (!cancelled) setInstructor(null)
        }
      }
      try {
        const res: unknown = await http.get<Record<string, unknown>[]>(
          `/api/enrollments?course_id=${encodeURIComponent(course.id)}`,
        )
        if (!cancelled) {
          const list = Array.isArray(res)
            ? res
            : Array.isArray((res as { data?: unknown })?.data)
              ? (res as { data: unknown[] }).data
              : []
          setStudentCount(list.length)
        }
      } catch (_error) {
        // Enrollment count unavailable — omit the student count display
        if (!cancelled) setStudentCount(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, course.instructor_id, course.id])

  const instructorLabel = instructor?.name || null
  const instructorSeed = instructor?.id || course.instructor_id || course.id

  return (
    <div data-mol-id="course-header">
      <div className={cm.cn(cm.flex({ justify: 'between', align: 'start' }), cm.sp('mb', 4))}>
        <div>
          <h1
            className={cm.cn(
              cm.textSize('4xl'),
              cm.sp('mb', 2),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {course.name}
          </h1>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }), cm.textSize('sm'))}>
            {instructorLabel ? (
              <div
                className={cm.cn(cm.flex({ align: 'center', gap: 2 }), 'text-foreground-secondary')}
                data-mol-id="course-header-instructor"
              >
                <img
                  alt={t(
                    'courseHeader.instructorName',
                    { name: instructorLabel },
                    { defaultValue: '{{name}}' },
                  )}
                  className={cm.cn(cm.w(6), cm.h(6), cm.roundedFull, 'object-cover')}
                  src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(instructorSeed)}`}
                />
                <span>{instructorLabel}</span>
              </div>
            ) : null}
            {studentCount != null && studentCount > 0 ? (
              <>
                {instructorLabel ? (
                  <span className={cm.cn('text-foreground-tertiary')}>•</span>
                ) : null}
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 1 }),
                    'text-foreground-secondary',
                  )}
                  data-mol-id="course-header-students"
                >
                  <span className={cm.cn('material-symbols-outlined text-[18px]')}>group</span>
                  <span>
                    {t(
                      'courseHeader.studentCount',
                      { count: studentCount },
                      { defaultValue: '{{count}} students' },
                    )}
                  </span>
                </div>
              </>
            ) : null}
          </div>
        </div>
        <button
          className={cm.cn(
            cm.sp('px', 6),
            cm.fontWeight('semibold'),
            'py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl active:scale-95 transition-all',
          )}
          data-mol-id="btn-share"
          onClick={() => {
            try {
              navigator.clipboard?.writeText(window.location.href)
            } catch (_error) {
              // Clipboard API unavailable — share silently fails
            }
          }}
        >
          {t('courseHeader.share', {}, { defaultValue: 'Share Course' })}
        </button>
      </div>
      <div
        className={cm.cn(cm.flex({ gap: 8 }), cm.sp('mt', 8), 'border-b border-outline-variant/20')}
      >
        {modules.map((mod, idx) => {
          const allCompleted = mod.lessons?.length > 0 && mod.lessons.every((l) => l.completed)
          const hasStarted = mod.lessons?.some((l) => l.completed)
          const isActive = idx === activeModuleIdx
          const isLocked = !allCompleted && !hasStarted && idx > activeModuleIdx
          return (
            <button
              key={mod.id}
              onClick={() => !isLocked && onModuleChange(idx)}
              aria-pressed={isActive}
              className={
                isActive
                  ? cm.cn(
                      cm.sp('pb', 4),
                      cm.textSize('sm'),
                      cm.fontWeight('bold'),
                      cm.flex({ align: 'center', gap: 2 }),
                      'text-primary border-b-2 border-primary',
                    )
                  : isLocked
                    ? cm.cn(
                        cm.sp('pb', 4),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        cm.flex({ align: 'center', gap: 2 }),
                        'text-foreground-tertiary cursor-not-allowed',
                      )
                    : cm.cn(
                        cm.sp('pb', 4),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        cm.flex({ align: 'center', gap: 2 }),
                        'text-foreground-secondary hover:text-primary',
                      )
              }
            >
              {allCompleted && !isActive && (
                <span
                  className={cm.cn('material-symbols-outlined text-success text-[18px]')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              )}
              {isLocked && (
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>lock</span>
              )}
              {mod.title}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CourseHeader
export { CourseHeader }
