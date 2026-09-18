import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { error as logError } from '@molecule/app-logger'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import SettingsBottomActionBar from '../components/SettingsBottomActionBar.js'
import SettingsPageHeader from '../components/SettingsPageHeader.js'
import SettingsProfileCard from '../components/SettingsProfileCard.js'
import SettingsSideNavBar from '../components/SettingsSideNavBar.js'
import SettingsTopAppBar from '../components/SettingsTopAppBar.js'

interface PropertyHubProfile {
  phone?: string
  bio?: string
  notifyEmail?: boolean
  notifySms?: boolean
  notifyNewLeads?: boolean
  notifyShowings?: boolean
}

interface UserRow {
  id?: string
  name?: string
  email?: string
  oauthData?: { propertyhub?: PropertyHubProfile } & Record<string, unknown>
}

function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserRow>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [deletingAccount, setDeletingAccount] = useState(false)

  const initialProfile = user?.oauthData?.propertyhub ?? {}
  const [firstName, setFirstName] = useState(user?.name?.split(' ')[0] ?? '')
  const [lastName, setLastName] = useState(user?.name?.split(' ').slice(1).join(' ') ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(initialProfile.phone ?? '')
  const [bio, setBio] = useState(initialProfile.bio ?? '')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [notifyEmail, setNotifyEmail] = useState(initialProfile.notifyEmail ?? true)
  const [notifySms, setNotifySms] = useState(initialProfile.notifySms ?? false)
  const [notifyNewLeads, setNotifyNewLeads] = useState(initialProfile.notifyNewLeads ?? true)
  const [notifyShowings, setNotifyShowings] = useState(initialProfile.notifyShowings ?? true)

  // Re-fetch the canonical user row on mount so the form reflects any
  // server-side changes made since login (defends against stale auth
  // cache after an out-of-band update).
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    http
      .get<UserRow | { props: UserRow }>(`/api/users/${user.id}`)
      .then((res) => {
        if (cancelled) return
        // The User resource wraps responses as { props: {...} }. The HTTP
        // client itself wraps as { data }. Walk both layers.
        const raw = res.data
        const body = raw && typeof raw === 'object' && 'props' in raw ? raw.props : raw
        if (!body || typeof body !== 'object') return
        const ph = body.oauthData?.propertyhub ?? {}
        setFirstName(body.name?.split(' ')[0] ?? '')
        setLastName(body.name?.split(' ').slice(1).join(' ') ?? '')
        setEmail(body.email ?? '')
        if (ph.phone !== undefined) setPhone(ph.phone)
        if (ph.bio !== undefined) setBio(ph.bio)
        if (ph.notifyEmail !== undefined) setNotifyEmail(ph.notifyEmail)
        if (ph.notifySms !== undefined) setNotifySms(ph.notifySms)
        if (ph.notifyNewLeads !== undefined) setNotifyNewLeads(ph.notifyNewLeads)
        if (ph.notifyShowings !== undefined) setNotifyShowings(ph.notifyShowings)
      })
      .catch((error: unknown) => {
        // Best-effort freshness refresh — the form already rendered from the
        // auth cache, so a failed re-fetch just means possibly-stale values.
        logError('settings.refreshUser', error)
      })
    return () => {
      cancelled = true
    }
  }, [http, user?.id])

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  async function handleProfileSave() {
    setSavingProfile(true)
    setProfileSuccess('')
    setProfileError('')
    if (!user?.id) {
      setProfileError(t('settings.notSignedIn', {}, { defaultValue: 'You are not signed in.' }))
      setSavingProfile(false)
      return
    }
    try {
      // The User resource schema only natively supports name + email on the
      // top-level row. Phone, bio, and notification preferences ride along
      // in the freeform `oauthData.propertyhub` namespace — that is the
      // documented extensibility hook on the User row.
      const existingOAuth = (user.oauthData ?? {}) as Record<string, unknown>
      await http.patch(`/api/users/${user.id}`, {
        name: `${firstName} ${lastName}`.trim(),
        email,
        oauthData: {
          ...existingOAuth,
          propertyhub: {
            phone,
            bio,
            notifyEmail,
            notifySms,
            notifyNewLeads,
            notifyShowings,
          },
        },
      })
      setProfileSuccess(
        t('settings.profileUpdateSuccess', {}, { defaultValue: 'Profile updated successfully.' }),
      )
    } catch (error) {
      logError('settings.profileSave', error)
      setProfileError(
        t('settings.profileUpdateError', {}, { defaultValue: 'Failed to update profile.' }),
      )
    } finally {
      setSavingProfile(false)
    }
  }

  function handleDiscard() {
    const ph = user?.oauthData?.propertyhub ?? {}
    setFirstName(user?.name?.split(' ')[0] ?? '')
    setLastName(user?.name?.split(' ').slice(1).join(' ') ?? '')
    setEmail(user?.email ?? '')
    setPhone(ph.phone ?? '')
    setBio(ph.bio ?? '')
    setNotifyEmail(ph.notifyEmail ?? true)
    setNotifySms(ph.notifySms ?? false)
    setNotifyNewLeads(ph.notifyNewLeads ?? true)
    setNotifyShowings(ph.notifyShowings ?? true)
    setProfileSuccess('')
    setProfileError('')
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      setPasswordError(
        t('settings.passwordMismatchError', {}, { defaultValue: 'New passwords do not match.' }),
      )
      return
    }
    if (!user?.id) {
      setPasswordError(t('settings.notSignedIn', {}, { defaultValue: 'You are not signed in.' }))
      return
    }
    setSavingPassword(true)
    setPasswordSuccess('')
    setPasswordError('')
    try {
      await http.patch(`/api/users/${user.id}/password`, {
        currentPassword,
        newPassword,
      })
      setPasswordSuccess(
        t('settings.passwordChangeSuccess', {}, { defaultValue: 'Password changed successfully.' }),
      )
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      logError('settings.passwordChange', error)
      setPasswordError(
        t('settings.changePasswordModal.error', {}, { defaultValue: 'Failed to change password.' }),
      )
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleDeleteAccount() {
    if (
      !window.confirm(
        t(
          'settings.deleteAccountConfirmation',
          {},
          {
            defaultValue:
              'Are you sure you want to permanently delete your account? This action cannot be undone.',
          },
        ),
      )
    )
      return
    if (!user?.id) {
      alert(t('settings.notSignedIn', {}, { defaultValue: 'You are not signed in.' }))
      return
    }
    setDeletingAccount(true)
    try {
      await http.delete(`/api/users/${user.id}`)
      navigate('/login')
    } catch (error) {
      logError('settings.deleteAccount', error)
      alert(t('settings.failedToDeleteAccount', {}, { defaultValue: 'Failed to delete account.' }))
    } finally {
      setDeletingAccount(false)
    }
  }

  return (
    <div className={cm.cn(cm.surface, 'font-body text-on-surface')}>
      {/* Sidebar Navigation Shell */}
      <SettingsSideNavBar />
      <SettingsTopAppBar />
      {/* Main Content Area */}
      <main className={cm.cn(cm.sp('px', 12), 'ml-72 pt-32 pb-24 min-h-screen')}>
        <div className={cm.cn(cm.mxAuto, 'max-w-5xl')}>
          <SettingsPageHeader />
          <div className={cm.grid({ cols: 12, gap: 'xl' })}>
            {/* Profile Section */}
            <section className={cm.cn(cm.stack(8), 'col-span-12 lg:col-span-8')}>
              <SettingsProfileCard
                firstName={firstName}
                onFirstNameChange={setFirstName}
                lastName={lastName}
                onLastNameChange={setLastName}
                email={email}
                onEmailChange={setEmail}
                phone={phone}
                onPhoneChange={setPhone}
                bio={bio}
                onBioChange={setBio}
              />
              {/* Password Section */}
              <div className={cm.cn(cm.sp('p', 10), 'bg-surface-container-low rounded-xl')}>
                <h3
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'md' }),
                    cm.fontWeight('bold'),
                    cm.textSize('2xl'),
                    cm.sp('mb', 6),
                    'font-headline',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-primary-container')}>
                    lock
                  </span>

                  {t('settings.securityTitle', {}, { defaultValue: 'Security & Password' })}
                </h3>
                <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
                  <div className={cm.cn('col-span-2')}>
                    <label
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.sp('mb', 2),
                        cm.sp('ml', 4),
                        'block uppercase tracking-wider text-outline',
                      )}
                    >
                      {t(
                        'settings.changePasswordModal.currentPassword',
                        {},
                        { defaultValue: 'Current Password' },
                      )}
                    </label>
                    <input
                      className={cm.cn(
                        cm.sp('px', 6),
                        cm.sp('py', 4),
                        'w-full bg-surface-container-lowest ghost-border rounded-xl focus:ring-2 focus:ring-surface-tint focus:outline-none transition-all',
                      )}
                      placeholder={t(
                        'common.passwordPlaceholder',
                        {},
                        { defaultValue: '••••••••••••' },
                      )}
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.sp('mb', 2),
                        cm.sp('ml', 4),
                        'block uppercase tracking-wider text-outline',
                      )}
                    >
                      {t(
                        'settings.changePasswordModal.newPassword',
                        {},
                        { defaultValue: 'New Password' },
                      )}
                    </label>
                    <input
                      className={cm.cn(
                        cm.sp('px', 6),
                        cm.sp('py', 4),
                        'w-full bg-surface-container-lowest ghost-border rounded-xl focus:ring-2 focus:ring-surface-tint focus:outline-none transition-all',
                      )}
                      placeholder={t(
                        'common.passwordPlaceholder',
                        {},
                        { defaultValue: '••••••••••••' },
                      )}
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        cm.sp('mb', 2),
                        cm.sp('ml', 4),
                        'block uppercase tracking-wider text-outline',
                      )}
                    >
                      {t(
                        'settings.confirmPasswordLabel',
                        {},
                        { defaultValue: 'Confirm New Password' },
                      )}
                    </label>
                    <input
                      className={cm.cn(
                        cm.sp('px', 6),
                        cm.sp('py', 4),
                        'w-full bg-surface-container-lowest ghost-border rounded-xl focus:ring-2 focus:ring-surface-tint focus:outline-none transition-all',
                      )}
                      placeholder={t(
                        'common.passwordPlaceholder',
                        {},
                        { defaultValue: '••••••••••••' },
                      )}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                {passwordError && (
                  <p
                    role="alert"
                    className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-error')}
                  >
                    {passwordError}
                  </p>
                )}
                {passwordSuccess && (
                  <p
                    role="status"
                    className={cm.cn(cm.sp('mt', 4), cm.textSize('sm'), 'text-success')}
                  >
                    {passwordSuccess}
                  </p>
                )}
                <div className={cm.sp('mt', 8)}>
                  <button
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      cm.roundedFull,
                      'bg-surface-container-highest text-primary hover:bg-surface-variant transition-colors',
                    )}
                    onClick={handlePasswordChange}
                    disabled={savingPassword}
                  >
                    {savingPassword
                      ? t('common.updatingEllipsis', {}, { defaultValue: 'Updating…' })
                      : t('settings.updatePasswordButton', {}, { defaultValue: 'Update Password' })}
                  </button>
                </div>
              </div>
            </section>
            {/* Sidebar Content */}
            <aside className={cm.cn(cm.stack(8), 'col-span-12 lg:col-span-4')}>
              {/* Language Preference */}
              <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
                <h3
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xl'),
                    cm.sp('mb', 2),
                    'font-headline',
                  )}
                >
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mb', 4), 'text-on-surface-variant')}>
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
                  <h3
                    className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}
                  >
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
              {/* Notification Preferences */}
              <div className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
                <h3
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xl'),
                    cm.sp('mb', 4),
                    'font-headline',
                  )}
                >
                  {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
                </h3>
                <div className={cm.stack(6)}>
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <div>
                      <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                        {t(
                          'settings.emailNotificationsLabel',
                          {},
                          { defaultValue: 'Email Notifications' },
                        )}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'settings.emailNotificationsDescription',
                          {},
                          { defaultValue: 'Daily digest & activity' },
                        )}
                      </p>
                    </div>
                    <label className={cm.cn(cm.cursorPointer, 'relative inline-flex items-center')}>
                      <input
                        checked={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.checked)}
                        className={cm.cn('sr-only peer')}
                        type="checkbox"
                        aria-label={t(
                          'settings.emailNotificationsLabel',
                          {},
                          { defaultValue: 'Email Notifications' },
                        )}
                      />
                      <div
                        className={cm.cn(
                          cm.h(6),
                          cm.roundedFull,
                          "w-11 bg-outline-variant peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container",
                        )}
                      ></div>
                    </label>
                  </div>
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <div>
                      <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                        {t('settings.smsAlertsLabel', {}, { defaultValue: 'SMS Alerts' })}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'settings.smsAlertsDescription',
                          {},
                          { defaultValue: 'Critical platform updates' },
                        )}
                      </p>
                    </div>
                    <label className={cm.cn(cm.cursorPointer, 'relative inline-flex items-center')}>
                      <input
                        checked={notifySms}
                        onChange={(e) => setNotifySms(e.target.checked)}
                        className={cm.cn('sr-only peer')}
                        type="checkbox"
                        aria-label={t(
                          'settings.smsAlertsLabel',
                          {},
                          { defaultValue: 'SMS Alerts' },
                        )}
                      />
                      <div
                        className={cm.cn(
                          cm.h(6),
                          cm.roundedFull,
                          "w-11 bg-outline-variant peer-focus:outline-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container",
                        )}
                      ></div>
                    </label>
                  </div>
                  <div className={cm.flex({ align: 'center', justify: 'between' })}>
                    <div>
                      <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>
                        {t('settings.newLeadAlertsLabel', {}, { defaultValue: 'New Lead Alerts' })}
                      </p>
                      <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                        {t(
                          'settings.newLeadAlertsDescription',
                          {},
                          { defaultValue: 'Instant push notifications' },
                        )}
                      </p>
                    </div>
                    <label className={cm.cn(cm.cursorPointer, 'relative inline-flex items-center')}>
                      <input
                        checked={notifyNewLeads}
                        onChange={(e) => setNotifyNewLeads(e.target.checked)}
                        className={cm.cn('sr-only peer')}
                        type="checkbox"
                        aria-label={t(
                          'settings.newLeadAlertsLabel',
                          {},
                          { defaultValue: 'New Lead Alerts' },
                        )}
                      />
                      <div
                        className={cm.cn(
                          "w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container",
                        )}
                      ></div>
                    </label>
                  </div>
                  <div className={cm.cn('flex items-center justify-between')}>
                    <div>
                      <p className={cm.cn('font-semibold text-sm')}>
                        {t(
                          'settings.showingRemindersLabel',
                          {},
                          { defaultValue: 'Showing Reminders' },
                        )}
                      </p>
                      <p className={cm.cn('text-xs text-on-surface-variant')}>
                        {t(
                          'settings.showingRemindersDescription',
                          {},
                          { defaultValue: 'Calendar sync notifications' },
                        )}
                      </p>
                    </div>
                    <label className={cm.cn('relative inline-flex items-center cursor-pointer')}>
                      <input
                        checked={notifyShowings}
                        onChange={(e) => setNotifyShowings(e.target.checked)}
                        className={cm.cn('sr-only peer')}
                        type="checkbox"
                        aria-label={t(
                          'settings.showingRemindersLabel',
                          {},
                          { defaultValue: 'Showing Reminders' },
                        )}
                      />
                      <div
                        className={cm.cn(
                          "w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container",
                        )}
                      ></div>
                    </label>
                  </div>
                </div>
              </div>
              {/* Danger Zone */}
              <div className={cm.cn('bg-error-container/20 rounded-xl p-8')}>
                <h3 className={cm.cn('font-headline font-bold text-xl text-error mb-4')}>
                  {t('settings.dangerZoneTitle', {}, { defaultValue: 'Danger Zone' })}
                </h3>
                <p className={cm.cn('text-xs text-on-surface-variant mb-6 leading-relaxed')}>
                  {t(
                    'settings.deleteAccountWarning',
                    {},
                    {
                      defaultValue:
                        'Deleting your account is permanent. All your listing data, lead history, and analytical reports will be erased from our servers immediately.',
                    },
                  )}
                </p>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className={cm.cn(
                    'w-full py-4 rounded-xl border border-error/20 text-error font-bold text-sm hover:bg-error hover:text-on-error transition-all duration-300',
                  )}
                >
                  {deletingAccount
                    ? t('settings.deletingEllipsis', {}, { defaultValue: 'Deleting…' })
                    : t('settings.deleteAccountButton', {}, { defaultValue: 'Delete Account' })}
                </button>
              </div>
              {/* Ad Placement / Branding (Editorial touch) */}
              <div className={cm.cn('relative h-64 rounded-xl overflow-hidden group')}>
                <img
                  alt={t(
                    'property.demoListing.luxuryEstate',
                    {},
                    { defaultValue: 'Luxury Estate' },
                  )}
                  className={cm.cn(
                    'w-full h-full object-cover transition-transform duration-700 group-hover:scale-110',
                  )}
                  data-alt="Modern architectural mansion with floor-to-ceiling glass windows at sunset, soft warm interior glow, luxury real estate photography"
                  src="https://picsum.photos/seed/Settings-1/1200/800"
                />
                <div
                  className={cm.cn(
                    'absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex flex-col justify-end p-6',
                  )}
                >
                  <span
                    className={cm.cn(
                      'text-primary-fixed text-[10px] uppercase font-bold tracking-[0.2em] mb-1',
                    )}
                  >
                    {t('settings.featuredAssetLabel', {}, { defaultValue: 'Featured Asset' })}
                  </span>
                  <p className={cm.cn('text-on-primary font-headline font-bold')}>
                    {t('settings.featuredAssetName', {}, { defaultValue: 'The Obsidian Villa' })}
                  </p>
                  <p className={cm.cn('text-on-primary/60 text-xs')}>
                    {t('settings.featuredAssetLocation', {}, { defaultValue: 'Bel Air, CA' })}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      {/* Bottom Action Bar */}
      <SettingsBottomActionBar
        onSave={handleProfileSave}
        onDiscard={handleDiscard}
        saving={savingProfile}
        successMessage={profileSuccess}
        errorMessage={profileError}
      />
    </div>
  )
}

export default Settings
export { Settings, Settings as SettingsPage }
