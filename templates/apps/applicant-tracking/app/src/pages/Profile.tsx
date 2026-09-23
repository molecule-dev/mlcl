import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const FOCUS_AREAS = [
  { key: 'engineering', defaultLabel: 'Engineering' },
  { key: 'design', defaultLabel: 'Design' },
  { key: 'product', defaultLabel: 'Product' },
  { key: 'data', defaultLabel: 'Data' },
  { key: 'gtm', defaultLabel: 'GTM / Sales' },
  { key: 'people', defaultLabel: 'People' },
] as const

interface RecruiterProfile {
  display_name?: string | null
  role?: string | null
  bio?: string | null
  focus?: Record<string, boolean> | null
  public_profile?: boolean | null
}

interface RecentHire {
  id: string
  initial: string
  name: string
  role: string
  started_at: string
}

interface AccountUser {
  name?: string | null
  email?: string | null
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const auth = useAuth<AccountUser>()
  const fallbackName = auth.user?.name ?? auth.user?.email ?? ''

  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [bio, setBio] = useState('')
  const [focus, setFocus] = useState<Record<string, boolean>>({})
  const [publicProfile, setPublicProfile] = useState(true)
  const [recentHires, setRecentHires] = useState<RecentHire[] | null>(null)
  const [hiresError, setHiresError] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Hydrate from API
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/profile')
      .then((res) => {
        if (cancelled) return
        const p = unwrapSingle<RecruiterProfile>(res)
        if (p) {
          setName(p.display_name ?? fallbackName)
          setRole(p.role ?? '')
          setBio(p.bio ?? '')
          setFocus(p.focus ?? {})
          setPublicProfile(p.public_profile ?? true)
        } else if (fallbackName) {
          setName(fallbackName)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfileError(
            t('nav.couldNotLoadProfile', {}, { defaultValue: 'Could not load profile.' }),
          )
          if (fallbackName) setName(fallbackName)
        }
      })
    http
      .get('/api/profile/recent-hires')
      .then((res) => {
        if (!cancelled) setRecentHires(unwrapList<RecentHire>(res))
      })
      .catch(() => {
        if (!cancelled)
          setHiresError(
            t('profile.recentError', {}, { defaultValue: 'Could not load recent placements.' }),
          )
      })
    return () => {
      cancelled = true
    }
  }, [http, t, fallbackName])

  function toggle(key: string) {
    setFocus((f) => ({ ...f, [key]: !f[key] }))
    setSaveStatus('idle')
  }

  function handleSave() {
    if (saveStatus === 'saving') return
    setSaveStatus('saving')
    setSaveError(null)
    http
      .put('/api/profile', {
        display_name: name,
        role,
        bio,
        focus,
        public_profile: publicProfile,
      })
      .then(() => setSaveStatus('saved'))
      .catch(() => {
        setSaveStatus('idle')
        setSaveError(
          t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
        )
      })
  }

  return (
    <div data-mol-id="page-profile" className={cm.cn(cm.sp('py', 8), cm.stack(8), 'px-4 md:px-8')}>
      <header>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-primary')}>
          {t('nav.yourAccount', {}, { defaultValue: 'Your account' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 2),
            cm.textSize('4xl'),
            'font-extrabold tracking-tight text-on-surface',
          )}
        >
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'profile.subheading',
            {},
            {
              defaultValue:
                'Show candidates who is reaching out. Tracks your hiring focus areas and recent placements.',
            },
          )}
        </p>
        {profileError ? (
          <p className={cm.cn(cm.sp('mt', 2), cm.textSize('sm'), 'text-error')}>{profileError}</p>
        ) : null}
      </header>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
          <span
            className={cm.cn(
              'grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary text-3xl font-extrabold shadow-md shadow-primary/20',
            )}
          >
            {(name || ' ').charAt(0).toUpperCase()}
          </span>
          <div className={cm.cn('min-w-0 flex-1')}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('nav.identity', {}, { defaultValue: 'Identity' })}
            </p>
            <p className={cm.cn('mt-1 text-2xl font-extrabold tracking-tight text-on-surface')}>
              {name || t('profile.unnamed', {}, { defaultValue: 'Unnamed recruiter' })}
            </p>
            <p className={cm.cn('text-sm font-medium text-on-surface-variant')}>{role}</p>
          </div>
        </div>

        <div className={cm.cn(cm.sp('mt', 6), 'grid gap-4 md:grid-cols-2')}>
          <Field
            id="name"
            label={t('form.displayName', {}, { defaultValue: 'Display name' })}
            value={name}
            onChange={(v) => {
              setName(v)
              setSaveStatus('idle')
            }}
          />
          <Field
            id="role"
            label={t('form.role', {}, { defaultValue: 'Role' })}
            value={role}
            onChange={(v) => {
              setRole(v)
              setSaveStatus('idle')
            }}
          />
        </div>

        <div className={cm.cn(cm.sp('mt', 4), cm.flex({ direction: 'col', gap: 'sm' }))}>
          <label
            htmlFor="bio"
            className={cm.cn(
              'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.bio', {}, { defaultValue: 'Bio' })}
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => {
              setBio(e.target.value)
              setSaveStatus('idle')
            }}
            rows={4}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-y',
            )}
          />
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <p
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('profile.focusEyebrow', {}, { defaultValue: 'Hiring focus' })}
        </p>
        <h2 className={cm.cn('mt-1 text-lg font-extrabold tracking-tight text-on-surface')}>
          {t('profile.focusHeading', {}, { defaultValue: 'Areas you recruit for' })}
        </h2>
        <div className={cm.cn(cm.sp('mt', 4), cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
          {FOCUS_AREAS.map((area) => {
            const active = !!focus[area.key]
            return (
              <button
                key={area.key}
                type="button"
                onClick={() => toggle(area.key)}
                aria-pressed={active}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('xs'),
                  'rounded-full font-bold tracking-wide border transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low',
                )}
              >
                {t(`profile.focus.${area.key}`, {}, { defaultValue: area.defaultLabel })}
              </button>
            )
          })}
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
        )}
      >
        <p
          className={cm.cn(
            'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('profile.recentEyebrow', {}, { defaultValue: 'Recent placements' })}
        </p>
        <h2 className={cm.cn('mt-1 text-lg font-extrabold tracking-tight text-on-surface')}>
          {t('profile.recentHeading', {}, { defaultValue: 'Hires you closed' })}
        </h2>
        {hiresError ? (
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-error')}>{hiresError}</p>
        ) : recentHires === null ? (
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('profile.recentLoading', {}, { defaultValue: 'Loading recent placements…' })}
          </p>
        ) : recentHires.length === 0 ? (
          <p className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t('profile.recentEmpty', {}, { defaultValue: 'No placements yet.' })}
          </p>
        ) : (
          <ul className={cm.cn(cm.sp('mt', 4), 'divide-y divide-outline-variant/20')}>
            {recentHires.map((h) => (
              <li
                key={h.id}
                className={cm.cn(cm.sp('py', 3), cm.flex({ align: 'center', gap: 'sm' }))}
              >
                <span
                  className={cm.cn(
                    'grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary font-bold',
                  )}
                >
                  {h.initial}
                </span>
                <div className={cm.cn('min-w-0 flex-1')}>
                  <p className={cm.cn('text-sm font-semibold text-on-surface')}>{h.name}</p>
                  <p className={cm.cn('text-xs text-on-surface-variant')}>{h.role}</p>
                </div>
                <p
                  className={cm.cn(
                    'text-[10px] font-black uppercase tracking-widest text-on-surface-variant tabular-nums',
                  )}
                >
                  {new Date(h.started_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
          cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
        )}
      >
        <div>
          <p className={cm.cn('text-sm font-semibold text-on-surface')}>
            {t('profile.publicLabel', {}, { defaultValue: 'Public profile' })}
          </p>
          <p className={cm.cn('text-xs text-on-surface-variant')}>
            {t(
              'profile.publicHelp',
              {},
              {
                defaultValue:
                  'Allow candidates and applicants to see your name and role on job posts.',
              },
            )}
          </p>
        </div>
        <label className={cm.cn('inline-flex items-center gap-2 cursor-pointer')}>
          <input
            type="checkbox"
            checked={publicProfile}
            onChange={(e) => {
              setPublicProfile(e.target.checked)
              setSaveStatus('idle')
            }}
            className={cm.cn('rounded accent-primary')}
          />
          <span className={cm.cn('text-sm font-semibold text-on-surface')}>
            {publicProfile
              ? t('profile.publicOn', {}, { defaultValue: 'Visible' })
              : t('profile.publicOff', {}, { defaultValue: 'Hidden' })}
          </span>
        </label>
      </section>

      <div className={cm.cn('flex justify-end items-center gap-3')}>
        {saveError ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{saveError}</p>
        ) : saveStatus === 'saved' ? (
          <p className={cm.cn(cm.textSize('sm'), 'text-success')}>
            {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
          </p>
        ) : null}
        <button
          type="button"
          data-mol-id="profile-save"
          disabled={saveStatus === 'saving'}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'rounded-xl bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50',
          )}
          onClick={handleSave}
        >
          {saveStatus === 'saving'
            ? t('profile.saving', {}, { defaultValue: 'Saving\u2026' })
            : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
        </button>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
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
      <input
        id={id}
        data-mol-id={`profile-${id}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cm.cn(
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.textSize('sm'),
          cm.fontWeight('medium'),
          'rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all',
        )}
      />
    </div>
  )
}

export default Profile
