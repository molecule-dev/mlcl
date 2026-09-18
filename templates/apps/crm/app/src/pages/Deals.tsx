import { useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface DealRecord {
  id: string
  title: string
  value: number
  currency: string
  stage: string
  probability: number
  contact_id: string | null
  company_id: string | null
  expected_close_date: string | null
  created_at: string
  updated_at: string
  owner_id: string
}

interface CompanyRecord {
  id: string
  name: string
}

const STAGES = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const
type Stage = (typeof STAGES)[number]

const STAGE_LABELS: Record<Stage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed won',
  closed_lost: 'Closed lost',
}

function formatCurrency(value: number | null | undefined, currency = 'USD'): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n)
  } catch (_error) {
    // Intl.NumberFormat failed (e.g. unsupported locale); use plain fallback
    return `$${Math.round(n).toLocaleString()}`
  }
}

function stageTone(stage: string): string {
  switch (stage) {
    case 'lead':
      return 'bg-surface-container-high text-on-surface-variant'
    case 'qualified':
      return 'bg-secondary-container text-on-secondary-container'
    case 'proposal':
      return 'bg-tertiary-container text-on-tertiary-container'
    case 'negotiation':
      return 'bg-primary-container text-on-primary-container'
    case 'closed_won':
      return 'bg-success-light text-success'
    case 'closed_lost':
      return 'bg-rose-100 text-error'
    default:
      return 'bg-surface-container-high text-on-surface-variant'
  }
}

