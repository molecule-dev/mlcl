import { type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  ChecklistTaskCard,
  type ChecklistTaskCategory,
  type ChecklistTaskStatus,
} from '../components/ChecklistTaskCard.js'
import {
  type MilestoneEntry,
  type MilestoneStatus,
  MilestoneTimeline,
} from '../components/MilestoneTimeline.js'
import { StatTriad } from '../components/StatTriad.js'
import { TeamMemberCard } from '../components/TeamMemberCard.js'
import { WelcomeHeroCard } from '../components/WelcomeHeroCard.js'

interface OnboardingTaskApi {
  id: string
  title: string
  description?: string | null
  category?: string
  due_date?: string | null
  status: string
  position?: number
}

interface MilestoneApi {
  id: string
  label: string
  target_at?: string | null
  achieved_at?: string | null
}

interface TeamMemberApi {
  id: string
  name: string
  role?: string | null
  department?: string | null
  email?: string | null
}

interface MeApi {
  user: { id: string; name?: string | null; firstName?: string | null; email?: string | null }
  onboarding: { id: string; start_date: string }
  counts: {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    overdueTasks: number
    totalMilestones: number
    achievedMilestones: number
  }
  derived: { completionPct: number; dayNumber: number }
}

function deriveTaskStatus(api: string | undefined): ChecklistTaskStatus {
  switch (api) {
    case 'complete':
    case 'completed':
    case 'done':
      return 'complete'
    case 'in_progress':
    case 'active':
      return 'in_progress'
    case 'overdue':
      return 'overdue'
    default:
      return 'pending'
  }
}

function deriveCategory(api: string | undefined): ChecklistTaskCategory {
  switch (api) {
    case 'milestone':
    case 'training':
    case 'documents':
    case 'people':
    case 'paperwork':
      return api === 'paperwork' ? 'documents' : api
    case 'intro':
      return 'people'
    case 'it':
    case 'general':
    case 'other':
    default:
      return 'general'
  }
}

function deriveMilestoneStatus(m: MilestoneApi, now: Date): MilestoneStatus {
  if (m.achieved_at) return 'complete'
  if (!m.target_at) return 'upcoming'
  const target = new Date(m.target_at)
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (target.getTime() < now.getTime() - sevenDays) return 'overdue'
  if (target.getTime() < now.getTime() + sevenDays) return 'current'
  return 'upcoming'
}

