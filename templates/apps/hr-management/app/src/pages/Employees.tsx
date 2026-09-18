import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { EmployeeStatus } from '../components/EmployeeStatusPill.js'
import { EmployeeStatusPill } from '../components/EmployeeStatusPill.js'
import { unwrapList } from '../lib/unwrap.js'

interface Employee {
  id: string
  employee_id: string
  name: string
  avatar_initial: string
  email: string
  title: string
  department: string
  manager_name: string
  office: string
  status: EmployeeStatus
  hire_date: string
  tenure_years: number
}

const FILTERS: { key: 'all' | EmployeeStatus; defaultLabel: string }[] = [
  { key: 'all', defaultLabel: 'All' },
  { key: 'active', defaultLabel: 'Active' },
  { key: 'on-leave', defaultLabel: 'On leave' },
  { key: 'probation', defaultLabel: 'Probation' },
  { key: 'terminated', defaultLabel: 'Terminated' },
]

export function Employees() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/employees')
      .then((res) => {
        if (!cancelled) setEmployees(unwrapList<Employee>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('employees.loadError', {}, { defaultValue: 'Failed to load employees.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return employees.filter((e) => {
      if (filter !== 'all' && e.status !== filter) return false
      if (!q) return true
      return (
        e.name.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.employee_id.toLowerCase().includes(q)
      )
    })
  }, [employees, query, filter])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(6))}>
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary-dark')}
          >
            {t('employees.eyebrow', {}, { defaultValue: 'People · directory' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('employees.heading', {}, { defaultValue: 'Employees' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
            {t(
              'employees.subheading',
              { count: employees.length },
              { defaultValue: '{{count}} people across every department.' },
            )}
          </p>
        </div>
        <Link
          to="/employees/new"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'inline-flex items-center gap-2 rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
            person_add
          </span>
          {t('employees.cta', {}, { defaultValue: 'Add employee' })}
        </Link>
      </header>

      <div
        className={cm.cn(
          cm.sp('p', 4),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          cm.flex({ align: 'center', wrap: 'wrap', gap: 'md' }),
        )}
      >
        <div
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            'flex flex-1 items-center gap-3 rounded-full bg-surface-container-low border border-outline-variant/20 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all min-w-[14rem]',
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-[18px] text-on-surface-variant')}
          >
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              'employees.searchPlaceholder',
              {},
              { defaultValue: 'Search employees, departments, IDs…' },
            )}
            className={cm.cn(
              cm.fontWeight('medium'),
              cm.textSize('sm'),
              'flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/70',
            )}
          />
        </div>
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  'rounded-full text-[10px] font-black uppercase tracking-widest transition-colors',
                  active
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                )}
              >
                {t(`employees.filter.${f.key}`, {}, { defaultValue: f.defaultLabel })}
              </button>
            )
          })}
        </div>
      </div>

      <section
        className={cm.cn(
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden',
        )}
      >
        {loading ? (
          <p className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
            {t('employees.loading', {}, { defaultValue: 'Loading…' })}
          </p>
        ) : error ? (
          <p className={cm.cn(cm.sp('p', 8), 'text-error')}>{error}</p>
        ) : filtered.length === 0 ? (
          <p className={cm.cn(cm.sp('p', 8), cm.textCenter, 'text-on-surface-variant')}>
            {t('employees.empty', {}, { defaultValue: 'No matches.' })}
          </p>
        ) : (
          <table className={cm.cn('w-full text-left text-sm')}>
            <thead className={cm.cn('bg-surface-container-low')}>
              <tr>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.name', {}, { defaultValue: 'Name' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('form.title', {}, { defaultValue: 'Title' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('employees.col.department', {}, { defaultValue: 'Department' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('employees.col.manager', {}, { defaultValue: 'Manager' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('employees.col.id', {}, { defaultValue: 'ID' })}
                </th>
                <th
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('nav.status', {}, { defaultValue: 'Status' })}
                </th>
              </tr>
            </thead>
            <tbody className={cm.cn('divide-y divide-outline-variant/20')}>
              {filtered.map((emp) => (
                <tr
                  key={emp.id}
                  className={cm.cn('hover:bg-surface-container-low transition-colors')}
                >
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <Link
                      to={`/employees/${emp.id}`}
                      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
                    >
                      <span
                        className={cm.cn(
                          'grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary-dark',
                          cm.fontWeight('bold'),
                          cm.shrink0,
                        )}
                      >
                        {emp.avatar_initial}
                      </span>
                      <span>
                        <span
                          className={cm.cn(
                            cm.fontWeight('semibold'),
                            'block text-on-surface hover:text-primary transition-colors',
                          )}
                        >
                          {emp.name}
                        </span>
                        <span className={cm.cn('block text-xs text-on-surface-variant')}>
                          {emp.email}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface')}>
                    {emp.title}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        'rounded-full bg-primary/10 text-primary-dark text-xs font-semibold',
                      )}
                    >
                      {emp.department}
                    </span>
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-on-surface-variant')}>
                    {emp.manager_name}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 3),
                      'text-on-surface-variant',
                      'font-mono tabular-nums',
                    )}
                  >
                    {emp.employee_id}
                  </td>
                  <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                    <EmployeeStatusPill status={emp.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
