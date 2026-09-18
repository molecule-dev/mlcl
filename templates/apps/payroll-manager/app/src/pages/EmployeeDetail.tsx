import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtMoney } from '../lib/money.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string | null
  department: string | null
  title: string | null
  status: string
  pay_frequency: string
  salary: number | string
  ssn: string | null
  tax_filing_status: string
  start_date: string | null
}

interface Withholding {
  id: string
  federal_allowances: number
  state_allowances: number
  additional_withholding: number | string
  exempt: boolean
  created_at: string
}

interface Deduction {
  id: string
  name: string
  type: string
  amount: number | string
  is_percentage: boolean
  is_pretax: boolean
  is_active: boolean
}

const STATUS_LABEL: Record<string, { label: string; bg: string }> = {
  active: { label: 'Active', bg: 'bg-success-container/40 text-on-success-container' },
  on_leave: { label: 'On leave', bg: 'bg-warning-container/40 text-on-warning-container' },
  inactive: { label: 'Inactive', bg: 'bg-error-container/40 text-on-error-container' },
  terminated: { label: 'Terminated', bg: 'bg-error-container/40 text-on-error-container' },
}

export function EmployeeDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [withholdings, setWithholdings] = useState<Withholding[]>([])
  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void Promise.all([
      http.get<Employee>(`/api/employees/${id}`).catch(() => null),
      http.get(`/api/taxes/withholdings/${id}`).catch(() => null),
      http.get(`/api/deductions/${id}`).catch(() => null),
    ]).then(([eRes, wRes, dRes]) => {
      if (cancelled) return
      const emp = unwrapSingle<Employee>(eRes)
      if (!emp) {
        setError(t('employeeDetail.notFound', {}, { defaultValue: 'Employee not found.' }))
        return
      }
      setEmployee(emp)
      setWithholdings(unwrapList<Withholding>(wRes))
      setDeductions(unwrapList<Deduction>(dRes))
    })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (error) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto)}>
        <p className={cm.cn(cm.textSize('sm'), 'text-error font-bold')}>{error}</p>
        <Link to="/employees" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          {t('employeeDetail.backToEmployees', {}, { defaultValue: '← Back to employees' })}
        </Link>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto)}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  const fullName = `${employee.first_name} ${employee.last_name}`
  const status = (employee.status ?? 'active').toLowerCase()
  const statusStyle = STATUS_LABEL[status] ?? STATUS_LABEL.active

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <nav
        className={cm.cn(
          cm.textSize('sm'),
          cm.flex({ align: 'center', gap: 'xs' }),
          'text-on-surface-variant',
        )}
      >
        <Link to="/employees" className={cm.cn(`hover:text-primary`)}>
          {t('employeeDetail.crumbEmployees', {}, { defaultValue: 'Employees' })}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-on-surface font-semibold">{fullName}</span>
      </nav>

      <section
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
          cm.sp('p', 8),
          'rounded-2xl bg-gradient-to-br from-primary-container/30 via-surface-container-lowest to-surface-container-lowest shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.w(20),
            cm.h(20),
            cm.roundedFull,
            cm.flex({ align: 'center', justify: 'center' }),
            cm.fontWeight('bold'),
            cm.textSize('2xl'),
            'text-white shadow-md bg-gradient-to-br from-primary to-secondary',
          )}
        >
          {employee.first_name.charAt(0)}
          {employee.last_name.charAt(0)}
        </div>
        <div className={cm.flex1}>
          <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight')}>{fullName}</h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {employee.title ?? '—'}
            {employee.department ? ` · ${employee.department}` : ''}
          </p>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 3))}
          >
            {employee.email ? (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  'text-on-surface-variant',
                )}
              >
                <span className={cm.cn(`material-symbols-outlined text-base`)} aria-hidden="true">
                  mail
                </span>
                {employee.email}
              </span>
            ) : null}
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              <span className={cm.cn(`material-symbols-outlined text-base`)} aria-hidden="true">
                badge
              </span>
              ID {employee.id.slice(0, 8)}
            </span>
          </div>
        </div>
        <div className={cm.flex({ direction: 'col', align: 'end', gap: 'xs' })}>
          <span
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'text-[10px] uppercase tracking-widest',
              statusStyle.bg,
            )}
          >
            {t(`employeeDetail.status.${status}`, {}, { defaultValue: statusStyle.label })}
          </span>
          {employee.start_date ? (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'employeeDetail.startedOn',
                { date: new Date(employee.start_date).toLocaleDateString() },
                { defaultValue: 'Started {{date}}' },
              )}
            </p>
          ) : null}
          <Link
            to={`/employees/${employee.id}/edit`}
            data-testid="employee-edit-link"
            className={cm.cn(
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'uppercase tracking-widest border border-outline-variant hover:bg-surface-container-low',
            )}
          >
            {t('employeeDetail.edit', {}, { defaultValue: 'Edit employee' })}
          </Link>
        </div>
      </section>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <SectionCard
          title={t('employeeDetail.compensation', {}, { defaultValue: 'Compensation' })}
          icon="payments"
          tint="text-primary"
        >
          <DetailRow
            label={t('employeeDetail.salary', {}, { defaultValue: 'Annual salary' })}
            value={fmtMoney(employee.salary)}
            mono
          />
          <DetailRow
            label={t('employeeDetail.payFrequency', {}, { defaultValue: 'Pay frequency' })}
            value={employee.pay_frequency}
          />
          <DetailRow
            label={t('employeeDetail.ssn', {}, { defaultValue: 'SSN' })}
            value={employee.ssn ?? '—'}
            mono
          />
        </SectionCard>

        <SectionCard
          title={t('employeeDetail.taxes', {}, { defaultValue: 'Tax withholdings' })}
          icon="account_balance"
          tint="text-secondary"
        >
          <DetailRow
            label={t('employeeDetail.filingStatus', {}, { defaultValue: 'Filing status' })}
            value={String(employee.tax_filing_status ?? 'single').replace('_', ' ')}
          />
          {withholdings.length > 0 ? (
            <>
              <DetailRow
                label={t(
                  'employeeDetail.federalAllowances',
                  {},
                  { defaultValue: 'Federal allowances' },
                )}
                value={String(withholdings[0].federal_allowances)}
                mono
              />
              <DetailRow
                label={t(
                  'employeeDetail.stateAllowances',
                  {},
                  { defaultValue: 'State allowances' },
                )}
                value={String(withholdings[0].state_allowances)}
                mono
              />
              <DetailRow
                label={t(
                  'employeeDetail.additionalWithholding',
                  {},
                  { defaultValue: 'Additional per-period' },
                )}
                value={fmtMoney(withholdings[0].additional_withholding)}
                mono
              />
            </>
          ) : (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('employeeDetail.noWithholdings', {}, { defaultValue: 'No W-4 on file yet.' })}
            </p>
          )}
        </SectionCard>

        <SectionCard
          title={t('employeeDetail.deductions', {}, { defaultValue: 'Deductions' })}
          icon="receipt_long"
          tint="text-tertiary"
        >
          {deductions.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('employeeDetail.noDeductions', {}, { defaultValue: 'No deductions on file.' })}
            </p>
          ) : (
            deductions.map((d) => (
              <DetailRow
                key={d.id}
                label={d.name}
                sub={
                  d.is_pretax
                    ? t('employeeDetail.preTax', {}, { defaultValue: 'Pre-tax' })
                    : t('employeeDetail.postTax', {}, { defaultValue: 'Post-tax' })
                }
                value={d.is_percentage ? `${d.amount}%` : fmtMoney(d.amount)}
                mono
              />
            ))
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  icon,
  tint,
  full = false,
  children,
}: {
  title: string
  icon: string
  tint: string
  full?: boolean
  children: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ direction: 'col', gap: 'md' }),
        'rounded-2xl bg-surface-container-lowest shadow-sm',
        full ? 'lg:col-span-3' : '',
      )}
    >
      <header className={cm.flex({ align: 'center', gap: 'sm' })}>
        <span
          className={cm.cn(cm.sp('p', 2), cm.roundedFull, 'bg-primary/10', tint)}
          aria-hidden="true"
        >
          <span className={cm.cn(`material-symbols-outlined text-base`)}>{icon}</span>
        </span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
          {title}
        </h2>
      </header>
      <div className={cm.stack(2)}>{children}</div>
    </section>
  )
}

function DetailRow({
  label,
  sub,
  value,
  mono = false,
}: {
  label: string
  sub?: string
  value: string
  mono?: boolean
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('py', 2),
        'border-b border-outline-variant/40 last:border-b-0',
      )}
    >
      <div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>{label}</p>
        {sub ? <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{sub}</p> : null}
      </div>
      <p
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('semibold'),
          'text-on-surface',
          mono ? 'tabular-nums' : '',
        )}
      >
        {value}
      </p>
    </div>
  )
}
