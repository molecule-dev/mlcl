import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { EmployeeStatus } from '../components/EmployeeStatusPill.js'
import { EmployeeStatusPill } from '../components/EmployeeStatusPill.js'
import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface Employee {
  id: string
  employee_id: string
  name: string
  first_name: string
  last_name: string
  avatar_initial: string
  email: string
  personal_email: string
  phone: string
  title: string
  department: string
  department_id: string | null
  manager_name: string
  manager_id: string | null
  office: string
  employment_type: string
  status: EmployeeStatus
  hire_date: string
  tenure_years: number
  birthday: string
}

interface PtoRow {
  id: string
  employee_id: string
  type_label: string
  status: string
  start_date: string
  end_date: string
  days: number
  reason: string
}

interface DocRow {
  id: string
  name: string
  category: string
  uploaded_at: string
  size_label: string
  uploader_name: string
  employee_id?: string | null
}

interface AuditEvent {
  id: string
  occurred_at: string
  actor_name: string
  action: string
  target_label: string
  target_link?: string
}

const TABS = [
  { key: 'personal', defaultLabel: 'Personal info', icon: 'badge' },
  { key: 'time-off', defaultLabel: 'Time off', icon: 'calendar_month' },
  { key: 'documents', defaultLabel: 'Documents', icon: 'folder_shared' },
  { key: 'audit', defaultLabel: 'Audit log', icon: 'history' },
] as const

function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

type Translate = ReturnType<typeof useTranslation>['t']

/** Human label for an employee status — shares the EmployeeStatusPill key family. */
function statusLabel(status: EmployeeStatus, t: Translate): string {
  const canonical = status === 'on_leave' ? 'on-leave' : status
  const defaults: Record<string, string> = {
    active: 'Active',
    'on-leave': 'On leave',
    probation: 'Probation',
    terminated: 'Terminated',
  }
  return t(`employeeStatusPill.${canonical}`, {}, { defaultValue: defaults[canonical] ?? status })
}

/** Human label for a PTO request status — shares the PtoStatusPill key family. */
function ptoStatusLabel(status: string, t: Translate): string {
  const defaults: Record<string, string> = {
    approved: 'Approved',
    pending: 'Pending',
    denied: 'Denied',
  }
  return t(`ptoStatusPill.${status}`, {}, { defaultValue: defaults[status] ?? status })
}

