import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, Switch, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { KbdBadge } from '../components/KbdBadge.js'
import { PageHeader } from '../components/PageHeader.js'
import { useFetchOne } from '../lib/use-fetch.js'

interface ShortcutRow {
  key: string
  defaultLabel: string
  shortcut: string
}

const SHORTCUTS: ReadonlyArray<ShortcutRow> = [
  { key: 'palette', defaultLabel: 'Open command palette', shortcut: '⌘K' },
  { key: 'paste', defaultLabel: 'Paste last clip', shortcut: '⌘⇧V' },
  { key: 'pin', defaultLabel: 'Pin selected snippet', shortcut: '⌘P' },
  { key: 'encrypt', defaultLabel: 'Encrypt selected snippet', shortcut: '⌘E' },
  { key: 'category', defaultLabel: 'Filter by category', shortcut: '⌘1-5' },
  { key: 'delete', defaultLabel: 'Delete selected', shortcut: '⌘⌫' },
  { key: 'newClip', defaultLabel: 'Capture clipboard now', shortcut: '⌘⇧Y' },
  { key: 'preferences', defaultLabel: 'Open settings', shortcut: '⌘,' },
] as const

type ToggleKey = 'sync' | 'autoEncrypt' | 'desktopOverlay' | 'menuBar' | 'startAtLogin'

interface ToggleDescriptor {
  key: ToggleKey
  defaultLabel: string
  defaultDescription: string
}

const TOGGLES: ReadonlyArray<ToggleDescriptor> = [
  {
    key: 'sync',
    defaultLabel: 'Cloud sync',
    defaultDescription: 'Sync clips across every signed-in device, end-to-end encrypted.',
  },
  {
    key: 'autoEncrypt',
    defaultLabel: 'Auto-encrypt secrets',
    defaultDescription: 'Detect API keys, tokens and passwords and encrypt them automatically.',
  },
  {
    key: 'desktopOverlay',
    defaultLabel: 'Desktop overlay',
    defaultDescription: 'Show the palette as an always-on-top overlay on macOS and Windows.',
  },
  {
    key: 'menuBar',
    defaultLabel: 'Menu-bar status',
    defaultDescription: 'Show the {{appName}} icon in the system menu bar / system tray.',
  },
  {
    key: 'startAtLogin',
    defaultLabel: 'Launch at login',
    defaultDescription: 'Start {{appName}} automatically when you sign in to your machine.',
  },
]

interface ProfilePayload {
  id: string
  email: string | null
  name: string | null
  planKey: string
  theme: 'light' | 'dark' | 'system'
  toggles: Record<ToggleKey, boolean>
}

interface ClipExportRow {
  id: string
  title: string
  preview: string
  type: string
  is_pinned: boolean
  is_favorite: boolean
  is_sensitive: boolean
  created_at: string
}

