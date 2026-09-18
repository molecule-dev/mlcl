import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  type MilestoneEntry,
  type MilestoneStatus,
  MilestoneTimeline,
} from '../components/MilestoneTimeline.js'
import { StatTriad } from '../components/StatTriad.js'

interface MilestoneApi {
  id: string
  label: string
  target_at?: string | null
  achieved_at?: string | null
}

interface OnboardingApi {
  id: string
  start_date: string
  status: string
}

interface OnboardingTaskApi {
  id: string
  status: string
  due_date?: string | null
}

function deriveMilestoneStatus(m: MilestoneApi, now: Date): MilestoneStatus {
  if (m.achieved_at) return 'complete'
  if (!m.target_at) return 'upcoming'
  const target = new Date(m.target_at).getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (target < now.getTime() - sevenDays) return 'overdue'
  if (target < now.getTime() + sevenDays) return 'current'
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
  if (dayDelta <= 7)
    return t('timeline.daysRange', { day: dayDelta }, { defaultValue: `Days 1–${dayDelta}` })
  return t('timeline.dayLabel', { day: dayDelta }, { defaultValue: `Day ${dayDelta}` })
}

export function Timeline() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [milestones, setMilestones] = useState<MilestoneApi[]>([])
  const [onboardings, setOnboardings] = useState<OnboardingApi[]>([])
  const [tasks, setTasks] = useState<OnboardingTaskApi[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!http) return
    setLoading(true)
    Promise.all([
      http
        .get<MilestoneApi[]>('/api/timeline-milestones')
        .then((r) => r.data ?? [])
        .catch(() => []),
      http
        .get<OnboardingApi[]>('/api/onboardings')
        .then((r) => r.data ?? [])
        .catch(() => []),
      http
        .get<OnboardingTaskApi[]>('/api/tasks')
        .then((r) => r.data ?? [])
        .catch(() => []),
    ]).then(([m, o, ts]) => {
      setMilestones(m)
      setOnboardings(o)
      setTasks(ts)
      setLoading(false)
    })
  }, [http])

  const now = new Date()
  const startDate = onboardings[0]?.start_date ? new Date(onboardings[0].start_date) : now

  const entries: MilestoneEntry[] = useMemo(() => {
    return milestones.map((m) => {
      const status = deriveMilestoneStatus(m, now)
      const target = m.target_at ? new Date(m.target_at).getTime() : 0
      const cohort = tasks.filter((task) => {
        if (!task.due_date) return false
        return new Date(task.due_date).getTime() <= target
      })
      const done = cohort.filter(
        (task) =>
          task.status === 'complete' || task.status === 'completed' || task.status === 'done',
      ).length
      return {
        id: m.id,
        title: m.label,
        dayLabel: dayLabelFor(m, startDate, t),
        description: undefined,
        status,
        taskSummary: cohort.length > 0 ? { done, total: cohort.length } : undefined,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestones, tasks, startDate.getTime(), now.getTime(), t])

  const totalDone = entries.reduce((sum, m) => sum + (m.taskSummary?.done ?? 0), 0)
  const totalAll = entries.reduce((sum, m) => sum + (m.taskSummary?.total ?? 0), 0)
  const completePct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0
  const currentMilestone =
    entries.find((m) => m.status === 'current') ?? entries.find((m) => m.status === 'upcoming')
  const nextMilestone = entries.find((m) => m.status === 'upcoming')

  return (
    <div data-mol-id="page-timeline" className={cm.flex({ direction: 'col', gap: 'lg' })}>
      <header>
        <p
          className="text-[11px] font-black uppercase tracking-[0.3em]"
          style={{ color: 'var(--mol-color-secondary)' }}
        >
          {t('timeline.eyebrow', {}, { defaultValue: 'Onboarding · Milestones' })}
        </p>
        <h1 className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 2), 'text-3xl tracking-tight')}>
          {t('timeline.title', {}, { defaultValue: 'Your 30 / 60 / 90 journey.' })}
        </h1>
        <p className={cm.cn(cm.textMuted, cm.sp('mt', 2), 'max-w-2xl')}>
          {t(
            'timeline.subtitle',
            {},
            {
              defaultValue:
                'Each milestone unlocks new modules, intros, and growth conversations. No pressure — just progress.',
            },
          )}
        </p>
      </header>

      <StatTriad
        items={[
          {
            id: 'progress',
            label: t('timeline.stat.progress', {}, { defaultValue: 'Overall' }),
            value: `${completePct}%`,
            icon: 'trending_up',
            accent: '#0f766e',
            helper: t(
              'timeline.stat.progressHelper',
              { done: totalDone, total: totalAll },
              { defaultValue: `${totalDone} / ${totalAll} tasks` },
            ),
          },
          {
            id: 'current',
            label: t('timeline.stat.current', {}, { defaultValue: 'Current milestone' }),
            value: currentMilestone?.dayLabel ?? '—',
            icon: 'flag',
            accent: '#6d28d9',
            helper: currentMilestone?.title,
          },
          {
            id: 'next',
            label: t('timeline.stat.next', {}, { defaultValue: 'Next unlock' }),
            value: nextMilestone?.dayLabel ?? '—',
            icon: 'lock_open',
            accent: '#92400e',
            helper: nextMilestone?.title,
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
          <h2 className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 4), 'text-xl tracking-tight')}>
            {t('timeline.milestonesHeading', {}, { defaultValue: 'Milestones' })}
          </h2>
          {loading ? (
            <p className={cm.textMuted}>
              {t('timeline.loading', {}, { defaultValue: 'Loading milestones…' })}
            </p>
          ) : entries.length === 0 ? (
            <p className={cm.textMuted}>
              {t('timeline.empty', {}, { defaultValue: 'No milestones yet.' })}
            </p>
          ) : (
            <MilestoneTimeline entries={entries} />
          )}
        </section>

        <aside>
          <div
            className={cm.sp('p', 6)}
            style={{
              background:
                'linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
              borderRadius: '20px',
              border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
            }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-[0.18em]"
              style={{ color: 'var(--mol-color-secondary)' }}
            >
              {t('timeline.tipEyebrow', {}, { defaultValue: 'Manager tip' })}
            </p>
            <h3 className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 2), 'text-lg tracking-tight')}>
              {t(
                'timeline.tipTitle',
                {},
                { defaultValue: 'Block calendar time for the milestones.' },
              )}
            </h3>
            <p className={cm.cn(cm.textMuted, cm.sp('mt', 2), 'text-sm leading-relaxed')}>
              {t(
                'timeline.tipBody',
                {},
                {
                  defaultValue:
                    'Schedule a 30-minute reflection at days 30, 60, and 90 with your manager — it makes feedback specific and progress visible.',
                },
              )}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
