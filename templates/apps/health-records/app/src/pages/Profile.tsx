import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

interface ProfileBundle {
  name: string
  email: string
  twoFactorEnabled: boolean
  profile: {
    pronouns?: string
    dateOfBirth?: string
    bloodType?: string
    height?: string
    weight?: string
    addressLine1?: string
    addressLine2?: string
    primaryCare?: string
    insurer?: string
  }
  emergency_contacts: Array<{
    name: string
    relation?: string
    phone?: string
    email?: string
  }>
  preferences?: Record<string, unknown>
  security?: Record<string, unknown>
}

interface AllergyRow {
  id: string
  allergen?: string
  substance?: string
  severity?: string
  reaction?: string
}

interface ConditionRow {
  id: string
  name: string
  status?: string
  onset_date?: string
}

const SEVERITY_COLOR: Record<string, string> = {
  severe: 'var(--color-clinical-abnormal)',
  life_threatening: 'var(--color-clinical-abnormal)',
  moderate: 'var(--color-clinical-caution)',
  mild: 'var(--color-clinical-normal)',
}

function ageFromDob(dob?: string): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const diff = Date.now() - d.getTime()
  return Math.max(0, Math.floor(diff / (365.25 * 86_400_000)))
}

function fmtDob(dob?: string): string {
  if (!dob) return '—'
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return dob
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const DEMO_KEYS: Array<[keyof ProfileBundle['profile'], string, string]> = [
  ['bloodType', 'profile.bloodType', 'Blood type'],
  ['height', 'profile.height', 'Height'],
  ['weight', 'profile.weight', 'Weight'],
  ['addressLine1', 'profile.address', 'Address'],
  ['primaryCare', 'profile.pcp', 'Primary care'],
  ['insurer', 'profile.insurer', 'Insurance'],
]

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<UserProfile>()
  const [bundle, setBundle] = useState<ProfileBundle | null>(null)
  const [allergies, setAllergies] = useState<AllergyRow[]>([])
  const [conditions, setConditions] = useState<ConditionRow[]>([])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ProfileBundle | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const loadAll = () => {
    Promise.allSettled([
      http.get('/api/profile/me'),
      http.get('/api/allergies'),
      http.get('/api/conditions'),
    ]).then(([p, a, c]) => {
      if (p.status === 'fulfilled') {
        const b = unwrapSingle<ProfileBundle>(p.value)
        if (b) setBundle(b)
      }
      if (a.status === 'fulfilled') setAllergies(unwrapList<AllergyRow>(a.value))
      if (c.status === 'fulfilled') setConditions(unwrapList<ConditionRow>(c.value))
    })
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startEditing = () => {
    if (!bundle) return
    setDraft(JSON.parse(JSON.stringify(bundle)) as ProfileBundle)
    setEditing(true)
    setError(null)
  }

  const cancelEditing = () => {
    setEditing(false)
    setDraft(null)
    setError(null)
  }

  const setDraftProfile = (key: keyof ProfileBundle['profile'], value: string) => {
    setDraft((d) => (d ? { ...d, profile: { ...d.profile, [key]: value } } : d))
  }

  const setDraftName = (value: string) => {
    setDraft((d) => (d ? { ...d, name: value } : d))
  }

  const setDraftEmail = (value: string) => {
    setDraft((d) => (d ? { ...d, email: value } : d))
  }

  const setEmergency = (
    idx: number,
    key: keyof ProfileBundle['emergency_contacts'][number],
    value: string,
  ) => {
    setDraft((d) => {
      if (!d) return d
      const ec = [...d.emergency_contacts]
      const cur = ec[idx] ?? { name: '' }
      ec[idx] = { ...cur, [key]: value }
      return { ...d, emergency_contacts: ec }
    })
  }

  const addEmergency = () => {
    setDraft((d) =>
      d
        ? {
            ...d,
            emergency_contacts: [
              ...d.emergency_contacts,
              { name: '', relation: '', phone: '', email: '' },
            ],
          }
        : d,
    )
  }

  const removeEmergency = (idx: number) => {
    setDraft((d) =>
      d ? { ...d, emergency_contacts: d.emergency_contacts.filter((_, i) => i !== idx) } : d,
    )
  }

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      const cleanedEmergency = draft.emergency_contacts
        .map((e) => ({ ...e, name: e.name?.trim() ?? '' }))
        .filter((e) => e.name.length > 0)
      const payload: Partial<ProfileBundle> & { name?: string } = {
        profile: draft.profile,
        emergency_contacts: cleanedEmergency,
      }
      if (draft.name && draft.name.trim().length > 0) payload.name = draft.name.trim()
      // Email lives on the user record (not the profile bundle), so PATCH it
      // directly on the user resource — mirrors the shared AccountSection.
      const nextEmail = draft.email?.trim() ?? ''
      if (user?.id && nextEmail.length > 0 && nextEmail !== bundle?.email) {
        await http.patch(`/api/users/${user.id}`, { email: nextEmail })
      }
      const res = await http.patch('/api/profile/me', payload)
      const b = unwrapSingle<ProfileBundle>(res)
      if (b) {
        setBundle(b)
        setSavedAt(Date.now())
      }
      setEditing(false)
      setDraft(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('profile.saveError', {}, { defaultValue: 'Could not save profile changes.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  const view = bundle
  const age = useMemo(() => ageFromDob(view?.profile.dateOfBirth), [view?.profile.dateOfBirth])

  if (!view) {
    return (
      <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-profile">
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('p', 8))} data-mol-id="page-profile">
      <div
        className={cm.cn(
          cm.flex({ align: 'start', justify: 'between', wrap: 'wrap', gap: 'md' }),
          cm.sp('mb', 8),
        )}
      >
        <div>
          <p className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-1')}>
            {t('profile.eyebrow', {}, { defaultValue: 'Patient profile' })}
          </p>
          {editing ? (
            <div className={cm.cn('space-y-2 max-w-md')}>
              <input
                type="text"
                value={draft?.name ?? ''}
                onChange={(e) => setDraftName(e.target.value)}
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight bg-surface-container-low border border-outline-variant rounded-lg px-3 py-1 w-full',
                )}
                data-mol-id="profile-name-input"
                aria-label={t('profile.nameLabel', {}, { defaultValue: 'Full name' })}
              />
              <input
                type="email"
                value={draft?.email ?? ''}
                onChange={(e) => setDraftEmail(e.target.value)}
                placeholder="you@example.com"
                className={cm.cn(
                  cm.textSize('sm'),
                  'w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40',
                )}
                data-mol-id="profile-email-input"
                aria-label={t('profile.emailLabel', {}, { defaultValue: 'Email address' })}
              />
            </div>
          ) : (
            <h1
              className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}
              data-mol-id="profile-name"
            >
              {view.name || t('profile.unnamed', {}, { defaultValue: 'Your patient profile' })}
            </h1>
          )}
          {!editing && (
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {view.email}
              {view.profile.pronouns ? ` · ${view.profile.pronouns}` : ''}
              {view.profile.dateOfBirth
                ? ` · ${t(
                    'profile.born',
                    { date: fmtDob(view.profile.dateOfBirth) },
                    { defaultValue: 'Born {{date}}' },
                  )}`
                : ''}
              {age != null
                ? ` · ${t('profile.age', { age }, { defaultValue: '{{age}} y/o' })}`
                : ''}
            </p>
          )}
        </div>
        <div className={cm.cn(cm.flex({ gap: 'sm' }))}>
          {editing ? (
            <>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'px-4 py-2 text-[11px] uppercase tracking-widest rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container disabled:opacity-50',
                )}
                data-mol-id="profile-cancel"
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'px-4 py-2 text-[11px] uppercase tracking-widest rounded-full bg-primary text-on-primary shadow-sm hover:shadow-md disabled:opacity-50',
                )}
                data-mol-id="profile-save"
              >
                {saving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className={cm.cn(
                cm.fontWeight('bold'),
                'px-4 py-2 text-[11px] uppercase tracking-widest rounded-full bg-primary text-on-primary shadow-sm hover:shadow-md',
              )}
              data-mol-id="profile-edit"
            >
              {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className={cm.cn(cm.sp('mb', 4), 'text-error font-bold text-sm')}
          data-mol-id="profile-error"
        >
          {error}
        </p>
      )}
      {savedAt && !editing && (
        <p
          className={cm.cn(
            cm.sp('mb', 4),
            cm.textSize('xs'),
            'text-clinical-normal font-bold uppercase tracking-widest',
          )}
          data-mol-id="profile-saved"
        >
          {t('common.saved', {}, { defaultValue: 'Saved' })}
        </p>
      )}

      {/* Demographics + insurance */}
      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl shadow-sm',
          cm.sp('mb', 6),
        )}
      >
        <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
          {t('profile.demographics', {}, { defaultValue: 'Demographics & insurance' })}
        </h2>
        <dl className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3')}>
          {editing ? (
            <>
              {(
                [
                  ['pronouns', 'profile.pronouns', 'Pronouns', 'they/them'],
                  ['dateOfBirth', 'profile.dobEdit', 'Date of birth (YYYY-MM-DD)', '1990-03-14'],
                  ['bloodType', 'profile.bloodType', 'Blood type', 'O+'],
                  ['height', 'profile.height', 'Height', '5\' 9"'],
                  ['weight', 'profile.weight', 'Weight', '168 lb'],
                  ['addressLine1', 'profile.address', 'Address', '482 Linden Ave, Madison WI'],
                  ['primaryCare', 'profile.pcp', 'Primary care', 'Dr. Anika Patel · Brightcare'],
                  ['insurer', 'profile.insurer', 'Insurance', 'BlueCross WI · PPO · 9241-87'],
                ] as const
              ).map(([key, tk, label, placeholder]) => (
                <div key={key}>
                  <label
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'block uppercase tracking-widest text-on-surface-variant mb-1',
                    )}
                  >
                    {t(tk, {}, { defaultValue: label })}
                  </label>
                  <input
                    type="text"
                    value={(draft?.profile as Record<string, string | undefined>)?.[key] ?? ''}
                    onChange={(e) =>
                      setDraftProfile(key as keyof ProfileBundle['profile'], e.target.value)
                    }
                    placeholder={t(`profile.placeholder.${key}`, {}, { defaultValue: placeholder })}
                    data-mol-id={`profile-input-${key as string}`}
                    className={cm.cn(
                      cm.sp('p', 2),
                      'w-full bg-surface-container-low border border-outline-variant rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40',
                    )}
                  />
                </div>
              ))}
            </>
          ) : (
            DEMO_KEYS.map(([key, tk, label]) => {
              const value = view.profile[key]
              return (
                <div key={key}>
                  <dt
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(tk, {}, { defaultValue: label })}
                  </dt>
                  <dd
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.sp('mt', 1))}
                    data-mol-id={`profile-${key}`}
                  >
                    {value || t('profile.empty', {}, { defaultValue: '—' })}
                  </dd>
                </div>
              )
            })
          )}
        </dl>
      </section>

      {/* Allergies — critical first */}
      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl shadow-sm',
          cm.sp('mb', 6),
        )}
        style={{ borderLeft: '4px solid var(--color-clinical-abnormal)' }}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
          <span
            className="material-symbols-outlined"
            style={{ color: 'var(--color-clinical-abnormal)' }}
          >
            warning
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('profile.allergies', {}, { defaultValue: 'Allergies & sensitivities' })}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'ml-auto text-on-surface-variant uppercase tracking-wider font-bold',
            )}
          >
            {t(
              'profile.onFile',
              { count: allergies.length },
              { defaultValue: '{{count}} on file' },
            )}
          </span>
        </div>
        {allergies.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('profile.noAllergies', {}, { defaultValue: 'No allergies recorded.' })}
          </p>
        ) : (
          <ul
            className={cm.cn('divide-y divide-outline-variant/20')}
            data-mol-id="profile-allergies"
          >
            {allergies.map((a) => (
              <li
                key={a.id}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
                  cm.sp('py', 3),
                )}
              >
                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                    {a.allergen ?? a.substance ?? '—'}
                  </p>
                  {a.reaction && (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {a.reaction}
                    </p>
                  )}
                </div>
                {a.severity && (
                  <span
                    className={cm.cn(
                      'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white',
                    )}
                    style={{
                      backgroundColor:
                        SEVERITY_COLOR[a.severity] ?? 'var(--color-clinical-caution)',
                    }}
                  >
                    {t(`allergies.severity.${a.severity}`, {}, { defaultValue: a.severity })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Active conditions */}
      <section
        className={cm.cn(
          cm.sp('p', 6),
          'bg-surface-container-lowest rounded-2xl shadow-sm',
          cm.sp('mb', 6),
        )}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('profile.conditions', {}, { defaultValue: 'Active conditions' })}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'ml-auto text-on-surface-variant uppercase tracking-wider font-bold',
            )}
          >
            {t(
              'profile.onFile',
              { count: conditions.length },
              { defaultValue: '{{count}} on file' },
            )}
          </span>
        </div>
        {conditions.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('profile.noConditions', {}, { defaultValue: 'No conditions recorded.' })}
          </p>
        ) : (
          <ul
            className={cm.cn('divide-y divide-outline-variant/20')}
            data-mol-id="profile-conditions"
          >
            {conditions.map((c) => (
              <li
                key={c.id}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'sm' }),
                  cm.sp('py', 3),
                )}
              >
                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{c.name}</p>
                  {c.onset_date && (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {t(
                        'profile.onset',
                        { year: new Date(c.onset_date).getFullYear() },
                        { defaultValue: 'Onset {{year}}' },
                      )}
                    </p>
                  )}
                </div>
                {c.status && (
                  <span
                    className={cm.cn(
                      'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-success-container text-on-success-container',
                    )}
                  >
                    {t(`conditions.status.${c.status}`, {}, { defaultValue: c.status })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Emergency contacts */}
      <section
        className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 4))}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
            {t('profile.emergency', {}, { defaultValue: 'Emergency contacts' })}
          </h2>
          {editing && (
            <button
              type="button"
              onClick={addEmergency}
              className={cm.cn(
                cm.fontWeight('bold'),
                'ml-auto px-3 py-1 text-[10px] uppercase tracking-widest rounded-full bg-primary text-on-primary',
              )}
              data-mol-id="profile-add-emergency"
            >
              {t('profile.addEmergency', {}, { defaultValue: '+ Add' })}
            </button>
          )}
        </div>
        {editing ? (
          <ul className={cm.cn('space-y-3')}>
            {(draft?.emergency_contacts ?? []).map((contact, idx) => (
              <li
                key={idx}
                className={cm.cn(cm.sp('p', 3), 'rounded-lg border border-outline-variant/40')}
              >
                <div className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 sm:grid-cols-2')}>
                  <input
                    type="text"
                    placeholder={t('profile.ecName', {}, { defaultValue: 'Full name *' })}
                    value={contact.name ?? ''}
                    onChange={(e) => setEmergency(idx, 'name', e.target.value)}
                    className={cm.cn(
                      cm.sp('p', 2),
                      'bg-surface-container-low border border-outline-variant rounded-md text-sm',
                    )}
                    data-mol-id={`emergency-name-${idx}`}
                  />
                  <input
                    type="text"
                    placeholder={t('profile.ecRelation', {}, { defaultValue: 'Relation' })}
                    value={contact.relation ?? ''}
                    onChange={(e) => setEmergency(idx, 'relation', e.target.value)}
                    className={cm.cn(
                      cm.sp('p', 2),
                      'bg-surface-container-low border border-outline-variant rounded-md text-sm',
                    )}
                  />
                  <input
                    type="tel"
                    placeholder={t('profile.ecPhone', {}, { defaultValue: 'Phone' })}
                    value={contact.phone ?? ''}
                    onChange={(e) => setEmergency(idx, 'phone', e.target.value)}
                    className={cm.cn(
                      cm.sp('p', 2),
                      'bg-surface-container-low border border-outline-variant rounded-md text-sm',
                    )}
                  />
                  <input
                    type="email"
                    placeholder={t('profile.ecEmail', {}, { defaultValue: 'Email' })}
                    value={contact.email ?? ''}
                    onChange={(e) => setEmergency(idx, 'email', e.target.value)}
                    className={cm.cn(
                      cm.sp('p', 2),
                      'bg-surface-container-low border border-outline-variant rounded-md text-sm',
                    )}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeEmergency(idx)}
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'mt-2 text-error uppercase tracking-widest hover:underline',
                  )}
                  data-mol-id={`emergency-remove-${idx}`}
                >
                  {t('common.remove', {}, { defaultValue: 'Remove' })}
                </button>
              </li>
            ))}
            {(draft?.emergency_contacts.length ?? 0) === 0 && (
              <li className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'profile.noEmergency',
                  {},
                  { defaultValue: 'No emergency contacts yet — add one above.' },
                )}
              </li>
            )}
          </ul>
        ) : view.emergency_contacts.length === 0 ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'profile.noEmergency',
              {},
              { defaultValue: 'No emergency contacts on file. Click "Edit profile" to add one.' },
            )}
          </p>
        ) : (
          <ul
            className={cm.cn('divide-y divide-outline-variant/20')}
            data-mol-id="profile-emergency-contacts"
          >
            {view.emergency_contacts.map((e, idx) => (
              <li
                key={idx}
                className={cm.cn(
                  cm.flex({ align: 'start', justify: 'between', wrap: 'wrap', gap: 'md' }),
                  cm.sp('py', 3),
                )}
              >
                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{e.name}</p>
                  {e.relation && (
                    <p
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'text-on-surface-variant uppercase tracking-wider',
                      )}
                    >
                      {e.relation}
                    </p>
                  )}
                </div>
                <div className={cm.textRight}>
                  {e.phone && (
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'tabular-nums',
                        cm.fontWeight('semibold'),
                      )}
                      style={{ fontFamily: 'var(--mol-font-mono)' }}
                    >
                      {e.phone}
                    </p>
                  )}
                  {e.email && (
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{e.email}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>
        <Link
          to="/settings"
          className={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'text-primary hover:underline',
          )}
        >
          {t('profile.editLink', {}, { defaultValue: 'Notification preferences and security →' })}
        </Link>
      </div>
    </div>
  )
}
