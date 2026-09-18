import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AssignmentRow } from '../components/AssignmentRow.js'
import { CourseTileCard } from '../components/CourseTileCard.js'
import { LiveClassHeroCard } from '../components/LiveClassHeroCard.js'
import { ScheduleItem } from '../components/ScheduleItem.js'
import { StatPill } from '../components/StatPill.js'
import type { CourseRow as ApiCourse, DashboardBundle } from '../lib/api.js'

const ASSIGNMENT_STATUS = (
  due: string | null,
  hasSubmission?: boolean,
): 'upcoming' | 'in-progress' | 'submitted' | 'overdue' => {
  if (hasSubmission) return 'submitted'
  if (!due) return 'upcoming'
  const dueMs = new Date(due).getTime()
  const now = Date.now()
  if (Number.isNaN(dueMs)) return 'upcoming'
  if (dueMs < now) return 'overdue'
  if (dueMs - now < 36 * 60 * 60 * 1000) return 'in-progress'
  return 'upcoming'
}

type Translator = (
  key: string,
  values?: Record<string, string | number>,
  opts?: { defaultValue?: string },
) => string

const formatDueLabel = (due: string | null, t: Translator): string => {
  if (!due) return t('dashboard.noDueDate', {}, { defaultValue: 'No due date' })
  const date = new Date(due)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))
  if (Math.abs(diffDays) <= 1) {
    if (diffMs < 0)
      return (
        t('dashboard.dueOverdue', {}, { defaultValue: 'Overdue · ' }) +
        date.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      )
    return (
      t('dashboard.dueToday', {}, { defaultValue: 'Due ' }) +
      date.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    )
  }
  return (
    t('dashboard.dueOn', {}, { defaultValue: 'Due ' }) +
    date.toLocaleString(undefined, { month: 'short', day: 'numeric' })
  )
}

