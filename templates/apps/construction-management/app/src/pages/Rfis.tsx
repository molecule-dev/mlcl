import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProjectNav } from '../components/ProjectNav.js'
import { STATUS_TONE, StatusBadge } from '../components/StatusBadge.js'
import { daysSince, formatDate } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface Rfi {
  id: string
  project_id: string
  project: string
  number: number
  title: string
  question: string
  originator: string
  drawings_ref: string
  due_date: string | null
  status: string
  created_at: string
}

const STATUSES = ['all', 'open', 'answered', 'closed'] as const
type StatusFilter = (typeof STATUSES)[number]

export function Rfis() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { projectId } = useParams<{ projectId: string }>()
  const [list, setList] = useState<Rfi[]>([])
  const [status, setStatus] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [originator, setOriginator] = useState('')
  const [drawingsRef, setDrawingsRef] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!projectId) return
    setLoading(true)
    http
      .get(`/api/rfis?project_id=${projectId}`)
      .then((res) => {
        if (!cancelled) setList(unwrapList<Rfi>(res))
      })
      .catch(() => {
        if (!cancelled) setError(t('rfis.loadError', {}, { defaultValue: 'Failed to load RFIs.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, projectId, t])

  const visible = status === 'all' ? list : list.filter((r) => r.status === status)

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!projectId) return
    setSaving(true)
    setFormError(null)
    try {
      await http.post('/api/rfis', {
        project_id: projectId,
        title,
        question,
        originator,
        drawings_ref: drawingsRef || undefined,
        due_date: dueDate || null,
      })
      const refreshed = await http.get(`/api/rfis?project_id=${projectId}`)
      setList(unwrapList<Rfi>(refreshed))
      setShowForm(false)
      setTitle('')
      setQuestion('')
      setOriginator('')
      setDrawingsRef('')
      setDueDate('')
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t('rfis.createError', {}, { defaultValue: 'Failed to raise the RFI.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between' })}>
        <div>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
            {t('rfis.heading', {}, { defaultValue: 'RFIs' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'rfis.subheading',
              { open: list.filter((r) => r.status === 'open').length },
              { defaultValue: '{{open}} open' },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="rfis-new-button"
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
            ? t('rfis.cancelNew', {}, { defaultValue: 'Cancel' })
            : t('rfis.newButton', {}, { defaultValue: 'Raise RFI' })}
        </button>
      </header>

      <ProjectNav projectId={projectId ?? ''} />

      {showForm && (
        <form
          data-mol-id="rfis-new-form"
          onSubmit={handleCreate}
          className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}
        >
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('rfis.field.title', {}, { defaultValue: 'Title' })}
              </span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-mol-id="rfis-field-title"
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
                {t('rfis.field.originator', {}, { defaultValue: 'Originator' })}
              </span>
              <input
                required
                value={originator}
                onChange={(e) => setOriginator(e.target.value)}
                data-mol-id="rfis-field-originator"
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
                {t('rfis.field.drawings', {}, { defaultValue: 'Drawing reference' })}
              </span>
              <input
                value={drawingsRef}
                onChange={(e) => setDrawingsRef(e.target.value)}
                data-mol-id="rfis-field-drawings"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
                placeholder="A-402 / S-101"
              />
            </label>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('rfis.field.due', {}, { defaultValue: 'Due date' })}
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                data-mol-id="rfis-field-due"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'border border-outline-variant rounded-md bg-surface',
                )}
              />
            </label>
          </div>
          <label className={'block space-y-1'}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {t('rfis.field.question', {}, { defaultValue: 'Question' })}
            </span>
            <textarea
              required
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              data-mol-id="rfis-field-question"
              className={cm.cn(
                cm.w('full'),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'border border-outline-variant rounded-md bg-surface',
              )}
            />
          </label>
          {formError && (
            <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
              {formError}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            data-mol-id="rfis-create-submit"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-md brand-gradient text-on-primary disabled:opacity-50',
            )}
          >
            {saving
              ? t('rfis.saving', {}, { defaultValue: 'Raising…' })
              : t('rfis.submit', {}, { defaultValue: 'Raise RFI' })}
          </button>
        </form>
      )}

      <nav
        aria-label={t('rfis.filterLabel', {}, { defaultValue: 'Filter RFIs by status' })}
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
              data-mol-id={`rfis-filter-${s}`}
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
              {t(`rfis.status.${s}`, {}, { defaultValue: s })}
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
          {t('rfis.empty', {}, { defaultValue: 'No RFIs match.' })}
        </p>
      ) : (
        <ul className={'space-y-3'}>
          {visible.map((rfi) => {
            const age = daysSince(rfi.created_at) ?? 0
            return (
              <li key={rfi.id} data-mol-id={`rfi-row-${rfi.id}`}>
                <Link
                  to={`/projects/${rfi.project_id}/rfis/${rfi.id}`}
                  className={cm.cn(
                    cm.card(),
                    cm.sp('p', 5),
                    'block hover:bg-surface-container-low transition-colors',
                  )}
                >
                  <div
                    className={cm.flex({
                      align: 'center',
                      justify: 'between',
                      gap: 'md',
                      wrap: 'wrap',
                    })}
                  >
                    <div>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('semibold'),
                          'text-on-surface-variant',
                        )}
                      >
                        #{rfi.number} · {rfi.originator}
                        {rfi.drawings_ref ? ` · ${rfi.drawings_ref}` : ''}
                      </p>
                      <p
                        className={cm.cn(
                          cm.sp('mt', 1),
                          cm.textSize('base'),
                          cm.fontWeight('medium'),
                        )}
                      >
                        {rfi.title}
                      </p>
                    </div>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      {rfi.status === 'open' && (
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            age >= 5 ? 'text-error font-semibold' : 'text-on-surface-variant',
                          )}
                        >
                          {t('rfis.ageDays', { days: age }, { defaultValue: '{{days}}d open' })}
                        </span>
                      )}
                      {rfi.due_date && rfi.status !== 'closed' ? (
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t(
                            'rfis.due',
                            { date: formatDate(rfi.due_date) },
                            { defaultValue: 'due {{date}}' },
                          )}
                        </span>
                      ) : null}
                      <StatusBadge
                        value={rfi.status}
                        tone={STATUS_TONE[rfi.status] ?? 'neutral'}
                        translationKeyPrefix="rfis.status"
                      />
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
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

export default Rfis
