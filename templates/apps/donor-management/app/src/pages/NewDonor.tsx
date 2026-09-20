import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

const TAGS = ['monthly-donor', 'major-donor', 'volunteer', 'board-member', 'lapsed', 'new'] as const

export function NewDonor() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    is_organization: false,
  })
  const [tags, setTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError(t('donors.new.nameRequired', {}, { defaultValue: 'Name is required.' }))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await http.post('/api/donors', {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        is_organization: form.is_organization,
        tags,
      })
      const created = unwrapSingle<{ id?: string }>(res)
      navigate(created?.id ? `/donors/${created.id}` : '/donors')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('donors.new.error', {}, { defaultValue: 'Failed to add donor.' }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    'border border-outline-variant rounded-md w-full',
  )

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('2xl'), cm.mxAuto)}>
      <nav className={cm.sp('mb', 4)}>
        <Link to="/donors" className={cm.cn(cm.textSize('sm'), 'text-primary hover:underline')}>
          ← {t('donors.backToList', {}, { defaultValue: 'Back to donors' })}
        </Link>
      </nav>
      <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
        {t('donors.new.heading', {}, { defaultValue: 'New donor' })}
      </h1>

      <form onSubmit={submit} className={cm.cn(cm.card(), cm.sp('p', 6), cm.stack(4))}>
        <label className={cm.stack(1)}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('donors.new.name', {}, { defaultValue: 'Name' })}
          </span>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t(
              'donors.new.namePlaceholder',
              {},
              { defaultValue: 'Margaret Osei or Riverside Family Fund' },
            )}
            className={inputCls}
          />
        </label>
        <div className={cm.grid({ cols: 2, gap: 'md' })}>
          <label className={cm.stack(1)}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('donors.new.email', {}, { defaultValue: 'Email' })}
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className={cm.stack(1)}>
            <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
              {t('donors.new.phone', {}, { defaultValue: 'Phone' })}
            </span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputCls}
            />
          </label>
        </div>
        <label className={cm.stack(1)}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('form.address', {}, { defaultValue: 'Mailing address' })}
          </span>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder={t(
              'donors.new.addressPlaceholder',
              {},
              { defaultValue: '4120 Holly Lane, Seattle, WA 98103' },
            )}
            className={inputCls}
          />
        </label>

        <fieldset className={cm.stack(2)}>
          <legend className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
            {t('donors.new.tags', {}, { defaultValue: 'Tags' })}
          </legend>
          <div className={cm.flex({ gap: 'sm', wrap: 'wrap' })}>
            {TAGS.map((tg) => {
              const checked = tags.includes(tg)
              return (
                <label
                  key={tg}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.textSize('sm'),
                    'rounded-full border border-outline-variant cursor-pointer',
                    checked && 'bg-primary-container text-on-primary-container border-transparent',
                  )}
                >
                  <input
                    type="checkbox"
                    className={'sr-only'}
                    checked={checked}
                    onChange={() =>
                      setTags((prev) =>
                        prev.includes(tg) ? prev.filter((x) => x !== tg) : [...prev, tg],
                      )
                    }
                  />
                  {t(`donors.tag.${tg}`, {}, { defaultValue: tg.replace(/-/g, ' ') })}
                </label>
              )
            })}
          </div>
        </fieldset>

        <label className={cm.flex({ align: 'center', gap: 'sm' })}>
          <input
            type="checkbox"
            checked={form.is_organization}
            onChange={(e) => setForm({ ...form, is_organization: e.target.checked })}
          />
          <span className={cm.textSize('sm')}>
            {t(
              'donors.new.isOrganization',
              {},
              { defaultValue: 'This donor is an organization or foundation' },
            )}
          </span>
        </label>

        {error ? (
          <p className={'text-error text-sm'} role="alert">
            {error}
          </p>
        ) : null}

        <div className={cm.flex({ gap: 'sm', justify: 'end' })}>
          <Link
            to="/donors"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'border border-outline-variant rounded-md',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'bg-primary text-on-primary rounded-md disabled:opacity-50',
            )}
          >
            {submitting
              ? t('common.addingEllipsis', {}, { defaultValue: 'Adding…' })
              : t('donors.new.submit', {}, { defaultValue: 'Add donor' })}
          </button>
        </div>
      </form>
    </div>
  )
}