export function DealsPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [deals, setDeals] = useState<DealRecord[]>([])
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<'all' | Stage>('all')
  const [draftOpen, setDraftOpen] = useState(false)
  const [draft, setDraft] = useState({
    title: '',
    value: '',
    stage: 'lead' as Stage,
    probability: '20',
    company_id: '',
  })
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [dealsRes, companiesRes] = await Promise.all([
        http.get<DealRecord[]>('/api/deals'),
        http.get<CompanyRecord[]>('/api/companies'),
      ])
      setDeals(Array.isArray(dealsRes.data) ? dealsRes.data : [])
      setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : [])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load deals.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is defined inline and recreated each render; adding it would cause an infinite loop
  }, [])

  const companyName = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of companies) map.set(c.id, c.name)
    return map
  }, [companies])

  const filtered = useMemo(() => {
    if (stageFilter === 'all') return deals
    return deals.filter((d) => d.stage === stageFilter)
  }, [deals, stageFilter])

  const stats = useMemo(() => {
    const open = deals.filter((d) => !d.stage.startsWith('closed_'))
    const won = deals.filter((d) => d.stage === 'closed_won')
    return {
      openCount: open.length,
      openValue: open.reduce((sum, d) => sum + Number(d.value || 0), 0),
      wonCount: won.length,
      wonValue: won.reduce((sum, d) => sum + Number(d.value || 0), 0),
      total: deals.length,
    }
  }, [deals])

  const stageBuckets = useMemo(() => {
    return STAGES.map((stage) => ({
      stage,
      deals: deals.filter((d) => d.stage === stage),
    }))
  }, [deals])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.title.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await http.post<DealRecord>('/api/deals', {
        title: draft.title.trim(),
        value: Number(draft.value) || 0,
        stage: draft.stage,
        probability: Number(draft.probability) || 0,
        company_id: draft.company_id || null,
      })
      setDraft({ title: '', value: '', stage: 'lead', probability: '20', company_id: '' })
      setDraftOpen(false)
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create deal.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStageChange(deal: DealRecord, stage: Stage) {
    if (deal.stage === stage) return
    try {
      await http.patch<DealRecord>(`/api/deals/${deal.id}`, { stage })
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to move deal.'
      setError(msg)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('deals.confirmDelete', {}, { defaultValue: 'Delete this deal?' }))) return
    try {
      await http.delete(`/api/deals/${id}`)
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete deal.'
      setError(msg)
    }
  }

  const stageLabel = (stage: Stage): string =>
    t(`pipeline.stage.${stage}`, {}, { defaultValue: STAGE_LABELS[stage] })

  return (
    <div
      aria-label={t('deals.pageLabel', {}, { defaultValue: 'Deals' })}
      className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}
    >
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-4')}
      >
        <div>
          <h1
            className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}
          >
            {t('deals.title', {}, { defaultValue: 'Deals Pipeline' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            <span data-mol-id="deals-open-value">{formatCurrency(stats.openValue)}</span>{' '}
            {t('deals.openAcrossLabel', {}, { defaultValue: 'open across' })}{' '}
            <span data-mol-id="deals-open-count">{stats.openCount}</span>{' '}
            {stats.openCount === 1
              ? t('deals.dealSingularLabel', {}, { defaultValue: 'deal ·' })
              : t('deals.dealPluralLabel', {}, { defaultValue: 'deals ·' })}{' '}
            <span data-mol-id="deals-won-count">{stats.wonCount}</span>{' '}
            {t('deals.wonLabel', {}, { defaultValue: 'won' })} (
            <span data-mol-id="deals-won-value">{formatCurrency(stats.wonValue)}</span>)
          </p>
        </div>
        <button
          type="button"
          data-mol-id="deals-new"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary rounded-lg hover:bg-primary/90',
          )}
          onClick={() => setDraftOpen((v) => !v)}
        >
          {draftOpen
            ? t('common.cancel', {}, { defaultValue: 'Cancel' })
            : t('deals.newDeal', {}, { defaultValue: 'New deal' })}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          data-mol-id="deals-error"
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
          data-mol-id="deals-form"
          className={cm.cn(
            cm.sp('p', 4),
            cm.flex({ direction: 'col' }),
            'gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low',
          )}
        >
          <div className={cm.cn(cm.flex(), 'gap-3 flex-wrap')}>
            <input
              required
              data-mol-id="deals-title"
              placeholder={t('deals.fieldTitle', {}, { defaultValue: 'Deal title' }) as string}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'flex-1 min-w-[200px] rounded-lg border border-outline-variant/30 bg-surface',
              )}
            />
            <input
              type="number"
              min="0"
              step="100"
              data-mol-id="deals-value"
              placeholder={t('deals.fieldValue', {}, { defaultValue: 'Value (USD)' }) as string}
              value={draft.value}
              onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'w-36 rounded-lg border border-outline-variant/30 bg-surface',
              )}
            />
            <select
              data-mol-id="deals-stage"
              value={draft.stage}
              onChange={(e) => setDraft((d) => ({ ...d, stage: e.target.value as Stage }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant/30 bg-surface',
              )}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {stageLabel(s)}
                </option>
              ))}
            </select>
            <select
              data-mol-id="deals-company"
              value={draft.company_id}
              onChange={(e) => setDraft((d) => ({ ...d, company_id: e.target.value }))}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-lg border border-outline-variant/30 bg-surface min-w-[160px]',
              )}
            >
              <option value="">
                {t('deals.fieldCompany', {}, { defaultValue: 'No company' })}
              </option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              type="submit"
              data-mol-id="deals-submit"
              disabled={submitting || !draft.title.trim()}
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
                : t('deals.create', {}, { defaultValue: 'Create deal' })}
            </button>
          </div>
        </form>
      )}

      <div className={cm.cn(cm.flex(), 'gap-2 flex-wrap')}>
        <button
          type="button"
          onClick={() => setStageFilter('all')}
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'rounded-full',
            stageFilter === 'all'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container-low text-on-surface-variant',
          )}
        >
          {t('status.all', {}, { defaultValue: 'All' })} ({stats.total})
        </button>
        {STAGES.map((s) => {
          const count = deals.filter((d) => d.stage === s).length
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStageFilter(s)}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'rounded-full',
                stageFilter === s
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant',
              )}
            >
              {stageLabel(s)} ({count})
            </button>
          )
        })}
      </div>

      {loading ? (
        <div data-mol-id="deals-loading" className="text-on-surface-variant">
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-mol-id="deals-empty"
          className={cm.cn(
            cm.sp('p', 8),
            'text-center text-on-surface-variant rounded-xl border border-dashed border-outline-variant/30',
          )}
        >
          {t('deals.empty', {}, { defaultValue: 'No deals yet. Create your first deal above.' })}
        </div>
      ) : (
        <div
          data-mol-id="deals-table"
          className={cm.cn(
            'rounded-xl border border-outline-variant/15 bg-surface-container-lowest overflow-hidden',
          )}
        >
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider">
              <tr>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('form.title', {}, { defaultValue: 'Title' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('deals.col.value', {}, { defaultValue: 'Value' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('deals.col.stage', {}, { defaultValue: 'Stage' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-left')}>
                  {t('form.company', {}, { defaultValue: 'Company' })}
                </th>
                <th className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  {t('nav.actions', {}, { defaultValue: 'Actions' })}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((deal) => (
                <tr
                  key={deal.id}
                  data-mol-id="deals-row"
                  data-deal-id={deal.id}
                  className="border-t border-outline-variant/10"
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), cm.fontWeight('semibold'))}>
                    {deal.title}
                  </td>
                  <td
                    className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}
                    data-mol-id="deals-row-value"
                  >
                    {formatCurrency(deal.value, deal.currency || 'USD')}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <select
                      value={deal.stage}
                      data-mol-id="deals-row-stage"
                      onChange={(e) => handleStageChange(deal, e.target.value as Stage)}
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.textSize('xs'),
                        cm.fontWeight('semibold'),
                        'rounded-full border-0 cursor-pointer',
                        stageTone(deal.stage),
                      )}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {stageLabel(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {deal.company_id ? (companyName.get(deal.company_id) ?? '—') : '—'}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                    <button
                      type="button"
                      data-mol-id="deals-delete"
                      onClick={() => handleDelete(deal.id)}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section
        data-mol-id="deals-kanban"
        className={cm.cn(cm.flex(), 'gap-4 overflow-x-auto pb-2')}
      >
        {stageBuckets.map((bucket) => (
          <div
            key={bucket.stage}
            data-mol-id={`deals-stage-${bucket.stage}`}
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'min-w-[240px] rounded-xl bg-surface-container-low p-3 gap-2',
            )}
          >
            <header
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 1),
                'text-xs uppercase tracking-wider text-on-surface-variant font-bold',
              )}
            >
              <span>{stageLabel(bucket.stage)}</span>
              <span>{bucket.deals.length}</span>
            </header>
            {bucket.deals.length === 0 ? (
              <div
                className={cm.cn(
                  cm.sp('p', 3),
                  cm.textSize('xs'),
                  'text-on-surface-variant/70 text-center',
                )}
              >
                —
              </div>
            ) : (
              bucket.deals.map((deal) => (
                <article
                  key={deal.id}
                  data-mol-id="deals-kanban-card"
                  className={cm.cn(
                    cm.sp('p', 3),
                    'rounded-lg bg-surface-container-lowest border border-outline-variant/15',
                  )}
                >
                  <div className={cm.cn(cm.fontWeight('semibold'), 'truncate')}>{deal.title}</div>
                  <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {formatCurrency(deal.value, deal.currency || 'USD')}
                  </div>
                </article>
              ))
            )}
          </div>
        ))}
      </section>
    </div>
  )
}

export default DealsPage
export { DealsPage as Deals }
