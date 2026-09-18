import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AnnouncementsFeed } from '../components/AnnouncementsFeed.js'
import { AssignmentRow } from '../components/AssignmentRow.js'
import { GpaHeroCard } from '../components/GpaHeroCard.js'
import { SubjectStatsTriad } from '../components/SubjectStatsTriad.js'
import { TodayScheduleStrip } from '../components/TodayScheduleStrip.js'
import { type ApiAssignment, dueLabel, letterFor, statusFor, subjectFor } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<{ name?: string; email?: string }>()
  const [assignments, setAssignments] = useState<ApiAssignment[]>([])

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/assignments')
      .then((res) => {
        if (cancelled) return
        setAssignments(unwrapList<ApiAssignment>(res))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  const upcomingAssignments = assignments.slice(0, 4)
  const greetingName = user?.name?.split(/[\s@]/)[0] || user?.email?.split('@')[0] || 'friend'

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))} data-mol-id="page-dashboard">
      <header
        className={cm.cn(cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' }))}
      >
        <div>
          <p
            className={cm.cn(cm.textSize('sm'), 'font-bold uppercase tracking-widest text-primary')}
          >
            {t('status.today', {}, { defaultValue: 'Today' })}
          </p>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t(
              'dashboard.greeting',
              { name: greetingName },
              { defaultValue: 'Hi {{name}}, ready for class?' },
            )}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
            {t(
              'dashboard.subtitle',
              {},
              {
                defaultValue:
                  'Your week at a glance — schedule, grades, and assignments in one quiet view.',
              },
            )}
          </p>
        </div>
        <Link
          to="/grades/report-card"
          data-mol-id="dashboard-view-report-card"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors font-semibold',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            description
          </span>
          {t('dashboard.viewReportCard', {}, { defaultValue: 'View report card' })}
        </Link>
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }), 'items-start')}>
        <div className={cm.cn('col-span-12 lg:col-span-8')}>
          <GpaHeroCard />
        </div>
        <div className={cm.cn('col-span-12 lg:col-span-4 self-stretch')}>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.flex({ direction: 'col', gap: 'md' }),
              'h-full rounded-2xl bg-surface-container-lowest shadow-sm',
            )}
          >
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('dashboard.weekFocusEyebrow', {}, { defaultValue: 'Week focus' })}
            </p>
            <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}>
              {t(
                'dashboard.weekFocusTitle',
                {},
                { defaultValue: 'Bring up Algebra II by 4 points' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
              {t(
                'dashboard.weekFocusBody',
                {},
                {
                  defaultValue:
                    'Submit Quadratics practice set 7 and the chapter quiz. Tutoring lab is open Tuesday & Thursday after period 7.',
                },
              )}
            </p>
            <Link
              to="/assignments"
              className={cm.cn(
                cm.textSize('sm'),
                'mt-auto inline-flex items-center gap-1 font-bold text-primary hover:underline',
              )}
            >
              {t('dashboard.weekFocusCta', {}, { defaultValue: 'See full plan' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </div>

      <SubjectStatsTriad />

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'xl' }))}>
        <div className={cm.cn('col-span-12 lg:col-span-7')}>
          <TodayScheduleStrip />
        </div>
        <div className={cm.cn('col-span-12 lg:col-span-5')}>
          <section
            data-mol-id="dashboard-upcoming"
            className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
          >
            <header
              className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}
            >
              <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
                {t('dashboard.assignmentsTitle', {}, { defaultValue: 'Up next this week' })}
              </h2>
              <Link
                to="/assignments"
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-bold uppercase tracking-widest text-primary hover:underline',
                )}
              >
                {t('dashboard.assignmentsLink', {}, { defaultValue: 'See all' })}
              </Link>
            </header>
            <div className={cm.cn(cm.flex({ direction: 'col' }))}>
              {upcomingAssignments.length === 0 ? (
                <p
                  className={cm.cn(
                    cm.sp('py', 8),
                    cm.textCenter,
                    cm.textSize('sm'),
                    'text-on-surface-variant',
                  )}
                >
                  {t(
                    'dashboard.assignmentsEmpty',
                    {},
                    { defaultValue: 'No upcoming assignments. Enjoy the break!' },
                  )}
                </p>
              ) : (
                upcomingAssignments.map((a) => {
                  const status = statusFor(a.status)
                  const grade =
                    status === 'graded' && a.points != null
                      ? letterFor(Number(a.points))
                      : undefined
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
                      overdue={a.status === 'overdue'}
                      href={`/assignments/${a.id}`}
                    />
                  )
                })
              )}
            </div>
          </section>
        </div>
      </div>

      <AnnouncementsFeed />
    </div>
  )
}

export default Dashboard
export { Dashboard as DashboardPage }
