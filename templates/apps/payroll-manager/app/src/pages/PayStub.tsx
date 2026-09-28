import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtMoney, toNum } from '../lib/money.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface LineItem {
  description: string
  amount: number
}

interface StubPayload {
  stub: {
    id: string
    pay_run_id: string
    employee_id: string
    employee_name: string
    employee_email?: string
    gross: number | string
    federal_tax: number | string
    state_tax: number | string
    fica: number | string
    medicare: number | string
    deductions_total?: number | string
    net: number | string
    pay_date: string
    period_start: string
    period_end: string
  }
  payRun: {
    id: string
    pay_period_start: string
    pay_period_end: string
    pay_date: string
  }
  employee: {
    id: string
    title?: string
    department?: string
    pay_frequency?: string
  } | null
}

export function PayStub() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [data, setData] = useState<StubPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get(`/api/pay-stubs/${id}`)
      .then((res) => {
        if (cancelled) return
        const payload = unwrapSingle<StubPayload>(res)
        if (!payload) {
          setError(t('payStub.notFound', {}, { defaultValue: 'Pay stub not found.' }))
          setData(null)
        } else {
          setData(payload)
        }
      })
      .catch(() => {
        if (!cancelled) setError(t('payStub.notFound', {}, { defaultValue: 'Pay stub not found.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto)}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(4))}
      >
        <Link
          to="/pay-runs"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline',
          )}
        >
          ← {t('payStub.backToRuns', {}, { defaultValue: 'Back to pay runs' })}
        </Link>
        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>
          {error || t('payStub.notFound', {}, { defaultValue: 'Pay stub not found.' })}
        </p>
      </div>
    )
  }

  const stub = data.stub
  const employeeFullName = stub.employee_name || ''
  const grossTotal = toNum(stub.gross)
  const earnings: LineItem[] = [
    {
      description: t('payStub.regularPay', {}, { defaultValue: 'Regular pay' }),
      amount: grossTotal,
    },
  ]
  const taxes: LineItem[] = [
    {
      description: t('payStub.federalTax', {}, { defaultValue: 'Federal income tax' }),
      amount: toNum(stub.federal_tax),
    },
    {
      description: t('payStub.stateTax', {}, { defaultValue: 'State income tax' }),
      amount: toNum(stub.state_tax),
    },
    {
      description: t('payStub.fica', {}, { defaultValue: 'Social Security (FICA)' }),
      amount: toNum(stub.fica),
    },
    {
      description: t('payStub.medicare', {}, { defaultValue: 'Medicare' }),
      amount: toNum(stub.medicare),
    },
  ].filter((line) => line.amount > 0)
  const taxesTotal = taxes.reduce((s, l) => s + l.amount, 0)
  const deductionsTotal = toNum(stub.deductions_total)
  const deductions: LineItem[] =
    deductionsTotal > 0
      ? [
          {
            description: t('payStub.benefits', {}, { defaultValue: 'Benefits & deductions' }),
            amount: deductionsTotal,
          },
        ]
      : []
  const netPay = toNum(stub.net)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(6))}>
      <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' })}>
        <Link
          to={`/pay-runs/${data.payRun.id}`}
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            'text-primary hover:underline',
          )}
        >
          ← {t('payStub.backToRun', {}, { defaultValue: 'Back to pay run' })}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.roundedFull,
            'border border-outline-variant hover:bg-surface-container-low transition-colors',
          )}
        >
          <span className={cm.cn(`material-symbols-outlined text-base`)} aria-hidden="true">
            print
          </span>
          {t('payStub.print', {}, { defaultValue: 'Print or save PDF' })}
        </button>
      </div>

      <article
        className={cm.cn(
          cm.sp('p', 10),
          cm.maxW('4xl'),
          cm.mxAuto,
          cm.w('full'),
          'rounded-2xl shadow-md bg-[var(--color-surface-container-lowest,white)] print:shadow-none print:p-6',
        )}
      >
        <header
          className={cm.cn(
            cm.flex({ align: 'start', justify: 'between' }),
            cm.sp('mb', 8),
            'pb-6 border-b-2 border-outline-variant/40',
          )}
        >
          <div>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('payStub.eyebrow', {}, { defaultValue: 'Earnings statement' })}
            </p>
            <h1 className={cm.cn(cm.textSize('2xl'), 'font-extrabold tracking-tight')}>
              {t('payStub.statementTitle', {}, { defaultValue: 'Pay stub' })}
            </h1>
          </div>
          <div className={cm.cn(cm.textRight, cm.flex({ direction: 'col', gap: 'xs' }))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('payStub.payDateLabel', {}, { defaultValue: 'Pay date' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'text-on-surface tabular-nums',
              )}
            >
              {new Date(stub.pay_date).toLocaleDateString()}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums')}>
              {t(
                'payStub.period',
                {
                  start: new Date(stub.period_start).toLocaleDateString(),
                  end: new Date(stub.period_end).toLocaleDateString(),
                },
                { defaultValue: 'Period {{start}} – {{end}}' },
              )}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'payStub.runId',
                { id: data.payRun.id.slice(0, 8) },
                { defaultValue: 'Run {{id}}' },
              )}
            </p>
          </div>
        </header>

        <section className={cm.cn(cm.sp('mb', 8))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('payStub.employee', {}, { defaultValue: 'Employee' })}
          </p>
          <p className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mt', 1))}>
            {employeeFullName}
          </p>
          {data.employee?.title || data.employee?.department ? (
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {[data.employee?.title, data.employee?.department].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </section>

        <PayStubSection
          title={t('payStub.earnings', {}, { defaultValue: 'Earnings' })}
          items={earnings}
          total={grossTotal}
          totalLabel={t('payStub.grossTotal', {}, { defaultValue: 'Gross earnings' })}
        />
        {deductions.length > 0 ? (
          <PayStubSection
            title={t('payStub.deductionsTitle', {}, { defaultValue: 'Deductions' })}
            items={deductions}
            total={deductionsTotal}
            totalLabel={t('payStub.deductionsTotal', {}, { defaultValue: 'Deductions total' })}
            subtract
          />
        ) : null}
        {taxes.length > 0 ? (
          <PayStubSection
            title={t('payStub.taxes', {}, { defaultValue: 'Taxes' })}
            items={taxes}
            total={taxesTotal}
            totalLabel={t('payStub.taxesTotal', {}, { defaultValue: 'Taxes withheld' })}
            subtract
          />
        ) : null}

        <section
          className={cm.cn(
            cm.sp('mt', 8),
            cm.sp('p', 6),
            'rounded-xl bg-primary-container/30',
            cm.accentCard({ tone: 'primary' }),
          )}
        >
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <div>
              <p className={cm.accentCardLabel({ tone: 'primary' })}>
                {t('payStub.netPay', {}, { defaultValue: 'Net pay' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {data.employee?.pay_frequency
                  ? t(
                      'payStub.netHintFreq',
                      { freq: data.employee.pay_frequency },
                      { defaultValue: 'Direct deposit · {{freq}}' },
                    )
                  : t('payStub.netHintGeneric', {}, { defaultValue: 'Direct deposit' })}
              </p>
            </div>
            <p
              className={cm.cn(
                cm.textSize('4xl'),
                'font-extrabold tabular-nums tracking-tight text-primary',
              )}
            >
              {fmtMoney(netPay)}
            </p>
          </div>
        </section>
      </article>
    </div>
  )
}

function PayStubSection({
  title,
  items,
  total,
  totalLabel,
  subtract = false,
}: {
  title: string
  items: LineItem[]
  total: number
  totalLabel: string
  subtract?: boolean
}) {
  const cm = getClassMap()
  if (items.length === 0) return null
  return (
    <section className={cm.cn(cm.sp('mb', 6))}>
      <h3
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          cm.sp('mb', 3),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {title}
      </h3>
      <ul className={cm.stack(0)}>
        {items.map((line) => (
          <li
            key={line.description}
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              cm.sp('py', 2),
              'border-b border-outline-variant/40',
            )}
          >
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>{line.description}</p>
            <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'tabular-nums')}>
              {subtract ? '−' : ''}
              {fmtMoney(line.amount)}
            </p>
          </li>
        ))}
      </ul>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('pt', 2),
          cm.sp('mt', 1),
          'border-t-2 border-outline-variant/60',
        )}
      >
        <p className={cm.cn(cm.textSize('sm'), 'font-bold')}>{totalLabel}</p>
        <p className={cm.cn(cm.textSize('sm'), 'font-bold tabular-nums')}>
          {subtract ? '−' : ''}
          {fmtMoney(total)}
        </p>
      </div>
    </section>
  )
}
