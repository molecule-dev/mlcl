import { useEffect, useState } from 'react'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import SettingsAppearanceSection from '../components/SettingsAppearanceSection.js'
import SettingsDangerZoneSection from '../components/SettingsDangerZoneSection.js'
import SettingsDeliverabilitySection from '../components/SettingsDeliverabilitySection.js'
import SettingsFormFooter from '../components/SettingsFormFooter.js'
import SettingsNotificationsSection from '../components/SettingsNotificationsSection.js'
import SettingsPageHeader from '../components/SettingsPageHeader.js'
import SettingsPrivacySection from '../components/SettingsPrivacySection.js'
import SettingsProfileSection from '../components/SettingsProfileSection.js'
import SettingsPublicationSection from '../components/SettingsPublicationSection.js'

interface ProfileResponse {
  id: string
  name: string | null
  email: string | null
  preferences: {
    theme: 'light' | 'dark' | 'system'
    fontSize: 'small' | 'medium' | 'large'
    bio: string
    profileVisible: boolean
    showEmail: boolean
    newFollowers: boolean
    commentsNotif: boolean
    mentionsNotif: boolean
  }
}

function applyThemeAndFontSize(
  theme: 'light' | 'dark' | 'system',
  fontSize: 'small' | 'medium' | 'large',
) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const resolvedTheme =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme
  root.dataset.theme = resolvedTheme
  root.dataset.fontSize = fontSize
}

