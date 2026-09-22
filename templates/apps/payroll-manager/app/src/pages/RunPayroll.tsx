import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { fmtMoney } from '../lib/money.js'
import { unwrapList } from '../lib/unwrap.js'

interface Employee {
  id: string
  first_name: string
  last_name: string
  status: 'active' | 'on_leave' | 'terminated'
  salary: number | string
  pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
}

interface PayRun {
  id: string
  pay_period_start: string
  pay_period_end: string
  pay_date: string
  status: 'draft' | 'approved' | 'processed'
}

interface ReviewRow {
  id: string
  name: string
  initials: string
  hours: number
  gross: number
  net: number
  status: 'ready' | 'flagged'
  onLeave?: boolean
}

const STEPS = [
  { key: 'select', defaultLabel: 'Select cycle' },
  { key: 'review', defaultLabel: 'Review entries' },
  { key: 'approve', defaultLabel: 'Approve & file' },
] as const

const STATUS_CHIPS: Record<ReviewRow['status'], { bg: string; fg: string; label: string }> = {
  ready: { bg: 'var(--mol-color-success-light)', fg: 'var(--mol-color-success)', label: 'READY' },
  flagged: {
    bg: 'var(--mol-color-warning-light)',
    fg: 'var(--mol-color-warning)',
    label: 'PARTIAL',
  },
}

const FEDERAL_RATE = 0.18
const STATE_RATE = 0.05
const FICA_RATE = 0.062
const MEDICARE_RATE = 0.0145

function periodsPerYearOf(freq: string): number {
  if (freq === 'weekly') return 52
  if (freq === 'semimonthly') return 24
  if (freq === 'monthly') return 12
  return 26
}

function computeRow(e: Employee): ReviewRow {
  const salary = typeof e.salary === 'string' ? Number(e.salary) : e.salary
  const periods = periodsPerYearOf(e.pay_frequency)
  const gross = salary / periods
  const taxes = gross * (FEDERAL_RATE + STATE_RATE + FICA_RATE + MEDICARE_RATE)
  const net = gross - taxes
  const status: 'ready' | 'flagged' = e.status === 'active' ? 'ready' : 'flagged'
  return {
    id: e.id,
    name: `${e.first_name} ${e.last_name}`,
    initials: `${e.first_name.charAt(0)}${e.last_name.charAt(0)}`.toUpperCase(),
    hours: 80,
    gross: Math.round(gross * 100) / 100,
    net: Math.round(net * 100) / 100,
    status,
    onLeave: e.status === 'on_leave',
  }
}

