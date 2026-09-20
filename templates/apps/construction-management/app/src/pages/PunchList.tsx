import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProjectNav } from '../components/ProjectNav.js'
import { SEVERITY_TONE, STATUS_TONE, StatusBadge } from '../components/StatusBadge.js'
import { formatDate, formatDateTime } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface PunchItem {
  id: string
  project_id: string
  project: string
  location: string
  severity: string
  description: string
  assignee: string | null
  status: string
  photo_url: string | null
  closed_at: string | null
  created_at: string
}

const SEVERITIES = ['low', 'medium', 'high'] as const
const STATUSES = ['all', 'open', 'in_progress', 'closed'] as const
type StatusFilter = (typeof STATUSES)[number]

export function PunchList() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { projectId } = useParams<{ projectId: string }>()
  const [items, setItems] = useState<PunchItem[]>([])
  const [status, setStatus] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [location, setLocation] = useState('')
  const [severity, setSeverity] = useState<string>('medium')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [assignId, setAssignId] = useState<string | null>(null)
  const [assignName, setAssignName] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!projectId) return
    setLoading(true)
    http
      .get(`/punch-items?project_id=${projectId}`)
      .then((res) => {
        if (!cancelled) setItems(unwrapList<PunchItem>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('punch.loadError', {}, { defaultValue: 'Failed to load punch items.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, projectId, t])

  const visible = status === 'all' ? items : items.filter((i) => i.status === status)

  async function refresh(): Promise<void> {
    if (!projectId) return
    const res = await http.get(`/punch-items?project_id=${projectId}`)
    setItems(unwrapList<PunchItem>(res))
  }

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!projectId) return
    setSaving(true)
    setFormError(null)
    try {
      await http.post('/punch-items', {
        project_id: projectId,
        location,
        severity,
        description,
        assignee: assignee || null,
        photo_url: photoUrl || null,
      })
      await refresh()
      setShowForm(false)
      setLocation('')
      setDescription('')
      setAssignee('')
      setPhotoUrl('')
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t('punch.createError', {}, { defaultValue: 'Failed to file the punch item.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function transition(item: PunchItem, next: 'in_progress' | 'closed'): Promise<void> {
    try {
      await http.post(`/punch-items/${item.id}/status`, { status: next })
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('punch.statusError', {}, { defaultValue: 'Status change rejected.' }),
      )
    }
  }

  async function handleAssign(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!assignId) return
    try {
      await http.put(`/punch-items/${assignId}`, { assignee: assignName || null })
      await refresh()
      setAssignId(null)
      setAssignName('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('punch.assignError', {}, { defaultValue: 'Failed to assign.' }),
      )
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('punch.heading', {}, { defaultValue: 'Punch list' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'punch.subheading',
              { open: items.filter((i) => i.status !== 'closed').length },
              { defaultValue: '{{open}} open items' },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="punch-new-button"
          onClick={() => setShowForm((v) => !v)}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'rounded-md brand-gradient text-on-primary',
          )}
        >
          {showForm
            ? t('punch.cancelNew', {}, { defaultValue: 'Cancel' })
            : t('punch.newButton', {}, { defaultValue: 'File punch item' })}
        </button>
      </header>

      <ProjectNav projectId={projectId ?? ''} />

      {showForm && (
        <form
          data-mol-id="punch-new-form"
          onSubmit={handleCreate}
          className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}
        >
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('punch.field.location', {}, { defaultValue: 'Location on plans' })}
              </span>
              <input
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                data-mol-id="punch-field-location"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
                placeholder={t(
                  'punch.field.locationPlaceholder',
                  {},
                  { defaultValue: 'Level 2 — Grid C4' },
                )}
              />
            </label>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('punch.field.severity', {}, { defaultValue: 'Severity' })}
              </span>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                data-mol-id="punch-field-severity"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {t(`punch.severity.${s}`, {}, { defaultValue: s.toUpperCase() })}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className={'block space-y-1'}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('punch.field.description', {}, { defaultValue: 'Description' })}
            </span>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-mol-id="punch-field-description"
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'border border-outline-variant rounded-md bg-surface',
              )}
            />
          </label>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('punch.field.assignee', {}, { defaultValue: 'Assignee (optional)' })}
              </span>
              <input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                data-mol-id="punch-field-assignee"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
              />
            </label>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('punch.field.photo', {}, { defaultValue: 'Photo URL (optional)' })}
              </span>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                data-mol-id="punch-field-photo"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
                placeholder="https://…"
              />
            </label>
          </div>
          {formError && (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
              {formError}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            data-mol-id="punch-create-submit"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-md brand-gradient text-on-primary disabled:opacity-50',
            )}
          >
            {saving
              ? t('punch.saving', {}, { defaultValue: 'Filing…' })
              : t('punch.submit', {}, { defaultValue: 'File item' })}
          </button>
        </form>
      )}

      <nav
        aria-label={t('punch.filterLabel', {}, { defaultValue: 'Filter punch items by status' })}
        className={cm.flex({ gap: 'xs', align: 'center', wrap: 'wrap' })}
      >
        {STATUSES.map((s) => {
          const active = status === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={active}
              data-mol-id={`punch-filter-${s}`}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'rounded-full',
                active
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface border border-outline-variant text-on-surface-variant',
              )}
            >
              {t(`punch.status.${s}`, {}, { defaultValue: s.replace(/_/g, ' ') })}
            </button>
          )
        })}
      </nav>

      {error ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : visible.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('punch.empty', {}, { defaultValue: 'No punch items match — the job is clean.' })}
        </p>
      ) : (
        <ul className={'space-y-4'}>
          {visible.map((item) => (
            <li
              key={item.id}
              data-mol-id={`punch-item-${item.id}`}
              className={cm.cn(cm.card(), cm.sp('p', 5))}
            >
              <div className={cm.flex({ align: 'start', justify: 'between', gap: 'md' })}>
                <div>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-primary')}
                  >
                    {item.location}
                  </p>
                  <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'))}>{item.description}</p>
                  <p
                    className={cm.cn(cm.sp('mt', 2), cm.textSize('xs'), 'text-on-surface-variant')}
                  >
                    {t(
                      'punch.filed',
                      { date: formatDate(item.created_at) },
                      { defaultValue: 'Filed {{date}}' },
                    )}
                    {item.assignee ? ` · ${item.assignee}` : ''}
                    {item.closed_at
                      ? ` · ${t('punch.closedAt', { date: formatDateTime(item.closed_at) }, { defaultValue: 'closed {{date}}' })}`
                      : ''}
                  </p>
                </div>
                <div className={cm.flex({ direction: 'col', gap: 'xs', align: 'end' })}>
                  <StatusBadge
                    value={item.severity}
                    tone={SEVERITY_TONE[item.severity] ?? 'neutral'}
                    translationKeyPrefix="punch.severity"
                  />
                  <StatusBadge
                    value={item.status}
                    tone={STATUS_TONE[item.status] ?? 'neutral'}
                    translationKeyPrefix="punch.status"
                  />
                </div>
              </div>

              {item.photo_url ? (
                <img
                  src={item.photo_url}
                  alt={t('punch.photoAlt', {}, { defaultValue: 'Punch item photo' })}
                  className={cm.cn(cm.sp('mt', 3), 'rounded-md h-32 w-auto object-cover')}
                />
              ) : null}

              {item.status !== 'closed' && (
                <div
                  className={cm.cn(
                    cm.sp('mt', 3),
                    cm.flex({ gap: 'sm', align: 'center', wrap: 'wrap' }),
                  )}
                >
                  {item.status === 'open' && (
                    <button
                      type="button"
                      data-mol-id={`punch-start-${item.id}`}
                      onClick={() => transition(item, 'in_progress')}
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1.5),
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'rounded-md border border-outline-variant hover:bg-surface-container',
                      )}
                    >
                      {t('punch.start', {}, { defaultValue: 'Start work' })}
                    </button>
                  )}
                  <button
                    type="button"
                    data-mol-id={`punch-assign-${item.id}`}
                    onClick={() => setAssignId(assignId === item.id ? null : item.id)}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1.5),
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'rounded-md border border-outline-variant hover:bg-surface-container',
                    )}
                  >
                    {item.assignee
                      ? t('punch.reassign', {}, { defaultValue: 'Reassign' })
                      : t('punch.assign', {}, { defaultValue: 'Assign' })}
                  </button>
                  <button
                    type="button"
                    data-mol-id={`punch-close-${item.id}`}
                    onClick={() => transition(item, 'closed')}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1.5),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'rounded-md bg-primary text-on-primary hover:opacity-90',
                    )}
                  >
                    {t('punch.close', {}, { defaultValue: 'Close out' })}
                  </button>
                </div>
              )}

              {assignId === item.id && (
                <form
                  onSubmit={handleAssign}
                  className={cm.cn(
                    cm.sp('mt', 3),
                    cm.flex({ gap: 'sm', align: 'end', wrap: 'wrap' }),
                  )}
                >
                  <label className={'block space-y-1'}>
                    <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                      {t('punch.assignTo', {}, { defaultValue: 'Assign to' })}
                    </span>
                    <input
                      required
                      value={assignName}
                      onChange={(e) => setAssignName(e.target.value)}
                      data-mol-id="punch-assign-name"
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        'border border-outline-variant rounded-md bg-surface',
                      )}
                    />
                  </label>
                  <button
                    type="submit"
                    data-mol-id="punch-assign-submit"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'rounded-md brand-gradient text-on-primary',
                    )}
                  >
                    {t('punch.assignSave', {}, { defaultValue: 'Save' })}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <p>
        <Link
          to={projectId ? `/projects/${projectId}` : '/projects'}
          className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}
        >
          {t('project.backToOverview', {}, { defaultValue: '← Back to project overview' })}
        </Link>
      </p>
    </div>
  )
}

export default PunchList
