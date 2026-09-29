import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { Employee } from '../components/EmployeesTable.js'
import { EmployeesTable } from '../components/EmployeesTable.js'
import { fmtMoney } from '../lib/money.js'
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
    first_name: 'Maria',
    last_name: 'Lopez',
    email: 'maria.lopez@stipend.example',
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
  {
    id: 'e-6',
    first_name: 'Jonas',
    last_name: 'Mendel',
    email: 'jonas.mendel@stipend.example',
    department: 'Engineering',
    title: 'Backend Engineer',
    salary: 122_000,
    status: 'active',
  },
  {
    id: 'e-7',
    first_name: 'Saoirse',
    last_name: 'Quinn',
    email: 'saoirse.quinn@stipend.example',
    department: 'Marketing',
    title: 'Brand Designer',
    salary: 88_000,
    status: 'active',
  },
  {
    id: 'e-8',
    first_name: 'Rashid',
    last_name: 'Bello',
    email: 'rashid.bello@stipend.example',
    department: 'Sales',
    title: 'Sales Development Rep',
    salary: 64_000,
    status: 'active',
  },
  {
    id: 'e-9',
    first_name: 'Mei-Ling',
    last_name: 'Tan',
    email: 'mei.tan@stipend.example',
    department: 'People Ops',
    title: 'HR Business Partner',
    salary: 102_000,
    status: 'active',
  },
  {
    id: 'e-10',
    first_name: 'Theo',
    last_name: 'Andersen',
    email: 'theo.andersen@stipend.example',
    department: 'Engineering',
    title: 'Engineering Manager',
    salary: 178_000,
    status: 'active',
  },
  {
    id: 'e-11',
    first_name: 'Lia',
    last_name: 'Rosales',
    email: 'lia.rosales@stipend.example',
    department: 'Customer',
    title: 'Onboarding Lead',
    salary: 92_000,
    status: 'active',
  },
  {
    id: 'e-12',
    first_name: 'Kofi',
    last_name: 'Mensah',
    email: 'kofi.mensah@stipend.example',
    department: 'Operations',
    title: 'Compliance Analyst',
    salary: 84_000,
    status: 'active',
  },
  {
    id: 'e-13',
    first_name: 'Ines',
    last_name: 'Lehmann',
    email: 'ines.lehmann@stipend.example',
    department: 'Marketing',
    title: 'Content Strategist',
    salary: 76_000,
    status: 'terminated',
  },
]

const DEPARTMENTS = [
  'All',
  'Engineering',
  'Sales',
  'Operations',
  'Finance',
  'Marketing',
  'People Ops',
  'Customer',
] as const
// Mirrors the employee status enum used by the form + API ('active' |
// 'on_leave' | 'terminated') so every filter chip can actually match data.
const STATUS_FILTERS = ['all', 'active', 'on_leave', 'terminated'] as const

type StatusFilter = (typeof STATUS_FILTERS)[number]

