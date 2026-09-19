import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { EMPTY_PERSON_FORM, PersonForm, type PersonFormValue } from '../components/PersonForm.js'
import { displayName, type Person, type RelativeRelation } from '../lib/people.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface RelationOption {
  key: RelativeRelation
  icon: string
  label: string
  help: string
}

const RELATIONS: RelationOption[] = [
  {
    key: 'parent',
    icon: 'family_restroom',
    label: 'Parent',
    help: 'The new person is a parent of {{name}} — {{name}} appears as their child automatically.',
  },
  {
    key: 'partner',
    icon: 'favorite',
    label: 'Partner',
    help: 'The new person is a partner (spouse) of {{name}} — one link, shown on both profiles.',
  },
  {
    key: 'child',
    icon: 'child_care',
    label: 'Child',
    help: 'The new person is a child of {{name}} — {{name}} appears as their parent automatically.',
  },
  {
    key: 'sibling',
    icon: 'group',
    label: 'Sibling',
    help: 'The new person shares {{name}}’s parents — half-siblings included when parents overlap.',
  },
]

export function AddRelative() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [anchor, setAnchor] = useState<Person | null>(null)
  const [relation, setRelation] = useState<RelativeRelation>('parent')
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
          setAnchor(payload)
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
    if (!anchor) return
    setSaving(true)
    setError(null)
    try {
      await http.post('/api/people', {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || undefined,
        maiden_name: form.maiden_name.trim() || undefined,
        gender: form.gender || undefined,
        birth_date: form.birth_date || undefined,
        birth_place: form.birth_place.trim() || undefined,
        death_date: form.death_date || undefined,
        death_place: form.death_place.trim() || undefined,
        notes: form.notes.trim() || undefined,
        relative: { personId: anchor.id, relation },
      })
      navigate(`/people/${anchor.id}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('addRelative.error', {}, { defaultValue: 'Could not add this relative.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div
        className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.sp('p', 8))}
        data-mol-id="page-add-relative"
      >
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  if (error && !anchor) {
    return (
      <div
        className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.sp('p', 8))}
        data-mol-id="page-add-relative"
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
          {t('personDetail.back', {}, { defaultValue: 'All people' })}
        </Link>
        <p className={cm.cn(cm.sp('py', 8), 'text-error font-bold')}>{error}</p>
      </div>
    )
  }

  const anchorName = anchor ? displayName(anchor) : ''

  return (
    <div
      className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.sp('p', 6), 'lg:p-8')}
      data-mol-id="page-add-relative"
    >
      <Link
        to={anchor ? `/people/${anchor.id}` : '/people'}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-primary hover:underline mb-3',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
        {t('addRelative.back', { name: anchorName }, { defaultValue: 'Back to {{name}}' })}
      </Link>

      <h1
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          'tracking-tight',
          cm.sp('mb', 1),
        )}
      >
        {t(
          'addRelative.title',
          { name: anchorName },
          { defaultValue: 'Add a relative of {{name}}' },
        )}
      </h1>
      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mb', 6))}>
        {t(
          'addRelative.subtitle',
          {},
          {
            defaultValue:
              'Pick the relationship first — the link is created in both directions automatically.',
          },
        )}
      </p>

      <form onSubmit={handleSubmit} className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
        {/* Relation picker */}
        <fieldset
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="relation-picker"
        >
          <legend
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 4),
            )}
          >
            {t('addRelative.relationLegend', {}, { defaultValue: 'Relationship' })}
          </legend>
          <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 sm:grid-cols-2')}>
            {RELATIONS.map((r) => {
              const active = relation === r.key
              return (
                <label
                  key={r.key}
                  className={cm.cn(
                    cm.flex({ align: 'start', gap: 'sm' }),
                    cm.sp('p', 4),
                    'rounded-xl border cursor-pointer transition-all',
                    active
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-outline-variant/40 hover:bg-surface-container',
                  )}
                >
                  <input
                    type="radio"
                    name="relation"
                    value={r.key}
                    checked={active}
                    onChange={() => setRelation(r.key)}
                    className={cm.cn(cm.sp('mt', 1))}
                    data-mol-id={`relation-${r.key}`}
                  />
                  <span>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.fontWeight('semibold'),
                      )}
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">
                        {r.icon}
                      </span>
                      {t(`addRelative.relation.${r.key}.label`, {}, { defaultValue: r.label })}
                    </span>
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant block')}>
                      {t(
                        `addRelative.relation.${r.key}.help`,
                        { name: anchorName },
                        { defaultValue: r.help },
                      )}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {/* Person fields */}
        <div className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 4),
            )}
          >
            {t('addRelative.personLegend', {}, { defaultValue: 'About the new person' })}
          </h2>
          <PersonForm value={form} onChange={onChange} idPrefix="add-relative" />

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
              to={anchor ? `/people/${anchor.id}` : '/people'}
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
              data-mol-id="add-relative-submit"
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
                : t('addRelative.submit', {}, { defaultValue: 'Add relative' })}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default AddRelative
