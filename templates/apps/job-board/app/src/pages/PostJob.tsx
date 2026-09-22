import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface PostJobForm {
  title: string
  description: string
  location: string
  salary_min: string
  salary_max: string
  type: string
  tags: string
}

interface CompanyOption {
  id: string
  name: string
}

const initial: PostJobForm = {
  title: '',
  description: '',
  location: '',
  salary_min: '',
  salary_max: '',
  type: 'full_time',
  tags: '',
}

export function PostJob() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [form, setForm] = useState<PostJobForm>(initial)
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [companyId, setCompanyId] = useState('')
  // When a user has no company (or chooses to add a new one), they enter
  // a free-text company name and we POST /api/companies behind the scenes
  // before posting the job.
  const [newCompanyName, setNewCompanyName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/companies?mine=true')
      .then((res) => {
        if (cancelled) return
        const list = unwrapList<CompanyOption>(res)
        setCompanies(list)
        if (list.length > 0) {
          setCompanyId(list[0].id)
        }
      })
      .catch(() => {
        if (!cancelled) setCompanies([])
      })
    return () => {
      cancelled = true
    }
  }, [http])

  function update<K extends keyof PostJobForm>(key: K, value: PostJobForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.title.trim()) {
      setError(t('postJob.titleRequired', {}, { defaultValue: 'Job title is required.' }))
      return
    }
    const usingNewCompany = !companyId || companyId === '__new__'
    if (usingNewCompany && !newCompanyName.trim()) {
      setError(t('postJob.companyNameRequired', {}, { defaultValue: 'Company name is required.' }))
      return
    }
    if (!form.description.trim()) {
      setError(
        t(
          'postJob.descriptionRequired',
          {},
          { defaultValue: 'A description helps candidates self-select.' },
        ),
      )
      return
    }
    setSubmitting(true)
    try {
      let resolvedCompanyId = companyId && companyId !== '__new__' ? companyId : ''
      if (usingNewCompany) {
        const created = await http.post('/api/companies', {
          name: newCompanyName.trim(),
          description: '',
        })
        const newCompany = unwrapSingle<CompanyOption>(created.data)
        if (!newCompany?.id) {
          setError(
            t(
              'postJob.companyCreateFailed',
              {},
              { defaultValue: 'Could not create company — try again.' },
            ),
          )
          setSubmitting(false)
          return
        }
        resolvedCompanyId = newCompany.id
        setCompanies((cs) => [...cs, newCompany])
        setCompanyId(newCompany.id)
        setNewCompanyName('')
        track({ name: 'company.created', properties: { company_id: newCompany.id } })
      }
      const created = await http.post('/api/jobs', {
        title: form.title.trim(),
        company_id: resolvedCompanyId,
        description: form.description.trim(),
        location: form.location.trim() || null,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        type: form.type,
        tags: form.tags
          ? form.tags
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      })
      // Jobs are created as drafts server-side; publish immediately so the
      // "Publish role" CTA delivers what it says and the role shows up on
      // the public board + dashboard.
      const createdJob = unwrapSingle<{ id?: string }>(created.data)
      if (createdJob?.id) {
        await http.post(`/api/jobs/${createdJob.id}/publish`, {})
        track({
          name: 'job.posted',
          properties: { job_id: createdJob.id, company_id: resolvedCompanyId, type: form.type },
        })
      }
      navigate('/dashboard')
    } catch (_error) {
      setError(t('postJob.submitError', {}, { defaultValue: 'Failed to publish — try again.' }))
    } finally {
      setSubmitting(false)
    }
  }

  const showAddCompanyInline = companies.length === 0 || companyId === '__new__'

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
          {t('postJob.eyebrow', {}, { defaultValue: 'Post a role' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            cm.textSize('4xl'),
            'font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('postJob.heading', {}, { defaultValue: 'Bring the right candidates to your team.' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.fontWeight('medium'), 'text-on-surface-variant')}>
          {t(
            'postJob.subheading',
            {},
            {
              defaultValue:
                'Publish a role to the public board. You can edit it any time from the dashboard.',
            },
          )}
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-error/10 text-error font-semibold')}
        >
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className={cm.cn(
          cm.sp('p', 8),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <div className={cm.stack(6)}>
          <Field
            id="title"
            label={t('postJob.title', {}, { defaultValue: 'Job title' })}
            placeholder={t(
              'postJob.titlePlaceholder',
              {},
              { defaultValue: 'e.g. Senior Backend Engineer' },
            )}
            value={form.title}
            onChange={(v) => update('title', v)}
          />

          {companies.length > 0 ? (
            <div className={cm.cn('flex flex-col gap-2')}>
              <label
                htmlFor="company"
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.company', {}, { defaultValue: 'Company' })}
              </label>
              <select
                id="company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className={cm.cn(
                  'rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm font-medium text-on-surface outline-none focus:border-primary',
                )}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__new__">
                  {t('postJob.addNewCompany', {}, { defaultValue: '+ Add a new company' })}
                </option>
              </select>
            </div>
          ) : null}

          {showAddCompanyInline ? (
            <Field
              id="company_name"
              label={
                companies.length === 0
                  ? t('postJob.companyNameLabel', {}, { defaultValue: "Your company's name" })
                  : t('postJob.newCompanyName', {}, { defaultValue: 'New company name' })
              }
              placeholder={t(
                'postJob.companyNamePlaceholder',
                {},
                { defaultValue: 'e.g. Acuity Talent' },
              )}
              value={newCompanyName}
              onChange={setNewCompanyName}
            />
          ) : null}

          <div className={cm.cn('flex flex-col gap-2')}>
            <label
              htmlFor="description"
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('postJob.descriptionLabel', {}, { defaultValue: 'Job description' })}
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={8}
              placeholder={t(
                'postJob.descriptionPlaceholder',
                {},
                {
                  defaultValue:
                    'What will the candidate do? Who will they work with? Why this team, why now?',
                },
              )}
              className={cm.cn(
                'rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm font-medium text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
              )}
            />
          </div>

          <Field
            id="location"
            label={t('form.location', {}, { defaultValue: 'Location' })}
            placeholder={t(
              'postJob.locationPlaceholder',
              {},
              { defaultValue: 'San Francisco, CA — leave blank for remote' },
            )}
            value={form.location}
            onChange={(v) => update('location', v)}
          />

          <div className={cm.cn('grid gap-4 md:grid-cols-3')}>
            <Field
              id="salary_min"
              type="number"
              label={t('postJob.salaryMin', {}, { defaultValue: 'Min salary' })}
              placeholder="80000"
              value={form.salary_min}
              onChange={(v) => update('salary_min', v)}
            />
            <Field
              id="salary_max"
              type="number"
              label={t('postJob.salaryMax', {}, { defaultValue: 'Max salary' })}
              placeholder="120000"
              value={form.salary_max}
              onChange={(v) => update('salary_max', v)}
            />
            <div className={cm.cn('flex flex-col gap-2')}>
              <label
                htmlFor="type"
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.type', {}, { defaultValue: 'Type' })}
              </label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className={cm.cn(
                  'rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm font-medium text-on-surface outline-none focus:border-primary',
                )}
              >
                <option value="full_time">
                  {t('postJob.fullTime', {}, { defaultValue: 'Full-time' })}
                </option>
                <option value="part_time">
                  {t('postJob.partTime', {}, { defaultValue: 'Part-time' })}
                </option>
                <option value="contract">
                  {t('postJob.contract', {}, { defaultValue: 'Contract' })}
                </option>
                <option value="internship">
                  {t('postJob.internship', {}, { defaultValue: 'Internship' })}
                </option>
              </select>
            </div>
          </div>

          <Field
            id="tags"
            label={t('postJob.tagsLabel', {}, { defaultValue: 'Tags (comma separated)' })}
            placeholder="React, TypeScript, Postgres"
            value={form.tags}
            onChange={(v) => update('tags', v)}
          />

          <button
            type="submit"
            disabled={submitting}
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'self-start rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
            )}
          >
            {submitting
              ? t('common.publishingEllipsis', {}, { defaultValue: 'Publishing…' })
              : t('postJob.publish', {}, { defaultValue: 'Publish role' })}
          </button>
        </div>
      </form>
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  type?: string
}

function Field({ id, label, placeholder, value, onChange, type = 'text' }: FieldProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn('flex flex-col gap-2')}>
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
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cm.cn(
          'rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-sm font-medium text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
        )}
      />
    </div>
  )
}
