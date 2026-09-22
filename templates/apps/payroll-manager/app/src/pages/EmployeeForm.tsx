import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface EmployeeFormState {
  first_name: string
  last_name: string
  email: string
  ssn: string
  department: string
  title: string
  salary: string
  pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
  start_date: string
  tax_filing_status: 'single' | 'married' | 'head_of_household'
  status: 'active' | 'on_leave' | 'terminated'
}

interface EmployeeRecord {
  id: string
  first_name: string
  last_name: string
  email: string | null
  department: string | null
  title: string | null
  salary: number | string
  pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
  start_date: string | null
  tax_filing_status: 'single' | 'married' | 'head_of_household'
  status: 'active' | 'on_leave' | 'terminated'
}

const EMPTY: EmployeeFormState = {
  first_name: '',
  last_name: '',
  email: '',
  ssn: '',
  department: '',
  title: '',
  salary: '0',
  pay_frequency: 'biweekly',
  start_date: new Date().toISOString().slice(0, 10),
  tax_filing_status: 'single',
  status: 'active',
}

/**
 * Create-or-edit page for an employee record. Wired into the routes
 * `/employees/new` (create) and `/employees/:id/edit` (edit).
 *
 * Uses the same `/api/employees` endpoints as the rest of the app —
 * SSN is sent in plaintext over the auth-protected channel and the
 * server encrypts it at rest. Only the masked last-4 ever comes back.
 */
