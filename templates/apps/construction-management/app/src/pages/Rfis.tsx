import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
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

  // SEOR & consultant SLA tracker — turnaround stats over the live board.
  const openRfis = list.filter((r) => r.status === 'open')
  const avgDaysOpen =
    openRfis.length > 0
      ? Math.round(
          (openRfis.reduce((sum, r) => sum + (daysSince(r.created_at) ?? 0), 0) / openRfis.length) *
            10,
        ) / 10
      : 0
  const oldestOpen = openRfis.reduce((max, r) => Math.max(max, daysSince(r.created_at) ?? 0), 0)
  const overdue = openRfis.filter((r) => r.due_date && new Date(r.due_date) < new Date()).length
  // Official determination log — the answered and closed RFIs, newest first:
  // what was asked, what governed, and when it was locked.
  const determinations = list
    .filter((r) => r.status === 'answered' || r.status === 'closed')
    .slice(0, 6)

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!projectId) return
    setSaving(true)
    setFormError(null)
    try {
      const res = await http.post('/api/rfis', {
        project_id: projectId,
        title,
        question,
        originator,
        drawings_ref: drawingsRef || undefined,
        due_date: dueDate || null,
      })
      const created = (res as unknown as { data?: Rfi }).data
      track({
        name: 'rfi.raised',
        properties: { project_id: projectId, rfi_id: created?.id ?? null },
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
    <div className={cm.cn('px-4 md:px-8', cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}>
        <div>
          <h1 className={cm.cn('text-2xl md:text-3xl', cm.fontWeight('bold'), 'wrap-anywhere')}>
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
                  'min-w-0 border border-outline-variant rounded-md bg-surface',
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
                  'min-w-0 border border-outline-variant rounded-md bg-surface',
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
                  'min-w-0 border border-outline-variant rounded-md bg-surface',
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
                  'min-w-0 border border-outline-variant rounded-md bg-surface',
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
                'min-w-0 border border-outline-variant rounded-md bg-surface',
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

      {/* SEOR & consultant SLA tracker */}
      <section data-mol-id="rfis-sla-tracker" className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <div className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}>
          <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {t('rfis.slaTracker', {}, { defaultValue: 'SEOR & Consultant SLA Tracker' })}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant',
            )}
          >
            {t(
              'rfis.slaTarget',
              {},
              { defaultValue: 'Contract target: answered in under 72 hours' },
            )}
          </span>
        </div>
        <div className={cm.cn(cm.sp('mt', 4), cm.grid({ cols: 2, gap: 'md' }), 'md:grid-cols-4')}>
          {[
            {
              label: t('rfis.sla.open', { count: openRfis.length }, { defaultValue: 'Open now' }),
              value: String(openRfis.length),
            },
            {
              label: t('rfis.sla.avg', {}, { defaultValue: 'Avg days open' }),
              value: avgDaysOpen.toLocaleString(),
            },
            {
              label: t('rfis.sla.oldest', {}, { defaultValue: 'Oldest open' }),
              value: t('rfis.sla.days', { days: oldestOpen }, { defaultValue: '{{days}}d' }),
            },
            {
              label: t('rfis.sla.overdue', {}, { defaultValue: 'Past due date' }),
              value: String(overdue),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cm.cn(cm.sp('p', 3), 'rounded-lg bg-surface-container')}
            >
              <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>{stat.value}</p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Official determination log */}
      <section data-mol-id="rfis-determination-log" className={cm.cn(cm.card(), cm.sp('p', 6))}>
        <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
          {t('rfis.determinationLog', {}, { defaultValue: 'Official Determination Log' })}
        </h2>
        <p className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'rfis.determinationLogHint',
            {},
            {
              defaultValue:
                'Answered and closed RFIs of record — the determination the field builds to, newest first.',
            },
          )}
        </p>
        {determinations.length === 0 ? (
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'rfis.determinationLogEmpty',
              {},
              { defaultValue: 'No determinations yet — answer an RFI to open the log.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn(cm.sp('mt', 4), 'divide-y divide-outline-variant')}>
            {determinations.map((rfi) => (
              <li key={rfi.id}>
                <Link
                  to={`/projects/${rfi.project_id}/rfis/${rfi.id}`}
                  className={cm.flex({
                    align: 'center',
                    justify: 'between',
                    gap: 'md',
                    wrap: 'wrap',
                  })}
                >
                  <span className={cm.cn(cm.textSize('sm'), 'min-w-0 truncate')}>
                    <span className={cm.cn(cm.fontWeight('semibold'))}>#{rfi.number}</span>{' '}
                    <span className="text-on-surface-variant">{rfi.title}</span>
                  </span>
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      rfi.status === 'closed' ? 'text-on-surface-variant' : 'text-tertiary',
                      'whitespace-nowrap',
                    )}
                  >
                    {t(
                      `rfis.status.${rfi.status}`,
                      {},
                      { defaultValue: rfi.status === 'closed' ? 'Closed of record' : 'Answered' },
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

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