function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth()
  const http = useHttpClient()
  const userData = user as Record<string, unknown> | null

  const [name, setName] = useState((userData?.name as string) || '')
  const [email, setEmail] = useState((userData?.email as string) || '')
  const [bio, setBio] = useState('')
  const [profileVisible, setProfileVisible] = useState(true)
  const [showEmail, setShowEmail] = useState(false)
  const [newFollowers, setNewFollowers] = useState(true)
  const [commentsNotif, setCommentsNotif] = useState(true)
  const [mentionsNotif, setMentionsNotif] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ProfileResponse>('/api/profile/me')
      .then((res) => {
        if (cancelled) return
        const payload = res.data
        if (!payload || !payload.id) return
        setName(payload.name ?? '')
        if (payload.email) setEmail(payload.email)
        const p = payload.preferences ?? null
        if (p) {
          setBio(p.bio ?? '')
          setProfileVisible(p.profileVisible)
          setShowEmail(p.showEmail)
          setNewFollowers(p.newFollowers)
          setCommentsNotif(p.commentsNotif)
          setMentionsNotif(p.mentionsNotif)
          setTheme(p.theme)
          setFontSize(p.fontSize)
          applyThemeAndFontSize(p.theme, p.fontSize)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [http])

  function handleThemeChange(next: 'light' | 'dark' | 'system') {
    setTheme(next)
    applyThemeAndFontSize(next, fontSize)
  }

  function handleFontSizeChange(next: 'small' | 'medium' | 'large') {
    setFontSize(next)
    applyThemeAndFontSize(theme, next)
  }

  async function handleSave() {
    if (!userData?.id) return
    setLoading(true)
    setMessage(null)
    try {
      const updates: Record<string, unknown> = {}
      if (name) updates.name = name
      if (email) updates.email = email
      // 1. Update profile name on the user resource. The molecule resource
      //    handlers expect the request body to be the patch object directly
      //    (NOT wrapped in `{ data: ... }`).
      if (Object.keys(updates).length > 0) {
        await http.patch(`/api/users/${userData.id}`, updates)
      }
      // 2. Persist UI preferences (theme/font/bio/etc) on oauthData via the per-app endpoint
      await http.patch('/api/profile/preferences', {
        theme,
        fontSize,
        bio,
        profileVisible,
        showEmail,
        newFollowers,
        commentsNotif,
        mentionsNotif,
      })
      applyThemeAndFontSize(theme, fontSize)
      setMessage({
        type: 'success',
        text: t('settings.saveSuccess', {}, { defaultValue: 'Settings saved successfully.' }),
      })
    } catch (e) {
      setMessage({
        type: 'error',
        text:
          e instanceof Error
            ? e.message
            : t('settings.saveError', {}, { defaultValue: 'Failed to save settings.' }),
      })
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    setMessage(null)
  }

  async function handleDeleteAccount() {
    try {
      await http.delete(`/api/users/${userData?.id}`)
      window.location.href = '/'
    } catch (e) {
      setMessage({
        type: 'error',
        text:
          e instanceof Error
            ? e.message
            : t(
                'settings.failedToDeleteAccount',
                {},
                { defaultValue: 'Failed to delete account.' },
              ),
      })
    }
  }

  return (
    // Chrome (sidebar/topbar/drawer) comes from StudioLayout; this is content
    // only — padding stays inside the page. The global Save action (formerly
    // the top nav's) lives here now, wired to the same handler and e2e id.
    <div className={cm.cn('px-4 md:px-16', 'max-w-4xl', 'pt-6 md:pt-10 pb-16 md:pb-24')}>
      <div className={cm.cn(cm.flex({ justify: 'end' }), cm.sp('mb', 4))}>
        <button
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 2),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'bg-primary text-on-primary font-label uppercase tracking-widest hover:scale-95 active:scale-90 transition-transform',
          )}
          data-mol-id="save-settings-top"
          onClick={handleSave}
          disabled={loading}
        >
          {loading
            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
            : t('common.saveChanges', {}, { defaultValue: 'Save Changes' })}
        </button>
      </div>
      <SettingsPageHeader />
      {message && (
        <div
          data-mol-id="settings-message"
          className={cm.cn(
            cm.sp('mb', 8),
            cm.sp('p', 4),
            'rounded-lg',
            message.type === 'success'
              ? 'bg-success-container text-on-success-container'
              : 'bg-error-container text-on-error-container',
          )}
          role="alert"
        >
          {message.text}
        </div>
      )}
      <div className={cm.stack(10)}>
        <SettingsPublicationSection />
        <SettingsProfileSection
          name={name}
          bio={bio}
          setName={setName}
          setBio={setBio}
          email={email}
          setEmail={setEmail}
        />
        <SettingsAppearanceSection
          theme={theme === 'system' ? 'light' : theme}
          fontSize={fontSize}
          onThemeChange={(next) => handleThemeChange(next)}
          onFontSizeChange={(next) => handleFontSizeChange(next)}
        />
        <section
          data-mol-id="settings-language-section"
          className={cm.cn(
            cm.grid({ cols: 1, gap: 'none' }),
            'md:grid-cols-12 items-start gap-x-10 gap-y-6',
          )}
        >
          <div className={cm.cn('md:col-span-4')}>
            <h3 className={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'), 'font-headline')}>
              {t('footer.language', {}, { defaultValue: 'Language' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.sp('mt', 2),
                'text-on-surface-variant font-label',
              )}
            >
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 8),
              'md:col-span-8 bg-surface-container-lowest rounded-xl editorial-shadow',
            )}
          >
            <LanguagePicker />
          </div>
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
        <SettingsNotificationsSection
          newFollowers={newFollowers}
          commentsNotif={commentsNotif}
          mentionsNotif={mentionsNotif}
          onToggleNewFollowers={(checked) => setNewFollowers(checked)}
          onToggleComments={(checked) => setCommentsNotif(checked)}
          onToggleMentions={(checked) => setMentionsNotif(checked)}
        />
        <SettingsPrivacySection
          profileVisible={profileVisible}
          showEmail={showEmail}
          onToggleVisibility={(checked) => setProfileVisible(checked)}
          onToggleShowEmail={(checked) => setShowEmail(checked)}
        />
        <SettingsDeliverabilitySection />
        <SettingsDangerZoneSection onDelete={handleDeleteAccount} />
      </div>
      <SettingsFormFooter onSave={handleSave} loading={loading} onCancel={handleCancel} />
    </div>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
