import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EMPTY_PERSON_FORM, PersonForm, type PersonFormValue } from '../components/PersonForm.js'
import type { Person } from '../lib/people.js'
import { unwrapSingle } from '../lib/unwrap.js'

export function EditPerson() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [form, setForm] = useState<PersonFormValue>(EMPTY_PERSON_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/people/${id}`)
      .then((res) => {
        if (cancelled) return
        const payload = unwrapSingle<Person>(res)
        if (!payload) {
          setError(t('personDetail.notFound', {}, { defaultValue: 'Person not found.' }))
        } else {
          setForm({
            first_name: payload.first_name ?? '',
            last_name: payload.last_name ?? '',
            maiden_name: payload.maiden_name ?? '',
            gender: payload.gender ?? '',
            birth_date: payload.birth_date ?? '',
            birth_place: payload.birth_place ?? '',
            death_date: payload.death_date ?? '',
            death_place: payload.death_place ?? '',
            notes: payload.notes ?? '',
          })
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const onChange = (patch: Partial<PersonFormValue>) => setForm((f) => ({ ...f, ...patch }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      await http.put(`/api/people/${id}`, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        maiden_name: form.maiden_name.trim() || null,
        gender: form.gender || null,
        birth_date: form.birth_date || null,
        birth_place: form.birth_place.trim() || null,
        death_date: form.death_date || null,
        death_place: form.death_place.trim() || null,
        notes: form.notes.trim() || null,
      })
      navigate(`/people/${id}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('editPerson.error', {}, { defaultValue: 'Could not save changes.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.sp('p', 8))}
        data-mol-id="page-edit-person"
      >
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  return (
    <div
      className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.sp('p', 6), 'lg:p-8')}
      data-mol-id="page-edit-person"
    >
      <Link
        to={id ? `/people/${id}` : '/people'}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-primary hover:underline mb-3',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
        {t('editPerson.back', {}, { defaultValue: 'Back to profile' })}
      </Link>

      <h1
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          'tracking-tight',
          cm.sp('mb', 1),
        )}
      >
        {t('editPerson.title', { name: form.first_name }, { defaultValue: 'Edit {{name}}' })}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 6))}>
        {t(
          'editPerson.subtitle',
          {},
          {
            defaultValue:
              'Dates, places, and research notes. Relationships are managed from the profile.',
          },
        )}
      </p>

      {error && (
        <div
          role="alert"
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 3),
            cm.sp('mb', 4),
            cm.textSize('sm'),
            'bg-error-container text-on-error-container rounded-xl',
          )}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
      >
        <PersonForm value={form} onChange={onChange} idPrefix="edit-person" />

        <div className={cm.cn(cm.flex({ justify: 'end', gap: 'md' }), cm.sp('mt', 6))}>
          <Link
            to={id ? `/people/${id}` : '/people'}
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'rounded-xl border border-outline-variant/50 hover:bg-surface-container transition-colors',
            )}
          >
            {t('common.cancel', {}, { defaultValue: 'Cancel' })}
          </Link>
          <button
            type="submit"
            disabled={saving || !form.first_name.trim()}
            data-mol-id="edit-person-submit"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              'text-white rounded-xl hover:shadow-lg active:scale-95 transition-all disabled:opacity-60',
            )}
            style={{ background: 'linear-gradient(135deg, #15803d, #65a30d)' }}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('editPerson.submit', {}, { defaultValue: 'Save changes' })}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditPerson
