import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EMPTY_PERSON_FORM, PersonForm, type PersonFormValue } from '../components/PersonForm.js'
import type { Person } from '../lib/people.js'
import { unwrapSingle } from '../lib/unwrap.js'

export function AddPerson() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [form, setForm] = useState<PersonFormValue>(EMPTY_PERSON_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onChange = (patch: Partial<PersonFormValue>) => setForm((f) => ({ ...f, ...patch }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await http.post('/api/people', {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || undefined,
        maiden_name: form.maiden_name.trim() || undefined,
        gender: form.gender || undefined,
        birth_date: form.birth_date || undefined,
        birth_place: form.birth_place.trim() || undefined,
        death_date: form.death_date || undefined,
        death_place: form.death_place.trim() || undefined,
        notes: form.notes.trim() || undefined,
      })
      const created = unwrapSingle<Person>(res)
      track({ name: 'person.created', properties: { person_id: created?.id } })
      navigate(created?.id ? `/people/${created.id}` : '/people')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('addPerson.error', {}, { defaultValue: 'Could not save this person.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  // Live dossier preview — mirrors exactly what the record will say.
  const previewName = [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(' ')
  const previewYears = [
    form.birth_date ? form.birth_date.slice(0, 4) : null,
    form.death_date ? form.death_date.slice(0, 4) : null,
  ].filter(Boolean)

  return (
    <div
      className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.sp('p', 6), 'lg:p-8')}
      data-mol-id="page-add-person"
    >
      <Link
        to="/people"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-primary hover:underline mb-3',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
        {t('addPerson.back', {}, { defaultValue: 'All people' })}
      </Link>

      <h1
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          'tracking-tight',
          cm.sp('mb', 1),
        )}
      >
        {t('addPerson.title', {}, { defaultValue: 'Record a New Soul into the Ledger' })}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 6))}>
        {t(
          'addPerson.subtitle',
          {},
          {
            defaultValue:
              'Add anyone to the tree — open their profile afterwards to link parents, partners, or children.',
          },
        )}
      </p>

      <form
        onSubmit={handleSubmit}
        className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
      >
        <PersonForm
          value={form}
          onChange={onChange}
          idPrefix="add-person"
          variant="dossier"
          betweenSections={
            <>
              {/* 3. Kinship & Lineage Placement — handled from the profile */}
              <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                <h2
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'addPerson.section.kinship',
                    {},
                    { defaultValue: '3. Kinship & Lineage Placement' },
                  )}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'addPerson.section.kinshipBody',
                    {},
                    {
                      defaultValue:
                        'Record the person first — then open their profile and use “Add relative” to weave parents, partners, children, or siblings. The link is created in both directions automatically.',
                    },
                  )}
                </p>
              </section>

              {/* 4. Keepsakes, Evidence & Biometric Media — notes today */}
              <section className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                <h2
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    'addPerson.section.keepsakes',
                    {},
                    { defaultValue: '4. Keepsakes, Evidence & Biometric Media' },
                  )}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'addPerson.section.keepsakesBody',
                    {},
                    {
                      defaultValue:
                        'Evidence lives in the archival narrative below for now — note sources, record numbers, and where the original tintypes are kept. The archive deliberately stores no biometric or DNA media.',
                    },
                  )}
                </p>
              </section>
            </>
          }
        />

        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.sp('mt', 4),
              cm.textSize('sm'),
              'bg-error-container text-on-error-container rounded-xl',
            )}
          >
            {error}
          </div>
        )}

        <div className={cm.cn(cm.flex({ justify: 'end', gap: 'md' }), cm.sp('mt', 6))}>
          <Link
            to="/people"
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
            data-mol-id="add-person-submit"
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
              : t('addPerson.submit', {}, { defaultValue: 'Add person' })}
          </button>
        </div>
      </form>

      {/* Live dossier preview + custody note */}
      <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2', cm.sp('mt', 6))}>
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="add-person-preview"
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 3),
            )}
          >
            {t('addPerson.previewTitle', {}, { defaultValue: 'Live Dossier Preview' })}
          </h2>
          <p
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}
            style={{ fontFamily: 'var(--mol-font-tree)' }}
          >
            {previewName ||
              t('addPerson.previewEmptyName', {}, { defaultValue: 'Awaiting a name…' })}
          </p>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant uppercase tracking-wider font-bold tabular-nums',
              cm.sp('mt', 1),
            )}
          >
            {previewYears.length > 0
              ? previewYears.join(' – ')
              : t('addPerson.previewEmptyYears', {}, { defaultValue: 'Dates unknown' })}
          </p>
          {form.birth_place.trim() && (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 2))}>
              {t(
                'addPerson.previewBornPlace',
                { place: form.birth_place.trim() },
                { defaultValue: 'Born — {{place}}' },
              )}
            </p>
          )}
        </section>

        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 3),
            )}
          >
            {t('addPerson.custodyTitle', {}, { defaultValue: 'Custody & Privacy Protocol' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}>
            {t(
              'addPerson.custodyBody',
              {},
              {
                defaultValue:
                  'The record enters your private archive immediately — visible only in your account, never indexed or sold. You can edit or remove it at any time from its profile.',
              },
            )}
          </p>
        </section>
      </div>
    </div>
  )
}

export default AddPerson
