import { useNavigate } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { fmtMoney } from '../lib/money.js'

export interface Employee {
  id: string
  first_name: string
  last_name: string
  email?: string
  department: string | null
  title: string | null
  salary: number | string
  pay_frequency?: string
  status: string
}

interface EmployeesTableProps {
  employees: Employee[]
  loading?: boolean
}

// Every avatar bg must hold >=4.5:1 with white initials (axe color-contrast).
const AVATAR_COLORS = ['#0e7490', '#047857', '#7c3aed', '#dc2626', '#0369a1', '#b45309']

function avatarColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const STATUS_STYLES: Record<string, { bg: string; color: string; defaultLabel: string }> = {
  active: {
    bg: 'var(--mol-color-success-light)',
    color: 'var(--mol-color-success)',
    defaultLabel: 'ACTIVE',
  },
  on_leave: {
    bg: 'var(--mol-color-warning-light)',
    color: 'var(--mol-color-warning)',
    defaultLabel: 'ON LEAVE',
  },
  inactive: {
    bg: 'var(--mol-color-error-light)',
    color: 'var(--mol-color-error)',
    defaultLabel: 'INACTIVE',
  },
  pending: {
    bg: 'var(--mol-color-info-light)',
    color: 'var(--mol-color-info)',
    defaultLabel: 'PENDING',
  },
  terminated: {
    bg: 'var(--mol-color-error-light)',
    color: 'var(--mol-color-error)',
    defaultLabel: 'TERMINATED',
  },
}

/**
 * Editorial employees table — avatar chip, name + email stacked,
 * department, title, annual salary (tabular-nums right-aligned), and
 * status pill with brand-derived semantic colors. Hover lifts row.
 *
 * Translated from crm/CompaniesTable.tsx + CompanyRow.tsx.
 */
export function EmployeesTable({ employees, loading = false }: EmployeesTableProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className={cm.w('full')}>
      <div
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 3),
          cm.grid({ cols: 12 }),
          'items-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        <span className="col-span-4">
          {t('employeesTable.col.name', {}, { defaultValue: 'Employee' })}
        </span>
        <span className="col-span-2">
          {t('employeesTable.col.department', {}, { defaultValue: 'Department' })}
        </span>
        <span className="col-span-3">{t('form.title', {}, { defaultValue: 'Title' })}</span>
        <span className="col-span-2 text-right">
          {t('employeesTable.col.salary', {}, { defaultValue: 'Salary' })}
        </span>
        <span className="col-span-1 text-right">
          {t('nav.status', {}, { defaultValue: 'Status' })}
        </span>
      </div>

      <div className={cm.cn(cm.sp('mt', 1), 'space-y-1.5')}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 4),
                  cm.grid({ cols: 12 }),
                  'items-center bg-surface-container-lowest rounded-xl shadow-sm animate-pulse',
                )}
              >
                <div className={cm.cn(cm.flex({ align: 'center' }), 'col-span-4 gap-3')}>
                  <div
                    className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'bg-surface-container')}
                  />
                  <div className={cm.cn(cm.flex1, 'space-y-1.5')}>
                    <div className={cm.cn(cm.h(3), cm.w(32), 'rounded bg-surface-container')} />
                    <div className={cm.cn(cm.h(2), cm.w(24), 'rounded bg-surface-container')} />
                  </div>
                </div>
                <div className="col-span-2">
                  <div className={cm.cn(cm.h(3), cm.w(20), 'rounded bg-surface-container')} />
                </div>
                <div className="col-span-3">
                  <div className={cm.cn(cm.h(3), cm.w(28), 'rounded bg-surface-container')} />
                </div>
                <div className="col-span-2">
                  <div
                    className={cm.cn(cm.h(3), cm.w(16), 'rounded bg-surface-container ml-auto')}
                  />
                </div>
                <div className="col-span-1">
                  <div
                    className={cm.cn(
                      cm.h(5),
                      cm.w(16),
                      cm.roundedFull,
                      'bg-surface-container ml-auto',
                    )}
                  />
                </div>
              </div>
            ))
          : employees.map((emp) => {
              const fullName = `${emp.first_name} ${emp.last_name}`
              const initials =
                `${emp.first_name[0] ?? ''}${emp.last_name[0] ?? ''}`.toUpperCase() || '?'
              const status = (emp.status ?? 'active').toLowerCase()
              const style = STATUS_STYLES[status] ?? STATUS_STYLES.active
              return (
                <div
                  key={emp.id}
                  className={cm.cn(
                    cm.grid({ cols: 12 }),
                    cm.sp('px', 6),
                    cm.sp('py', 4),
                    cm.cursorPointer,
                    'items-center bg-surface-container-lowest rounded-xl hover:bg-surface-container-low hover:-translate-y-0.5 transition-all duration-200 shadow-sm group',
                  )}
                  onClick={() => navigate(`/employees/${emp.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/employees/${emp.id}`)
                    }
                  }}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'col-span-4')}>
                    <div
                      className={cm.cn(
                        cm.w(10),
                        cm.h(10),
                        cm.roundedFull,
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.fontWeight('bold'),
                        cm.textSize('sm'),
                        'text-white shadow-sm',
                      )}
                      style={{ backgroundColor: avatarColor(fullName) }}
                      aria-hidden="true"
                    >
                      {initials}
                    </div>
                    <div className={cm.cn(`min-w-0`)}>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('bold'),
                          'text-on-surface truncate',
                        )}
                      >
                        {fullName}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                        {emp.email ?? t('common.noValue', {}, { defaultValue: '—' })}
                      </p>
                    </div>
                  </div>
                  <div className={cm.cn(cm.textSize('sm'), 'col-span-2 text-on-surface-variant')}>
                    {emp.department ?? t('common.noValue', {}, { defaultValue: '—' })}
                  </div>
                  <div className={cm.cn(cm.textSize('sm'), 'col-span-3 text-on-surface')}>
                    {emp.title ?? t('common.noValue', {}, { defaultValue: '—' })}
                  </div>
                  <div
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'col-span-2 text-on-surface tabular-nums text-right',
                    )}
                  >
                    {fmtMoney(emp.salary)}
                  </div>
                  <div className="col-span-1 text-right">
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 1),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'text-[10px] uppercase tracking-widest',
                      )}
                      style={{ backgroundColor: style.bg, color: style.color }}
                    >
                      {t(
                        `employeesTable.status.${status}`,
                        {},
                        { defaultValue: style.defaultLabel },
                      )}
                    </span>
                  </div>
                </div>
              )
            })}

        {!loading && employees.length === 0 ? (
          <div className={cm.cn(cm.sp('py', 12), cm.textCenter, 'text-on-surface-variant')}>
            {t(
              'employeesTable.empty',
              {},
              { defaultValue: 'No employees yet. Add your first hire.' },
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
