import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

interface ToggleRowProps {
  id: string
  title: string
  description: string
  value: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
}

function ToggleRow({ id, title, description, value, disabled, onChange }: ToggleRowProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('p', 4),
        'rounded-xl bg-surface border border-outline-variant/40 hover:border-primary/40 transition-colors',
      )}
    >
      <div className={'min-w-0'}>
        <label
          htmlFor={id}
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'text-on-surface block')}
        >
          {title}
        </label>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1')}>{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={cm.cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
          disabled ? 'opacity-60 cursor-not-allowed' : '',
          value ? 'bg-primary' : 'bg-on-surface/20',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
            value ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

interface Preferences {
  breakingAlerts: boolean
  dailyDigest: boolean
  emailDigest: boolean
  hideRead: boolean
  biasBalanced: boolean
  showBiasMeters: boolean
}

const DEFAULT_PREFS: Preferences = {
  breakingAlerts: true,
  dailyDigest: true,
  emailDigest: false,
  hideRead: false,
  biasBalanced: true,
  showBiasMeters: true,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth<UserProfile & { oauthData?: Record<string, unknown> }>()
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Preferences round-trip through the app's own server-side channel
  // (GET/PATCH /api/preferences). The platform user resource never returns
  // `oauthData` on reads, so the old oauthData merge could not survive a
  // reload — this channel reads/merges the slice server-side instead.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    http
      .get<{
        breakingAlerts?: boolean
        dailyDigest?: boolean
        emailDigest?: boolean
        hideRead?: boolean
        biasBalanced?: boolean
        showBiasMeters?: boolean
      }>('/api/preferences')
      .then((resp) => {
        if (cancelled) return
        const stored = resp.data ?? {}
        setPrefs({
          breakingAlerts: stored.breakingAlerts ?? DEFAULT_PREFS.breakingAlerts,
          dailyDigest: stored.dailyDigest ?? DEFAULT_PREFS.dailyDigest,
          emailDigest: stored.emailDigest ?? DEFAULT_PREFS.emailDigest,
          hideRead: stored.hideRead ?? DEFAULT_PREFS.hideRead,
          biasBalanced: stored.biasBalanced ?? DEFAULT_PREFS.biasBalanced,
          showBiasMeters: stored.showBiasMeters ?? DEFAULT_PREFS.showBiasMeters,
        })
      })
      .catch(() => {
        // Keep defaults — the toggles stay usable; PATCH failures surface below.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, user?.id])

  async function persistPrefs(next: Preferences) {
    setSaving(true)
    setError(null)
    try {
      const merged = await http.patch<Preferences>('/api/preferences', next)
      const saved = merged.data ?? next
      setPrefs(saved)
      setSavedAt(Date.now())
      // Mirror into the local auth user so live readers of
      // `useShowBiasMeters()` (Home/Topics/Search lists) update immediately.
      if (user) {
        const existingOauth = (user.oauthData as Record<string, unknown> | undefined) ?? {}
        setUser({
          ...(user as unknown as Record<string, unknown>),
          oauthData: { ...existingOauth, preferences: saved },
        } as unknown as UserProfile)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.saveError', {}, { defaultValue: 'Failed to save preferences.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    void persistPrefs(next)
  }

  async function handleSignOut() {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }

  const showSavedBadge = savedAt !== null && Date.now() - savedAt < 2500
  const email = user?.email ?? 'reader@example.com'

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 1),
            'uppercase tracking-widest text-orange-800 dark:text-secondary',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Tune your briefing' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-headline font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Notifications, reading preferences, and bias-aware feed tuning.' },
          )}
        </p>
        <div
          className={cm.cn(cm.sp('mt', 2), 'h-5 text-xs text-on-surface-variant')}
          aria-live="polite"
        >
          {error ? (
            <span className={'text-error font-semibold'}>{error}</span>
          ) : showSavedBadge ? (
            <span className={'text-primary font-semibold'}>
              {t('common.saved', {}, { defaultValue: 'Saved' })}
            </span>
          ) : saving ? (
            <span>{t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })}</span>
          ) : null}
        </div>
      </header>

      <section className={cm.stack(4)}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'border-b border-outline-variant/60 pb-2',
          )}
        >
          <span className={'material-symbols-outlined text-primary text-base'} aria-hidden="true">
            notifications
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-headline font-bold')}>
            {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
          </h2>
        </header>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <ToggleRow
            id="setting-breaking"
            value={prefs.breakingAlerts}
            disabled={!user || loading}
            onChange={(v) => update('breakingAlerts', v)}
            title={t('settings.breaking.title', {}, { defaultValue: 'Breaking news alerts' })}
            description={t(
              'settings.breaking.description',
              {},
              {
                defaultValue: 'Push a notification when a breaking story is covered by 3+ outlets.',
              },
            )}
          />
          <ToggleRow
            id="setting-daily"
            value={prefs.dailyDigest}
            disabled={!user || loading}
            onChange={(v) => update('dailyDigest', v)}
            title={t('settings.daily.title', {}, { defaultValue: 'Daily digest' })}
            description={t(
              'settings.daily.description',
              {},
              {
                defaultValue:
                  'A finished morning briefing of the top stories from your followed topics.',
              },
            )}
          />
          <ToggleRow
            id="setting-email"
            value={prefs.emailDigest}
            disabled={!user || loading}
            onChange={(v) => update('emailDigest', v)}
            title={t('settings.email.title', {}, { defaultValue: 'Email digest' })}
            description={t(
              'settings.email.description',
              {},
              {
                defaultValue:
                  'Receive the daily digest by email instead of (or in addition to) push.',
              },
            )}
          />
        </div>
      </section>

      <section className={cm.stack(4)}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'border-b border-outline-variant/60 pb-2',
          )}
        >
          <span className={'material-symbols-outlined text-primary text-base'} aria-hidden="true">
            menu_book
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-headline font-bold')}>
            {t('settings.reading.heading', {}, { defaultValue: 'Reading preferences' })}
          </h2>
        </header>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <ToggleRow
            id="setting-hide-read"
            value={prefs.hideRead}
            disabled={!user || loading}
            onChange={(v) => update('hideRead', v)}
            title={t(
              'settings.hideRead.title',
              {},
              { defaultValue: 'Hide stories you have already read' },
            )}
            description={t(
              'settings.hideRead.description',
              {},
              {
                defaultValue:
                  'Stories you have opened in the last 24 hours will not appear in the briefing.',
              },
            )}
          />
        </div>
      </section>

      <section className={cm.stack(4)}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'border-b border-outline-variant/60 pb-2',
          )}
        >
          <span className={'material-symbols-outlined text-primary text-base'} aria-hidden="true">
            balance
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-headline font-bold')}>
            {t('settings.bias.heading', {}, { defaultValue: 'Bias awareness' })}
          </h2>
        </header>
        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
          <ToggleRow
            id="setting-bias-balanced"
            value={prefs.biasBalanced}
            disabled={!user || loading}
            onChange={(v) => update('biasBalanced', v)}
            title={t(
              'settings.biasBalanced.title',
              {},
              { defaultValue: 'Always show balanced coverage' },
            )}
            description={t(
              'settings.biasBalanced.description',
              {},
              {
                defaultValue:
                  'Pin a counter-perspective beneath each headline so you see at least one outlet from across the spectrum.',
              },
            )}
          />
          <ToggleRow
            id="setting-bias-meters"
            value={prefs.showBiasMeters}
            disabled={!user || loading}
            onChange={(v) => update('showBiasMeters', v)}
            title={t(
              'settings.showBiasMeters.title',
              {},
              { defaultValue: 'Show bias meters in the feed' },
            )}
            description={t(
              'settings.showBiasMeters.description',
              {},
              { defaultValue: 'Display the bias indicator beneath each story headline in lists.' },
            )}
          />
        </div>
      </section>

      <section className={cm.stack(4)}>
        <header
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'border-b border-outline-variant/60 pb-2',
          )}
        >
          <span className={'material-symbols-outlined text-primary text-base'} aria-hidden="true">
            language
          </span>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-headline font-bold')}>
            {t('footer.language', {}, { defaultValue: 'Language' })}
          </h2>
        </header>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.language.description',
            {},
            { defaultValue: 'Choose the language used throughout the briefing.' },
          )}
        </p>
        <LanguagePicker />
      </section>

      <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
        <div className={cm.sp('mb', 6)}>
          <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
            {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
          </h3>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'common.toggleLightDark',
              {},
              { defaultValue: 'Toggle between light and dark mode.' },
            )}
          </p>
        </div>
        <ThemeToggle />
      </section>
      <footer
        className={cm.cn(
          cm.sp('p', 6),
          cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          'rounded-2xl bg-surface-container-lowest border border-outline-variant/40',
        )}
      >
        <div>
          <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>
            {t('settings.signedInAs', { email }, { defaultValue: 'Signed in as {{email}}' })}
          </p>
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-1')}>
            {t(
              'settings.manageAccount',
              {},
              { defaultValue: 'Manage email, password, and subscription from the user menu.' },
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 2),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'bg-error/10 text-error hover:bg-error/20 transition-colors',
          )}
        >
          {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
        </button>
      </footer>
    </div>
  )
}
