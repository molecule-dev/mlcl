import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ContactRecord {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  title: string | null
  company_id: string | null
  source: string | null
  created_at: string
  updated_at: string
}

interface CompanyRecord {
  id: string
  name: string
}

interface DealRecord {
  id: string
  title: string
  value: number
  stage: string
  contact_id: string | null
}

interface ActivityRecord {
  id: string
  type: string
  subject: string
  description: string | null
  due_date: string | null
  completed: boolean
  contact_id: string | null
}

function fullName(c: ContactRecord | null): string {
  if (!c) return ''
  const name = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim()
  return name || c.email || 'Unnamed contact'
}

export function ContactDetailPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [contact, setContact] = useState<ContactRecord | null>(null)
  const [company, setCompany] = useState<CompanyRecord | null>(null)
  const [deals, setDeals] = useState<DealRecord[]>([])
  const [activities, setActivities] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get<ContactRecord>(`/api/contacts/${id}`)
      .then(async (res) => {
        if (cancelled) return
        const c = res.data
        setContact(c)
        const promises: Array<Promise<unknown>> = [
          http
            .get<DealRecord[]>('/api/deals')
            .then((r) => (Array.isArray(r.data) ? r.data : []))
            .catch(() => [] as DealRecord[]),
          http
            .get<ActivityRecord[]>('/api/activities')
            .then((r) => (Array.isArray(r.data) ? r.data : []))
            .catch(() => [] as ActivityRecord[]),
        ]
        if (c?.company_id) {
          promises.push(
            http
              .get<CompanyRecord>(`/api/companies/${c.company_id}`)
              .then((r) => r.data ?? null)
              .catch(() => null),
          )
        } else {
          promises.push(Promise.resolve(null))
        }
        const [d, a, comp] = await Promise.all(promises)
        if (cancelled) return
        setDeals((d as DealRecord[]).filter((x) => x.contact_id === id))
        setActivities((a as ActivityRecord[]).filter((x) => x.contact_id === id))
        setCompany(comp as CompanyRecord | null)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Contact not found')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- http is a stable singleton from useHttpClient(); including it would not change behavior
  }, [id])

  const totalDealValue = useMemo(
    () => deals.reduce((sum, d) => sum + Number(d.value || 0), 0),
    [deals],
  )

  async function handleDelete() {
    if (!contact) return
    if (
      !window.confirm(
        t('contactDetail.confirmDelete', {}, { defaultValue: 'Delete this contact?' }),
      )
    )
      return
    try {
      await http.delete(`/api/contacts/${contact.id}`)
      navigate('/contacts')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete contact.')
    }
  }

  if (loading) {
    return (
      <div className="text-on-surface-variant">
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }
  if (error || !contact) {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-3')}>
        <p>{error ?? t('contactDetail.notFound', {}, { defaultValue: 'Contact not found.' })}</p>
        <Link to="/contacts" className="text-primary underline text-sm" data-mol-id="contact-back">
          {t('contactDetail.back', {}, { defaultValue: 'Back to contacts' })}
        </Link>
      </div>
    )
  }

  return (
    <div data-mol-id="contact-detail" className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-3')}
      >
        <div>
          <Link to="/contacts" className="text-sm text-on-surface-variant hover:text-primary">
            ← {t('contactDetail.back', {}, { defaultValue: 'All contacts' })}
          </Link>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              'font-extrabold tracking-tight text-on-surface mt-2',
            )}
          >
            {fullName(contact)}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {contact.title ?? '—'}
            {company ? ` · ${company.name}` : ''}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="contact-detail-delete"
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
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 4),
          'rounded-xl border border-outline-variant/15 bg-surface-container-lowest',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
          {t('contactDetail.info', {}, { defaultValue: 'Information' })}
        </h2>
        <dl className={cm.cn(cm.flex(), 'gap-x-8 gap-y-3 flex-wrap text-sm')}>
          <Field label={t('form.email', {}, { defaultValue: 'Email' })} value={contact.email} />
          <Field label={t('form.phone', {}, { defaultValue: 'Phone' })} value={contact.phone} />
          <Field label={t('contact.title', {}, { defaultValue: 'Title' })} value={contact.title} />
          <Field
            label={t('contact.source', {}, { defaultValue: 'Source' })}
            value={contact.source}
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
            {t('contactDetail.deals', {}, { defaultValue: 'Deals' })}
          </h2>
          <span className="text-sm text-on-surface-variant">
            {deals.length} · ${totalDealValue.toLocaleString()}
          </span>
        </div>
        {deals.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            {t('contactDetail.dealsEmpty', {}, { defaultValue: 'No deals yet for this contact.' })}
          </p>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
            {deals.map((d) => (
              <li
                key={d.id}
                data-mol-id="contact-detail-deal"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('p', 3),
                  'rounded-lg bg-surface-container-low',
                )}
              >
                <div>
                  <Link to={`/deals/${d.id}`} className="font-semibold hover:text-primary">
                    {d.title}
                  </Link>
                  <div className="text-xs text-on-surface-variant capitalize">
                    {d.stage.replace('_', ' ')}
                  </div>
                </div>
                <div className="font-semibold">${Number(d.value).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 4),
          'rounded-xl border border-outline-variant/15 bg-surface-container-lowest',
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 3))}>
          {t('contactDetail.activities', {}, { defaultValue: 'Activity timeline' })}
        </h2>
        {activities.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            {t(
              'contactDetail.activitiesEmpty',
              {},
              { defaultValue: 'No activities logged for this contact.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
            {activities.map((a) => (
              <li
                key={a.id}
                data-mol-id="contact-detail-activity"
                className={cm.cn(cm.sp('p', 3), 'rounded-lg bg-surface-container-low')}
              >
                <div className="font-semibold capitalize">
                  {a.type}: {a.subject}
                </div>
                {a.description && (
                  <div className="text-xs text-on-surface-variant mt-1">{a.description}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
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

export default ContactDetailPage
export { ContactDetailPage as ContactDetail }