export function EmployeeProfile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const http = useHttpClient()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [pto, setPto] = useState<PtoRow[]>([])
  const [docs, setDocs] = useState<DocRow[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('personal')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<Employee>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      id ? http.get(`/api/employees/${id}`).catch(() => null) : Promise.resolve(null),
      http.get('/api/pto').catch(() => null),
      http.get('/api/documents').catch(() => null),
      http.get('/api/audit').catch(() => null),
    ])
      .then(([eRes, pRes, dRes, aRes]) => {
        if (cancelled) return
        const found = eRes ? unwrapSingle<Employee>(eRes) : null
        setEmployee(found)
        setPto(unwrapList<PtoRow>(pRes))
        setDocs(unwrapList<DocRow>(dRes))
        setAudit(unwrapList<AuditEvent>(aRes))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('employeeProfile.loadError', {}, { defaultValue: 'Failed to load employee.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  const empPto = useMemo(
    () => (employee ? pto.filter((p) => p.employee_id === employee.id) : []),
    [pto, employee],
  )
  const empDocs = useMemo(
    () => (employee ? docs.filter((d) => !d.employee_id || d.employee_id === employee.id) : []),
    [docs, employee],
  )
  const empAudit = useMemo(
    () =>
      employee
        ? audit.filter(
            (a) => a.target_link === `/employees/${employee.id}` || a.actor_name === employee.name,
          )
        : [],
    [audit, employee],
  )

  function startEdit() {
    if (!employee) return
    setDraft({
      title: employee.title,
      email: employee.email,
      personal_email: employee.personal_email,
      phone: employee.phone,
      department: employee.department,
      manager_name: employee.manager_name,
      office: employee.office,
      employment_type: employee.employment_type,
      status: employee.status,
    })
    setSaveError(null)
    setEditing(true)
  }

  async function saveEdit() {
    if (!employee) return
    setSaving(true)
    setSaveError(null)
    try {
      const payload: Record<string, unknown> = {
        title: draft.title ?? null,
        email: draft.email,
        personal_email: draft.personal_email ?? null,
        phone: draft.phone ?? null,
        office_location: draft.office ?? null,
        employment_type: draft.employment_type ?? 'full-time',
        status: draft.status ?? employee.status,
        department_name: draft.department,
        manager_name: draft.manager_name,
      }
      const res = await http.patch(`/api/employees/${employee.id}`, payload)
      const updated = unwrapSingle<Employee>(res)
      if (updated) setEmployee(updated)
      track({
        name: 'employee.updated',
        properties: { employee_id: employee.id, status: payload.status ?? employee.status },
      })
      setEditing(false)
    } catch (err) {
      const msg =
        (err && typeof err === 'object' && 'message' in err ? String(err.message) : '') ||
        t('employeeProfile.saveError', {}, { defaultValue: 'Failed to save changes.' })
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  if (error || !employee)
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-error')}>
        {error ?? t('employeeProfile.empty', {}, { defaultValue: 'Employee not found.' })}
      </div>
    )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8))}>
      <Link
        to="/employees"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.textSize('xs'),
          cm.fontWeight('semibold'),
          'text-on-surface-variant hover:text-on-surface transition-colors',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
          arrow_back
        </span>
        {t('employeeProfile.backToList', {}, { defaultValue: 'All employees' })}
      </Link>

      <section
        className={cm.cn(
          'rounded-[2rem] overflow-hidden bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            'h-40 bg-gradient-to-br from-primary to-primary-container relative overflow-hidden',
          )}
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -right-16 -bottom-12 h-48 w-48 rounded-full bg-surface/10 blur-3xl',
            )}
          />
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -left-12 -top-16 h-48 w-48 rounded-full bg-secondary-fixed/15 blur-3xl',
            )}
          />
        </div>
        <div className={cm.cn(cm.sp('px', 8), cm.sp('pb', 6), 'relative')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between', gap: 'lg', wrap: 'wrap' }),
              '-mt-6',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'end', gap: 'lg' }))}>
              <span
                className={cm.cn(
                  'grid h-24 w-24 place-items-center rounded-full bg-primary text-on-primary border-4 border-surface-container-lowest text-3xl font-extrabold tracking-tight',
                )}
              >
                {employee.avatar_initial}
              </span>
              <div className={cm.cn(cm.sp('mb', 2))}>
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-primary-dark',
                  )}
                >
                  {employee.department}
                </p>
                <h1
                  className={cm.cn(
                    cm.textSize('3xl'),
                    'font-extrabold tracking-tight text-on-surface',
                  )}
                >
                  {employee.name}
                </h1>
                <p className={cm.cn(cm.textSize('sm'), 'font-medium text-on-surface-variant')}>
                  {employee.title} · {employee.office}
                </p>
              </div>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
              <EmployeeStatusPill status={employee.status} />
              <a
                href={employee.email ? `mailto:${employee.email}` : undefined}
                aria-label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                className={cm.cn(
                  'h-10 w-10 grid place-items-center rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors',
                  employee.email ? '' : 'pointer-events-none opacity-40',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  mail
                </span>
              </a>
              <a
                href={employee.phone ? `tel:${employee.phone}` : undefined}
                aria-label={t('employeeProfile.action.call', {}, { defaultValue: 'Call' })}
                className={cm.cn(
                  'h-10 w-10 grid place-items-center rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors',
                  employee.phone ? '' : 'pointer-events-none opacity-40',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  call
                </span>
              </a>
              <button
                type="button"
                onClick={editing ? saveEdit : startEdit}
                disabled={saving}
                aria-label={
                  editing
                    ? t('common.save', {}, { defaultValue: 'Save' })
                    : t('common.edit', {}, { defaultValue: 'Edit' })
                }
                className={cm.cn(
                  'h-10 w-10 grid place-items-center rounded-full bg-primary/10 text-primary-dark hover:bg-primary/15 transition-colors disabled:opacity-50',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                  {editing ? 'check' : 'edit'}
                </span>
              </button>
              {editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  aria-label={t('common.cancel', {}, { defaultValue: 'Cancel' })}
                  className={cm.cn(
                    'h-10 w-10 grid place-items-center rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    aria-hidden="true"
                  >
                    close
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {saveError ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error-container/40 text-on-error-container text-sm font-semibold border border-error/30',
          )}
        >
          {saveError}
        </div>
      ) : null}

      <nav
        className={cm.cn(
          cm.sp('p', 1),
          'rounded-2xl bg-surface-container-low border border-outline-variant/20 inline-flex flex-wrap gap-1',
        )}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.textSize('sm'),
                'rounded-xl font-semibold transition-colors',
                active
                  ? 'bg-surface-container-lowest text-primary-dark shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')} aria-hidden="true">
                {tab.icon}
              </span>
              {t(`employeeProfile.tab.${tab.key}`, {}, { defaultValue: tab.defaultLabel })}
            </button>
          )
        })}
      </nav>

      {activeTab === 'personal' ? (
        editing ? (
          <EditFields draft={draft} setDraft={setDraft} />
        ) : (
          <div className={cm.cn('grid gap-4 md:grid-cols-2')}>
            <DetailCard
              title={t('employeeProfile.section.contact', {}, { defaultValue: 'Contact' })}
              rows={[
                {
                  label: t('auth.workEmail', {}, { defaultValue: 'Work email' }),
                  value: employee.email,
                },
                {
                  label: t(
                    'addEmployee.field.personalEmail',
                    {},
                    { defaultValue: 'Personal email' },
                  ),
                  value: employee.personal_email,
                },
                { label: t('form.phone', {}, { defaultValue: 'Phone' }), value: employee.phone },
              ]}
            />
            <DetailCard
              title={t('form.role', {}, { defaultValue: 'Role' })}
              rows={[
                { label: t('form.title', {}, { defaultValue: 'Title' }), value: employee.title },
                {
                  label: t('employees.col.department', {}, { defaultValue: 'Department' }),
                  value: employee.department,
                },
                {
                  label: t('employees.col.manager', {}, { defaultValue: 'Manager' }),
                  value: employee.manager_name,
                },
                {
                  label: t('employeeProfile.field.office', {}, { defaultValue: 'Office' }),
                  value: employee.office,
                },
                {
                  label: t(
                    'addEmployee.field.employmentType',
                    {},
                    { defaultValue: 'Employment type' },
                  ),
                  value: employee.employment_type,
                },
              ]}
            />
            <DetailCard
              title={t('nav.identity', {}, { defaultValue: 'Identity' })}
              rows={[
                {
                  label: t('employeeProfile.field.employeeId', {}, { defaultValue: 'Employee ID' }),
                  value: employee.employee_id,
                  mono: true,
                },
                {
                  label: t('employeeProfile.field.hireDate', {}, { defaultValue: 'Hire date' }),
                  value: fmtDate(employee.hire_date),
                },
                {
                  label: t('employeeProfile.field.tenure', {}, { defaultValue: 'Tenure' }),
                  value:
                    employee.tenure_years === 1
                      ? t('employeeProfile.tenureOneYear', {}, { defaultValue: '1 year' })
                      : t(
                          'employeeProfile.tenureYears',
                          { count: employee.tenure_years },
                          { defaultValue: '{{count}} years' },
                        ),
                },
                {
                  label: t('employeeProfile.field.birthday', {}, { defaultValue: 'Birthday' }),
                  value: employee.birthday || '—',
                },
              ]}
            />
            <DetailCard
              title={t('nav.status', {}, { defaultValue: 'Status' })}
              rows={[
                {
                  label: t('employeeProfile.field.current', {}, { defaultValue: 'Current' }),
                  value: statusLabel(employee.status, t),
                },
                {
                  label: t('employeeProfile.field.lastReview', {}, { defaultValue: 'Last review' }),
                  value: '—',
                },
                {
                  label: t('employeeProfile.field.nextOneOnOne', {}, { defaultValue: 'Next 1:1' }),
                  value: '—',
                },
              ]}
            />
          </div>
        )
      ) : null}

      {activeTab === 'time-off' ? (
        empPto.length === 0 ? (
          <EmptyTab
            label={t(
              'employeeProfile.timeOffEmpty',
              {},
              { defaultValue: 'No time-off requests yet.' },
            )}
            cta={{
              to: '/pto',
              label: t('employeeProfile.timeOffCta', {}, { defaultValue: 'Open Time off' }),
            }}
          />
        ) : (
          <ul className={cm.cn(cm.stack(2))}>
            {empPto.map((p) => (
              <li
                key={p.id}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20',
                )}
              >
                <div>
                  <p className={cm.cn('font-semibold text-on-surface')}>
                    {p.type_label} · {p.start_date} → {p.end_date}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {p.days === 1
                      ? t('employeeProfile.oneDay', {}, { defaultValue: '1 day' })
                      : t(
                          'employeeProfile.daysCount',
                          { count: p.days },
                          { defaultValue: '{{count}} days' },
                        )}{' '}
                    · {p.reason || '—'}
                  </p>
                </div>
                <span
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full',
                    p.status === 'approved'
                      ? 'bg-tertiary/10 text-tertiary'
                      : p.status === 'pending'
                        ? 'bg-secondary/10 text-secondary'
                        : 'bg-error/10 text-error',
                  )}
                >
                  {ptoStatusLabel(p.status, t)}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {activeTab === 'documents' ? (
        empDocs.length === 0 ? (
          <EmptyTab
            label={t(
              'employeeProfile.documentsEmpty',
              {},
              { defaultValue: 'No documents linked yet.' },
            )}
            cta={{
              to: '/documents',
              label: t('employeeProfile.documentsCta', {}, { defaultValue: 'Open Documents' }),
            }}
          />
        ) : (
          <ul className={cm.cn(cm.stack(2))}>
            {empDocs.map((d) => (
              <li
                key={d.id}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20',
                )}
              >
                <div>
                  <p className={cm.cn('font-semibold text-on-surface')}>{d.name}</p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {d.category} · {d.size_label} ·{' '}
                    {t(
                      'employeeProfile.uploadedBy',
                      { name: d.uploader_name },
                      { defaultValue: 'uploaded by {{name}}' },
                    )}{' '}
                    · {fmtDate(d.uploaded_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {activeTab === 'audit' ? (
        empAudit.length === 0 ? (
          <EmptyTab
            label={t('employeeProfile.auditEmpty', {}, { defaultValue: 'No recent activity.' })}
            cta={{
              to: '/settings',
              label: t('employeeProfile.auditCta', {}, { defaultValue: 'Open audit log' }),
            }}
          />
        ) : (
          <ol className={cm.cn(cm.stack(2))}>
            {empAudit.map((a) => (
              <li
                key={a.id}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 4),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/20',
                )}
              >
                <p className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                  {a.actor_name} {a.action} {a.target_label}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {fmtDate(a.occurred_at)}
                </p>
              </li>
            ))}
          </ol>
        )
      ) : null}
    </div>
  )
}

interface DetailRow {
  label: string
  value: string
  mono?: boolean
}

function DetailCard({ title, rows }: { title: string; rows: DetailRow[] }) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
      )}
    >
      <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
        {title}
      </h2>
      <dl className={cm.cn(cm.sp('mt', 4), cm.stack(3))}>
        {rows.map((row) => (
          <div
            key={row.label}
            className={cm.flex({ align: 'baseline', justify: 'between', gap: 'sm' })}
          >
            <dt
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {row.label}
            </dt>
            <dd
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'text-on-surface text-right',
                row.mono ? 'font-mono tabular-nums' : '',
              )}
            >
              {row.value || '—'}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function EmptyTab({ label, cta }: { label: string; cta?: { to: string; label: string } }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 8),
        cm.textCenter,
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant',
      )}
    >
      <p className={cm.cn(cm.fontWeight('semibold'), 'text-on-surface')}>{label}</p>
      {cta ? (
        <Link
          to={cta.to}
          className={cm.cn(
            cm.sp('mt', 4),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'inline-block rounded-xl bg-primary text-on-primary',
          )}
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  )
}

