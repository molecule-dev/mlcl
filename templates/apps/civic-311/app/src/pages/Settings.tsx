import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import SettingsAppearanceSection from '../components/SettingsAppearanceSection.js'
import SettingsDangerZone from '../components/SettingsDangerZone.js'
import SettingsNotificationsSection from '../components/SettingsNotificationsSection.js'
import SettingsPageHeader from '../components/SettingsPageHeader.js'
import SettingsProfileSection from '../components/SettingsProfileSection.js'
import SettingsSecuritySection from '../components/SettingsSecuritySection.js'
import SettingsTeamSection from '../components/SettingsTeamSection.js'
import SettingsTopBar from '../components/SettingsTopBar.js'
import SideNavBar from '../components/SideNavBar.js'
import { applyThemeAttribute } from '../lib/theme.js'

interface MeResponse {
  id: string
  email: string | null
  name: string | null
  profile?: {
    jobTitle?: string | null
    timezone?: string | null
  }
  notification_preferences?: {
    statusEmail?: boolean
    watchAreaEmail?: boolean
    confirmationsEmail?: boolean
    commentEmail?: boolean
    weeklyDigest?: boolean
    digestFrequency?: string
  }
  preferences?: {
    theme?: 'light' | 'dark' | 'system'
    language?: string
    compactMode?: boolean
  }
}

interface WatchAreaRow {
  id: string
  name: string
  radius: number
  derived_address: string
}

