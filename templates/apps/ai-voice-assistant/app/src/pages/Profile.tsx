import { useEffect, useRef, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ProfileExtras {
  handle?: string
  bio?: string
  publicProfile?: boolean
  avatarUrl?: string
}

interface ProfileUser extends UserProfile {
  name?: string
  oauthData?: { profile?: ProfileExtras } | Record<string, unknown>
}

function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user } = useAuth<ProfileUser>()

  const [displayName, setDisplayName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [handle, setHandle] = useState('')
  const [bio, setBio] = useState('')
  const [publicProfile, setPublicProfile] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [avatarPromptOpen, setAvatarPromptOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const hydratedRef = useRef(false)
  // Per-field dirty tracking so the async hydrate (below) cannot
  // overwrite a value the user has already typed/toggled. Without this,
  // a slow GET /users/:id that resolves AFTER the user fills an input
  // would silently clobber their input back to the server's value
  // (race observed in the full e2e run, where the form is filled
  // immediately after navigation before hydrate finishes).
  const dirty = useRef({
    displayName: false,
    email: false,
    handle: false,
    bio: false,
    publicProfile: false,
    avatarUrl: false,
  })

  // Hydrate the editable extras (handle/bio/publicProfile/avatar) from
  // /users/:id — the server returns the full row including `oauthData`,
  // which is where we persist these per-app fields. Without this load
  // the extras only live in local UI state and disappear on reload.
  useEffect(() => {
    let cancelled = false
    if (!user?.id || hydratedRef.current) return
    void (async () => {
      try {
        const res = await http.get<{
          props?: { name?: string; email?: string; oauthData?: Record<string, unknown> }
        }>(`/users/${user.id}`)
        if (cancelled) return
        const props = res.data?.props
        const oauthData = (props?.oauthData ?? {}) as Record<string, unknown>
        const extras = (oauthData.profile ?? {}) as ProfileExtras
        if (!dirty.current.displayName) setDisplayName(props?.name ?? user.name ?? '')
        if (!dirty.current.email) setEmail(props?.email ?? user.email ?? '')
        if (!dirty.current.handle) setHandle(extras.handle ?? '')
        if (!dirty.current.bio) setBio(extras.bio ?? '')
        if (!dirty.current.publicProfile) setPublicProfile(extras.publicProfile ?? true)
        if (!dirty.current.avatarUrl) setAvatarUrl(extras.avatarUrl ?? null)
        hydratedRef.current = true
      } catch (_error) {
        // Ignore — UI falls back to whatever is on the auth session state.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, user?.id, user?.name, user?.email])

  const initials = (() => {
    const base = (displayName || user?.email || '').trim()
    if (!base) return 'P'
    const parts = base.split(/[\s@]+/).filter(Boolean)
    if (parts.length === 0) return 'P'
    if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase()
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  })()

  const inputClass = cm.cn(
    cm.w('full'),
    cm.sp('px', 4),
    cm.sp('py', 3),
    'rounded-xl bg-surface-secondary border border-border text-foreground placeholder-foreground-tertiary focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none',
  )
  const labelText = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    cm.textMuted,
    'uppercase tracking-widest',
  )

  function handlePickAvatar() {
    setAvatarPromptOpen(true)
    fileInputRef.current?.click()
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reject anything bigger than ~1.5MB — base64 inflates by ~33% and
    // jsonb gets unwieldy past a couple MB. Real production would route
    // through an uploads bond (S3/etc.); keep this simple-and-honest.
    const MAX_BYTES = 1_500_000
    if (file.size > MAX_BYTES) {
      setError(
        t('profile.avatarTooLarge', {}, { defaultValue: 'Pick a smaller image (under 1.5MB).' }),
      )
      return
    }
    // Read as a data URL so the avatar survives reload — a blob: URL is
    // session-scoped and dies the moment the page navigates, which made
    // the "Change" button look like it worked but quietly forgot the
    // pick on every reload.
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      if (dataUrl) {
        dirty.current.avatarUrl = true
        setAvatarUrl(dataUrl)
        setAvatarPromptOpen(false)
        setSavedAt(null)
      }
    }
    reader.onerror = () => {
      setError(t('profile.avatarReadError', {}, { defaultValue: 'Could not read that image.' }))
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (saving || !user?.id) return
    setSaving(true)
    setError(null)
    try {
      // Read-modify-write the user's oauthData so we don't clobber other
      // apps' keys (voicePreferences, etc.).
      const current = await http
        .get<{ props?: { oauthData?: Record<string, unknown> } }>(`/users/${user.id}`)
        .then((res) => (res.data?.props?.oauthData ?? {}) as Record<string, unknown>)
        .catch(() => ({}) as Record<string, unknown>)
      const profileExtras: ProfileExtras = {
        handle: handle.trim() || undefined,
        bio: bio.trim() || undefined,
        publicProfile,
        avatarUrl: avatarUrl ?? undefined,
      }
      const oauthData: Record<string, unknown> = { ...current, profile: profileExtras }
      await http.patch(`/users/${user.id}`, {
        name: displayName,
        email: email.trim(),
        oauthData,
      })
      setSavedAt(new Date())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('common.couldNotSaveProfile', {}, { defaultValue: 'Could not save profile.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-foreground',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.sp('px', 6),
          cm.sp('py', 6),
          'border-b border-border',
        )}
      >
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.textMuted,
            'uppercase tracking-widest font-semibold',
          )}
        >
          {t('profile.eyebrow', {}, { defaultValue: 'Public identity' })}
        </span>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.profile', {}, { defaultValue: 'Profile' })}
        </h1>
      </header>

      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.stack(6),
          cm.sp('px', 6),
          cm.sp('py', 8),
          cm.mxAuto,
          cm.w('full'),
          'max-w-[760px]',
        )}
      >
        <section
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg' }),
            cm.sp('p', 6),
            'rounded-2xl bg-surface border border-border',
          )}
        >
          <div className={cm.cn(cm.position('relative'))}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName || (user?.email ?? '')}
                className={cm.cn(cm.roundedFull, 'h-24 w-24 object-cover')}
                style={{
                  boxShadow:
                    '0 0 30px color-mix(in srgb, var(--mol-color-primary) 45%, transparent)',
                }}
              />
            ) : (
              <div
                className={cm.cn(
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.fontWeight('bold'),
                  'h-24 w-24 bg-gradient-to-br from-primary to-secondary text-white text-2xl',
                )}
                style={{
                  boxShadow:
                    '0 0 30px color-mix(in srgb, var(--mol-color-primary) 45%, transparent)',
                }}
                aria-hidden="true"
              >
                {initials}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarFile}
            />
            <button
              type="button"
              onClick={handlePickAvatar}
              aria-expanded={avatarPromptOpen}
              className={cm.cn(
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('semibold'),
                cm.textSize('xs'),
                'absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-surface border border-border text-foreground hover:bg-surface-secondary transition-colors',
              )}
            >
              {avatarPromptOpen
                ? t('profile.changing', {}, { defaultValue: 'Pick a file…' })
                : t('profile.change', {}, { defaultValue: 'Change' })}
            </button>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col' }))}>
            <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {displayName || '—'}
            </span>
            <span className={cm.cn(cm.textMuted, cm.textSize('sm'))}>
              @{handle || t('profile.unsetHandle', {}, { defaultValue: 'unset' })}
            </span>
            <span className={cm.cn(cm.textSubtle, cm.textSize('xs'), cm.sp('mt', 1))}>
              {email || user?.email || ''}
            </span>
          </div>
        </section>

        <section className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface border border-border')}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 4))}>
            {t('profile.basics', {}, { defaultValue: 'Basics' })}
          </h2>
          <div className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(4))}>
            <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
              <span className={labelText}>
                {t('form.displayName', {}, { defaultValue: 'Display name' })}
              </span>
              <input
                value={displayName}
                onChange={(e) => {
                  dirty.current.displayName = true
                  setDisplayName(e.target.value)
                }}
                className={inputClass}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
              <span className={labelText}>{t('form.email', {}, { defaultValue: 'Email' })}</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  dirty.current.email = true
                  setEmail(e.target.value)
                }}
                className={inputClass}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
              <span className={labelText}>
                {t('profile.handle', {}, { defaultValue: 'Handle' })}
              </span>
              <input
                value={handle}
                onChange={(e) => {
                  dirty.current.handle = true
                  setHandle(e.target.value)
                }}
                className={inputClass}
              />
            </label>
            <label className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2))}>
              <span className={labelText}>{t('form.bio', {}, { defaultValue: 'Bio' })}</span>
              <textarea
                value={bio}
                onChange={(e) => {
                  dirty.current.bio = true
                  setBio(e.target.value)
                }}
                rows={4}
                className={inputClass}
              />
            </label>
            <label className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }))}>
              <span className={cm.cn(cm.flex({ direction: 'col' }))}>
                <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                  {t('profile.publicProfile', {}, { defaultValue: 'Public profile' })}
                </span>
                <span className={cm.cn(cm.textMuted, cm.textSize('xs'))}>
                  {t(
                    'profile.publicDescription',
                    {},
                    { defaultValue: 'Make your name and bio visible to teammates.' },
                  )}
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={publicProfile}
                aria-label={t('profile.publicProfile', {}, { defaultValue: 'Public profile' })}
                onClick={() => {
                  dirty.current.publicProfile = true
                  setPublicProfile((p) => !p)
                }}
                className={cm.cn(
                  'relative h-6 w-11 rounded-full transition-colors shrink-0',
                  publicProfile ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-border',
                )}
              >
                <span
                  className={cm.cn(
                    'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform',
                    publicProfile ? 'translate-x-5' : '',
                  )}
                />
              </button>
            </label>
          </div>
        </section>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className={cm.cn(
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.sp('py', 3),
            cm.textSize('base'),
            'self-start px-8 bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60',
          )}
        >
          {saving
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('common.saveProfile', {}, { defaultValue: 'Save profile' })}
        </button>
        {savedAt ? (
          <p role="status" className={cm.cn(cm.textSize('xs'), cm.textMuted)}>
            {t(
              'common.savedAt',
              { time: savedAt.toLocaleTimeString() },
              { defaultValue: 'Saved at {{time}}' },
            )}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 3),
              'rounded-xl bg-error/15 text-error border border-error/30',
            )}
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default Profile
export { Profile, Profile as ProfilePage }
