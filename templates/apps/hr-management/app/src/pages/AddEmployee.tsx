import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

const HIDDEN_TABS = [
  { key: 'time-off', defaultLabel: 'Time off' },
  { key: 'documents', defaultLabel: 'Documents' },
  { key: 'audit', defaultLabel: 'Audit log' },
] as const

export function AddEmployee() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [personalEmail, setPersonalEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [startDate, setStartDate] = useState('')
  const [title, setTitle] = useState('')
  const [employmentType, setEmploymentType] = useState('full-time')
  const [department, setDepartment] = useState('Engineering')
  const [manager, setManager] = useState('')
  const [office, setOffice] = useState('San Francisco, CA')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setError(null)
    if (!first.trim() || !last.trim()) {
      setError(
        t('addEmployee.errorRequired', {}, { defaultValue: 'First and last name are required.' }),
      )
      return
    }
    setSaving(true)
    try {
      const res = await http.post('/api/employees', {
        first_name: first,
        last_name: last,
        title: title || 'Employee',
        email: workEmail || undefined,
        personal_email: personalEmail || undefined,
        phone: phone || undefined,
        hire_date: startDate || undefined,
        employment_type: employmentType,
        department_name: department || undefined,
        manager_name: manager || undefined,
        office_location: office || undefined,
        status: 'active',
      })
      const created = unwrapSingle<{ id: string }>(res)
      if (created?.id) {
        navigate(`/employees/${created.id}`)
      } else {
        navigate('/employees')
      }
    } catch (err) {
      const msg =
        (err && typeof err === 'object' && 'message' in err ? String(err.message) : '') ||
        t('addEmployee.errorSave', {}, { defaultValue: 'Failed to save employee.' })
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

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
        {t('addEmployee.back', {}, { defaultValue: 'All employees' })}
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
        </div>
        <div className={cm.cn(cm.sp('px', 8), cm.sp('pb', 6))}>
          <div
            className={cm.cn(
              cm.flex({ align: 'end', justify: 'between', gap: 'lg', wrap: 'wrap' }),
              '-mt-6',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'end', gap: 'lg' }))}>
              <div
                aria-hidden="true"
                title={t(
                  'addEmployee.avatarHint',
                  {},
                  { defaultValue: 'Photo upload uses the S3 bond.' },
                )}
                className={cm.cn(
                  'h-24 w-24 grid place-items-center rounded-full bg-surface-container-low border-4 border-surface-container-lowest text-on-surface-variant',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[28px]')} aria-hidden="true">
                  {first ? first.charAt(0).toUpperCase() : 'person'}
                </span>
              </div>
              <div className={cm.cn(cm.sp('mb', 2), cm.stack(1))}>
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-primary-dark',
                  )}
                >
                  {t('addEmployee.eyebrow', {}, { defaultValue: 'New employee' })}
                </p>
                <input
                  type="text"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  placeholder={t('form.firstName', {}, { defaultValue: 'First name' })}
                  className={cm.cn(
                    cm.textSize('3xl'),
                    'font-extrabold tracking-tight bg-transparent border-b-2 border-outline-variant/30 focus:border-primary outline-none text-on-surface placeholder:text-on-surface-variant/50 w-64',
                  )}
                />
                <input
                  type="text"
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  placeholder={t('form.lastName', {}, { defaultValue: 'Last name' })}
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.fontWeight('medium'),
                    'bg-transparent border-b-2 border-outline-variant/30 focus:border-primary outline-none text-on-surface-variant placeholder:text-on-surface-variant/50 w-64',
                  )}
                />
              </div>
            </div>

            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
              <Link
                to="/employees"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors',
                )}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </Link>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
                )}
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('addEmployee.save', {}, { defaultValue: 'Save employee' })}
              </button>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div
          role="alert"
          aria-live="assertive"
          className={cm.cn(
            cm.sp('p', 4),
            'rounded-xl bg-error-container/40 text-on-error-container text-sm font-semibold border border-error/30',
          )}
        >
          {error}
        </div>
      ) : null}

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <header>
          <p
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('addEmployee.section.personal', {}, { defaultValue: 'Personal info' })}
          </p>
          <h2
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('lg'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('addEmployee.headingPersonal', {}, { defaultValue: 'Who they are' })}
          </h2>
        </header>
        <div className={cm.cn(cm.sp('mt', 6), cm.grid({ cols: 2, gap: 'md' }))}>
          <Field
            id="title"
            type="text"
            value={title}
            onChange={setTitle}
            label={t('addEmployee.field.title', {}, { defaultValue: 'Job title' })}
            icon="badge"
          />
          <Field
            id="work-email"
            type="email"
            value={workEmail}
            onChange={setWorkEmail}
            label={t('auth.workEmail', {}, { defaultValue: 'Work email' })}
            icon="mail"
          />
          <Field
            id="personal-email"
            type="email"
            value={personalEmail}
            onChange={setPersonalEmail}
            label={t('addEmployee.field.personalEmail', {}, { defaultValue: 'Personal email' })}
            icon="alternate_email"
          />
          <Field
            id="phone"
            type="tel"
            value={phone}
            onChange={setPhone}
            label={t('form.phone', {}, { defaultValue: 'Phone' })}
            icon="call"
          />
          <Field
            id="start"
            type="date"
            value={startDate}
            onChange={setStartDate}
            label={t('form.startDate', {}, { defaultValue: 'Start date' })}
            icon="event"
          />
          <Field
            id="emp-type"
            type="text"
            value={employmentType}
            onChange={setEmploymentType}
            label={t('addEmployee.field.employmentType', {}, { defaultValue: 'Employment type' })}
            icon="work"
          />
          <Field
            id="department"
            type="text"
            value={department}
            onChange={setDepartment}
            label={t('addEmployee.field.department', {}, { defaultValue: 'Department' })}
            icon="business"
          />
          <Field
            id="manager"
            type="text"
            value={manager}
            onChange={setManager}
            label={t('addEmployee.field.manager', {}, { defaultValue: 'Manager' })}
            icon="supervisor_account"
          />
          <Field
            id="office"
            type="text"
            value={office}
            onChange={setOffice}
            label={t('addEmployee.field.office', {}, { defaultValue: 'Office location' })}
            icon="location_on"
          />
        </div>
        <div className={cm.cn(cm.sp('mt', 6))}>
          <ReadOnlyField
            id="employee-id"
            label={t('addEmployee.field.employeeId', {}, { defaultValue: 'Employee ID (auto)' })}
            value="ARB-0154"
            icon="badge"
          />
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-low border border-outline-variant/20 text-on-surface-variant',
        )}
      >
        <p
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t(
            'addEmployee.locked.title',
            {},
            { defaultValue: 'Available after the employee is created' },
          )}
        </p>
        <ul
          className={cm.cn(cm.sp('mt', 3), cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }))}
        >
          {HIDDEN_TABS.map((tab) => (
            <li
              key={tab.key}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.flex({ align: 'center', gap: 'sm' }),
                'rounded-full bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')} aria-hidden="true">
                lock
              </span>
              {t(`addEmployee.locked.${tab.key}`, {}, { defaultValue: tab.defaultLabel })}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

interface FieldProps {
  id: string
  type: string
  value: string
  onChange: (v: string) => void
  label: string
  icon: string
}

function Field({ id, type, value, onChange, label, icon }: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <label
        htmlFor={id}
        className={cm.cn(
          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-xl border border-outline-variant/30 bg-surface-container-low focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-[20px] text-on-surface-variant')}
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cm.cn(
            cm.sp('ml', 3),
            cm.fontWeight('medium'),
            cm.textSize('sm'),
            'flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/60',
          )}
        />
      </div>
    </div>
  )
}

function ReadOnlyField({
  id,
  label,
  value,
  icon,
}: {
  id: string
  label: string
  value: string
  icon: string
}) {
  const cm = getClassMap()
  return (
    <div className={cm.flex({ direction: 'col', gap: 'sm' })}>
      <label
        htmlFor={id}
        className={cm.cn(
          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <div
        className={cm.cn(
          cm.flex({ align: 'center' }),
          cm.sp('px', 4),
          cm.sp('py', 3),
          'rounded-xl border border-outline-variant/30 bg-surface-container-low',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn('material-symbols-outlined text-[20px] text-on-surface-variant')}
        >
          {icon}
        </span>
        <span
          id={id}
          className={cm.cn(
            cm.sp('ml', 3),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'flex-1 text-on-surface font-mono tabular-nums',
          )}
        >
          {value}
        </span>
      </div>
    </div>
  )
}
