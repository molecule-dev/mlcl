import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import type { Employee } from '../components/EmployeesTable.js'
import { EmployeesTable } from '../components/EmployeesTable.js'
import { PayrollHeroCard } from '../components/PayrollHeroCard.js'
import { PayrollKpiTriad } from '../components/PayrollKpiTriad.js'
import type { PayRun } from '../components/PayRunsList.js'
import { PayRunsList } from '../components/PayRunsList.js'
import { unwrapList } from '../lib/unwrap.js'

const SAMPLE_EMPLOYEES: Employee[] = [
  {
    id: 'e-1',
    first_name: 'Amelia',
    last_name: 'Okafor',
    email: 'amelia.okafor@stipend.example',
    department: 'Engineering',
    title: 'Staff Software Engineer',
    salary: 168_000,
    status: 'active',
  },
  {
    id: 'e-2',
    first_name: 'Marcus',
    last_name: 'Hale',
    email: 'marcus.hale@stipend.example',
    department: 'Sales',
    title: 'Account Executive',
    salary: 96_000,
    status: 'active',
  },
  {
    id: 'e-3',
    first_name: 'Priya',
    last_name: 'Sundaram',
    email: 'priya.s@stipend.example',
    department: 'Operations',
    title: 'Payroll Specialist',
    salary: 78_000,
    status: 'active',
  },
  {
    id: 'e-4',
    first_name: 'Daniel',
    last_name: 'Cho',
    email: 'daniel.cho@stipend.example',
    department: 'Engineering',
    title: 'Senior Frontend Engineer',
    salary: 142_000,
    status: 'on_leave',
  },
  {
    id: 'e-5',
    first_name: 'Renee',
    last_name: 'Vasquez',
    email: 'renee.vasquez@stipend.example',
    department: 'Finance',
    title: 'Controller',
    salary: 134_000,
    status: 'active',
  },
]

const SAMPLE_PAY_RUNS: PayRun[] = [
  {
    id: 'pr-2026-08',
    pay_date: '2026-04-30',
    period_start: '2026-04-13',
    period_end: '2026-04-26',
    status: 'approved',
    total_gross: 184_250,
    total_net: 138_975,
    employee_count: 42,
  },
  {
    id: 'pr-2026-07',
    pay_date: '2026-04-16',
    period_start: '2026-03-30',
    period_end: '2026-04-12',
    status: 'processed',
    total_gross: 180_830,
    total_net: 135_402,
    employee_count: 41,
  },
  {
    id: 'pr-2026-06',
    pay_date: '2026-04-02',
    period_start: '2026-03-16',
    period_end: '2026-03-29',
    status: 'processed',
    total_gross: 178_960,
    total_net: 134_115,
    employee_count: 41,
  },
]

const SAMPLE_HISTORY = [
  { pay_date: '2026-01-08', total_gross: 162_000 },
  { pay_date: '2026-01-22', total_gross: 165_400 },
  { pay_date: '2026-02-05', total_gross: 168_120 },
  { pay_date: '2026-02-19', total_gross: 171_500 },
  { pay_date: '2026-03-05', total_gross: 173_900 },
  { pay_date: '2026-03-19', total_gross: 176_840 },
  { pay_date: '2026-04-02', total_gross: 178_960 },
  { pay_date: '2026-04-16', total_gross: 180_830 },
  { pay_date: '2026-04-30', total_gross: 184_250 },
]

