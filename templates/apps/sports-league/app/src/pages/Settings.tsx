import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { track } from '@molecule/app-analytics'
import { error as logError } from '@molecule/app-logger'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { SettingsPanel } from '../components/SettingsPanel.js'
import { unwrapList, unwrapObject } from '../lib/api.js'

interface SettingsToggle {
  key: 'score_alerts' | 'trade_alerts' | 'injury_alerts' | 'live_ticker'
  title: string
  body: string
  enabled: boolean
}

interface FavoriteTeamRow {
  id: string
  team_id: string
  team: {
    id: string
    name: string
    abbreviation?: string | null
    primary_color?: string | null
  } | null
}

const TOGGLE_DEFS: { key: SettingsToggle['key']; title: string; body: string }[] = [
  {
    key: 'score_alerts',
    title: 'Score alerts',
    body: 'Push when one of your favorite teams scores or concedes.',
  },
  {
    key: 'trade_alerts',
    title: 'Trade alerts',
    body: 'Push when a player you follow gets traded or signs.',
  },
  {
    key: 'injury_alerts',
    title: 'Injury alerts',
    body: 'Push for injury reports and roster updates league-wide.',
  },
  {
    key: 'live_ticker',
    title: 'Live ticker',
    body: 'Always show the navy scoreboard at the top of the dashboard.',
  },
]

