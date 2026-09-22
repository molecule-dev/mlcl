import { useCallback, useEffect, useMemo, useState } from 'react'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  ChecklistTaskCard,
  type ChecklistTaskCategory,
  type ChecklistTaskStatus,
} from '../components/ChecklistTaskCard.js'
import { StatTriad } from '../components/StatTriad.js'

interface OnboardingTaskApi {
  id: string
  title: string
  description?: string | null
  category?: string
  due_date?: string | null
  status: string
  position?: number
}

const FILTERS: Array<{ id: 'all' | ChecklistTaskStatus; label: string; defaultLabel: string }> = [
  { id: 'all', label: 'checklist.filter.all', defaultLabel: 'All' },
  { id: 'in_progress', label: 'checklist.filter.inProgress', defaultLabel: 'In progress' },
  { id: 'pending', label: 'checklist.filter.pending', defaultLabel: 'Not started' },
  { id: 'complete', label: 'checklist.filter.complete', defaultLabel: 'Complete' },
  { id: 'overdue', label: 'checklist.filter.overdue', defaultLabel: 'Overdue' },
]

interface UITask {
  id: string
  title: string
  description: string
  category: ChecklistTaskCategory
  status: ChecklistTaskStatus
  due: string
}

function deriveStatus(api: string | undefined, dueDate?: string | null): ChecklistTaskStatus {
  const isPastDue = !!dueDate && new Date(dueDate).getTime() < Date.now()
  switch (api) {
    case 'complete':
    case 'completed':
    case 'done':
      return 'complete'
    case 'in_progress':
    case 'active':
      // A past-due task that isn't complete is overdue, even while in progress.
      return isPastDue ? 'overdue' : 'in_progress'
    case 'overdue':
      return 'overdue'
    default:
      // Pending tasks whose due date has passed are overdue — the status is derived from due_date,
      // not from a server-set 'overdue' sentinel (which nothing writes).
      return isPastDue ? 'overdue' : 'pending'
  }
}

function deriveCategory(api: string | undefined): ChecklistTaskCategory {
  switch (api) {
    case 'milestone':
    case 'training':
    case 'documents':
    case 'people':
      return api
    case 'paperwork':
      return 'documents'
    case 'intro':
      return 'people'
    case 'it':
    case 'general':
    case 'other':
    default:
      return 'general'
  }
}

function formatDue(
  due: string | null | undefined,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (!due) return '—'
  const d = new Date(due)
  const today = new Date()
  if (d.toDateString() === today.toDateString())
    return t('status.today', {}, { defaultValue: 'Today' })
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function toUITask(task: OnboardingTaskApi, t: ReturnType<typeof useTranslation>['t']): UITask {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? '',
    category: deriveCategory(task.category),
    status: deriveStatus(task.status, task.due_date),
    due: formatDue(task.due_date, t),
  }
}

