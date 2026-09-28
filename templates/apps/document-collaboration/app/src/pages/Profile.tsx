import { useEffect, useState } from 'react'

import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

const CURSOR_PALETTE = ['#4f46e5', '#e11d48', '#16a34a', '#d97706', '#7c3aed'] as const

interface ProfileResponse {
  user_id: string
  email: string | null
  display_name: string
  handle: string | null
  pronouns: string | null
  role: string | null
  location: string | null
  bio: string | null
  cursor_color: string
  public_profile: boolean
  editor_prefs: Record<string, boolean>
  notification_prefs: Record<string, boolean>
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const [original, setOriginal] = useState<ProfileResponse | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [pronouns, setPronouns] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [publicProfile, setPublicProfile] = useState(true)
  const [cursorColor, setCursorColor] = useState<string>(CURSOR_PALETTE[0])

  const initials = (displayName || 'U U')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const adoptProfile = (p: ProfileResponse): void => {
    setOriginal(p)
    setDisplayName(p.display_name ?? '')
    setHandle(p.handle ?? '')
    setPronouns(p.pronouns ?? '')
    setRole(p.role ?? '')
    setLocation(p.location ?? '')
    setBio(p.bio ?? '')
    setPublicProfile(p.public_profile)
    setCursorColor(p.cursor_color || CURSOR_PALETTE[0])
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const profile = unwrapSingle<ProfileResponse>(res)
        if (profile) adoptProfile(profile)
      })
      .catch(() => {
        if (!cancelled)
          setError(t('nav.couldNotLoadProfile', {}, { defaultValue: 'Could not load profile.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const cancel = (): void => {
    if (original) adoptProfile(original)
  }

  const save = async (): Promise<void> => {
    setSaving(true)
    setError(null)
    try {
      const res = await http.patch('/api/profile/me', {
        display_name: displayName,
        handle: handle || null,
        pronouns: pronouns || null,
        role: role || null,
        location: location || null,
        bio: bio || null,
        cursor_color: cursorColor,
        public_profile: publicProfile,
      })
      const updated = unwrapSingle<ProfileResponse>(res)
      if (updated) adoptProfile(updated)
      setSavedAt(Date.now())
    } catch (error) {
      logError('profile.save', error)
      setError(t('common.saveFailed', {}, { defaultValue: 'Save failed.' }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'mx-auto w-full max-w-3xl space-y-8')}
      data-testid="profile-root"
    >
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('extrabold'),
            'uppercase tracking-widest text-secondary',
          )}
        >
          {t('profile.eyebrow', {}, { defaultValue: 'Studio identity' })}
        </p>
        <h1
          className={cm.cn(
            cm.sp('mt', 1),
            cm.textSize('3xl'),
            cm.fontWeight('extrabold'),
            'tracking-tight',
          )}
        >
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
        <p
          className={cm.cn(cm.sp('mt', 1), cm.textSize('lg'), 'italic text-on-surface-variant')}
          style={{ fontFamily: 'Charter, Georgia, serif' }}
        >
          {t('profile.subtitle', {}, { defaultValue: 'How you appear to your collaborators.' })}
        </p>
      </header>

      {error ? (
        <div
          className={cm.cn(
            cm.sp('p', 4),
            cm.accentCard({ tone: 'error' }),
            'rounded-xl bg-error/5 text-sm text-error',
          )}
        >
          {error}
        </div>
      ) : null}
      {savedAt ? (
        <div
          className={cm.cn(
            cm.sp('p', 3),
            cm.accentCard({ tone: 'success' }),
            'rounded-xl bg-success/5 text-sm text-success',
          )}
          data-testid="profile-saved-banner"
        >
          {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
        </div>
      ) : null}

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant',
        )}
      >
        <h2 className={cm.cn(cm.fontWeight('extrabold'), cm.textSize('lg'))}>
          {t('nav.identity', {}, { defaultValue: 'Identity' })}
        </h2>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'profile.identity.description',
            {},
            { defaultValue: 'The name, handle, and pronouns that show up next to your cursor.' },
          )}
        </p>

        <div className={cm.cn(cm.sp('mt', 6), cm.flex({ align: 'center', gap: 'md' }))}>
          <span
            className={cm.cn(
              'inline-flex h-16 w-16 items-center justify-center rounded-full text-lg font-extrabold text-white shadow-sm',
            )}
            style={{ backgroundColor: cursorColor }}
            aria-hidden="true"
          >
            {initials}
          </span>
        </div>

        <div className={cm.cn(cm.sp('mt', 6), 'grid grid-cols-1 gap-4 sm:grid-cols-2')}>
          <ProfileField
            label={t('form.displayName', {}, { defaultValue: 'Display name' })}
            value={displayName}
            onChange={setDisplayName}
            testId="profile-input-display-name"
          />
          <ProfileField
            label={t('profile.handle', {}, { defaultValue: 'Handle' })}
            value={handle}
            onChange={setHandle}
            testId="profile-input-handle"
          />
          <ProfileField
            label={t('profile.pronouns', {}, { defaultValue: 'Pronouns' })}
            value={pronouns}
            onChange={setPronouns}
            testId="profile-input-pronouns"
          />
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant',
        )}
      >
        <h2 className={cm.cn(cm.fontWeight('extrabold'), cm.textSize('lg'))}>
          {t('nav.about', {}, { defaultValue: 'About' })}
        </h2>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'profile.about.description',
            {},
            { defaultValue: 'A short bio for your public profile and the contributor pages.' },
          )}
        </p>

        <div className={cm.cn(cm.sp('mt', 6), 'grid grid-cols-1 gap-4 sm:grid-cols-2')}>
          <ProfileField
            label={t('profile.role', {}, { defaultValue: 'Role / title' })}
            value={role}
            onChange={setRole}
            testId="profile-input-role"
          />
          <ProfileField
            label={t('form.location', {}, { defaultValue: 'Location' })}
            value={location}
            onChange={setLocation}
            testId="profile-input-location"
          />
        </div>

        <div className={cm.sp('mt', 4)}>
          <label
            htmlFor="bio"
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'block uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('form.bio', {}, { defaultValue: 'Bio' })}
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            data-testid="profile-input-bio"
            className={cm.cn(
              cm.w('full'),
              cm.sp('mt', 2),
              cm.sp('px', 4),
              cm.sp('py', 3),
              cm.textSize('sm'),
              'rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
            )}
            style={{ fontFamily: 'Charter, Georgia, serif' }}
          />
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('p', 6),
          'rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant',
        )}
      >
        <h2 className={cm.cn(cm.fontWeight('extrabold'), cm.textSize('lg'))}>
          {t('profile.presence.title', {}, { defaultValue: 'Presence' })}
        </h2>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'profile.presence.description',
            {},
            {
              defaultValue:
                'Pick the color your cursor wears in shared documents. The same color is used for your selections, comments, and avatar.',
            },
          )}
        </p>

        <div className={cm.cn(cm.sp('mt', 4), cm.flex({ align: 'center', gap: 'sm' }))}>
          {CURSOR_PALETTE.map((color) => {
            const isActive = cursorColor === color
            return (
              <button
                key={color}
                type="button"
                onClick={() => setCursorColor(color)}
                aria-label={t(
                  'profile.presence.color',
                  { color },
                  { defaultValue: 'Cursor color {{color}}' },
                )}
                data-testid={`profile-cursor-color-${color}`}
                className={cm.cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-full transition-transform',
                  isActive ? 'scale-110 ring-2 ring-on-surface' : 'hover:scale-105',
                )}
                style={{ backgroundColor: color }}
              >
                {isActive ? (
                  <span
                    className={cm.cn('material-symbols-outlined text-white')}
                    style={{ fontSize: '1.1rem' }}
                    aria-hidden="true"
                  >
                    check
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <label className={cm.cn(cm.sp('mt', 6), cm.flex({ align: 'center', gap: 'sm' }))}>
          <input
            type="checkbox"
            checked={publicProfile}
            onChange={(e) => setPublicProfile(e.target.checked)}
            data-testid="profile-public-toggle"
            className={'h-4 w-4 rounded border-outline text-primary focus:ring-primary/40'}
          />
          <span className={cm.cn(cm.textSize('sm'), 'text-on-surface')}>
            {t('profile.publicToggle', {}, { defaultValue: 'Show profile to teammates' })}
          </span>
        </label>
      </section>

      <div className={cm.flex({ align: 'center', justify: 'end', gap: 'sm' })}>
        <button
          type="button"
          onClick={cancel}
          disabled={loading || saving}
          className={cm.cn(
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('semibold'),
            cm.textSize('sm'),
            'rounded-full border border-outline text-on-surface hover:bg-surface-container disabled:opacity-50',
          )}
          data-testid="profile-cancel"
        >
          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={loading || saving}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('extrabold'),
            cm.textSize('sm'),
            'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0',
          )}
          data-testid="profile-save"
        >
          {saving
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
        </button>
      </div>
    </div>
  )
}

function ProfileField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  testId?: string
}) {
  const cm = getClassMap()
  return (
    <div>
      <label
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('extrabold'),
          'block uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        className={cm.cn(
          cm.w('full'),
          cm.sp('mt', 2),
          cm.sp('px', 4),
          cm.sp('py', 3),
          cm.textSize('sm'),
          'rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30',
        )}
      />
    </div>
  )
}

export default Profile
