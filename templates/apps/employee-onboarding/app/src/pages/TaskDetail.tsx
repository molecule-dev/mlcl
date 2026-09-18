import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface OnboardingTaskApi {
  id: string
  title: string
  description?: string | null
  category?: string
  due_date?: string | null
  status: string
  completed_at?: string | null
}

const CATEGORY_LABEL: Record<string, string> = {
  paperwork: 'Paperwork',
  training: 'Training',
  intro: 'Introductions',
  it: 'IT setup',
  general: 'General',
  other: 'Other',
  documents: 'Documents',
  people: 'People',
  milestone: 'Milestone',
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending: {
    label: 'Not started',
    color: 'var(--embark-status-pending)',
    bg: 'var(--embark-status-pending-bg)',
  },
  in_progress: {
    label: 'In progress',
    color: 'var(--embark-status-progress)',
    bg: 'var(--embark-status-progress-bg)',
  },
  complete: {
    label: 'Complete',
    color: 'var(--embark-status-complete)',
    bg: 'var(--embark-status-complete-bg)',
  },
  overdue: {
    label: 'Overdue',
    color: 'var(--embark-status-overdue)',
    bg: 'var(--embark-status-overdue-bg)',
  },
}

function formatDue(
  due: string | null | undefined,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (!due) return t('taskDetail.noDue', {}, { defaultValue: 'No due date' })
  const d = new Date(due)
  const today = new Date()
  if (d.toDateString() === today.toDateString())
    return t('status.today', {}, { defaultValue: 'Today' })
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function TaskDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [task, setTask] = useState<OnboardingTaskApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    if (!http || !id) return
    setLoading(true)
    try {
      const r = await http.get<OnboardingTaskApi>(`/api/tasks/${id}`)
      setTask(r.data)
      setError(null)
    } catch (_error) {
      // Fetch failed — error message is shown to the user via setError below
      setError(
        t(
          'taskDetail.loadError',
          {},
          { defaultValue: 'We could not load this task. Please try again.' },
        ),
      )
      setTask(null)
    } finally {
      setLoading(false)
    }
  }, [http, id, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const onToggleStatus = useCallback(async () => {
    if (!http || !task || busy) return
    setBusy(true)
    const next = task.status === 'complete' ? 'in_progress' : 'complete'
    try {
      await http.put(`/api/tasks/${task.id}`, {
        status: next,
        completed_at: next === 'complete' ? new Date().toISOString() : null,
      })
      await reload()
    } catch (_error) {
      // Update failed — re-sync from the server so the UI reflects reality
      await reload()
    } finally {
      setBusy(false)
    }
  }, [http, task, busy, reload])

  if (loading) {
    return (
      <div data-mol-id="page-task-detail" className={cm.flex({ direction: 'col', gap: 'lg' })}>
        <p className={cm.textMuted}>
          {t('taskDetail.loading', {}, { defaultValue: 'Loading task…' })}
        </p>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div data-mol-id="page-task-detail" className={cm.flex({ direction: 'col', gap: 'lg' })}>
        <nav className="uppercase tracking-[0.18em] text-on-surface-variant">
          <Link to="/checklist">
            {t('taskDetail.breadcrumbChecklist', {}, { defaultValue: 'Checklist' })}
          </Link>
        </nav>
        <div className={cm.cn(cm.emptyState, cm.sp('py', 12))}>
          <p className={cm.emptyStateTitle}>
            {t('taskDetail.notFound', {}, { defaultValue: 'Task not found' })}
          </p>
          <p className={cm.emptyStateDescription}>
            {error ??
              t(
                'taskDetail.notFoundBody',
                {},
                { defaultValue: 'This task may have been deleted or belongs to another user.' },
              )}
          </p>
        </div>
      </div>
    )
  }

  const statusKey = task.status in STATUS_LABEL ? task.status : 'pending'
  const status = STATUS_LABEL[statusKey]
  const categoryKey = task.category && task.category in CATEGORY_LABEL ? task.category : 'general'
  const categoryLabel = t(
    `taskDetail.category.${categoryKey}`,
    {},
    { defaultValue: CATEGORY_LABEL[categoryKey] },
  )
  const statusLabel = t(`taskDetail.status.${statusKey}`, {}, { defaultValue: status.label })
  const dueLabel = formatDue(task.due_date, t)

  return (
    <div data-mol-id="page-task-detail" className={cm.flex({ direction: 'col', gap: 'lg' })}>
      <nav className="uppercase tracking-[0.18em] text-on-surface-variant">
        <Link to="/checklist">
          {t('taskDetail.breadcrumbChecklist', {}, { defaultValue: 'Checklist' })}
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span>
          {t('taskDetail.breadcrumbCurrent', {}, { defaultValue: 'Task' })} #{task.id.slice(0, 6)}
        </span>
      </nav>

      <header className={cm.flex({ direction: 'col', gap: 'sm' })}>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          <span
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{
              color: 'var(--mol-color-primary)',
              background: 'rgba(13, 148, 136, 0.10)',
              padding: '2px 12px',
              borderRadius: '999px',
            }}
          >
            {categoryLabel} · {dueLabel}
          </span>
          <span
            data-mol-id="task-status-badge"
            className="text-[10px] font-black uppercase tracking-[0.18em]"
            style={{
              color: status.color,
              background: status.bg,
              padding: '2px 12px',
              borderRadius: '999px',
            }}
          >
            {statusLabel}
          </span>
        </div>
        <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight')}>{task.title}</h1>
        {task.description && <p className={cm.cn(cm.textMuted, 'max-w-2xl')}>{task.description}</p>}
      </header>

      <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
        <button
          type="button"
          data-mol-id="task-toggle-button"
          disabled={busy}
          onClick={() => void onToggleStatus()}
          className={cm.cn('font-bold uppercase tracking-[0.14em] transition-colors')}
          style={{
            padding: '12px 20px',
            borderRadius: '999px',
            background:
              task.status === 'complete'
                ? 'transparent'
                : 'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-success) 100%)',
            color:
              task.status === 'complete' ? 'var(--mol-color-primary)' : 'var(--mol-color-surface)',
            border: task.status === 'complete' ? '2px solid var(--mol-color-primary)' : 'none',
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {task.status === 'complete'
            ? t('taskDetail.markIncomplete', {}, { defaultValue: 'Mark as in progress' })
            : t('taskDetail.markComplete', {}, { defaultValue: 'Mark complete' })}
        </button>
        <Link
          to="/checklist"
          className={cm.cn('font-bold uppercase tracking-[0.14em] transition-colors')}
          style={{
            padding: '12px 20px',
            borderRadius: '999px',
            background: 'transparent',
            color: 'var(--color-foreground-secondary, var(--mol-color-text-secondary))',
            border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
            textDecoration: 'none',
          }}
        >
          {t('taskDetail.backToChecklist', {}, { defaultValue: 'Back to checklist' })}
        </Link>
      </div>

      <aside
        className={cm.sp('p', 5)}
        style={{
          background:
            'linear-gradient(135deg, rgba(13, 148, 136, 0.10) 0%, rgba(139, 92, 246, 0.10) 100%)',
          borderRadius: '14px',
          border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
          maxWidth: '640px',
        }}
      >
        <p
          className="text-[10px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--mol-color-secondary)' }}
        >
          {t('taskDetail.tipEyebrow', {}, { defaultValue: 'Quick tip' })}
        </p>
        <p className={cm.cn(cm.sp('mt', 2), 'text-sm leading-relaxed')}>
          {t(
            'taskDetail.tipBody',
            {},
            {
              defaultValue:
                'If you’re blocked, message your onboarding buddy in Slack — they’re your first line of help.',
            },
          )}
        </p>
      </aside>
    </div>
  )
}
