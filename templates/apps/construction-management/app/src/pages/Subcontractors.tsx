import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ProjectNav } from '../components/ProjectNav.js'
import { STATUS_TONE, StatusBadge } from '../components/StatusBadge.js'
import { formatMoney } from '../lib/format.js'
import { unwrapList } from '../lib/unwrap.js'

interface Subcontractor {
  id: string
  project_id: string
  project: string
  trade: string
  company: string
  contact: string
  contract_value_cents: number
  status: string
}

export function Subcontractors() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { projectId } = useParams<{ projectId: string }>()
  const [list, setList] = useState<Subcontractor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Action failures (status changes) render INLINE below the table — feeding
  // them into `error` would replace the whole list with an error line.
  const [actionError, setActionError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [trade, setTrade] = useState('')
  const [company, setCompany] = useState('')
  const [contact, setContact] = useState('')
  const [contractValue, setContractValue] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!projectId) return
    setLoading(true)
    http
      .get(`/api/subcontractors?project_id=${projectId}`)
      .then((res) => {
        if (!cancelled) setList(unwrapList<Subcontractor>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('subs.loadError', {}, { defaultValue: 'Failed to load subcontractors.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, projectId, t])

  async function refresh(): Promise<void> {
    if (!projectId) return
    const res = await http.get(`/api/subcontractors?project_id=${projectId}`)
    setList(unwrapList<Subcontractor>(res))
  }

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!projectId) return
    setSaving(true)
    setFormError(null)
    try {
      await http.post('/api/subcontractors', {
        project_id: projectId,
        trade,
        company,
        contact: contact || undefined,
        contract_value_cents: contractValue ? Math.round(Number(contractValue) * 100) : 0,
      })
      await refresh()
      setShowForm(false)
      setTrade('')
      setCompany('')
      setContact('')
      setContractValue('')
      track({
        name: 'subcontractor.added',
        properties: { project_id: projectId, trade },
      })
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t('subs.createError', {}, { defaultValue: 'Failed to add the subcontractor.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(sub: Subcontractor, next: string): Promise<void> {
    setActionError(null)
    try {
      await http.put(`/api/subcontractors/${sub.id}`, { status: next })
      await refresh()
      track({
        name: next === 'terminated' ? 'subcontractor.terminated' : 'subcontractor.activated',
        properties: { project_id: sub.project_id, subcontractor_id: sub.id, status: next },
      })
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : t('subs.statusError', {}, { defaultValue: 'Status change rejected.' }),
      )
    }
  }

  const totalCommitted = list
    .filter((s) => s.status !== 'terminated')
    .reduce((sum, s) => sum + s.contract_value_cents, 0)
  // Terminate is one-way — require a second click on the same row to commit it.
  const [confirmTerminateId, setConfirmTerminateId] = useState<string | null>(null)

  return (
    <div className={cm.cn('px-4 md:px-8', cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, 'space-y-6')}>
      <header className={cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' })}>
        <div>
          <h1 className={cm.cn('text-2xl md:text-3xl', cm.fontWeight('bold'), 'wrap-anywhere')}>
            {t('subs.heading', {}, { defaultValue: 'Subcontractors' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'subs.subheading',
              { count: list.length, committed: formatMoney(totalCommitted) },
              { defaultValue: '{{count}} trades on this job · {{committed}} committed' },
            )}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="subs-new-button"
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
            ? t('subs.cancelNew', {}, { defaultValue: 'Cancel' })
            : t('subs.newButton', {}, { defaultValue: 'Add subcontractor' })}
        </button>
      </header>

      <ProjectNav projectId={projectId ?? ''} />

      {showForm && (
        <form
          data-mol-id="subs-new-form"
          onSubmit={handleCreate}
          className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}
        >
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2')}>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('subs.field.trade', {}, { defaultValue: 'Trade' })}
              </span>
              <input
                required
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                data-mol-id="subs-field-trade"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'min-w-0 border border-outline-variant rounded-md bg-surface',
                )}
                placeholder={t(
                  'subs.field.tradePlaceholder',
                  {},
                  { defaultValue: 'e.g. electrical' },
                )}
              />
            </label>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('subs.field.company', {}, { defaultValue: 'Company' })}
              </span>
              <input
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                data-mol-id="subs-field-company"
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
                {t('subs.field.contact', {}, { defaultValue: 'Contact' })}
              </span>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                data-mol-id="subs-field-contact"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'min-w-0 border border-outline-variant rounded-md bg-surface',
                )}
                placeholder="(555) 210-3344"
              />
            </label>
            <label className={'block space-y-1'}>
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                {t('subs.field.value', {}, { defaultValue: 'Contract value (USD)' })}
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                data-mol-id="subs-field-value"
                className={cm.cn(
                  cm.w('full'),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'min-w-0 border border-outline-variant rounded-md bg-surface',
                )}
                placeholder="1250000"
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
            data-mol-id="subs-create-submit"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-md brand-gradient text-on-primary disabled:opacity-50',
            )}
          >
            {saving
              ? t('subs.saving', {}, { defaultValue: 'Adding…' })
              : t('subs.submit', {}, { defaultValue: 'Add subcontractor' })}
          </button>
        </form>
      )}

      {error ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loading', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : list.length === 0 ? (
        <p className={cm.cn(cm.card(), cm.sp('p', 12), cm.textCenter, 'text-on-surface-variant')}>
          {t('subs.empty', {}, { defaultValue: 'No subcontractors on this project yet.' })}
        </p>
      ) : (
        <div className={cm.cn(cm.card(), 'overflow-x-auto')}>
          <table className={'w-full text-left text-sm'}>
            <thead>
              <tr className={'border-b border-outline-variant'}>
                <Th>{t('subs.col.trade', {}, { defaultValue: 'Trade' })}</Th>
                <Th>{t('subs.col.company', {}, { defaultValue: 'Company' })}</Th>
                <Th>{t('subs.col.contact', {}, { defaultValue: 'Contact' })}</Th>
                <Th>{t('subs.col.value', {}, { defaultValue: 'Contract value' })}</Th>
                <Th>{t('nav.status', {}, { defaultValue: 'Status' })}</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((sub) => (
                <tr
                  key={sub.id}
                  data-mol-id={`sub-row-${sub.id}`}
                  className={'border-b border-outline-variant hover:bg-surface-container'}
                >
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      cm.fontWeight('medium'),
                      'capitalize',
                    )}
                  >
                    {sub.trade}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>{sub.company}</td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {sub.contact || '—'}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {formatMoney(sub.contract_value_cents)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <StatusBadge
                        value={sub.status}
                        tone={STATUS_TONE[sub.status] ?? 'neutral'}
                        translationKeyPrefix="subs.status"
                      />
                      {sub.status === 'invited' && (
                        <button
                          type="button"
                          data-mol-id={`sub-activate-${sub.id}`}
                          onClick={() => setStatus(sub, 'active')}
                          className={cm.cn(cm.textSize('xs'), 'text-primary hover:underline')}
                        >
                          {t('subs.activate', {}, { defaultValue: 'Activate' })}
                        </button>
                      )}
                      {sub.status === 'active' && (
                        <button
                          type="button"
                          data-mol-id={`sub-terminate-${sub.id}`}
                          onClick={() => {
                            if (confirmTerminateId === sub.id) {
                              setConfirmTerminateId(null)
                              void setStatus(sub, 'terminated')
                            } else {
                              setConfirmTerminateId(sub.id)
                            }
                          }}
                          className={cm.cn(
                            cm.textSize('xs'),
                            confirmTerminateId === sub.id
                              ? 'font-semibold text-error underline'
                              : 'text-error hover:underline',
                          )}
                        >
                          {confirmTerminateId === sub.id
                            ? t('subs.confirmTerminate', {}, { defaultValue: 'Confirm terminate' })
                            : t('subs.terminate', {}, { defaultValue: 'Terminate' })}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {actionError && (
        <p className={cm.cn(cm.textSize('sm'), 'text-error')} role="alert">
          {actionError}
        </p>
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

function Th({ children }: { children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <th
      className={cm.cn(
        cm.sp('px', 4),
        cm.sp('py', 3),
        cm.textSize('xs'),
        cm.fontWeight('semibold'),
        'text-on-surface-variant',
        'uppercase tracking-wider',
      )}
    >
      {children}
    </th>
  )
}

export default Subcontractors