const adaptProfile = (row: ProfilePayload): ProfilePayload => row

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()

  const adaptCb = useCallback(adaptProfile, [])
  const profile = useFetchOne<ProfilePayload, ProfilePayload>('/api/profile/me', adaptCb)

  const [toggles, setToggles] = useState<Record<ToggleKey, boolean>>({
    sync: true,
    autoEncrypt: true,
    desktopOverlay: true,
    menuBar: false,
    startAtLogin: true,
  })
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (profile.data?.toggles) {
      setToggles((prev) => ({ ...prev, ...profile.data!.toggles }))
    }
  }, [profile.data])

  const handleToggle = useCallback(
    async (key: ToggleKey) => {
      const next = { ...toggles, [key]: !toggles[key] }
      setToggles(next)
      try {
        await http.patch('/api/profile/me', { toggles: { [key]: next[key] } })
        setFeedback(t('settings.savedFeedback', {}, { defaultValue: 'Setting saved.' }))
      } catch (_error) {
        // Revert on failure
        setToggles(toggles)
        setFeedback(t('settings.saveError', {}, { defaultValue: 'Could not save setting.' }))
      }
    },
    [toggles, http, t],
  )

  const handleExport = useCallback(async () => {
    setFeedback(null)
    try {
      const res = await http.get<ClipExportRow[]>('/api/clips')
      const rows = Array.isArray(res.data) ? res.data : []
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `yank-clips-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      setFeedback(
        t(
          'settings.exportFeedback',
          { count: rows.length },
          {
            defaultValue: 'Exported {{count}} clips.',
          },
        ),
      )
    } catch (err) {
      setFeedback(
        (err instanceof Error && err.message) ||
          t('settings.exportError', {}, { defaultValue: 'Export failed.' }),
      )
    }
  }, [http, t])

  const handleWipeCache = useCallback(() => {
    try {
      Object.keys(globalThis.localStorage).forEach((k) => {
        if (k.startsWith('mol-cache:') || k.startsWith('yank-cache:')) {
          globalThis.localStorage.removeItem(k)
        }
      })
      setFeedback(t('settings.wipeFeedback', {}, { defaultValue: 'Local cache wiped.' }))
    } catch (_error) {
      /* ignore — non-browser env */
    }
  }, [t])

  const planName = useMemo(() => {
    const k = (profile.data?.planKey ?? 'free').toLowerCase()
    if (k.includes('team')) return 'Team'
    if (k.includes('pro') || k.includes('stripe')) return 'Pro'
    return 'Free'
  }, [profile.data?.planKey])

  return (
    <div className={cm.cn('p-4 md:p-8', cm.maxW('5xl'), cm.mxAuto, 'space-y-12')}>
      <PageHeader
        eyebrow={t('nav.preferences', {}, { defaultValue: 'Preferences' })}
        heading={t('nav.settings', {}, { defaultValue: 'Settings' })}
        description={t(
          'settings.description',
          { appName: APP_NAME },
          {
            defaultValue:
              'Customize shortcuts, sync, encryption and how {{appName}} shows up on your machine.',
          },
        )}
      />

      <section data-mol-id="plan-summary">
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'uppercase tracking-widest text-on-surface-variant font-mono',
          )}
        >
          {t('nav.plan', {}, { defaultValue: 'Plan' })}
        </h2>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'md' }),
            cm.sp('p', 5),
            'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
          )}
        >
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-2xl"
            style={{ color: 'var(--color-primary)' }}
          >
            workspace_premium
          </span>
          <div className={cm.cn('flex-1')}>
            <p
              className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
              data-mol-id="settings-plan-name"
            >
              {t(`settings.plan.${planName.toLowerCase()}`, {}, { defaultValue: planName })}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'settings.planHint',
                {},
                { defaultValue: 'Manage billing, invoices and seat limits on the Billing page.' },
              )}
            </p>
          </div>
          <Link
            to="/billing"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.sp('px', 4),
              cm.sp('py', 2),
              'rounded-md text-white hover:opacity-90 transition-opacity',
            )}
            style={{ background: 'var(--color-primary)' }}
          >
            {t('settings.viewBilling', {}, { defaultValue: 'View billing' })}
          </Link>
        </div>
      </section>

      <section>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'uppercase tracking-widest text-on-surface-variant font-mono',
          )}
        >
          {t('settings.shortcutsHeading', {}, { defaultValue: 'Keyboard shortcuts' })}
        </h2>
        <div
          className={cm.cn(
            'rounded-xl bg-surface-container-lowest border border-outline-variant/40 overflow-x-auto',
          )}
        >
          <table className={cm.cn('w-full')}>
            <tbody className="divide-y divide-outline-variant/40">
              {SHORTCUTS.map((s) => (
                <tr
                  key={s.key}
                  className={cm.cn('hover:bg-surface-container-low transition-colors')}
                >
                  <td
                    className={cm.cn(
                      cm.sp('px', 3),
                      'md:px-5',
                      cm.sp('py', 3),
                      cm.textSize('sm'),
                      'text-on-surface',
                    )}
                  >
                    {t(`settings.shortcut.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 3),
                      'md:px-5',
                      cm.sp('py', 3),
                      'text-right whitespace-nowrap',
                    )}
                  >
                    <KbdBadge>{s.shortcut}</KbdBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'uppercase tracking-widest text-on-surface-variant font-mono',
          )}
        >
          {t('settings.preferencesHeading', {}, { defaultValue: 'General' })}
        </h2>
        <div
          className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}
          data-mol-id="settings-toggles"
        >
          {TOGGLES.map((toggle) => {
            const enabled = toggles[toggle.key]
            return (
              <div
                key={toggle.key}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'md' }),
                  cm.sp('p', 4),
                  'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
                )}
                data-mol-id={`toggle-row-${toggle.key}`}
              >
                <div className={cm.cn('flex-1 min-w-0')}>
                  <p
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('semibold'),
                      'text-on-surface',
                    )}
                  >
                    {t(
                      `settings.toggle.${toggle.key}.label`,
                      {},
                      { defaultValue: toggle.defaultLabel },
                    )}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-0.5')}>
                    {t(
                      `settings.toggle.${toggle.key}.description`,
                      { appName: APP_NAME },
                      { defaultValue: toggle.defaultDescription },
                    )}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onChange={() => void handleToggle(toggle.key)}
                  data-mol-id={`toggle-${toggle.key}`}
                  aria-label={t(
                    `settings.toggle.${toggle.key}.label`,
                    {},
                    { defaultValue: toggle.defaultLabel },
                  )}
                />
              </div>
            )
          })}
        </div>
      </section>

      <section data-mol-id="settings-language">
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'uppercase tracking-widest text-on-surface-variant font-mono',
          )}
        >
          {t('settings.language.title', {}, { defaultValue: 'Language' })}
        </h2>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 5),
            'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'common.chooseTheLanguage',
              {},
              { defaultValue: 'Choose the language used throughout the app.' },
            )}
          </p>
          <LanguagePicker />
        </div>
      </section>

      <section className={cm.cn('p-4 md:p-8', 'bg-surface-container-low rounded-xl')}>
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
      <section>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'uppercase tracking-widest text-on-surface-variant font-mono',
          )}
        >
          {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
        </h2>
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 5),
            'rounded-xl bg-surface-container-lowest border border-outline-variant/40',
          )}
        >
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
            {t(
              'settings.privacyBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Encrypted clips are AES-256 encrypted server-side. {{appName}} servers do not return ciphertext through list endpoints.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <button
              onClick={handleExport}
              type="button"
              data-mol-id="settings-export"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-md bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface',
              )}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                download
              </span>
              {t('settings.exportData', {}, { defaultValue: 'Export all clips' })}
            </button>
            <button
              onClick={handleWipeCache}
              type="button"
              data-mol-id="settings-wipe"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'rounded-md bg-error-container/30 hover:bg-error-container/50 text-error transition-colors',
              )}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                delete_forever
              </span>
              {t('settings.wipeAll', {}, { defaultValue: 'Wipe local cache' })}
            </button>
          </div>
          {feedback && (
            <p
              role="status"
              data-mol-id="settings-feedback"
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}
            >
              {feedback}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

export default Settings
export { Settings as SettingsPage }
