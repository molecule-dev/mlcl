import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useAuth, useHttpClient, useTranslation, useUser } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { unwrapSingle } from '../lib/unwrap.js'

interface AuthUser {
  id: string
  name?: string
  username?: string
  email?: string | null
}

const DIETARY_PREFS = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten-free' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
] as const

const NOTIFICATION_PREFS = [
  { key: 'helpful_votes', label: 'Helpful votes on my reviews', defaultOn: true },
  { key: 'replies', label: 'Replies to my reviews', defaultOn: true },
  { key: 'mentions', label: 'Mentions', defaultOn: true },
  { key: 'follows', label: 'New followers', defaultOn: false },
  { key: 'restaurant_updates', label: 'Updates from places I’ve saved', defaultOn: false },
  { key: 'weekly_digest', label: `Weekly ${APP_NAME} digest`, defaultOn: true },
] as const

const PREFS_STORAGE_KEY = 'morsel:userPreferences'

interface MorselPreferences {
  bio: string
  dietary: string[]
  notifications: Record<string, boolean>
}

function readLocalPrefs(): MorselPreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MorselPreferences
    if (parsed && typeof parsed === 'object') return parsed
    return null
  } catch (_error) {
    // JSON.parse or localStorage access failed; return null so defaults are used
    return null
  }
}