export function EmployeeForm() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()

  const isNew = !id || id === 'new'
  const [form, setForm] = useState<EmployeeFormState>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    setLoading(true)
    http
      .get<EmployeeRecord>(`/api/employees/${id}`)
      .then((res) => {
        if (cancelled) return
        const emp = unwrapSingle<EmployeeRecord>(res)
        if (!emp) {
          setError(t('employeeForm.notFound', {}, { defaultValue: 'Employee not found.' }))
          return
        }
        setForm({
          first_name: emp.first_name ?? '',
          last_name: emp.last_name ?? '',
          email: emp.email ?? '',
          ssn: '',
          department: emp.department ?? '',
          title: emp.title ?? '',
          salary: String(emp.salary ?? 0),
          pay_frequency: emp.pay_frequency ?? 'biweekly',
          start_date: (emp.start_date ?? new Date().toISOString()).slice(0, 10),
          tax_filing_status: emp.tax_filing_status ?? 'single',
          status: emp.status ?? 'active',
        })
      })
      .catch(() => {
        if (!cancelled)
          setError(t('employeeForm.loadError', {}, { defaultValue: 'Could not load employee.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, isNew, t])

  const update = <K extends keyof EmployeeFormState>(k: K, v: EmployeeFormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setError(null)
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError(
        t('employeeForm.nameRequired', {}, { defaultValue: 'First and last name are required.' }),
      )
      return
    }
    const salary = Number(form.salary)
    if (!Number.isFinite(salary) || salary < 0) {
      setError(
        t(
          'employeeForm.salaryInvalid',
          {},
          { defaultValue: 'Salary must be a non-negative number.' },
        ),
      )
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        salary,
        pay_frequency: form.pay_frequency,
        tax_filing_status: form.tax_filing_status,
      }
      if (form.email.trim()) payload.email = form.email.trim()
      if (form.department.trim()) payload.department = form.department.trim()
      if (form.title.trim()) payload.title = form.title.trim()
      if (form.ssn.trim()) payload.ssn = form.ssn.trim()
      if (isNew) {
        if (form.start_date) payload.start_date = form.start_date
        const res = await http.post<EmployeeRecord>('/api/employees', payload)
        const created = unwrapSingle<EmployeeRecord>(res)
        if (created?.id) {
          void track({
            name: 'employee.added',
            properties: { employee_id: created.id, salary, pay_frequency: form.pay_frequency },
          })
        }
        navigate(created?.id ? `/employees/${created.id}` : '/employees')
      } else {
        if (form.status) payload.status = form.status
        await http.put<EmployeeRecord>(`/api/employees/${id}`, payload)
        void track({
          name: 'employee.updated',
          properties: { employee_id: id, salary, status: form.status },
        })
        navigate(`/employees/${id}`)
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t('employeeForm.saveError', {}, { defaultValue: 'Could not save employee.' })
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto)}>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest text-primary',
          )}
        >
          {isNew
            ? t('employeeForm.eyebrowNew', {}, { defaultValue: 'New hire' })
            : t('employeeForm.eyebrowEdit', {}, { defaultValue: 'Edit employee' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {isNew
            ? t('employeeForm.headingNew', {}, { defaultValue: 'Add employee' })
            : t('employeeForm.headingEdit', {}, { defaultValue: 'Update employee' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'employeeForm.subheading',
            {},
            {
              defaultValue:
                'Required fields are first name, last name, and salary. SSN is encrypted at rest and only the last 4 digits are displayed.',
            },
          )}
        </p>
      </header>

      {error ? (
        <p role="alert" className={cm.cn(cm.textSize('sm'), 'text-error font-bold')}>
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className={cm.stack(6)}
        aria-label={t('employeeForm.formAria', {}, { defaultValue: 'Employee form' })}
      >
        <FormSection title={t('nav.identity', {}, { defaultValue: 'Identity' })} icon="badge">
          <FieldText
            label={t('form.firstName', {}, { defaultValue: 'First name' })}
            value={form.first_name}
            onChange={(v) => update('first_name', v)}
            required
            autoComplete="given-name"
            testId="employee-first-name"
          />
          <FieldText
            label={t('form.lastName', {}, { defaultValue: 'Last name' })}
            value={form.last_name}
            onChange={(v) => update('last_name', v)}
            required
            autoComplete="family-name"
            testId="employee-last-name"
          />
          <FieldText
            label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
            type="email"
            value={form.email}
            onChange={(v) => update('email', v)}
            autoComplete="email"
            testId="employee-email"
          />
          <FieldText
            label={t('employeeForm.ssn', {}, { defaultValue: 'SSN' })}
            value={form.ssn}
            onChange={(v) => update('ssn', v)}
            placeholder={
              isNew
                ? t('employeeForm.ssnPlaceholderNew', {}, { defaultValue: '###-##-####' })
                : t(
                    'employeeForm.ssnPlaceholderEdit',
                    {},
                    { defaultValue: 'Leave blank to keep on file' },
                  )
            }
            mono
            testId="employee-ssn"
          />
        </FormSection>

        <FormSection title={t('form.role', {}, { defaultValue: 'Role' })} icon="work">
          <FieldText
            label={t('employeeForm.department', {}, { defaultValue: 'Department' })}
            value={form.department}
            onChange={(v) => update('department', v)}
            testId="employee-department"
          />
          <FieldText
            label={t('form.title', {}, { defaultValue: 'Title' })}
            value={form.title}
            onChange={(v) => update('title', v)}
            testId="employee-title"
          />
          {isNew ? (
            <FieldText
              label={t('form.startDate', {}, { defaultValue: 'Start date' })}
              type="date"
              value={form.start_date}
              onChange={(v) => update('start_date', v)}
              testId="employee-start-date"
            />
          ) : (
            <FieldSelect
              label={t('nav.status', {}, { defaultValue: 'Status' })}
              value={form.status}
              onChange={(v) => update('status', v as EmployeeFormState['status'])}
              testId="employee-status"
              options={[
                { value: 'active', label: t('status.active', {}, { defaultValue: 'Active' }) },
                {
                  value: 'on_leave',
                  label: t('employeeForm.statusOnLeave', {}, { defaultValue: 'On leave' }),
                },
                {
                  value: 'terminated',
                  label: t('employeeForm.statusTerminated', {}, { defaultValue: 'Terminated' }),
                },
              ]}
            />
          )}
        </FormSection>

        <FormSection
          title={t('employeeForm.compensation', {}, { defaultValue: 'Compensation' })}
          icon="payments"
        >
          <FieldText
            label={t('employeeForm.salary', {}, { defaultValue: 'Annual salary (USD)' })}
            type="number"
            value={form.salary}
            onChange={(v) => update('salary', v)}
            mono
            required
            testId="employee-salary"
          />
          <FieldSelect
            label={t('employeeForm.payFrequency', {}, { defaultValue: 'Pay frequency' })}
            value={form.pay_frequency}
            onChange={(v) => update('pay_frequency', v as EmployeeFormState['pay_frequency'])}
            testId="employee-pay-frequency"
            options={[
              { value: 'weekly', label: t('employeeForm.weekly', {}, { defaultValue: 'Weekly' }) },
              {
                value: 'biweekly',
                label: t('employeeForm.biweekly', {}, { defaultValue: 'Biweekly' }),
              },
              {
                value: 'semimonthly',
                label: t('employeeForm.semimonthly', {}, { defaultValue: 'Semi-monthly' }),
              },
              { value: 'monthly', label: t('status.monthly', {}, { defaultValue: 'Monthly' }) },
            ]}
          />
          <FieldSelect
            label={t('employeeForm.taxFilingStatus', {}, { defaultValue: 'Tax filing status' })}
            value={form.tax_filing_status}
            onChange={(v) =>
              update('tax_filing_status', v as EmployeeFormState['tax_filing_status'])
            }
            testId="employee-tax-filing-status"
            options={[
              { value: 'single', label: t('employeeForm.single', {}, { defaultValue: 'Single' }) },
              {
                value: 'married',
                label: t('employeeForm.married', {}, { defaultValue: 'Married' }),
              },
              {
                value: 'head_of_household',
                label: t('employeeForm.headOfHousehold', {}, { defaultValue: 'Head of household' }),
              },
            ]}
          />
        </FormSection>

        <div className={cm.flex({ align: 'center', gap: 'sm', justify: 'end' })}>
          <Link
            to={isNew ? '/employees' : `/employees/${id}`}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.roundedFull,
              'border border-outline-variant hover:bg-surface-container-low',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={saving}
            data-testid="employee-form-submit"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : isNew
                ? t('employeeForm.createCta', {}, { defaultValue: 'Add employee' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
          </button>
        </div>
      </form>
    </div>
  )
}

function FormSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  const cm = getClassMap()
  return (
    <section className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}>
      <header className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
        <span
          className={cm.cn(cm.sp('p', 2), cm.roundedFull, 'bg-primary/10 text-primary')}
          aria-hidden="true"
        >
          <span className={cm.cn(`material-symbols-outlined text-base`)}>{icon}</span>
        </span>
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{title}</h2>
      </header>
      <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>{children}</div>
    </section>
  )
}

function FieldText({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  autoComplete,
  placeholder,
  mono = false,
  testId,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'email' | 'number' | 'date'
  required?: boolean
  autoComplete?: string
  placeholder?: string
  mono?: boolean
  testId?: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        data-testid={testId}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          'rounded-md bg-surface-container-low border border-outline-variant focus:ring-2 focus:ring-primary/30 focus:outline-none',
          mono ? 'tabular-nums font-mono' : '',
        )}
      />
    </label>
  )
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
  testId,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  testId?: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
      <span
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          'rounded-md bg-surface-container-low border border-outline-variant focus:ring-2 focus:ring-primary/30 focus:outline-none',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