interface EditFieldsProps {
  draft: Partial<Employee>
  setDraft: (d: Partial<Employee>) => void
}

function EditFields({ draft, setDraft }: EditFieldsProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  function field(label: string, key: keyof Employee, type = 'text') {
    return (
      <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <span
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {label}
        </span>
        <input
          type={type}
          value={(draft[key] as string | undefined) ?? ''}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium text-on-surface',
          )}
        />
      </label>
    )
  }
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
      )}
    >
      <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}>
        {t('employeeProfile.editHeading', {}, { defaultValue: 'Edit profile' })}
      </h2>
      <div className={cm.cn(cm.sp('mt', 6), 'grid gap-4 sm:grid-cols-2')}>
        {field(t('form.title', {}, { defaultValue: 'Title' }), 'title')}
        {field(t('auth.workEmail', {}, { defaultValue: 'Work email' }), 'email', 'email')}
        {field(
          t('addEmployee.field.personalEmail', {}, { defaultValue: 'Personal email' }),
          'personal_email',
          'email',
        )}
        {field(t('form.phone', {}, { defaultValue: 'Phone' }), 'phone', 'tel')}
        {field(t('employees.col.department', {}, { defaultValue: 'Department' }), 'department')}
        {field(
          t('employeeProfile.field.managerName', {}, { defaultValue: 'Manager (name)' }),
          'manager_name',
        )}
        {field(t('employeeProfile.field.office', {}, { defaultValue: 'Office' }), 'office')}
        {field(
          t('addEmployee.field.employmentType', {}, { defaultValue: 'Employment type' }),
          'employment_type',
        )}
        <label className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <span
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('nav.status', {}, { defaultValue: 'Status' })}
          </span>
          <select
            value={(draft.status as string | undefined) ?? 'active'}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as EmployeeStatus })}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              'rounded-xl border border-outline-variant/30 bg-surface-container-low focus:border-primary outline-none text-sm font-medium text-on-surface',
            )}
          >
            <option value="active">
              {t('employeeStatusPill.active', {}, { defaultValue: 'Active' })}
            </option>
            <option value="on_leave">
              {t('employeeStatusPill.on-leave', {}, { defaultValue: 'On leave' })}
            </option>
            <option value="probation">
              {t('employeeStatusPill.probation', {}, { defaultValue: 'Probation' })}
            </option>
            <option value="terminated">
              {t('employeeStatusPill.terminated', {}, { defaultValue: 'Terminated' })}
            </option>
          </select>
        </label>
      </div>
    </section>
  )
}
