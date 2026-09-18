import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

const STAGE_DEFAULTS = [
  { key: 'sourced', defaultLabel: 'Sourced' },
  { key: 'screening', defaultLabel: 'Screening' },
  { key: 'interview', defaultLabel: 'Interview' },
  { key: 'offer', defaultLabel: 'Offer' },
  { key: 'hired', defaultLabel: 'Hired' },
] as const

interface TeamMember {
  id: string
  name: string
  email?: string
  role: string
}

export function NewJob() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('Engineering')
  const [location, setLocation] = useState('Remote (US)')
  const [employmentType, setEmploymentType] = useState('full_time')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [aiScreening, setAiScreening] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [team, setTeam] = useState<TeamMember[] | null>(null)
  const [teamError, setTeamError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/settings/team')
      .then((res) => {
        if (!cancelled) setTeam(unwrapList<TeamMember>(res))
      })
      .catch(() => {
        if (!cancelled)
          setTeamError(t('newJob.teamError', {}, { defaultValue: 'Could not load hiring team.' }))
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError(t('newJob.titleRequired', {}, { defaultValue: 'Job title is required.' }))
      return
    }
    setSaving(true)
    setError(null)
    try {
      await http.post('/api/jobs', {
        title,
        department,
        location,
        employment_type: employmentType,
        description,
        requirements: requirements
          .split('\n')
          .map((r) => r.trim())
          .filter(Boolean),
        salary_min: salaryMin ? Number(salaryMin) : null,
        salary_max: salaryMax ? Number(salaryMax) : null,
        ai_screening: aiScreening,
      })
      navigate('/jobs')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('newJob.failed', {}, { defaultValue: 'Could not save job.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-mol-id="page-new-job"
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.stack(8), 'pb-24')}
    >
      <header className={cm.flex({ align: 'end', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <Link
            to="/jobs"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'text-primary hover:text-primary-container transition-colors',
            )}
          >
            ← {t('newJob.back', {}, { defaultValue: 'Back to jobs' })}
          </Link>
          <p
            className={cm.cn('mt-2 text-[10px] font-black uppercase tracking-widest text-primary')}
          >
            {t('newJob.eyebrow', {}, { defaultValue: 'New role' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('4xl'),
              'font-extrabold tracking-tight text-on-surface',
            )}
          >
            {t('newJob.heading', {}, { defaultValue: 'Post a job' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'newJob.subheading',
              {},
              {
                defaultValue: 'Set the basics, configure the pipeline, and publish to your boards.',
              },
            )}
          </p>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          aria-live="assertive"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.textSize('sm'),
            'rounded-xl bg-error/10 text-error font-semibold',
          )}
        >
          {error}
        </div>
      ) : null}

      <div className={cm.cn('grid gap-6 lg:grid-cols-12')}>
        <div className={cm.cn('lg:col-span-8', cm.stack(6))}>
          <Section title={t('newJob.basicsHeading', {}, { defaultValue: 'Role basics' })}>
            <Field
              id="title"
              label={t('newJob.titleLabel', {}, { defaultValue: 'Job title' })}
              placeholder="Senior Backend Engineer"
              value={title}
              onChange={setTitle}
              required
            />
            <div className={cm.grid({ cols: 2, gap: 'md' })}>
              <Field
                id="department"
                label={t('newJob.departmentLabel', {}, { defaultValue: 'Department' })}
                value={department}
                onChange={setDepartment}
              />
              <Field
                id="location"
                label={t('form.location', {}, { defaultValue: 'Location' })}
                value={location}
                onChange={setLocation}
              />
            </div>
            <SelectField
              id="employmentType"
              label={t('newJob.typeLabel', {}, { defaultValue: 'Employment type' })}
              value={employmentType}
              onChange={setEmploymentType}
              options={[
                {
                  value: 'full_time',
                  label: t('newJob.type.fullTime', {}, { defaultValue: 'Full-time' }),
                },
                {
                  value: 'part_time',
                  label: t('newJob.type.partTime', {}, { defaultValue: 'Part-time' }),
                },
                {
                  value: 'contract',
                  label: t('newJob.type.contract', {}, { defaultValue: 'Contract' }),
                },
              ]}
            />
          </Section>

          <Section
            title={t('newJob.descHeading', {}, { defaultValue: 'Description & requirements' })}
          >
            <TextArea
              id="description"
              label={t('newJob.descLabel', {}, { defaultValue: 'Role description' })}
              placeholder={t(
                'newJob.descPlaceholder',
                {},
                { defaultValue: 'Describe the role, ideal candidate, and impact…' },
              )}
              value={description}
              onChange={setDescription}
              rows={6}
            />
            <TextArea
              id="requirements"
              label={t('newJob.reqLabel', {}, { defaultValue: 'Requirements (one per line)' })}
              placeholder={'6+ years of backend experience\nStrong TypeScript / Node\n…'}
              value={requirements}
              onChange={setRequirements}
              rows={4}
            />
          </Section>

          <Section title={t('newJob.compHeading', {}, { defaultValue: 'Compensation' })}>
            <div className={cm.grid({ cols: 2, gap: 'md' })}>
              <Field
                id="salaryMin"
                type="number"
                label={t('newJob.salaryMin', {}, { defaultValue: 'Salary min (USD)' })}
                placeholder="160000"
                value={salaryMin}
                onChange={setSalaryMin}
              />
              <Field
                id="salaryMax"
                type="number"
                label={t('newJob.salaryMax', {}, { defaultValue: 'Salary max (USD)' })}
                placeholder="220000"
                value={salaryMax}
                onChange={setSalaryMax}
              />
            </div>
          </Section>
        </div>

        <aside className={cm.cn('lg:col-span-4', cm.stack(6))}>
          <Section title={t('newJob.stagesHeading', {}, { defaultValue: 'Pipeline stages' })}>
            <ul className={cm.stack(2)}>
              {STAGE_DEFAULTS.map((s, i) => (
                <li
                  key={s.key}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    'rounded-xl bg-surface-container-low text-sm font-semibold text-on-surface',
                  )}
                >
                  <span>
                    <span className={cm.cn('text-on-surface-variant tabular-nums mr-2')}>
                      {i + 1}.
                    </span>
                    {t(`pipeline.stage.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title={t('newJob.teamHeading', {}, { defaultValue: 'Hiring team' })}>
            {teamError ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{teamError}</p>
            ) : team === null ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t('newJob.teamLoading', {}, { defaultValue: 'Loading hiring team…' })}
              </p>
            ) : team.length === 0 ? (
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'newJob.teamEmpty',
                  {},
                  { defaultValue: 'Invite teammates from Settings → Team.' },
                )}
              </p>
            ) : (
              <ul className={cm.stack(2)}>
                {team.map((m) => (
                  <li key={m.id} className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className={cm.cn(
                        'h-9 w-9 grid place-items-center rounded-full bg-primary/10 text-primary font-bold',
                      )}
                    >
                      {(m.name || ' ').charAt(0).toUpperCase()}
                    </span>
                    <div className={cm.cn('min-w-0 flex-1')}>
                      <p className={cm.cn('text-sm font-semibold text-on-surface')}>{m.name}</p>
                      <p className={cm.cn('text-xs text-on-surface-variant')}>{m.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t('newJob.aiHeading', {}, { defaultValue: 'AI screening' })}>
            <label
              className={cm.cn(
                'flex items-center justify-between gap-3 p-4 rounded-xl bg-surface-container-low cursor-pointer',
              )}
            >
              <div>
                <p className={cm.cn('text-sm font-semibold text-on-surface')}>
                  {t('newJob.aiToggle', {}, { defaultValue: 'Auto-score new applicants' })}
                </p>
                <p className={cm.cn('text-xs text-on-surface-variant')}>
                  {t(
                    'newJob.aiHelp',
                    {},
                    {
                      defaultValue:
                        'Resumes ranked against requirements; recruiter reviews top matches first.',
                    },
                  )}
                </p>
              </div>
              <input
                type="checkbox"
                checked={aiScreening}
                onChange={(e) => setAiScreening(e.target.checked)}
                className={cm.cn('rounded accent-primary')}
              />
            </label>
          </Section>
        </aside>
      </div>

      {/* Sticky save bar */}
      <div
        className={cm.cn(
          'fixed bottom-0 inset-x-0 lg:left-60 z-40 border-t border-outline-variant/30 bg-surface/90 backdrop-blur-md px-8 py-4 flex items-center justify-end gap-3',
        )}
      >
        <Link
          to="/jobs"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors',
          )}
        >
          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
        </Link>
        <button
          type="submit"
          data-mol-id="newjob-submit"
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
            : t('newJob.publish', {}, { defaultValue: 'Publish job' })}
        </button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <section
      className={cm.cn(
        cm.sp('p', 6),
        'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
      )}
    >
      <h2
        className={cm.cn(
          cm.sp('mb', 4),
          cm.textSize('sm'),
          'font-black uppercase tracking-widest text-on-surface',
        )}
      >
        {title}
      </h2>
      <div className={cm.stack(4)}>{children}</div>
    </section>
  )
}

interface FieldProps {
  id: string
  type?: string
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}

function Field({ id, type = 'text', label, placeholder, value, onChange, required }: FieldProps) {
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
      <input
        id={id}
        data-mol-id={`newjob-${id}`}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all',
        )}
      />
    </div>
  )
}

function TextArea({
  id,
  label,
  placeholder,
  value,
  onChange,
  rows,
}: {
  id: string
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  rows?: number
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
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows ?? 4}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y',
        )}
      />
    </div>
  )
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
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
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default NewJob
