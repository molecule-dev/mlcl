import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

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
}

interface ContactBrief {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

interface CompanyBrief {
  id: string
  name: string
}

interface ActivityBrief {
  id: string
  type: string
  subject: string
  description: string | null
  due_date: string | null
  deal_id: string | null
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

export function DealDetailPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [deal, setDeal] = useState<DealRecord | null>(null)
  const [contact, setContact] = useState<ContactBrief | null>(null)
  const [company, setCompany] = useState<CompanyBrief | null>(null)
  const [activities, setActivities] = useState<ActivityBrief[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const dealRes = await http.get<DealRecord>(`/api/deals/${id}`)
      const d = dealRes.data
      setDeal(d)
      const promises: Array<Promise<unknown>> = [
        d?.contact_id
          ? http
              .get<ContactBrief>(`/api/contacts/${d.contact_id}`)
              .then((r) => r.data ?? null)
              .catch(() => null)
          : Promise.resolve(null),
        d?.company_id
          ? http
              .get<CompanyBrief>(`/api/companies/${d.company_id}`)
              .then((r) => r.data ?? null)
              .catch(() => null)
          : Promise.resolve(null),
        http
          .get<ActivityBrief[]>(`/api/activities?deal_id=${id}`)
          .then((r) => (Array.isArray(r.data) ? r.data : []))
          .catch(() => [] as ActivityBrief[]),
      ]
      const [c, co, a] = await Promise.all(promises)
      setContact(c as ContactBrief | null)
      setCompany(co as CompanyBrief | null)
      setActivities(a as ActivityBrief[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deal not found')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is defined inline and recreated each render; adding it would cause an infinite loop
  }, [id])

  const totalActivities = useMemo(() => activities.length, [activities])

  const stageLabel = (stage: string): string =>
    t(
      `pipeline.stage.${stage}`,
      {},
      { defaultValue: STAGE_LABELS[stage as Stage] ?? stage.replace('_', ' ') },
    )

  async function handleStageChange(newStage: Stage) {
    if (!deal) return
    setSaving(true)
    try {
      await http.patch<DealRecord>(`/api/deals/${deal.id}`, { stage: newStage })
      setDeal({ ...deal, stage: newStage })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update stage.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deal) return
    if (!window.confirm(t('dealDetail.confirmDelete', {}, { defaultValue: 'Delete this deal?' })))
      return
    try {
      await http.delete(`/api/deals/${deal.id}`)
      navigate('/deals')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete deal.')
    }
  }

  if (loading) {
    return (
      <div className="text-on-surface-variant">
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }
  if (error || !deal) {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-3')}>
        <p>{error ?? t('dealDetail.notFound', {}, { defaultValue: 'Deal not found.' })}</p>
        <Link to="/deals" className="text-primary underline text-sm">
          {t('dealDetail.back', {}, { defaultValue: 'Back to deals' })}
        </Link>
      </div>
    )
  }

  return (
    <div data-mol-id="deal-detail" className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-3')}
      >
        <div>
          <Link to="/deals" className="text-sm text-on-surface-variant hover:text-primary">
            ← {t('dealDetail.back', {}, { defaultValue: 'All deals' })}
          </Link>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              'font-extrabold tracking-tight text-on-surface mt-2',
            )}
          >
            {deal.title}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'dealDetail.summary',
              {
                value: Number(deal.value).toLocaleString(),
                currency: deal.currency || 'USD',
                probability: Math.round(Number(deal.probability) || 0),
              },
              { defaultValue: '${{value}} {{currency}} · {{probability}}% probability' },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.flex(), 'gap-2 flex-wrap')}>
          <select
            data-mol-id="deal-detail-stage"
            value={deal.stage}
            disabled={saving}
            onChange={(e) => handleStageChange(e.target.value as Stage)}
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
          <button
            type="button"
            data-mol-id="deal-detail-delete"
            onClick={handleDelete}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'rounded-lg text-error hover:bg-error-container/30 border border-outline-variant/30',
            )}
          >
            {t('common.delete', {}, { defaultValue: 'Delete' })}
          </button>
        </div>
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 4),
          'rounded-xl border border-outline-variant/15 bg-surface-container-lowest',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
          {t('dealDetail.info', {}, { defaultValue: 'Information' })}
        </h2>
        <dl className={cm.cn(cm.flex(), 'gap-x-8 gap-y-3 flex-wrap text-sm')}>
          <Field
            label={t('deals.col.stage', {}, { defaultValue: 'Stage' })}
            value={stageLabel(deal.stage)}
          />
          <Field
            label={t('deals.col.value', {}, { defaultValue: 'Value' })}
            value={`$${Number(deal.value).toLocaleString()}`}
          />
          <Field
            label={t('dealDetail.probability', {}, { defaultValue: 'Probability' })}
            value={`${Math.round(Number(deal.probability) || 0)}%`}
          />
          <Field
            label={t('dealDetail.expectedClose', {}, { defaultValue: 'Expected close' })}
            value={
              deal.expected_close_date
                ? new Date(deal.expected_close_date).toLocaleDateString()
                : null
            }
          />
          <Field
            label={t('form.contact', {}, { defaultValue: 'Contact' })}
            value={contactName(contact)}
          />
          <Field
            label={t('form.company', {}, { defaultValue: 'Company' })}
            value={company?.name ?? null}
          />
        </dl>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 4),
          'rounded-xl border border-outline-variant/15 bg-surface-container-lowest',
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('dealDetail.activities', {}, { defaultValue: 'Activity timeline' })}
          </h2>
          <span className="text-sm text-on-surface-variant">{totalActivities}</span>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            {t(
              'dealDetail.activitiesEmpty',
              {},
              { defaultValue: 'No activities yet for this deal.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
            {activities.map((a) => (
              <li
                key={a.id}
                data-mol-id="deal-detail-activity"
                className={cm.cn(cm.sp('p', 3), 'rounded-lg bg-surface-container-low')}
              >
                <div className="font-semibold capitalize">
                  {a.type}: {a.subject}
                </div>
                {a.description && (
                  <div className="text-xs text-on-surface-variant mt-1">{a.description}</div>
                )}
                {a.due_date && (
                  <div className="text-xs text-on-surface-variant mt-1">
                    {t(
                      'dealDetail.due',
                      { date: new Date(a.due_date).toLocaleString() },
                      { defaultValue: 'Due {{date}}' },
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function contactName(c: ContactBrief | null): string | null {
  if (!c) return null
  return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.email || null
}

interface FieldProps {
  label: string
  value: string | null | undefined
}

function Field({ label, value }: FieldProps) {
  const cm = getClassMap()
  return (
    <div className="min-w-[160px]">
      <dt className={cm.cn(cm.textSize('xs'), 'uppercase tracking-wider text-on-surface-variant')}>
        {label}
      </dt>
      <dd className={cm.cn('mt-1 text-on-surface', value ? '' : 'text-on-surface-variant')}>
        {value ?? '—'}
      </dd>
    </div>
  )
}

export default DealDetailPage
export { DealDetailPage as DealDetail }
