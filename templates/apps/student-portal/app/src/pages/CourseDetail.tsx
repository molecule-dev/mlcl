import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AssignmentRow } from '../components/AssignmentRow.js'
import { GradeBadge } from '../components/GradeBadge.js'
import {
  type ApiAssignment,
  type ApiGrade,
  type ApiScheduleEntry,
  dueLabel,
  letterFor,
  statusFor,
  subjectFor,
  weightedAverage,
} from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function CourseDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const [assignments, setAssignments] = useState<ApiAssignment[]>([])
  const [grades, setGrades] = useState<ApiGrade[]>([])
  const [schedule, setSchedule] = useState<ApiScheduleEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      http.get('/api/assignments').then((r) => unwrapList<ApiAssignment>(r)),
      http.get('/api/grades').then((r) => unwrapList<ApiGrade>(r)),
      http.get('/api/schedule').then((r) => unwrapList<ApiScheduleEntry>(r)),
    ])
      .then(([as, gs, sc]) => {
        if (cancelled) return
        setAssignments(as)
        setGrades(gs)
        setSchedule(sc)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const course = useMemo(() => {
    const allCourseNames = Array.from(
      new Set([
        ...assignments.map((a) => a.course_name ?? ''),
        ...grades.map((g) => g.course_name ?? ''),
        ...schedule.map((s) => s.course_name ?? ''),
      ]),
    ).filter(Boolean)
    const matched =
      allCourseNames.find((n) => slugify(n) === id) ?? allCourseNames[0] ?? id ?? 'Course'
    return matched
  }, [assignments, grades, schedule, id])

  const courseAssignments = useMemo(
    () => assignments.filter((a) => a.course_name === course),
    [assignments, course],
  )
  const courseGrades = useMemo(
    () => grades.filter((g) => g.course_name === course),
    [grades, course],
  )
  const courseSchedule = useMemo(
    () => schedule.find((s) => s.course_name === course) ?? null,
    [schedule, course],
  )

  const upcoming = courseAssignments.filter(
    (a) => a.status === 'upcoming' || a.status === 'overdue',
  )
  const recent = courseAssignments.filter((a) => a.status === 'graded' || a.status === 'submitted')

  // Weighted, honoring each grade's stored `weight` — a flat mean dropped it and disagreed with the
  // backend GPA/report-card and the Grades page for the same course.
  const avg = weightedAverage(courseGrades)
  const gradeLetter = letterFor(avg)

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))}
      data-mol-id="page-course-detail"
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.textSize('sm'),
          'text-on-surface-variant',
        )}
      >
        <Link to="/grades" className={cm.cn('hover:text-primary font-semibold')}>
          {t('courseDetail.backLink', {}, { defaultValue: 'Grades' })}
        </Link>
        <span aria-hidden="true">/</span>
        <span className={cm.cn('text-on-surface font-bold')}>{course}</span>
      </div>

      <header
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between', gap: 'md' }),
          cm.sp('p', 8),
          'rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary relative overflow-hidden md:flex-row md:items-end',
        )}
      >
        <div className={cm.cn('relative z-10')}>
          <p className={cm.cn('font-bold text-xs uppercase tracking-widest opacity-80')}>
            {courseSchedule
              ? t(
                  'courseDetail.eyebrow',
                  { period: courseSchedule.period_label ?? '', room: courseSchedule.room ?? '' },
                  { defaultValue: '{{period}} · {{room}}' },
                )
              : t('courseDetail.eyebrowFallback', {}, { defaultValue: 'Course overview' })}
          </p>
          <h1 className={cm.cn('mt-2 text-4xl md:text-5xl font-extrabold tracking-tighter')}>
            {course}
          </h1>
        </div>
        <div
          className={cm.cn(cm.flex({ direction: 'col', align: 'end', gap: 'xs' }), 'relative z-10')}
        >
          <span className={cm.cn('text-[10px] font-black uppercase tracking-widest opacity-80')}>
            {t('courseDetail.currentGrade', {}, { defaultValue: 'Current grade' })}
          </span>
          {courseGrades.length > 0 ? (
            <GradeBadge letter={gradeLetter} percentage={Math.round(avg)} />
          ) : (
            <span className={cm.cn('text-base opacity-80')}>—</span>
          )}
          {courseSchedule?.teacher && (
            <p className={cm.cn('text-xs opacity-80 mt-2')}>{courseSchedule.teacher}</p>
          )}
        </div>
        <div
          className={cm.cn(
            'absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
          )}
        />
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'col-span-12 lg:col-span-7 rounded-2xl bg-surface-container-lowest shadow-sm',
          )}
        >
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
            {t('courseDetail.upcoming', {}, { defaultValue: 'Upcoming work' })}
          </h2>
          <div className={cm.sp('mt', 3)}>
            {loading ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </p>
            ) : upcoming.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('courseDetail.noUpcoming', {}, { defaultValue: 'No upcoming assignments.' })}
              </p>
            ) : (
              upcoming.map((a) => (
                <AssignmentRow
                  key={a.id}
                  id={a.id}
                  title={a.title}
                  course={a.course_name ?? ''}
                  subject={subjectFor(a.course_name)}
                  dueLabel={dueLabel(a.due_date)}
                  status={statusFor(a.status)}
                  overdue={a.status === 'overdue'}
                  href={`/assignments/${a.id}`}
                />
              ))
            )}
          </div>
          <h2 className={cm.cn(cm.textSize('lg'), cm.sp('mt', 6), 'font-extrabold tracking-tight')}>
            {t('courseDetail.recent', {}, { defaultValue: 'Recently graded' })}
          </h2>
          <div className={cm.sp('mt', 3)}>
            {loading ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
              </p>
            ) : recent.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('courseDetail.noRecent', {}, { defaultValue: 'Nothing graded recently.' })}
              </p>
            ) : (
              recent.map((a) => {
                const status = statusFor(a.status)
                const grade =
                  status === 'graded' && a.points != null ? letterFor(Number(a.points)) : undefined
                return (
                  <AssignmentRow
                    key={a.id}
                    id={a.id}
                    title={a.title}
                    course={a.course_name ?? ''}
                    subject={subjectFor(a.course_name)}
                    dueLabel={dueLabel(a.due_date)}
                    status={status}
                    grade={grade}
                    gradePercentage={
                      status === 'graded' && a.points != null ? Number(a.points) : undefined
                    }
                    href={`/assignments/${a.id}`}
                  />
                )
              })
            )}
          </div>
        </section>

        <aside
          className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), 'col-span-12 lg:col-span-5')}
        >
          <div
            className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
          >
            <h3 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('courseDetail.gradesTitle', {}, { defaultValue: 'Recent grades' })}
            </h3>
            <ul className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('mt', 3))}>
              {courseGrades.slice(0, 6).map((g) => (
                <li
                  key={g.id}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('py', 3),
                    'border-b border-outline-variant/30 last:border-b-0',
                  )}
                >
                  <div>
                    <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>
                      {g.course_name}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {new Date(g.graded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={cm.cn(cm.textSize('sm'), 'font-bold tabular-nums text-on-surface')}
                  >
                    {g.letter_grade ?? letterFor(Number(g.score))} (
                    {Math.round(Number(g.score ?? 0))}%)
                  </span>
                </li>
              ))}
              {courseGrades.length === 0 && (
                <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('courseDetail.noGrades', {}, { defaultValue: 'No grades posted yet.' })}
                </li>
              )}
            </ul>
          </div>
          {courseSchedule?.teacher && (
            <div
              className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
            >
              <h3 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                {t('courseDetail.teacherTitle', {}, { defaultValue: 'Teacher' })}
              </h3>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 3))}>
                <span
                  className={cm.cn(
                    cm.w(12),
                    cm.h(12),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'bg-primary text-on-primary font-bold text-lg',
                  )}
                >
                  {courseSchedule.teacher
                    .split(' ')
                    .map((p) => p[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
                <div>
                  <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>
                    {courseSchedule.teacher}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {courseSchedule.room}
                  </p>
                </div>
              </div>
              <Link
                to="/messages"
                data-mol-id="course-message-teacher"
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                  forum
                </span>
                {t('courseDetail.messageTeacher', {}, { defaultValue: 'Message teacher' })}
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default CourseDetail
export { CourseDetail as CourseDetailPage }
