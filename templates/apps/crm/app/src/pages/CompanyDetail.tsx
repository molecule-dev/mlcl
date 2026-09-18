import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface CompanyRecord {
  id: string
  name: string
  domain: string | null
  industry: string | null
  size: string | null
  phone: string | null
  address: string | null
  created_at: string
  updated_at: string
  contacts?: ContactBrief[]
}

interface ContactBrief {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  title: string | null
  company_id: string | null
}

interface DealBrief {
  id: string
  title: string
  value: number
  stage: string
  company_id: string | null
}

interface ActivityBrief {
  id: string
  type: string
  subject: string
  description: string | null
  due_date: string | null
  company_id: string | null
}

export function CompanyDetailPage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [company, setCompany] = useState<CompanyRecord | null>(null)
  const [contacts, setContacts] = useState<ContactBrief[]>([])
  const [deals, setDeals] = useState<DealBrief[]>([])
  const [activities, setActivities] = useState<ActivityBrief[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      http.get<CompanyRecord>(`/api/companies/${id}`),
      http.get<DealBrief[]>('/api/deals'),
      http.get<ActivityBrief[]>('/api/activities'),
    ])
      .then(([cRes, dRes, aRes]) => {
        if (cancelled) return
        const c = cRes.data
        setCompany(c)
        setContacts(Array.isArray(c?.contacts) ? c.contacts : [])
        setDeals((Array.isArray(dRes.data) ? dRes.data : []).filter((d) => d.company_id === id))
        setActivities(
          (Array.isArray(aRes.data) ? aRes.data : []).filter((a) => a.company_id === id),
        )
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Company not found')
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
    if (!company) return
    if (
      !window.confirm(
        t('companyDetail.confirmDelete', {}, { defaultValue: 'Delete this company?' }),
      )
    )
      return
    try {
      await http.delete(`/api/companies/${company.id}`)
      navigate('/companies')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete company.')
    }
  }

  if (loading) {
    return (
      <div className="text-on-surface-variant">
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }
  if (error || !company) {
    return (
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'gap-3')}>
        <p>{error ?? t('companyDetail.notFound', {}, { defaultValue: 'Company not found.' })}</p>
        <Link to="/companies" className="text-primary underline text-sm">
          {t('companyDetail.back', {}, { defaultValue: 'Back to companies' })}
        </Link>
      </div>
    )
  }

  return (
    <div data-mol-id="company-detail" className={cm.cn(cm.flex({ direction: 'col' }), 'gap-6')}>
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'flex-wrap gap-3')}
      >
        <div>
          <Link to="/companies" className="text-sm text-on-surface-variant hover:text-primary">
            ← {t('companyDetail.back', {}, { defaultValue: 'All companies' })}
          </Link>
          <h1
            className={cm.cn(
              cm.textSize('3xl'),
              'font-extrabold tracking-tight text-on-surface mt-2',
            )}
          >
            {company.name}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {company.industry ?? '—'}
            {company.size
              ? ` · ${t('companyDetail.employees', { size: company.size }, { defaultValue: '{{size}} employees' })}`
              : ''}
          </p>
        </div>
        <button
          type="button"
          data-mol-id="company-detail-delete"
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
          {t('companyDetail.info', {}, { defaultValue: 'Information' })}
        </h2>
        <dl className={cm.cn(cm.flex(), 'gap-x-8 gap-y-3 flex-wrap text-sm')}>
          <Field
            label={t('companies.col.domain', {}, { defaultValue: 'Domain' })}
            value={company.domain}
          />
          <Field
            label={t('companies.col.industry', {}, { defaultValue: 'Industry' })}
            value={company.industry}
          />
          <Field label={t('form.size', {}, { defaultValue: 'Size' })} value={company.size} />
          <Field label={t('form.phone', {}, { defaultValue: 'Phone' })} value={company.phone} />
          <Field
            label={t('form.address', {}, { defaultValue: 'Address' })}
            value={company.address}
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
            {t('companyDetail.contacts', {}, { defaultValue: 'Contacts' })}
          </h2>
          <span className="text-sm text-on-surface-variant">{contacts.length}</span>
        </div>
        {contacts.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            {t(
              'companyDetail.contactsEmpty',
              {},
              { defaultValue: 'No contacts linked to this company yet.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
            {contacts.map((c) => (
              <li
                key={c.id}
                data-mol-id="company-detail-contact"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('p', 3),
                  'rounded-lg bg-surface-container-low',
                )}
              >
                <div>
                  <Link to={`/contacts/${c.id}`} className="font-semibold hover:text-primary">
                    {`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.email || 'Contact'}
                  </Link>
                  <div className="text-xs text-on-surface-variant">{c.title || c.email || '—'}</div>
                </div>
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
        <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 3))}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('companyDetail.deals', {}, { defaultValue: 'Deals' })}
          </h2>
          <span className="text-sm text-on-surface-variant">
            {deals.length} · ${totalDealValue.toLocaleString()}
          </span>
        </div>
        {deals.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            {t('companyDetail.dealsEmpty', {}, { defaultValue: 'No deals yet for this company.' })}
          </p>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
            {deals.map((d) => (
              <li
                key={d.id}
                data-mol-id="company-detail-deal"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between' }),
                  cm.sp('p', 3),
                  'rounded-lg bg-surface-container-low',
                )}
              >
                <Link to={`/deals/${d.id}`} className="font-semibold hover:text-primary">
                  {d.title}
                </Link>
                <span className="font-semibold">${Number(d.value).toLocaleString()}</span>
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
          {t('nav.activityFeed', {}, { defaultValue: 'Activity feed' })}
        </h2>
        {activities.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            {t(
              'companyDetail.activitiesEmpty',
              {},
              { defaultValue: 'No activities yet for this company.' },
            )}
          </p>
        ) : (
          <ul className={cm.cn(cm.flex({ direction: 'col' }), 'gap-2')}>
            {activities.map((a) => (
              <li
                key={a.id}
                data-mol-id="company-detail-activity"
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

export default CompanyDetailPage
export { CompanyDetailPage as CompanyDetail }
