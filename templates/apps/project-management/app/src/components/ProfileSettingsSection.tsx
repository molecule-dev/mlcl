import { useEffect, useRef, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ProfileResponse {
  id: string
  name: string
  email: string
  preferences: {
    bio?: string
    displayName?: string
  }
}

export default function ProfileSettingsSection() {
  const cm = getClassMap()
  const http = useHttpClient()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  // Store http in a ref so the mount-once effect always uses the latest client
  // without re-running on every render (which would cause an infinite GET loop
  // if useHttpClient() returns a new reference each render).
  const httpRef = useRef(http)
  httpRef.current = http

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await httpRef.current.get<ProfileResponse>('/api/profile/me')
        const data =
          (res as unknown as { data?: ProfileResponse }).data ?? (res as unknown as ProfileResponse)
        if (cancelled) return
        setDisplayName(data.preferences?.displayName ?? data.name ?? '')
        setEmail(data.email ?? '')
        setBio(data.preferences?.bio ?? '')
      } catch (_error) {
        // Leave fields empty; user can fill and save.
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const onSave = async () => {
    setLoading(true)
    setSaved(false)
    try {
      await http.patch('/api/profile/me', {
        name: displayName,
        email,
        preferences: { displayName, bio },
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={cm.cn(cm.sp('p', 10), 'bg-surface-container-lowest rounded-2xl shadow-sm')}>
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }), 'md:flex-row')}>
        <div className={cm.cn(cm.w('full'), cm.stack(2), 'md:w-1/3')}>
          <h3
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              'text-on-background tracking-tight',
            )}
          >
            {t('nav.profile', {}, { defaultValue: 'Profile' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'profileSettings.description',
              {},
              {
                defaultValue:
                  'Update your personal information and how others see you across projects.',
              },
            )}
          </p>
        </div>
        <div className={cm.cn(cm.w('full'), cm.stack(8), 'md:w-2/3')}>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'md:grid-cols-2')}>
            <div className={cm.stack(2)}>
              <label
                htmlFor="profile-display-name"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[0.68rem] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('profileSettings.displayNameLabel', {}, { defaultValue: 'Display Name' })}
              </label>
              <input
                id="profile-display-name"
                aria-label={t(
                  'profileSettings.displayNameLabel',
                  {},
                  { defaultValue: 'Display Name' },
                )}
                className={cm.cn(
                  cm.w('full'),
                  cm.h(12),
                  cm.sp('px', 4),
                  'rounded-lg bg-surface-container-low border-none focus:bg-surface focus:ring-1 focus:ring-primary-container/20 transition-all outline-none',
                )}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className={cm.stack(2)}>
              <label
                htmlFor="profile-email"
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[0.68rem] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('profileSettings.emailLabel', {}, { defaultValue: 'Email Address' })}
              </label>
              <input
                id="profile-email"
                aria-label={t('profileSettings.emailLabel', {}, { defaultValue: 'Email Address' })}
                className={cm.cn(
                  cm.w('full'),
                  cm.h(12),
                  cm.sp('px', 4),
                  'rounded-lg bg-surface-container-low border-none focus:bg-surface focus:ring-1 focus:ring-primary-container/20 transition-all outline-none',
                )}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className={cm.stack(2)}>
            <label
              htmlFor="profile-bio"
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[0.68rem] uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('form.bio', {}, { defaultValue: 'Bio' })}
            </label>
            <textarea
              id="profile-bio"
              aria-label={t('form.bio', {}, { defaultValue: 'Bio' })}
              className={cm.cn(
                cm.w('full'),
                cm.sp('p', 4),
                'rounded-lg bg-surface-container-low border-none focus:bg-surface focus:ring-1 focus:ring-primary-container/20 transition-all outline-none resize-none',
              )}
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div
            className={cm.cn(
              cm.sp('pt', 4),
              cm.flex({ justify: 'end', align: 'center', gap: 'md' }),
            )}
          >
            {saved && (
              <span
                className={cm.cn(cm.textSize('sm'), 'text-success')}
                role="status"
                data-testid="profile-saved"
              >
                {t('common.saved', {}, { defaultValue: 'Saved' })}
              </span>
            )}
            <button
              type="button"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 3),
                cm.fontWeight('semibold'),
                'rounded-lg text-on-primary indigo-gradient active:scale-95 transition-transform disabled:opacity-50',
              )}
              disabled={loading}
              onClick={onSave}
            >
              {loading
                ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
export { ProfileSettingsSection }