const FALLBACK_NOTIFS = {
  score_alerts: true,
  trade_alerts: true,
  injury_alerts: false,
  live_ticker: true,
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [notifs, setNotifs] = useState(FALLBACK_NOTIFS)
  const [favorites, setFavorites] = useState<FavoriteTeamRow[]>([])
  const [accountOpen, setAccountOpen] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get('/api/profile/me').catch(() => null),
      http.get('/api/favorite-teams').catch(() => null),
    ]).then(([profile, favs]) => {
      if (cancelled) return
      const profileObj = unwrapObject<{ notifications?: typeof FALLBACK_NOTIFS }>(profile)
      if (profileObj?.notifications) {
        setNotifs({ ...FALLBACK_NOTIFS, ...profileObj.notifications })
      }
      setFavorites(unwrapList<FavoriteTeamRow>(favs))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [http])

  const toggleNotification = async (key: SettingsToggle['key']) => {
    const next = { ...notifs, [key]: !notifs[key] }
    setNotifs(next)
    setSavedKey(null)
    try {
      await http.patch('/api/profile/me', { notifications: { [key]: !notifs[key] } })
      void track({
        name: 'preferences.updated',
        properties: { preference: `notifications.${key}`, value: !notifs[key] },
      })
      setSavedKey(key)
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1500)
    } catch (error) {
      logError('settings.toggleNotification', error)
      // revert on failure
      setNotifs(notifs)
    }
  }

  const removeFavorite = async (favId: string) => {
    const previous = favorites
    setFavorites((prev) => prev.filter((f) => f.id !== favId))
    try {
      await http.delete(`/api/favorite-teams/${favId}`)
      void track({ name: 'favorite.removed', properties: { favorite_id: favId } })
    } catch (error) {
      logError('settings.removeFavorite', error)
      setFavorites(previous)
    }
  }

  const toggles: SettingsToggle[] = TOGGLE_DEFS.map((d) => ({
    ...d,
    enabled: notifs[d.key],
  }))

  return (
    <div className={cm.cn('px-4 py-6 sm:px-8 sm:py-8', cm.maxW('5xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn('text-[11px] font-black uppercase tracking-[0.28em] text-primary mb-2')}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'Personalize' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-on-surface-variant')}>
          {loading
            ? t('settings.loading', {}, { defaultValue: 'Loading your preferences\u2026' })
            : t(
                'settings.subtitle',
                {},
                {
                  defaultValue: 'Account, favorite teams, and what you want pushed to your phone.',
                },
              )}
        </p>
      </header>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('settings.favoritesHeading', {}, { defaultValue: 'Favorite teams' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.favoritesBody',
            {},
            { defaultValue: 'These teams get pinned to your dashboard and trigger score alerts.' },
          )}
        </p>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))}>
          {favorites.length === 0 && !loading ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant italic')}>
              {t(
                'settings.noFavorites',
                {},
                { defaultValue: 'No favorites yet \u2014 pick teams from the Teams page.' },
              )}
            </p>
          ) : null}
          {favorites.map((fav) => {
            const team = fav.team
            if (!team) return null
            return (
              <span
                key={fav.id}
                data-testid={`favorite-team-${team.abbreviation ?? team.id}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-full bg-surface border border-outline-variant/40 shadow-sm',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cm.cn(
                    'inline-block w-5 h-5 rounded-md ring-1 ring-outline-variant/40',
                  )}
                  style={{ backgroundColor: team.primary_color ?? 'var(--color-primary)' }}
                />
                <span className={cm.cn('text-sm font-bold tracking-tight')}>{team.name}</span>
                <button
                  type="button"
                  onClick={() => removeFavorite(fav.id)}
                  className={cm.cn('text-on-surface-variant hover:text-loss transition-colors')}
                  aria-label={t(
                    'settings.removeFavorite',
                    { team: team.name },
                    { defaultValue: 'Remove {{team}} from favorites' },
                  )}
                >
                  <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
                    close
                  </span>
                </button>
              </span>
            )
          })}
          <Link
            to="/teams"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              'rounded-full border border-dashed border-outline-variant text-on-surface-variant hover:bg-surface-container-low font-bold',
            )}
          >
            <span aria-hidden="true" className={cm.cn('material-symbols-outlined text-base')}>
              add
            </span>
            {t('settings.addFavorite', {}, { defaultValue: 'Add team' })}
          </Link>
        </div>
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('settings.notificationsHeading', {}, { defaultValue: 'Notifications & display' })}
        </h2>
        <ul
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            'divide-y divide-outline-variant/40 rounded-2xl bg-surface border border-outline-variant/40 overflow-hidden',
          )}
        >
          {toggles.map((toggle) => (
            <li
              key={toggle.key}
              className={cm.cn(
                cm.flex({ align: 'start', justify: 'between', gap: 'md' }),
                cm.sp('p', 5),
              )}
            >
              <div className={cm.flex1}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'text-on-surface tracking-tight',
                  )}
                >
                  {t(`settings.toggle.${toggle.key}.title`, {}, { defaultValue: toggle.title })}
                </p>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mt', 1),
                    'text-on-surface-variant leading-relaxed',
                  )}
                >
                  {t(`settings.toggle.${toggle.key}.body`, {}, { defaultValue: toggle.body })}
                </p>
                {savedKey === toggle.key ? (
                  <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 1), 'text-primary font-bold')}>
                    {t('settings.saved', {}, { defaultValue: 'Saved' })}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                role="switch"
                data-testid={`toggle-${toggle.key}`}
                aria-checked={toggle.enabled}
                onClick={() => toggleNotification(toggle.key)}
                className={cm.cn(
                  'relative w-12 h-7 rounded-full transition-colors shrink-0',
                  toggle.enabled ? 'bg-primary' : 'bg-surface-container',
                )}
              >
                <span
                  className={cm.cn(
                    'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform',
                    toggle.enabled ? 'translate-x-5' : '',
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('settings.account', {}, { defaultValue: 'Account' })}
        </h2>
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            'rounded-full bg-surface border border-outline-variant hover:bg-surface-container-low transition-colors w-fit',
          )}
        >
          {t('settings.openAccount', {}, { defaultValue: 'Manage account, security, and devices' })}
        </button>
        {accountOpen ? <SettingsPanel onClose={() => setAccountOpen(false)} /> : null}
      </section>

      <section className={cm.stack(4)}>
        <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
          {t('footer.language', {}, { defaultValue: 'Language' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'common.chooseTheLanguage',
            {},
            { defaultValue: 'Choose the language used throughout the app.' },
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
    </div>
  )
}