export function RunPayroll() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [draftRun, setDraftRun] = useState<PayRun | null>(null)
  const [step, setStep] = useState<0 | 1 | 2>(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      http.get('/api/employees').catch(() => null),
      http.get('/api/pay-runs?status=draft').catch(() => null),
    ]).then(([eRes, prRes]) => {
      if (cancelled) return
      const emps = unwrapList<Employee>(eRes)
      const runs = unwrapList<PayRun>(prRes)
      setEmployees(emps)
      setDraftRun(runs[0] ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const rows = useMemo(() => employees.map(computeRow), [employees])
  const includedRows = rows.filter((r) => r.status === 'ready')
  const grossTotal = includedRows.reduce((s, r) => s + r.gross, 0)
  const netTotal = includedRows.reduce((s, r) => s + r.net, 0)
  const taxesTotal = grossTotal - netTotal

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const eyebrow = draftRun
    ? t(
        'runPayroll.eyebrowReady',
        {
          start: formatDate(draftRun.pay_period_start),
          end: formatDate(draftRun.pay_period_end),
          payDate: formatDate(draftRun.pay_date),
        },
        { defaultValue: 'Cycle · {{start}} – {{end}} · Pay date {{payDate}}' },
      )
    : t(
        'runPayroll.eyebrowEmpty',
        {},
        { defaultValue: 'No draft pay-run yet — start one from Pay runs.' },
      )

  const handleApprove = async () => {
    if (!draftRun || busy) return
    setBusy(true)
    setError(null)
    try {
      await http.post(`/api/pay-runs/${draftRun.id}/approve`, {})
      await http.post(`/api/pay-runs/${draftRun.id}/process`, {})
      void track({
        name: 'payroll.run',
        properties: {
          pay_run_id: draftRun.id,
          employee_count: includedRows.length,
          total_gross: Math.round(grossTotal * 100) / 100,
          total_net: Math.round(netTotal * 100) / 100,
        },
      })
      setStep(2)
      navigate(`/pay-runs/${draftRun.id}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'runPayroll.approveError',
              {},
              { defaultValue: 'Could not approve and process this pay-run.' },
            ),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {eyebrow}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('runPayroll.heading', {}, { defaultValue: 'Run payroll' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'runPayroll.subheading',
              { count: includedRows.length, flagged: rows.length - includedRows.length },
              { defaultValue: '{{count}} entries · {{flagged}} on leave or excluded' },
            )}
          </p>
        </div>
      </header>

      {error ? <p className={cm.cn(cm.textSize('sm'), 'text-error font-bold')}>{error}</p> : null}

      <ol className={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), 'list-none')}>
        {STEPS.map((s, i) => {
          const active = step === i
          const done = step > i
          return (
            <li key={s.key} className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn(
                  cm.w(8),
                  cm.h(8),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  done
                    ? 'bg-secondary text-white'
                    : active
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface-variant',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? (
                  <span className={cm.cn(`material-symbols-outlined text-base`)} aria-hidden="true">
                    check
                  </span>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  active ? 'text-on-surface' : 'text-on-surface-variant',
                )}
              >
                {t(`runPayroll.step.${s.key}`, {}, { defaultValue: s.defaultLabel })}
              </span>
              {i < STEPS.length - 1 ? (
                <span
                  className={cm.cn(
                    cm.w(10),
                    'h-[2px]',
                    done ? 'bg-secondary' : 'bg-surface-container',
                  )}
                />
              ) : null}
            </li>
          )
        })}
      </ol>

      <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12')}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'lg:col-span-8 rounded-2xl bg-surface-container-lowest shadow-sm space-y-4',
          )}
        >
          <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {t('runPayroll.entries', {}, { defaultValue: 'Pay-run entries' })}
            </h2>
            <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t('runPayroll.cycleHint', {}, { defaultValue: 'Biweekly · 80 hrs default' })}
            </span>
          </div>
          <div
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.grid({ cols: 12 }),
              'items-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              // Phone: hours hide (always 80) and the money columns pair
              // up, so the desktop captions misdescribe the layout.
              'hidden sm:grid',
            )}
          >
            <span className="col-span-5">
              {t('runPayroll.col.employee', {}, { defaultValue: 'Employee' })}
            </span>
            <span className="col-span-2 text-right">
              {t('runPayroll.col.hours', {}, { defaultValue: 'Hours' })}
            </span>
            <span className="col-span-2 text-right">
              {t('runPayroll.col.gross', {}, { defaultValue: 'Gross' })}
            </span>
            <span className="col-span-2 text-right">
              {t('runPayroll.col.net', {}, { defaultValue: 'Net' })}
            </span>
            <span className="col-span-1 text-right">
              {t('nav.status', {}, { defaultValue: 'Status' })}
            </span>
          </div>
          {rows.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('runPayroll.empty', {}, { defaultValue: 'Add employees first to run payroll.' })}
            </p>
          ) : (
            <ul className={cm.stack(2)}>
              {rows.map((r) => {
                const chip = STATUS_CHIPS[r.status]
                return (
                  <li
                    key={r.id}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 4),
                      cm.grid({ cols: 12 }),
                      'items-center bg-surface-container-low rounded-xl shadow-sm',
                    )}
                  >
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        'col-span-12 sm:col-span-5 min-w-0',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.w(10),
                          cm.h(10),
                          cm.roundedFull,
                          cm.flex({ align: 'center', justify: 'center' }),
                          cm.fontWeight('bold'),
                          cm.textSize('sm'),
                          'text-white bg-gradient-to-br from-primary to-secondary',
                        )}
                      >
                        {r.initials}
                      </span>
                      <div className={cm.cn(`min-w-0`)}>
                        <p
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'text-on-surface',
                          )}
                        >
                          {r.name}
                        </p>
                        {r.onLeave ? (
                          <p className={cm.cn(cm.textSize('xs'), 'text-warning')}>
                            {t(
                              'runPayroll.flagOnLeave',
                              {},
                              { defaultValue: 'On leave — excluded from this cycle' },
                            )}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        'hidden sm:inline col-span-2 text-right tabular-nums',
                      )}
                    >
                      {r.status === 'flagged' ? '\u2014' : r.hours.toFixed(0)}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        'col-span-5 sm:col-span-2 text-right tabular-nums font-semibold',
                      )}
                    >
                      {r.status === 'flagged' ? '\u2014' : fmtMoney(r.gross)}
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('sm'),
                        'col-span-4 sm:col-span-2 text-right tabular-nums font-bold text-primary',
                      )}
                    >
                      {r.status === 'flagged' ? '\u2014' : fmtMoney(r.net)}
                    </span>
                    <span className="col-span-3 sm:col-span-1 text-right">
                      <span
                        className={cm.cn(
                          cm.sp('px', 2),
                          cm.sp('py', 1),
                          cm.fontWeight('bold'),
                          cm.roundedFull,
                          'text-[10px] uppercase tracking-widest',
                        )}
                        style={{ backgroundColor: chip.bg, color: chip.fg }}
                      >
                        {t(`runPayroll.status.${r.status}`, {}, { defaultValue: chip.label })}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <aside
          className={cm.cn(
            cm.sp('p', 6),
            cm.flex({ direction: 'col', gap: 'lg' }),
            'lg:col-span-4 rounded-2xl bg-gradient-to-br from-primary-container/30 to-surface-container-lowest shadow-sm h-fit lg:sticky lg:top-6',
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
              {t('runPayroll.summary', {}, { defaultValue: 'Cycle summary' })}
            </p>
            <p
              className={cm.cn(
                cm.textSize('4xl'),
                cm.sp('mt', 1),
                'font-extrabold tabular-nums tracking-tighter',
              )}
            >
              {fmtMoney(grossTotal)}
            </p>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('runPayroll.grossLabel', {}, { defaultValue: 'Total gross' })}
            </p>
          </div>

          <ul className={cm.stack(3)}>
            <SummaryLine
              label={t('runPayroll.taxes', {}, { defaultValue: 'Taxes withheld' })}
              value={fmtMoney(taxesTotal)}
            />
            <SummaryLine
              label={t('runPayroll.netPay', {}, { defaultValue: 'Net to employees' })}
              value={fmtMoney(netTotal)}
              highlight
            />
            <SummaryLine
              label={t(
                'runPayroll.fees',
                { appName: APP_NAME },
                { defaultValue: '{{appName}} fee' },
              )}
              value={fmtMoney(includedRows.length * 4.5)}
              hint={t(
                'runPayroll.feesHint',
                { count: includedRows.length },
                { defaultValue: '$4.50 per active employee · {{count}} this cycle' },
              )}
            />
          </ul>

          <button
            type="button"
            onClick={handleApprove}
            disabled={busy || !draftRun || includedRows.length === 0}
            className={cm.cn(
              cm.sp('py', 4),
              cm.roundedFull,
              cm.textSize('base'),
              cm.fontWeight('bold'),
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              'text-white bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <span className={cm.cn(`material-symbols-outlined text-base`)} aria-hidden="true">
              verified
            </span>
            {busy
              ? t('runPayroll.approving', {}, { defaultValue: 'Processing\u2026' })
              : !draftRun
                ? t('runPayroll.noDraft', {}, { defaultValue: 'No draft to approve' })
                : t('runPayroll.approve', {}, { defaultValue: 'Approve & file' })}
          </button>
          <Link
            to="/pay-runs"
            className={cm.cn(
              cm.textSize('sm'),
              cm.textCenter,
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('runPayroll.cancel', {}, { defaultValue: 'Save draft and exit' })}
          </Link>
        </aside>
      </div>
    </div>
  )
}

function SummaryLine({
  label,
  value,
  hint,
  highlight,
}: {
  label: string
  value: string
  hint?: string
  highlight?: boolean
}) {
  const cm = getClassMap()
  return (
    <li
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('py', 2),
        'border-b border-outline-variant/40 last:border-b-0',
      )}
    >
      <div>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>{label}</p>
        {hint ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{hint}</p>
        ) : null}
      </div>
      <span
        className={cm.cn(
          cm.textSize('lg'),
          cm.fontWeight('bold'),
          'tabular-nums',
          highlight ? 'text-primary' : 'text-on-surface',
        )}
      >
        {value}
      </span>
    </li>
  )
}