export function Checklist() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [tasks, setTasks] = useState<UITask[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | ChecklistTaskStatus>('all')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const reload = useCallback(async () => {
    if (!http) return
    try {
      const r = await http.get<OnboardingTaskApi[]>('/api/tasks')
      const ui = (r.data ?? []).map((task) => toUITask(task, t))
      setTasks(ui)
    } catch (_error) {
      // Fetch failed — fall back to an empty list; error state is visible via loading=false + empty list
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [http, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const visible = useMemo(() => {
    return tasks.filter((task) => filter === 'all' || task.status === filter)
  }, [tasks, filter])

  const counts = useMemo(() => {
    const byStatus: Record<ChecklistTaskStatus, number> = {
      complete: 0,
      in_progress: 0,
      pending: 0,
      overdue: 0,
    }
    for (const task of tasks) byStatus[task.status] += 1
    return byStatus
  }, [tasks])

  const total = tasks.length
  const completePct = total > 0 ? Math.round((counts.complete / total) * 100) : 0

  const onToggle = useCallback(
    async (id: string, next: boolean) => {
      if (!http || pendingIds.has(id)) return
      setPendingIds((prev) => new Set(prev).add(id))
      const newStatus: ChecklistTaskStatus = next ? 'complete' : 'in_progress'
      // Optimistic update so the UI is responsive.
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? { ...task, status: newStatus } : task)),
      )
      try {
        await http.put(`/api/tasks/${id}`, {
          status: newStatus,
          completed_at: next ? new Date().toISOString() : null,
        })
        void track({
          name: next ? 'onboarding.task_completed' : 'onboarding.task_reopened',
          properties: { task_id: id, status: newStatus },
        })
        // Re-read so server-derived fields (completed_at/by, updated_at) are
        // reflected — and so a refresh of the page shows the same state.
        await reload()
      } catch (_error) {
        // Roll back on error; the reload re-syncs state from the server
        await reload()
      } finally {
        setPendingIds((prev) => {
          const copy = new Set(prev)
          copy.delete(id)
          return copy
        })
      }
    },
    [http, pendingIds, reload],
  )

  return (
    <div data-mol-id="page-checklist" className={cm.flex({ direction: 'col', gap: 'lg' })}>
      <header>
        <p
          className="text-[11px] font-black uppercase tracking-[0.3em]"
          style={{ color: 'var(--mol-color-secondary)' }}
        >
          {t('checklist.eyebrow', {}, { defaultValue: 'Onboarding · Checklist' })}
        </p>
        <h1 className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 2), 'text-3xl tracking-tight')}>
          {t('checklist.title', {}, { defaultValue: 'Your first 90 days, one task at a time.' })}
        </h1>
        <p className={cm.cn(cm.textMuted, cm.sp('mt', 2), 'max-w-2xl')}>
          {t(
            'checklist.subtitle',
            {},
            {
              defaultValue:
                'Each task is owned by you or someone on your team. Complete in any order — milestones unlock as you go.',
            },
          )}
        </p>
      </header>

      <StatTriad
        items={[
          {
            id: 'completion',
            label: t('checklist.stat.completion', {}, { defaultValue: 'Completion' }),
            value: `${completePct}%`,
            icon: 'check_circle',
            accent: '#166534',
            helper: t(
              'checklist.stat.completionHelper',
              { done: counts.complete, total },
              {
                defaultValue: `${counts.complete} of ${total} done`,
              },
            ),
          },
          {
            id: 'in-progress',
            label: t('checklist.stat.inProgress', {}, { defaultValue: 'In progress' }),
            value: String(counts.in_progress),
            icon: 'pending',
            accent: '#92400e',
            helper: t(
              'checklist.stat.inProgressHelper',
              {},
              { defaultValue: 'Pick up where you left off' },
            ),
          },
          {
            id: 'overdue',
            label: t('status.overdue', {}, { defaultValue: 'Overdue' }),
            value: String(counts.overdue),
            icon: 'warning',
            accent: '#b91c1c',
            helper: t('checklist.stat.overdueHelper', {}, { defaultValue: 'Catch these up first' }),
            trend:
              counts.overdue > 0
                ? {
                    label: t('checklist.stat.actionNeeded', {}, { defaultValue: 'Action needed' }),
                    positive: false,
                  }
                : undefined,
          },
        ]}
      />

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
        {FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cm.cn('text-xs font-black uppercase tracking-[0.18em] transition-colors')}
              style={{
                padding: '8px 16px',
                borderRadius: '999px',
                background: active
                  ? 'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)'
                  : 'transparent',
                color: active
                  ? 'var(--mol-color-surface)'
                  : 'var(--color-foreground-secondary, var(--mol-color-text-secondary))',
                border: active
                  ? 'none'
                  : '1px solid var(--color-border, var(--mol-color-background-tertiary))',
              }}
            >
              {t(f.label, {}, { defaultValue: f.defaultLabel })}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className={cm.textMuted}>
          {t('checklist.loading', {}, { defaultValue: 'Loading your checklist…' })}
        </p>
      ) : visible.length === 0 ? (
        <div className={cm.cn(cm.emptyState, cm.sp('py', 12))}>
          <div className={cm.emptyStateIcon}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '40px', color: 'var(--mol-color-primary)' }}
            >
              celebration
            </span>
          </div>
          <p className={cm.emptyStateTitle}>
            {t('checklist.empty.title', {}, { defaultValue: 'Nothing here right now' })}
          </p>
          <p className={cm.emptyStateDescription}>
            {t(
              'checklist.empty.body',
              {},
              { defaultValue: 'Switch the filter to see other tasks.' },
            )}
          </p>
        </div>
      ) : (
        <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
          {visible.map((task) => (
            <ChecklistTaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              category={task.category}
              status={task.status}
              dueLabel={task.due}
              onToggle={(id, next) => void onToggle(id, next)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