export function Employees() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [employees, setEmployees] = useState<Employee[]>(SAMPLE_EMPLOYEES)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState<(typeof DEPARTMENTS)[number]>('All')
  const [status, setStatus] = useState<StatusFilter>('all')

  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoadError(false)
    http
      .get('/api/employees')
      .then((res) => {
        if (cancelled) return
        setEmployees(unwrapList<Employee>(res))
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        // Keep showing the static placeholder so the page still renders
        // when the API is unreachable (offline / dev with API down) — but
        // say so, instead of silently pretending the roster is real.
        setLoadError(true)
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [http, reloadKey])

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (department !== 'All' && e.department !== department) return false
      if (status !== 'all' && e.status !== status) return false
      if (search) {
        const term = search.toLowerCase()
        const haystack =
          `${e.first_name} ${e.last_name} ${e.email ?? ''} ${e.title ?? ''}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [employees, department, status, search])

  const totalSalary = filtered.reduce((s, e) => s + Number(e.salary || 0), 0)

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
            {t('employees.eyebrow', {}, { defaultValue: 'Roster' })}
          </p>
          <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
            {t('employees.heading', {}, { defaultValue: 'Employees' })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
            {t(
              'employees.subheading',
              { count: filtered.length, total: fmtMoney(totalSalary) },
              { defaultValue: '{{count}} on roster · {{total}} annual payroll' },
            )}
          </p>
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          <button
            type="button"
            onClick={() => {
              exportCsv(filtered)
              void track({
                name: 'employee.roster_exported',
                properties: { count: filtered.length },
              })
            }}
            data-testid="employees-export-csv"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              cm.flex({ align: 'center', gap: 'xs' }),
              'border border-outline-variant hover:bg-surface-container-low transition-colors',
            )}
          >
            <span className={cm.cn(`material-symbols-outlined text-base`)} aria-hidden="true">
              file_download
            </span>
            {t('common.exportCsv', {}, { defaultValue: 'Export CSV' })}
          </button>
          <Link
            to="/employees/new"
            data-testid="employees-add-link"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              cm.flex({ align: 'center', gap: 'xs' }),
              'bg-primary text-on-primary hover:bg-primary/90 transition-colors',
            )}
          >
            <span className={cm.cn(`material-symbols-outlined text-base`)} aria-hidden="true">
              person_add
            </span>
            {t('employees.add', {}, { defaultValue: 'Add employee' })}
          </Link>
        </div>
      </header>

      <div
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
          cm.sp('p', 4),
          'bg-surface-container-lowest rounded-2xl shadow-sm',
        )}
      >
        <div className={cm.cn('relative min-w-0', cm.flex1)}>
          <span
            className={cm.cn(
              `material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base`,
            )}
            aria-hidden="true"
          >
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'employees.searchPlaceholder',
              {},
              { defaultValue: 'Search by name, email, or title' },
            )}
            aria-label={t('employees.searchAriaLabel', {}, { defaultValue: 'Search employees' })}
            className={cm.cn(
              cm.w('full'),
              cm.sp('pl', 10),
              cm.sp('pr', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.roundedFull,
              'bg-surface-container-low border-none focus:ring-2 ring-primary/30 placeholder:text-on-surface-variant',
            )}
          />
        </div>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value as (typeof DEPARTMENTS)[number])}
          aria-label={t(
            'employees.departmentAriaLabel',
            {},
            { defaultValue: 'Filter by department' },
          )}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.textSize('sm'),
            cm.fontWeight('medium'),
            cm.roundedFull,
            'bg-surface-container-low border-none focus:ring-2 ring-primary/30',
          )}
        >
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d === 'All'
                ? t('employees.allDepartments', {}, { defaultValue: 'All departments' })
                : d}
            </option>
          ))}
        </select>
        <div className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>
          {STATUS_FILTERS.map((s) => {
            const isActive = status === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.roundedFull,
                  'uppercase tracking-widest transition-colors',
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {t(
                  `employees.statusFilter.${s}`,
                  {},
                  {
                    defaultValue:
                      s === 'all'
                        ? 'All'
                        : s === 'on_leave'
                          ? 'On leave'
                          : s.charAt(0).toUpperCase() + s.slice(1),
                  },
                )}
              </button>
            )
          })}
        </div>
      </div>

      {loadError ? (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
            'rounded-xl bg-error-container text-on-error-container',
          )}
        >
          <span className={cm.textSize('sm')}>
            {t(
              'employees.loadError',
              {},
              {
                defaultValue:
                  'Live roster unavailable — showing sample data until the connection recovers.',
              },
            )}
          </span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-colors',
            )}
          >
            {t('common.retry', {}, { defaultValue: 'Retry' })}
          </button>
        </div>
      ) : null}

      <EmployeesTable employees={filtered} loading={!loaded} />
    </div>
  )
}

const CSV_COLUMNS: Array<{ key: keyof Employee; header: string }> = [
  { key: 'first_name', header: 'First name' },
  { key: 'last_name', header: 'Last name' },
  { key: 'email', header: 'Email' },
  { key: 'department', header: 'Department' },
  { key: 'title', header: 'Title' },
  { key: 'salary', header: 'Salary (USD)' },
  { key: 'pay_frequency', header: 'Pay frequency' },
  { key: 'status', header: 'Status' },
]

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

/**
 * Build a CSV out of the currently-filtered employees and trigger a
 * browser download. Stays in-memory — no backend round-trip needed —
 * which is perfect for "give me what I'm currently looking at".
 */
function exportCsv(employees: Employee[]): void {
  const header = CSV_COLUMNS.map((c) => c.header).join(',')
  const rows = employees.map((e) => CSV_COLUMNS.map((c) => csvEscape(e[c.key] ?? '')).join(','))
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const stamp = new Date().toISOString().slice(0, 10)
  anchor.download = `employees-${stamp}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
