import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ActivityRecord {
  id: string
  type: string
  subject: string
  description: string | null
  contact_id: string | null
  deal_id: string | null
  company_id: string | null
  due_date: string | null
  completed: boolean
  created_at: string
  updated_at: string
}

interface ContactRecord {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

interface DealRecord {
  id: string
  title: string
}

const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'task', 'note'] as const
type ActivityType = (typeof ACTIVITY_TYPES)[number]

const TYPE_LABELS: Record<ActivityType, string> = {
  call: 'Call',
  email: 'Email',
  meeting: 'Meeting',
  task: 'Task',
  note: 'Note',
}

const TYPE_ICONS: Record<ActivityType, string> = {
  call: 'call',
  email: 'mail',
  meeting: 'event',
  task: 'task_alt',
  note: 'sticky_note_2',
}

function formatRelative(timestamp: string | null): string {
  if (!timestamp) return '—'
  const then = new Date(timestamp).getTime()
  const now = Date.now()
  const diff = now - then
  const past = diff >= 0
  const abs = Math.abs(diff)
  const minutes = Math.floor(abs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return past ? `${minutes} min ago` : `in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return past ? `${hours} hr ago` : `in ${hours} hr`
  const days = Math.floor(hours / 24)
  if (days < 7)
    return past
      ? `${days} day${days === 1 ? '' : 's'} ago`
      : `in ${days} day${days === 1 ? '' : 's'}`
  return new Date(timestamp).toLocaleDateString()
}

export function ActivitiesPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [deals, setDeals] = useState<DealRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | ActivityType>('all')
  const [showCompleted, setShowCompleted] = useState(true)
  const [draftOpen, setDraftOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [draft, setDraft] = useState({
    type: 'task' as ActivityType,
    subject: '',
    description: '',
    contact_id: '',
    deal_id: '',
    due_date: '',
  })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [actsRes, contactsRes, dealsRes] = await Promise.all([
        http.get<ActivityRecord[]>('/api/activities'),
        http.get<ContactRecord[]>('/api/contacts'),
        http.get<DealRecord[]>('/api/deals'),
      ])
      setActivities(Array.isArray(actsRes.data) ? actsRes.data : [])
      setContacts(Array.isArray(contactsRes.data) ? contactsRes.data : [])
      setDeals(Array.isArray(dealsRes.data) ? dealsRes.data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load activities.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is defined inline and recreated each render; adding it would cause an infinite loop
  }, [])

  const contactName = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of contacts) {
      const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.email || 'Contact'
      map.set(c.id, name)
    }
    return map
  }, [contacts])

  const dealTitle = useMemo(() => {
    const map = new Map<string, string>()
    for (const d of deals) map.set(d.id, d.title)
    return map
  }, [deals])

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      if (!showCompleted && a.completed) return false
      return true
    })
  }, [activities, typeFilter, showCompleted])

  const stats = useMemo(() => {
    const completed = activities.filter((a) => a.completed).length
    const efficiency =
      activities.length === 0 ? 0 : Math.round((completed / activities.length) * 100)
    const now = Date.now()
    const upcoming = activities.filter((a) => {
      if (a.completed || !a.due_date) return false
      const due = new Date(a.due_date).getTime()
      return due > now && due - now < 24 * 60 * 60 * 1000
    }).length
    return { total: activities.length, completed, efficiency, upcoming }
  }, [activities])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.subject.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await http.post<ActivityRecord>('/api/activities', {
        type: draft.type,
        subject: draft.subject.trim(),
        description: draft.description || null,
        contact_id: draft.contact_id || null,
        deal_id: draft.deal_id || null,
        due_date: draft.due_date ? new Date(draft.due_date).toISOString() : null,
      })
      setDraft({
        type: 'task',
        subject: '',
        description: '',
        contact_id: '',
        deal_id: '',
        due_date: '',
      })
      setDraftOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create activity.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleComplete(a: ActivityRecord) {
    try {
      await http.patch(`/api/activities/${a.id}`, { completed: !a.completed })
      setActivities((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, completed: !x.completed } : x)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update activity.')
    }
  }

  const typeLabel = (type: ActivityType): string =>
    t(`activities.type.${type}`, {}, { defaultValue: TYPE_LABELS[type] })

  async function handleDelete(id: string) {
    if (
      !window.confirm(t('activities.confirmDelete', {}, { defaultValue: 'Delete this activity?' }))
    )
      return
    try {
      await http.delete(`/api/activities/${id}`)
      setActivities((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete activity.')
    }
  }

  return (
    <div
      aria-label={t('activities.pageLabel', {}, { defaultValue: 'Activities' })}
      className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}
    >
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-3')}
      >
        <div>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('activities.title', {}, { defaultValue: 'Activities' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            <span data-mol-id="activities-total">{stats.total}</span>{' '}
            {t('activities.totalLabel', {}, { defaultValue: 'logged ·' })}{' '}
            <span data-mol-id="activities-completed">{stats.completed}</span>{' '}
            {t('activities.completedLabel', {}, { defaultValue: 'done ·' })}{' '}
            <span data-mol-id="activities-upcoming">{stats.upcoming}</span>{' '}
            {t('activities.upcomingLabel', {}, { defaultValue: 'due in 24h ·' })}{' '}
            <span data-mol-id="activities-efficiency">{stats.efficiency}%</span>{' '}
            {t('activities.efficiencyLabel', {}, { defaultValue: 'completion rate' })}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="activities-new"
          onClick={() => setDraftOpen((v) => !v)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-lg hover:bg-primary/90',
          )}
        >
          {draftOpen
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('activities.new', {}, { defaultValue: 'Log activity' })}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          data-mol-id="activities-error"
          className={cm.cn(
            cm.sp('p', 3),
            cm.textSize('sm'),
            'rounded-lg bg-error-container text-on-error-container',
          )}
        >
          {error}
        </div>
      )}

      {draftOpen && (
        <form
          onSubmit={handleCreate}
          data-mol-id="activities-form"
          className={cm.cn(
            cm.sp('p', 4),
            cm.flex({ direction: 'col' }),
            'gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low',
          )}
        >
          <div className={cm.cn(cm.flex(), 'gap-3 flex-wrap')}>
            <select
              data-mol-id="activities-form-type"
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as ActivityType }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant/30 bg-surface',
              )}
            >
              {ACTIVITY_TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {typeLabel(tp)}
                </option>
              ))}
            </select>
            <input
              required
              data-mol-id="activities-form-subject"
              placeholder={t('activities.fieldSubject', {}, { defaultValue: 'Subject' }) as string}
              value={draft.subject}
              onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'flex-1 min-w-[200px] rounded-lg border border-outline-variant/30 bg-surface',
              )}
            />
            <input
              type="datetime-local"
              data-mol-id="activities-form-due"
              value={draft.due_date}
              onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant/30 bg-surface',
              )}
            />
          </div>
          <div className={cm.cn(cm.flex(), 'gap-3 flex-wrap')}>
            <select
              data-mol-id="activities-form-contact"
              value={draft.contact_id}
              onChange={(e) => setDraft((d) => ({ ...d, contact_id: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'min-w-[160px] rounded-lg border border-outline-variant/30 bg-surface',
              )}
            >
              <option value="">
                {t('activities.fieldContact', {}, { defaultValue: 'No contact' })}
              </option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {contactName.get(c.id)}
                </option>
              ))}
            </select>
            <select
              data-mol-id="activities-form-deal"
              value={draft.deal_id}
              onChange={(e) => setDraft((d) => ({ ...d, deal_id: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'min-w-[160px] rounded-lg border border-outline-variant/30 bg-surface',
              )}
            >
              <option value="">{t('activities.fieldDeal', {}, { defaultValue: 'No deal' })}</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            <input
              data-mol-id="activities-form-description"
              placeholder={t('form.description', {}, { defaultValue: 'Description' }) as string}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'flex-1 min-w-[200px] rounded-lg border border-outline-variant/30 bg-surface',
              )}
            />
            <button
              type="submit"
              data-mol-id="activities-form-submit"
              disabled={submitting || !draft.subject.trim()}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'bg-primary text-on-primary rounded-lg disabled:opacity-50',
              )}
            >
              {submitting
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('activities.create', {}, { defaultValue: 'Log activity' })}
            </button>
          </div>
        </form>
      )}

      <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-2 flex-wrap')}>
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'rounded-full',
            typeFilter === 'all'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-low text-on-surface-variant',
          )}
        >
          {t('status.all', {}, { defaultValue: 'All' })} ({stats.total})
        </button>
        {ACTIVITY_TYPES.map((tp) => {
          const count = activities.filter((a) => a.type === tp).length
          return (
            <button
              key={tp}
              type="button"
              onClick={() => setTypeFilter(tp)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'rounded-full',
                typeFilter === tp
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant',
              )}
            >
              {typeLabel(tp)} ({count})
            </button>
          )
        })}
        <label
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            'gap-2 ml-auto rounded-full bg-surface-container-low text-on-surface-variant cursor-pointer',
          )}
        >
          <input
            type="checkbox"
            data-mol-id="activities-show-completed"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          {t('activities.showCompleted', {}, { defaultValue: 'Show completed' })}
        </label>
      </div>

      {loading ? (
        <div data-mol-id="activities-loading" className="text-on-surface-variant">
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-mol-id="activities-empty"
          className={cm.cn(
            cm.sp('p', 8),
            'text-center text-on-surface-variant rounded-xl border border-dashed border-outline-variant/30',
          )}
        >
          {activities.length === 0
            ? t(
                'activities.empty',
                {},
                { defaultValue: 'No activities yet. Log your first activity above.' },
              )
            : t(
                'activities.emptyFiltered',
                {},
                { defaultValue: 'No activities match the current filter.' },
              )}
        </div>
      ) : (
        <ul data-mol-id="activities-list" className={cm.cn(cm.flex({ direction: 'col' }), 'gap-3')}>
          {filtered.map((a) => (
            <li
              key={a.id}
              data-mol-id="activities-row"
              data-activity-id={a.id}
              className={cm.cn(
                cm.flex({ align: 'center' }),
                cm.sp('p', 4),
                'gap-4 rounded-xl border border-outline-variant/15 bg-surface-container-lowest',
              )}
            >
              <input
                type="checkbox"
                data-mol-id="activities-toggle"
                checked={a.completed}
                onChange={() => handleToggleComplete(a)}
                aria-label={
                  t('activities.toggleComplete', {}, { defaultValue: 'Toggle complete' }) as string
                }
              />
              <span
                className={cm.fv5b245ffa}
                style={{ fontSize: '20px', color: 'var(--mol-color-text-secondary)' }}
                aria-hidden
              >
                {TYPE_ICONS[a.type as ActivityType] ?? 'event_note'}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    a.completed ? 'line-through text-on-surface-variant' : '',
                  )}
                >
                  {a.subject}
                </div>
                <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                  <span className="capitalize">{a.type}</span>
                  {a.contact_id && contactName.get(a.contact_id)
                    ? ` · ${contactName.get(a.contact_id)}`
                    : ''}
                  {a.deal_id && dealTitle.get(a.deal_id) ? ` · ${dealTitle.get(a.deal_id)}` : ''}
                  {a.description ? ` · ${a.description}` : ''}
                </div>
              </div>
              <div
                className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant whitespace-nowrap')}
              >
                {a.due_date ? formatRelative(a.due_date) : '—'}
              </div>
              <button
                type="button"
                data-mol-id="activities-delete"
                onClick={() => handleDelete(a.id)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'rounded-lg text-error hover:bg-error-container/30',
                )}
              >
                {t('common.delete', {}, { defaultValue: 'Delete' })}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ActivitiesPage
export { ActivitiesPage as Activities }