function writeLocalPrefs(prefs: MorselPreferences): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
  } catch (_error) {
    // localStorage quota exceeded or unavailable; preferences will not persist this session
  }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const user = useUser<AuthUser>()
  const { logout, refresh } = useAuth<AuthUser>()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [diet, setDiet] = useState<Set<string>>(new Set())
  const [notif, setNotif] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIFICATION_PREFS.map((p) => [p.key, p.defaultOn])),
  )
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Hydrate from the User record (name, email come from /users/:id) and the
  // local preference blob (bio + diet + notifications). The User table on
  // the server doesn't have a `bio` column in this scaffold, so we keep
  // these UX-only preferences in localStorage and persist name+email via the
  // standard PATCH /api/users/:id flow.
  //
  // We hydrate eagerly from the cached `useUser()` so the inputs are never
  // empty during the initial paint, then refetch /api/users/me so a hard
  // reload picks up server-side edits made in another tab (or by another
  // device) — `useUser` only reflects whatever the auth bond cached at
  // login time and is not invalidated on PATCH /users from elsewhere.
  useEffect(() => {
    if (!user?.id) return
    setName((cur) => cur || user.name || user.username || '')
    setEmail((cur) => cur || user.email || '')
    const prefs = readLocalPrefs()
    if (prefs) {
      setBio(prefs.bio ?? '')
      setDiet(new Set(prefs.dietary ?? []))
      setNotif((cur) => ({ ...cur, ...(prefs.notifications ?? {}) }))
    }
  }, [user?.id, user?.name, user?.username, user?.email])

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const envelope = unwrapSingle<{ props?: AuthUser } & AuthUser>(res)
        const me = envelope?.props ?? envelope
        if (!me) return
        if (me.name || me.username) setName(me.name ?? me.username ?? '')
        if (me.email !== undefined && me.email !== null) setEmail(me.email)
      })
      .catch(() => {
        /* tolerate — useUser cache is the fallback */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const toggleDiet = (v: string) => {
    setDiet((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    setSaving(true)
    setSavedMessage(null)
    setError(null)
    try {
      const patch: Record<string, unknown> = {}
      if (name && name !== user.name) patch.name = name
      if (email && email !== (user.email ?? '')) patch.email = email
      if (Object.keys(patch).length > 0) {
        const res = await http.patch(`/api/users/${user.id}`, patch)
        const updated = unwrapSingle<AuthUser>(res)
        if (!updated) throw new Error('Empty response from PATCH /users')
        // Refresh the auth user so the header avatar etc. picks up the new name.
        await refresh().catch(() => undefined)
      }
      writeLocalPrefs({
        bio,
        dietary: Array.from(diet),
        notifications: notif,
      })
      void track({
        name: 'settings.updated',
        properties: { user_id: user.id, fields: Object.keys(patch) },
      })
      setSavedMessage(t('common.settingsSavedPeriod', {}, { defaultValue: 'Settings saved.' }))
    } catch (err) {
      console.error('[Settings] save failed', err)
      setError(t('settings.error', {}, { defaultValue: 'Could not save your settings.' }))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount() {
    if (!user?.id || deleting) return
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        t(
          'settings.danger.confirm',
          {},
          { defaultValue: 'Permanently delete your account, reviews, and lists?' },
        ),
      )
    ) {
      return
    }
    setDeleting(true)
    try {
      await http.delete(`/api/users/${user.id}`)
      await logout().catch(() => undefined)
      navigate('/', { replace: true })
    } catch (err) {
      console.error('[Settings] delete account failed', err)
      setError(t('settings.danger.error', {}, { defaultValue: 'Could not delete account.' }))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className={cm.cn(cm.maxW('2xl'), cm.sp('px', 6), cm.sp('py', 10), cm.mxAuto)}>
      <header className={cm.cn(cm.sp('mb', 8))}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-[0.3em] text-primary',
          )}
        >
          {t('nav.yourAccount', {}, { defaultValue: 'Your account' })}
        </p>
        <h1
          className={cm.cn(cm.textSize('5xl'), cm.sp('mt', 2), 'leading-tight')}
          style={{ fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 }}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      <form onSubmit={handleSave} className={cm.flex({ direction: 'col', gap: 'lg' })}>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl border border-outline-variant/40',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('nav.profile', {}, { defaultValue: 'Profile' })}
          </h2>

          <div className={cm.cn(cm.sp('mt', 5), cm.flex({ direction: 'col', gap: 'md' }))}>
            <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.displayName', {}, { defaultValue: 'Display name' })}
              </span>
              <input
                type="text"
                value={name}
                data-testid="settings-name"
                onChange={(e) => setName(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
                )}
              />
            </label>
            <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </span>
              <input
                type="email"
                value={email}
                data-testid="settings-email"
                onChange={(e) => setEmail(e.target.value)}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  cm.fontWeight('semibold'),
                  'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors',
                )}
              />
            </label>
            <label className={cm.flex({ direction: 'col', gap: 'xs' })}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('form.bio', {}, { defaultValue: 'Bio' })}
              </span>
              <textarea
                value={bio}
                data-testid="settings-bio"
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'bg-surface-container-low rounded-xl border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors leading-relaxed',
                )}
                style={{ fontFamily: '"Lora", Georgia, serif' }}
              />
            </label>
          </div>
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl border border-outline-variant/40',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('footer.language', {}, { defaultValue: 'Language' })}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 2),
              cm.sp('mb', 4),
              'text-on-surface-variant',
            )}
          >
            {t(
              'common.chooseTheLanguage',
              {},
              { defaultValue: 'Choose the language used throughout the app.' },
            )}
          </p>
          <LanguagePicker />
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl border border-outline-variant/40',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h2>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('mt', 2),
              cm.sp('mb', 4),
              'text-on-surface-variant',
            )}
          >
            {t(
              'common.toggleLightDark',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
          <ThemeToggle />
        </section>
        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl border border-outline-variant/40',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('settings.diet.heading', {}, { defaultValue: 'Dietary preferences' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'settings.diet.body',
              {},
              { defaultValue: 'We’ll prioritize spots that match your preferences in Discover.' },
            )}
          </p>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }), cm.sp('mt', 4))}>
            {DIETARY_PREFS.map((p) => {
              const active = diet.has(p.value)
              return (
                <button
                  key={p.value}
                  type="button"
                  data-testid={`settings-diet-${p.value}`}
                  aria-pressed={active}
                  onClick={() => toggleDiet(p.value)}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-full transition-colors',
                    active
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
                  )}
                >
                  {t(`settings.diet.${p.value}`, {}, { defaultValue: p.label })}
                </button>
              )
            })}
          </div>
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 6),
            'bg-surface rounded-2xl border border-outline-variant/40',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-primary',
            )}
          >
            {t('settings.notifications.heading', {}, { defaultValue: 'Notifications' })}
          </h2>
          <ul className={cm.cn(cm.sp('mt', 4), 'divide-y divide-outline-variant/40')}>
            {NOTIFICATION_PREFS.map((p) => (
              <li
                key={p.key}
                className={cm.cn(
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                )}
              >
                <span className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                  {t(`settings.notifications.${p.key}`, {}, { defaultValue: p.label })}
                </span>
                <button
                  type="button"
                  data-testid={`settings-notif-${p.key}`}
                  onClick={() => setNotif((prev) => ({ ...prev, [p.key]: !prev[p.key] }))}
                  className={cm.cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    notif[p.key] ? 'bg-primary' : 'bg-surface-container-high',
                  )}
                  role="switch"
                  aria-checked={notif[p.key]}
                  aria-label={p.label}
                >
                  <span
                    className={cm.cn(
                      'block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                      notif[p.key] ? 'translate-x-5' : 'translate-x-0.5',
                    )}
                    style={{ marginTop: '0.125rem' }}
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className={cm.cn(cm.sp('p', 6), 'bg-error/5 rounded-2xl border border-error/30')}>
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-error',
            )}
          >
            {t('settings.danger.heading', {}, { defaultValue: 'Danger zone' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'settings.danger.body',
              {},
              {
                defaultValue:
                  'Deleting your account removes your reviews, lists, and follows. This cannot be undone.',
              },
            )}
          </p>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleting}
            data-testid="settings-delete"
            className={cm.cn(
              cm.sp('mt', 4),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full border border-error/40 text-error hover:bg-error/10 transition-colors disabled:opacity-50',
            )}
          >
            {deleting
              ? t('common.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
              : t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
          </button>
        </section>

        {error ? (
          <p data-testid="settings-error" className={'text-error text-sm'}>
            {error}
          </p>
        ) : null}
        {savedMessage ? (
          <p data-testid="settings-saved" className={'text-success text-sm font-semibold'}>
            {savedMessage}
          </p>
        ) : null}

        <footer className={cm.cn(cm.flex({ justify: 'end' }), cm.sp('mt', 4))}>
          <button
            type="submit"
            disabled={saving || !user?.id}
            data-testid="settings-save"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('bold'),
              'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-lg disabled:opacity-50',
            )}
          >
            {saving
              ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
              : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
          </button>
        </footer>
      </form>
    </main>
  )
}