function dayLabelFor(
  m: MilestoneApi,
  startDate: Date,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (!m.target_at) return ''
  const target = new Date(m.target_at)
  const dayDelta = Math.round((target.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  if (dayDelta <= 7) return t('dashboard.weekOne', {}, { defaultValue: 'Week 1' })
  return t('dashboard.dayLabel', { day: dayDelta }, { defaultValue: `Day ${dayDelta}` })
}

function formatDue(
  due: string | null | undefined,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (!due) return t('dashboard.noDue', {}, { defaultValue: 'No due date' })
  const d = new Date(due)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay) return t('status.today', {}, { defaultValue: 'Today' })
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function SectionHeading({
  cm,
  children,
  action,
}: {
  cm: ReturnType<typeof getClassMap>
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className={cm.cn(cm.flex({ align: 'end', justify: 'between' }), cm.sp('mb', 4))}>
      <h2 className={cm.cn(cm.fontWeight('bold'), 'text-xl tracking-tight')}>{children}</h2>
      {action}
    </div>
  )
}

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [me, setMe] = useState<MeApi | null>(null)
  const [tasks, setTasks] = useState<OnboardingTaskApi[]>([])
  const [milestones, setMilestones] = useState<MilestoneApi[]>([])
  const [team, setTeam] = useState<TeamMemberApi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!http) return
    setLoading(true)
    Promise.all([
      http
        .get<MeApi>('/api/onboardings/me')
        .then((r) => r.data)
        .catch(() => null),
      http
        .get<OnboardingTaskApi[]>('/api/tasks')
        .then((r) => r.data ?? [])
        .catch(() => []),
      http
        .get<MilestoneApi[]>('/api/timeline-milestones')
        .then((r) => r.data ?? [])
        .catch(() => []),
      http
        .get<TeamMemberApi[]>('/api/team-members')
        .then((r) => r.data ?? [])
        .catch(() => []),
    ]).then(([meR, tasksR, milestonesR, teamR]) => {
      setMe(meR)
      setTasks(tasksR)
      setMilestones(milestonesR)
      setTeam(teamR)
      setLoading(false)
    })
  }, [http])

  const firstName =
    me?.user.firstName ??
    me?.user.name?.split(/\s+/)[0] ??
    t('dashboard.defaultGreeting', {}, { defaultValue: 'there' })
  const completionPct = me?.derived.completionPct ?? 0
  const dayNumber = me?.derived.dayNumber ?? 1
  const completedCount = me?.counts.completedTasks ?? 0
  const totalCount = me?.counts.totalTasks ?? 0
  const milestonesDone = me?.counts.achievedMilestones ?? 0
  const milestonesTotal = me?.counts.totalMilestones ?? 0

  const upNext = tasks
    .filter((task) => deriveTaskStatus(task.status) !== 'complete')
    .sort((a, b) => {
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity
      return aDue - bDue
    })
    .slice(0, 3)

  const todayCount = tasks.filter((task) => {
    if (!task.due_date) return false
    const d = new Date(task.due_date)
    return d.toDateString() === new Date().toDateString()
  }).length

  const startDate = me?.onboarding.start_date ? new Date(me.onboarding.start_date) : new Date()
  const now = new Date()
  const milestoneEntries: MilestoneEntry[] = milestones.slice(0, 4).map((m) => {
    const status = deriveMilestoneStatus(m, now)
    return {
      id: m.id,
      title: m.label,
      dayLabel: dayLabelFor(m, startDate, t),
      description: undefined,
      status,
      taskSummary: undefined,
    }
  })

  const cohort = team.slice(0, 3).map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role ?? '',
    department: m.department ?? undefined,
  }))

  return (
    <div data-mol-id="page-dashboard" className={cm.flex({ direction: 'col', gap: 'lg' })}>
      <WelcomeHeroCard
        firstName={firstName}
        dayNumber={dayNumber}
        completionPct={completionPct}
        tasksDone={completedCount}
        tasksTotal={totalCount}
        milestonesDone={milestonesDone}
        milestonesTotal={milestonesTotal}
        nextTaskTitle={
          upNext[0]?.title ??
          t('dashboard.allCaughtUp', {}, { defaultValue: 'You are all caught up' })
        }
      />

      <StatTriad
        items={[
          {
            id: 'tasks-today',
            label: t('dashboard.stat.todayTasks', {}, { defaultValue: 'Tasks today' }),
            value: String(todayCount),
            icon: 'today',
            accent: '#0f766e',
            helper: t(
              'dashboard.stat.todayHelper',
              { count: todayCount },
              {
                defaultValue: todayCount === 0 ? 'No tasks due today' : `${todayCount} due today`,
              },
            ),
            trend: {
              label: t('dashboard.stat.todayTrend', {}, { defaultValue: 'On track' }),
              positive: true,
            },
          },
          {
            id: 'milestones',
            label: t('dashboard.stat.milestones', {}, { defaultValue: 'Milestones unlocked' }),
            value: `${milestonesDone} / ${milestonesTotal}`,
            icon: 'flag',
            accent: '#6d28d9',
            helper: t(
              'dashboard.stat.milestonesHelper',
              { day: dayNumber },
              { defaultValue: `Day ${dayNumber} of 90` },
            ),
          },
          {
            id: 'team',
            label: t('dashboard.stat.team', {}, { defaultValue: 'Teammates to meet' }),
            value: String(team.length),
            icon: 'diversity_3',
            accent: '#92400e',
            helper: t(
              'dashboard.stat.teamHelper',
              { count: team.length },
              { defaultValue: `${team.length} introductions queued` },
            ),
          },
        ]}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: '32px',
        }}
      >
        <section>
          <SectionHeading
            cm={cm}
            action={
              <Link to="/checklist" className="font-bold text-primary">
                {t('dashboard.viewAllTasks', {}, { defaultValue: 'View all tasks' })} →
              </Link>
            }
          >
            {t('status.upNext', {}, { defaultValue: 'Up next' })}
          </SectionHeading>
          {loading ? (
            <p className={cm.textMuted}>
              {t('dashboard.loading', {}, { defaultValue: 'Loading your tasks…' })}
            </p>
          ) : upNext.length === 0 ? (
            <p className={cm.textMuted}>
              {t('dashboard.noTasks', {}, { defaultValue: 'Nothing pending — great work.' })}
            </p>
          ) : (
            <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
              {upNext.map((task) => (
                <ChecklistTaskCard
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  description={task.description ?? ''}
                  category={deriveCategory(task.category)}
                  status={deriveTaskStatus(task.status)}
                  dueLabel={formatDue(task.due_date, t)}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeading cm={cm}>
            {t('dashboard.yourCohort', {}, { defaultValue: 'Your team' })}
          </SectionHeading>
          {loading ? (
            <p className={cm.textMuted}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : cohort.length === 0 ? (
            <p className={cm.textMuted}>
              {t('dashboard.noTeam', {}, { defaultValue: 'No teammates yet.' })}
            </p>
          ) : (
            <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
              {cohort.map((m) => (
                <TeamMemberCard key={m.id} {...m} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <SectionHeading
          cm={cm}
          action={
            <Link to="/timeline" className="font-bold text-primary">
              {t('dashboard.fullTimeline', {}, { defaultValue: 'Full timeline' })} →
            </Link>
          }
        >
          {t('dashboard.timelineHeading', {}, { defaultValue: '30/60/90 milestones' })}
        </SectionHeading>
        {loading ? (
          <p className={cm.textMuted}>
            {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : milestoneEntries.length === 0 ? (
          <p className={cm.textMuted}>
            {t('dashboard.noMilestones', {}, { defaultValue: 'No milestones yet.' })}
          </p>
        ) : (
          <MilestoneTimeline entries={milestoneEntries} />
        )}
      </section>
    </div>
  )
}