function Settings() {
  const cm = getClassMap()
  const { user } = useAuth()
  const http = useHttpClient()
  const userData = user as Record<string, unknown> | null
  const { t } = useTranslation()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [timezone, setTimezone] = useState(
    t('settings.defaultTimezone', {}, { defaultValue: '(GMT-08:00) Pacific Time (US & Canada)' }),
  )
  const [statusEmail, setStatusEmail] = useState(true)
  const [watchAreaEmail, setWatchAreaEmail] = useState(true)
  const [confirmationsEmail, setConfirmationsEmail] = useState(false)
  const [commentEmail, setCommentEmail] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [digestFrequency, setDigestFrequency] = useState(
    t('settings.defaultDigestFrequency', {}, { defaultValue: 'Every hour' }),
  )
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('light')
  const [language, setLanguage] = useState(
    t('settings.defaultLanguage', {}, { defaultValue: 'English (US)' }),
  )
  const [compactMode, setCompactMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [savingAppearance, setSavingAppearance] = useState(false)
  const [zones, setZones] = useState<WatchAreaRow[]>([])

  // Geofence presets summary (design: Geofence & Spatial Watch Presets) — a
  // read-only mirror of the caller's watch areas, managed on /watch-areas.
  useEffect(() => {
    let cancelled = false
    async function loadZones() {
      try {
        const res = await http.get('/api/watch-areas')
        const raw: WatchAreaRow[] = Array.isArray(res)
          ? (res as WatchAreaRow[])
          : Array.isArray((res as { data?: unknown })?.data)
            ? (res as { data: WatchAreaRow[] }).data
            : []
        if (!cancelled) setZones(raw)
      } catch (_error) {
        // Summary is a nice-to-have — settings save flows don't depend on it.
      }
    }
    void loadZones()
    return () => {
      cancelled = true
    }
  }, [http])

  // Theme picks immediately apply to <html data-theme>; persistence happens
  // when the user clicks Save. This preserves the design contract: the
  // page reflects the new theme the moment you click it, even before the
  // PUT round-trips.
  function setTheme(next: 'light' | 'dark' | 'system') {
    setThemeState(next)
    applyThemeAttribute(next)
  }

  // Hydrate from /api/users/me on mount so saved preferences round-trip
  // through reload. Falls back to the auth context for the basic email/name.
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (userData) {
        setEmail((userData.email as string) || '')
        setName((userData.name as string) || '')
      }
      try {
        const res = await http.get<MeResponse>('/api/users/me')
        if (cancelled) return
        const me = (res as unknown as { data?: MeResponse })?.data ?? (res as unknown as MeResponse)
        if (!me) return
        if (me.email) setEmail(me.email)
        if (me.name !== null && me.name !== undefined) setName(me.name)
        if (me.profile?.jobTitle != null) setJobTitle(me.profile.jobTitle)
        if (me.profile?.timezone != null) setTimezone(me.profile.timezone)
        const np = me.notification_preferences ?? {}
        if (typeof np.statusEmail === 'boolean') setStatusEmail(np.statusEmail)
        if (typeof np.watchAreaEmail === 'boolean') setWatchAreaEmail(np.watchAreaEmail)
        if (typeof np.confirmationsEmail === 'boolean') setConfirmationsEmail(np.confirmationsEmail)
        if (typeof np.commentEmail === 'boolean') setCommentEmail(np.commentEmail)
        if (typeof np.weeklyDigest === 'boolean') setWeeklyDigest(np.weeklyDigest)
        if (np.digestFrequency) setDigestFrequency(np.digestFrequency)
        const pr = me.preferences ?? {}
        if (pr.theme) {
          setThemeState(pr.theme)
          applyThemeAttribute(pr.theme)
        }
        if (pr.language) setLanguage(pr.language)
        if (typeof pr.compactMode === 'boolean') setCompactMode(pr.compactMode)
        // Hydration failure is safe to ignore — form fields stay at their defaults
      } catch (_error) {
        // intentional noop — UI defaults remain; user can still edit and save
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, http]) // userData is derived from user — re-running on user change is sufficient

  async function handleProfileSave() {
    setSaving(true)
    setMessage(null)
    try {
      await http.put('/api/users/me', { name, jobTitle, timezone })
      // Email lives on the canonical user record, not the /me preferences
      // surface — persist it through the molecule user resource's
      // PATCH /api/users/:id (auth-self) endpoint.
      const userId = userData?.id as string | undefined
      if (userId && email) {
        await http.patch(`/api/users/${userId}`, { email })
      }
      setMessage({
        type: 'success',
        text: t(
          'settings.profileSaveSuccess',
          {},
          { defaultValue: 'Profile updated successfully.' },
        ),
      })
    } catch (error) {
      logError('settings.handleProfileSave', error)
      setMessage({
        type: 'error',
        text: t('settings.profileSaveError', {}, { defaultValue: 'Failed to update profile.' }),
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    setDeactivating(true)
    try {
      await http.put('/api/users/me/deactivate', {})
      window.location.href = '/login'
    } catch (error) {
      logError('settings.handleDeactivate', error)
      setMessage({
        type: 'error',
        text: t('settings.deactivateError', {}, { defaultValue: 'Failed to deactivate account.' }),
      })
      setDeactivating(false)
    }
  }

  async function handleNotificationsSave() {
    setSavingNotifications(true)
    setMessage(null)
    try {
      await http.put('/api/users/me/notification-preferences', {
        statusEmail,
        watchAreaEmail,
        confirmationsEmail,
        commentEmail,
        weeklyDigest,
        digestFrequency,
      })
      setMessage({
        type: 'success',
        text: t(
          'settings.notificationsSaveSuccess',
          {},
          { defaultValue: 'Notification preferences updated successfully.' },
        ),
      })
    } catch (error) {
      logError('settings.handleNotificationsSave', error)
      setMessage({
        type: 'error',
        text: t(
          'settings.notificationsSaveError',
          {},
          { defaultValue: 'Failed to update notification preferences.' },
        ),
      })
    } finally {
      setSavingNotifications(false)
    }
  }

  async function handleAppearanceSave() {
    setSavingAppearance(true)
    setMessage(null)
    try {
      await http.put('/api/users/me/preferences', { theme, language, compactMode })
      setMessage({
        type: 'success',
        text: t(
          'settings.appearanceSaveSuccess',
          {},
          { defaultValue: 'Appearance settings updated successfully.' },
        ),
      })
    } catch (error) {
      logError('settings.handleAppearanceSave', error)
      setMessage({
        type: 'error',
        text: t(
          'settings.appearanceSaveError',
          {},
          { defaultValue: 'Failed to update appearance settings.' },
        ),
      })
    } finally {
      setSavingAppearance(false)
    }
  }

  return (
    <div className={cm.cn(cm.surface, 'selection:bg-primary-fixed')}>
      {/* Shell Layout — column on mobile (top bar stacks above content),
          sidebar row from md up. */}
      <div className={cm.cn(cm.flex({ direction: 'col' }), 'md:flex-row', cm.minH('screen'))}>
        <SideNavBar>
          {/* Main Content Area */}
          <main className={cm.cn(cm.flex1, cm.minH('screen'), 'bg-surface')}>
            {/* TopAppBar */}
            <SettingsTopBar />
            <div
              className={cm.cn(
                cm.mxAuto,
                cm.sp('px', 8),
                cm.sp('py', 12),
                cm.maxW('4xl'),
                cm.stack(10),
              )}
            >
              <SettingsPageHeader />
              {message && (
                <div
                  data-mol-id="settings-message"
                  data-mol-message-type={message.type}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-lg',
                    message.type === 'success'
                      ? 'bg-tertiary-container text-on-tertiary-container'
                      : 'bg-error-container text-on-error-container',
                    cm.flex({ justify: 'between', align: 'center' }),
                  )}
                >
                  {message.text}
                  <button
                    onClick={() => setMessage(null)}
                    className={cm.cn(
                      cm.sp('ml', 4),
                      cm.textSize('xs'),
                      'underline opacity-80 hover:opacity-100',
                    )}
                  >
                    {t('common.dismiss', {}, { defaultValue: 'Dismiss' })}
                  </button>
                </div>
              )}
              {/* 1. Profile Settings */}
              <SettingsProfileSection
                name={name}
                setName={setName}
                email={email}
                setEmail={setEmail}
                jobTitle={jobTitle}
                setJobTitle={setJobTitle}
                timezone={timezone}
                setTimezone={setTimezone}
                saving={saving}
                onSave={handleProfileSave}
              />
              {/* 2. Notification Preferences */}
              <SettingsNotificationsSection
                statusEmail={statusEmail}
                setStatusEmail={setStatusEmail}
                watchAreaEmail={watchAreaEmail}
                setWatchAreaEmail={setWatchAreaEmail}
                confirmationsEmail={confirmationsEmail}
                setConfirmationsEmail={setConfirmationsEmail}
                commentEmail={commentEmail}
                setCommentEmail={setCommentEmail}
                weeklyDigest={weeklyDigest}
                setWeeklyDigest={setWeeklyDigest}
                digestFrequency={digestFrequency}
                setDigestFrequency={setDigestFrequency}
                saving={savingNotifications}
                onSave={handleNotificationsSave}
              />
              {/* 3. Appearance */}
              <SettingsAppearanceSection
                theme={theme}
                setTheme={setTheme}
                language={language}
                setLanguage={setLanguage}
                compactMode={compactMode}
                setCompactMode={setCompactMode}
                saving={savingAppearance}
                onSave={handleAppearanceSave}
              />
              {/* 3b. Geofence & Spatial Watch Presets (design) — read-only
                mirror of the caller's watch areas; editing lives on
                /watch-areas so the geofence CRUD has one home. */}
              <section
                data-mol-id="settings-geofence-presets"
                className={cm.cn(
                  cm.stack(3),
                  cm.sp('p', 8),
                  'bg-surface-container-lowest rounded-xl shadow-sm',
                )}
              >
                <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
                  {t(
                    'settings.geofenceTitle',
                    {},
                    { defaultValue: 'Geofence & Spatial Watch Presets' },
                  )}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.geofenceBody',
                    {},
                    {
                      defaultValue:
                        'Named circles on the city grid that scope your dispatch telemetry. Create or edit them from the Watch Areas screen.',
                    },
                  )}
                </p>
                {zones.length === 0 ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t('settings.geofenceEmpty', {}, { defaultValue: 'No geofence presets yet.' })}{' '}
                    <Link
                      data-mol-id="settings-geofence-link"
                      className="text-primary underline"
                      to="/watch-areas"
                    >
                      {t('settings.geofenceCta', {}, { defaultValue: 'Create a watch area' })}
                    </Link>
                  </p>
                ) : (
                  <ul className={cm.stack(2)}>
                    {zones.map((zone) => (
                      <li
                        key={zone.id}
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between', gap: 3 }),
                          cm.sp('p', 3),
                          'rounded-lg border border-outline-variant/40 bg-surface-container-low',
                        )}
                      >
                        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                          {zone.name}
                        </span>
                        <span
                          className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}
                        >
                          {zone.derived_address}
                        </span>
                        <span
                          className={cm.cn(cm.textSize('xs'), 'shrink-0 text-on-surface-variant')}
                        >
                          {t(
                            'settings.geofenceRadius',
                            { radius: zone.radius },
                            { defaultValue: '{{radius}} blocks' },
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              {/* 3c. Civic Transparency & Privacy Safeguards (design) — the
                public-record statements and the legal links. */}
              <section
                data-mol-id="settings-transparency"
                className={cm.cn(
                  cm.stack(3),
                  cm.sp('p', 8),
                  'bg-surface-container-lowest rounded-xl shadow-sm',
                )}
              >
                <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
                  {t(
                    'settings.transparencyTitle',
                    {},
                    { defaultValue: 'Civic Transparency & Privacy Safeguards' },
                  )}
                </h3>
                <ul className={cm.stack(2)}>
                  {(
                    [
                      [
                        'settings.transparencyItem1',
                        'Public docket:',
                        ' your reports are part of the open municipal ledger; your identity is never shown on it.',
                      ],
                      [
                        'settings.transparencyItem2',
                        'PII redaction:',
                        ' phone numbers, emails, and precise home addresses are stripped from public exports.',
                      ],
                      [
                        'settings.transparencyItem3',
                        'No data sale:',
                        ' 311 telemetry is never sold, licensed to brokers, or used for ad targeting.',
                      ],
                    ] as const
                  ).map(([key, bold, rest]) => (
                    <li
                      key={key}
                      className={cm.cn(
                        cm.flex({ align: 'start', gap: 2 }),
                        cm.textSize('sm'),
                        'text-on-surface-variant',
                      )}
                    >
                      <span
                        className="material-symbols-outlined mt-0.5 shrink-0 text-[16px] text-primary"
                        aria-hidden
                      >
                        verified_user
                      </span>
                      <span>
                        <strong className="text-on-surface">
                          {t(`${key}.bold`, {}, { defaultValue: bold })}
                        </strong>
                        {t(key, {}, { defaultValue: rest })}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className={cm.flex({ gap: 3, wrap: 'wrap' })}>
                  <Link
                    data-mol-id="settings-privacy-link"
                    to="/privacy"
                    className={cnLegalLink(cm)}
                  >
                    {t(
                      'settings.privacyLink',
                      {},
                      { defaultValue: 'Privacy & Public Records Policy' },
                    )}
                  </Link>
                  <Link data-mol-id="settings-terms-link" to="/terms" className={cnLegalLink(cm)}>
                    {t('settings.termsLink', {}, { defaultValue: 'Terms of Service' })}
                  </Link>
                </div>
              </section>
              <SettingsSecuritySection />
              <SettingsTeamSection />
              {/* Danger Zone */}
              <SettingsDangerZone onDeactivate={handleDeactivate} deactivating={deactivating} />
            </div>
          </main>
        </SideNavBar>
      </div>
    </div>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }

/** Legal link chip in the transparency section. */
const cnLegalLink = (cm: ReturnType<typeof getClassMap>): string =>
  cm.cn(
    cm.sp('px', 4),
    cm.sp('py', 2),
    cm.textSize('sm'),
    cm.fontWeight('medium'),
    'rounded-lg border border-outline-variant text-on-surface transition-colors hover:bg-surface-container-low',
  )