const formatHHMM = (iso: string | null): string => {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [data, setData] = useState<DashboardBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get<DashboardBundle>('/api/me/dashboard')
      .then((res) => {
        if (cancelled) return
        setData(res.data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const courseById = useMemo(() => {
    const map = new Map<string, ApiCourse>()
    if (data) for (const c of data.courses) map.set(c.id, c)
    return map
  }, [data])

  if (loading && !data) {
    return (
      <div className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
        {t('dashboard.loading', {}, { defaultValue: 'Loading your dashboard…' })}
      </div>
    )
  }

  if (error && !data) {
    return (
      <div
        role="alert"
        className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-error-container text-on-error-container')}
      >
        {t('dashboard.error', { error }, { defaultValue: 'Could not load dashboard: {{error}}' })}
      </div>
    )
  }

  const stats = data?.stats
  const upcomingRoom = data?.upcomingRoom ?? null
  const courses = data?.courses ?? []
  const assignments = data?.assignments ?? []
  const upcomingRooms = data?.upcomingRooms ?? []
  const upcomingCourse = upcomingRoom?.course_id
    ? courseById.get(upcomingRoom.course_id)
    : undefined

  return (
    <div className={cm.stack(10)} data-testid="dashboard-root">
      {upcomingRoom ? (
        <LiveClassHeroCard
          classId={upcomingRoom.id}
          courseTitle={
            upcomingCourse
              ? `${upcomingCourse.title} · ${upcomingCourse.code}`
              : t(
                  'dashboard.heroNoCourse',
                  { appName: APP_NAME },
                  { defaultValue: '{{appName}} room' },
                )
          }
          classTitle={upcomingRoom.name}
          instructor={t('dashboard.heroYou', {}, { defaultValue: 'Hosted by you' })}
          participantCount={upcomingRoom.participant_count}
          isLive={upcomingRoom.status === 'active'}
        />
      ) : null}

      <section className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 lg:grid-cols-4')}>
        <StatPill
          icon="cast_for_education"
          tone="primary"
          label={t('dashboard.statClassesLabel', {}, { defaultValue: 'Live rooms' })}
          value={String(upcomingRooms.length)}
          delta={
            stats?.teaching
              ? t(
                  'dashboard.statClassesDelta',
                  { n: stats.teaching },
                  { defaultValue: '{{n}} active courses' },
                )
              : undefined
          }
        />
        <StatPill
          icon="assignment"
          tone="secondary"
          label={t('dashboard.statAssignmentsLabel', {}, { defaultValue: 'Assignments due' })}
          value={String(stats?.assignments ?? 0)}
          deltaTrend="flat"
        />
        <StatPill
          icon="school"
          tone="tertiary"
          label={t('dashboard.statCoursesLabel', {}, { defaultValue: 'Courses' })}
          value={String(stats?.courses ?? 0)}
          delta={
            stats?.enrolled
              ? t(
                  'dashboard.statCoursesDelta',
                  { n: stats.enrolled },
                  { defaultValue: '{{n}} enrolled' },
                )
              : undefined
          }
        />
        <StatPill
          icon="notifications"
          tone="success"
          label={t('dashboard.statNotificationsLabel', {}, { defaultValue: 'Unread alerts' })}
          value={String(stats?.unreadNotifications ?? 0)}
        />
      </section>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }), 'items-start')}>
        <div className={cm.cn('col-span-12 lg:col-span-8', cm.stack(8))}>
          <section data-testid="dashboard-courses-section">
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 5))}
            >
              <div className={cm.stack(1)}>
                <span
                  className={cm.cn('text-[11px] font-black uppercase tracking-widest text-primary')}
                >
                  {t('dashboard.continueEyebrow', {}, { defaultValue: 'Continue learning' })}
                </span>
                <h2
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('bold'),
                    'tracking-tight text-on-surface',
                  )}
                >
                  {t('dashboard.continueTitle', {}, { defaultValue: 'Pick up where you left off' })}
                </h2>
              </div>
              <Link
                to="/courses"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:underline',
                )}
              >
                {t('dashboard.continueAll', {}, { defaultValue: 'Browse catalogue →' })}
              </Link>
            </div>
            {courses.length === 0 ? (
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest text-on-surface-variant',
                )}
              >
                {t(
                  'dashboard.noCourses',
                  {},
                  { defaultValue: 'No courses yet — your first course will appear here.' },
                )}
              </div>
            ) : (
              <div
                className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2 xl:grid-cols-3')}
              >
                {courses.slice(0, 6).map((course) => (
                  <CourseTileCard
                    key={course.id}
                    id={course.id}
                    title={course.title}
                    code={course.code}
                    instructor={
                      course.term ?? t('dashboard.courseTerm', {}, { defaultValue: 'Current term' })
                    }
                    level="INTERMEDIATE"
                    imageSeed={`vc-dash-${course.id}`}
                    progressPercent={0}
                    lessonsRemaining={undefined}
                  />
                ))}
              </div>
            )}
          </section>

          <section data-testid="dashboard-assignments-section">
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <div className={cm.stack(1)}>
                <span
                  className={cm.cn(
                    'text-[11px] font-black uppercase tracking-widest text-secondary-dark',
                  )}
                >
                  {t('dashboard.assignmentsEyebrow', {}, { defaultValue: 'On your desk' })}
                </span>
                <h2
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('bold'),
                    'tracking-tight text-on-surface',
                  )}
                >
                  {t('dashboard.assignmentsTitle', {}, { defaultValue: 'Assignments due soon' })}
                </h2>
              </div>
              <Link
                to="/assignments"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:underline',
                )}
              >
                {t('dashboard.assignmentsAll', {}, { defaultValue: 'See all →' })}
              </Link>
            </div>
            <div
              className={cm.cn(
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/10 divide-y divide-outline-variant/15 overflow-hidden',
              )}
            >
              {assignments.length === 0 ? (
                <div className={cm.cn(cm.sp('p', 6), cm.textCenter, 'text-on-surface-variant')}>
                  {t(
                    'dashboard.noAssignments',
                    {},
                    { defaultValue: 'No assignments due — enjoy the calm.' },
                  )}
                </div>
              ) : (
                assignments.slice(0, 4).map((a) => {
                  const course = courseById.get(a.course_id)
                  return (
                    <AssignmentRow
                      key={a.id}
                      id={a.id}
                      title={a.title}
                      course={course?.title ?? t('nav.course', {}, { defaultValue: 'Course' })}
                      courseCode={course?.code ?? ''}
                      dueLabel={formatDueLabel(a.due_date, t)}
                      status={ASSIGNMENT_STATUS(a.due_date)}
                      weight={a.points}
                    />
                  )
                })
              )}
            </div>
          </section>
        </div>

        <aside className={cm.cn('col-span-12 lg:col-span-4', cm.stack(8))}>
          <section data-testid="dashboard-schedule-section">
            <div
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {t('dashboard.upcomingTitle', {}, { defaultValue: "Today's schedule" })}
              </h2>
              <Link
                to="/calendar"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-primary hover:underline',
                )}
              >
                {t('dashboard.upcomingAll', {}, { defaultValue: 'Calendar →' })}
              </Link>
            </div>
            <div className={cm.stack(3)}>
              {upcomingRooms.length === 0 ? (
                <div
                  className={cm.cn(
                    cm.sp('p', 4),
                    'rounded-2xl bg-surface-container-lowest text-on-surface-variant text-sm',
                  )}
                >
                  {t(
                    'dashboard.scheduleEmpty',
                    {},
                    { defaultValue: 'No upcoming live classes scheduled.' },
                  )}
                </div>
              ) : (
                upcomingRooms.map((room, i) => {
                  const course = room.course_id ? courseById.get(room.course_id) : undefined
                  return (
                    <ScheduleItem
                      key={room.id}
                      id={room.id}
                      title={room.name}
                      course={
                        course
                          ? `${course.title} · ${course.code}`
                          : t(
                              'dashboard.scheduleAula',
                              { appName: APP_NAME },
                              { defaultValue: '{{appName}} room' },
                            )
                      }
                      instructor={t(
                        'dashboard.scheduleHostedYou',
                        {},
                        { defaultValue: 'Hosted by you' },
                      )}
                      startTime={formatHHMM(room.scheduled_at)}
                      endTime={formatHHMM(room.ended_at)}
                      location={t(
                        'dashboard.scheduleJoinCode',
                        { code: room.join_code },
                        { defaultValue: 'Join code · {{code}}' },
                      )}
                      status={room.status === 'active' ? 'live' : undefined}
                      tone={i === 0 ? 'primary' : i === 1 ? 'secondary' : 'tertiary'}
                    />
                  )
                })
              )}
            </div>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 6),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/10',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mb', 3))}>
              <span
                className={cm.cn(
                  'h-9 w-9 rounded-xl bg-secondary/20 text-secondary-dark flex items-center justify-center',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[20px]')}>
                  tips_and_updates
                </span>
              </span>
              <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t(
                  'dashboard.tipTitle',
                  { appName: APP_NAME },
                  { defaultValue: '{{appName}} tip' },
                )}
              </h3>
            </div>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mb', 4),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'dashboard.tipBody',
                {},
                {
                  defaultValue:
                    'Open the live room from the hero card above to draw a stroke on the whiteboard or post a chat message — every action persists.',
                },
              )}
            </p>
            {upcomingRoom ? (
              <Link
                to={`/whiteboard/${upcomingRoom.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'text-primary hover:underline',
                )}
              >
                {t('dashboard.tipCta', {}, { defaultValue: 'Try the whiteboard' })}
                <span className={cm.cn('material-symbols-outlined text-[16px]')}>
                  arrow_forward
                </span>
              </Link>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  )
}

export default Dashboard
