// Phase 1 baseline — verbatim JSX of design-online-store-settings.html
// Do not hand-edit; Phase 2 will extract sections one at a time.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { NotificationsSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import SettingsAnnouncementBar from '../components/SettingsAnnouncementBar.js'
import SettingsDangerZone from '../components/SettingsDangerZone.js'
import SettingsDevicesCard from '../components/SettingsDevicesCard.js'
import SettingsNotificationsCard from '../components/SettingsNotificationsCard.js'
import SettingsPageHeader from '../components/SettingsPageHeader.js'
import SettingsPasswordCard from '../components/SettingsPasswordCard.js'
import SettingsProfileCard from '../components/SettingsProfileCard.js'
import SettingsSideNav from '../components/SettingsSideNav.js'
import SettingsTopNavBar from '../components/SettingsTopNavBar.js'
import SettingsTwoFactorCard from '../components/SettingsTwoFactorCard.js'
import StoreFooter from '../components/StoreFooter.js'
function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  type StoreUser = {
    id?: string
    name?: string
    email?: string
    oauthData?: {
      phone?: string
      location?: string
      notifications?: {
        orderUpdates?: boolean
        promotions?: boolean
        priceDrops?: boolean
        newsletter?: boolean
      }
    }
  }
  const auth = useAuth<StoreUser>()
  const user = auth.user
  const http = useHttpClient()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [activeSection, setActiveSection] = useState('profile')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [notifyOrderUpdates, setNotifyOrderUpdates] = useState(true)
  const [notifyPromotions, setNotifyPromotions] = useState(true)
  const [notifyPriceDrops, setNotifyPriceDrops] = useState(false)
  const [notifyNewsletter, setNotifyNewsletter] = useState(false)
  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      const od = user.oauthData ?? {}
      setPhone(od.phone || '')
      setLocation(od.location || '')
      const n = od.notifications ?? {}
      if (typeof n.orderUpdates === 'boolean') setNotifyOrderUpdates(n.orderUpdates)
      if (typeof n.promotions === 'boolean') setNotifyPromotions(n.promotions)
      if (typeof n.priceDrops === 'boolean') setNotifyPriceDrops(n.priceDrops)
      if (typeof n.newsletter === 'boolean') setNotifyNewsletter(n.newsletter)
    }
  }, [user])
  useEffect(() => {
    if (savedAt === null) return
    const timer = setTimeout(() => setSavedAt(null), 2500)
    return () => clearTimeout(timer)
  }, [savedAt])
  async function handleSave() {
    setProfileSaving(true)
    setSaveError(null)
    try {
      const oauthData = {
        phone,
        location,
        notifications: {
          orderUpdates: notifyOrderUpdates,
          promotions: notifyPromotions,
          priceDrops: notifyPriceDrops,
          newsletter: notifyNewsletter,
        },
      }
      await http.patch('/api/users/me', { name, email, oauthData })
      // Mirror the saved values into the auth client so a reload (which
      // reads user from storage) shows the values the user just saved.
      auth.setUser({ ...(user ?? {}), name, email, oauthData })
      setSavedAt(Date.now())
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : t('settings.saveError', {}, { defaultValue: 'Failed to save settings' }),
      )
    } finally {
      setProfileSaving(false)
    }
  }
  function handleDiscard() {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      const od = user.oauthData ?? {}
      setPhone(od.phone || '')
      setLocation(od.location || '')
      const n = od.notifications ?? {}
      setNotifyOrderUpdates(typeof n.orderUpdates === 'boolean' ? n.orderUpdates : true)
      setNotifyPromotions(typeof n.promotions === 'boolean' ? n.promotions : true)
      setNotifyPriceDrops(typeof n.priceDrops === 'boolean' ? n.priceDrops : false)
      setNotifyNewsletter(typeof n.newsletter === 'boolean' ? n.newsletter : false)
    }
    setCurrentPassword('')
    setNewPassword('')
  }
  async function handlePasswordSave() {
    setPasswordError(null)
    setPasswordSaving(true)
    try {
      await http.patch('/api/users/me/password', { currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : t('settings.changePasswordError', {}, { defaultValue: 'Failed to change password' }),
      )
    } finally {
      setPasswordSaving(false)
    }
  }
  async function handleSignOut() {
    setSigningOut(true)
    try {
      await auth.logout()
      navigate('/login')
    } finally {
      setSigningOut(false)
    }
  }
  return (
    <div className={cm.cn('bg-surface-secondary font-body text-foreground antialiased')}>
      {/* Announcement Bar */}
      <SettingsAnnouncementBar />
      {/* TopNavBar (Shared Component) */}
      <SettingsTopNavBar />
      <main className={cm.cn(cm.maxW('[1280px]'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 12))}>
        <SettingsPageHeader
          onSave={handleSave}
          onDiscard={handleDiscard}
          saving={profileSaving}
          savedAt={savedAt}
        />
        {saveError && (
          <p
            className={cm.cn(cm.sp('mb', 4), cm.textSize('sm'), 'text-error')}
            role="alert"
            data-mol-id="settings-save-error"
          >
            {saveError}
          </p>
        )}
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'xl' }), 'lg:grid-cols-12 items-start')}>
          {/* Sidebar Navigation */}
          <SettingsSideNav activeSection={activeSection} setActiveSection={setActiveSection} />
          {/* Settings Content */}
          <div className={cm.cn(cm.stack(8), 'lg:col-span-9')}>
            {/* Profile Section */}
            <SettingsProfileCard
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              location={location}
              setLocation={setLocation}
            />
            {/* Password Section */}
            <SettingsPasswordCard
              currentPassword={currentPassword}
              setCurrentPassword={setCurrentPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              onSave={handlePasswordSave}
              saving={passwordSaving}
              error={passwordError}
            />
            {/* Two-Factor Section */}
            <SettingsTwoFactorCard />
            {/* Notifications Section */}
            <SettingsNotificationsCard
              orderUpdates={notifyOrderUpdates}
              setOrderUpdates={setNotifyOrderUpdates}
              promotions={notifyPromotions}
              setPromotions={setNotifyPromotions}
              priceDrops={notifyPriceDrops}
              setPriceDrops={setNotifyPriceDrops}
              newsletter={notifyNewsletter}
              setNewsletter={setNotifyNewsletter}
            />
            {/* Push Notifications (browser) */}
            <div
              className={cm.cn(cm.sp('p', 6), 'bg-surface rounded-xl shadow-sm')}
              data-mol-id="section-push-notifications"
            >
              <NotificationsSection />
            </div>
            {/* Devices Section */}
            <SettingsDevicesCard />
            {/* Language Section */}
            <section
              className={cm.cn(cm.sp('p', 6), cm.stack(6), 'bg-surface rounded-xl shadow-sm')}
              data-mol-id="section-language"
              id="language"
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }), cm.sp('mb', 2))}>
                <span className={cm.cn('material-symbols-outlined text-green-600')}>language</span>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </h2>
              </div>
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
            {/* Sign Out */}
            <section
              className={cm.cn(
                cm.sp('p', 6),
                cm.flex({ align: 'center', justify: 'between', gap: 4 }),
                'bg-surface rounded-xl shadow-sm',
              )}
              data-mol-id="section-sign-out"
              id="sign-out"
            >
              <div>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                  {t('settings.signOutTitle', {}, { defaultValue: 'Sign Out' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.signOutDescription',
                    {},
                    { defaultValue: 'Sign out of your account on this device.' },
                  )}
                </p>
              </div>
              <button
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'bg-surface-secondary text-foreground rounded-md shadow-sm hover:bg-border transition-all',
                )}
                data-mol-id="sign-out"
                onClick={handleSignOut}
                disabled={signingOut}
              >
                {signingOut
                  ? t('common.signingOutEllipsis', {}, { defaultValue: 'Signing out…' })
                  : t('common.signOut', {}, { defaultValue: 'Sign Out' })}
              </button>
            </section>
            {/* Danger Zone */}
            <SettingsDangerZone />
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