export function Dashboard() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [employees, setEmployees] = useState<Employee[]>(SAMPLE_EMPLOYEES)
  const [payRuns, setPayRuns] = useState<PayRun[]>(SAMPLE_PAY_RUNS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/employees?status=active').catch(() => null),
      http.get('/api/pay-runs').catch(() => null),
    ]).then(([eRes, prRes]) => {
      if (cancelled) return
      const emps = unwrapList<Employee>(eRes)
      const runs = unwrapList<PayRun>(prRes)
      if (emps.length > 0) setEmployees(emps)
      if (runs.length > 0) setPayRuns(runs)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const num = (v: number | string | null | undefined): number => {
    if (v === null || v === undefined) return 0
    const n = typeof v === 'string' ? Number(v) : v
    return Number.isFinite(n) ? n : 0
  }

  const upcoming =
    payRuns.find((r) => r.status === 'approved' || r.status === 'draft') ?? payRuns[0]
  const previous = payRuns.find((r) => r.status === 'processed') ?? payRuns[1]
  const change = upcoming && previous ? num(upcoming.total_gross) - num(previous.total_gross) : 0

  const annualPayroll = employees.reduce((sum, e) => sum + num(e.salary), 0)
  const ytdTaxesWithheld = Math.round(annualPayroll * 0.18)

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('7xl'), cm.mxAuto, cm.stack(8))}>
      <header className={cm.flex({ direction: 'col', gap: 'xs' })}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t(
            'dashboard.eyebrow',
            { appName: APP_NAME },
            { defaultValue: '{{appName}} · Operator console' },
          )}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('dashboard.heading', {}, { defaultValue: 'Payroll overview' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'dashboard.subheading',
            {},
            {
              defaultValue:
                'Every cycle, covered. Review the next run, check headcount, and stay compliant.',
            },
          )}
        </p>
      </header>

      <PayrollKpiTriad
        activeEmployees={employees.filter((e) => e.status === 'active').length}
        annualPayroll={annualPayroll}
        ytdTaxesWithheld={ytdTaxesWithheld}
        nextPayDate={upcoming?.pay_date ?? null}
      />

      {upcoming ? (
        <section
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-12 items-stretch')}
        >
          <PayrollHeroCard
            nextRunGross={num(upcoming.total_gross)}
            nextRunDate={upcoming.pay_date}
            nextRunEmployeeCount={upcoming.employee_count}
            changeAmount={change}
            history={SAMPLE_HISTORY}
          />

          <aside
            className={cm.cn(
              cm.sp('p', 8),
              cm.flex({ direction: 'col', gap: 'lg' }),
              'lg:col-span-4 rounded-[2rem] bg-surface-container-low',
            )}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('dashboard.compliance.eyebrow', {}, { defaultValue: 'Compliance snapshot' })}
              </p>
              <p className={cm.cn(cm.textSize('2xl'), cm.sp('mt', 2), 'font-extrabold')}>
                {t('dashboard.compliance.title', {}, { defaultValue: 'All checks passing' })}
              </p>
            </div>
            <ul className={cm.stack(3)}>
              {[
                { key: 'taxes', defaultLabel: 'Federal & state taxes filed', icon: 'verified' },
                { key: 'i9', defaultLabel: 'I-9 documents on file', icon: 'fact_check' },
                { key: 'minimum', defaultLabel: 'Minimum wage compliant', icon: 'gavel' },
                { key: 'overtime', defaultLabel: 'Overtime tracked & paid', icon: 'schedule' },
              ].map((c) => (
                <li
                  key={c.key}
                  className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}
                >
                  <span className="material-symbols-outlined text-success" aria-hidden="true">
                    {c.icon}
                  </span>
                  <span className="text-on-surface">
                    {t(`dashboard.compliance.${c.key}`, {}, { defaultValue: c.defaultLabel })}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              to="/audit-log"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'mt-auto text-primary hover:underline inline-flex items-center gap-1 py-2',
              )}
            >
              {t('dashboard.compliance.viewAudit', {}, { defaultValue: 'View audit log' })}
              <span className={cm.cn(`material-symbols-outlined text-base`)} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </aside>
        </section>
      ) : null}

      {/* Recent pay runs */}
      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('dashboard.recentRunsHeading', {}, { defaultValue: 'Recent pay runs' })}
          </h2>
          <Link
            to="/pay-runs"
            className={cm.cn(
              cm.textSize('sm'),
              'font-bold text-primary hover:underline inline-block py-2',
            )}
          >
            {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
          </Link>
        </div>
        <PayRunsList payRuns={payRuns} limit={3} loading={!loaded} />
      </section>

      {/* Roster glance */}
      <section className={cm.stack(4)}>
        <div className={cm.flex({ align: 'baseline', justify: 'between' })}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
            {t('dashboard.rosterHeading', {}, { defaultValue: 'Active roster' })}
          </h2>
          <Link
            to="/employees"
            className={cm.cn(
              cm.textSize('sm'),
              'font-bold text-primary hover:underline inline-block py-2',
            )}
          >
            {t('common.viewAllArrow', {}, { defaultValue: 'View all →' })}
          </Link>
        </div>
        <EmployeesTable employees={employees.slice(0, 5)} loading={!loaded} />
      </section>
    </div>
  )
}
