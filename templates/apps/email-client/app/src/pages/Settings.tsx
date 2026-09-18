import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { MeridianAppShell } from '../components/MeridianAppShell.js'
import { deriveInitials } from '../lib/api.js'
import { type PreferenceState, readPrefs, writePrefs } from '../lib/preferences.js'

interface MeUser {
  id: string
  name?: string | null
  email?: string | null
  username?: string | null
  planKey?: string | null
}

const SECTIONS = [
  { key: 'account', icon: 'account_circle', defaultLabel: 'Account' },
  { key: 'notifications', icon: 'notifications', defaultLabel: 'Notifications' },
  { key: 'signatures', icon: 'edit_note', defaultLabel: 'Signatures' },
  { key: 'language', icon: 'language', defaultLabel: 'Language' },
  { key: 'security', icon: 'lock', defaultLabel: 'Security' },
] as const

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user, logout } = useAuth<MeUser>()

  const [section, setSection] = useState<(typeof SECTIONS)[number]['key']>('account')
  const [me, setMe] = useState<MeUser | null>(user ?? null)
  const [prefs, setPrefs] = useState<PreferenceState>(readPrefs())
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null)
  const [signatureSaved, setSignatureSaved] = useState<string | null>(null)

  // Read /api/users/:id on mount to ensure we have fresh data. The API
  // returns `{ props: {…user fields}, plan, … }` as the response body,
  // and `http.get` wraps that in `HttpResponse<…>`, so we unwrap once
  // (`.data` → body) then again (body.props → user fields).
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get<{ props?: MeUser } & MeUser>(`/api/users/${user.id}`)
        const body = res.data
        const payload: MeUser = (body?.props ?? body) as MeUser
        if (cancelled) return
        setMe(payload)
        setEditName(payload.name ?? '')
        setEditEmail(payload.email ?? '')
      } catch (_error) {
        // user profile load failed — fall back to cached auth state
        if (!cancelled) {
          setMe(user)
          setEditName(user.name ?? '')
          setEditEmail(user.email ?? '')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, http])

  const initials = useMemo(() => {
    const name = me?.name?.trim() || me?.email || ''
    return deriveInitials(name)
  }, [me])

  const onTogglePref = useCallback((key: keyof PreferenceState) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      writePrefs(next)
      return next
    })
  }, [])

  const saveSignature = useCallback(() => {
    writePrefs(prefs)
    setSignatureSaved(
      t('meridian.settings.signatureSaved', {}, { defaultValue: 'Signature saved.' }),
    )
    setTimeout(() => setSignatureSaved(null), 2000)
  }, [prefs, t])

  const saveProfile = useCallback(async () => {
    if (!me?.id) return
    setSavingProfile(true)
    setProfileFeedback(null)
    try {
      const res = await http.patch<{ props?: MeUser } & MeUser>(`/api/users/${me.id}`, {
        name: editName,
        email: editEmail,
      })
      const body = res.data
      const payload: MeUser = (body?.props ?? body) as MeUser
      setMe(payload)
      setProfileFeedback(t('common.profileSavedPeriod', {}, { defaultValue: 'Profile saved.' }))
      setEditing(false)
      setTimeout(() => setProfileFeedback(null), 2500)
    } catch (err) {
      setProfileFeedback(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }, [me?.id, editName, editEmail, http, t])

  const signOut = useCallback(async () => {
    try {
      await logout()
    } finally {
      navigate('/login')
    }
  }, [logout, navigate])

  return (
    <MeridianAppShell>
      <div className={cm.cn(cm.flex({}), 'h-full overflow-hidden')} data-mol-id="page-settings">
        <nav
          className={cm.cn(
            cm.flex({ direction: 'col' }),
            cm.sp('p', 4),
            'w-[260px] shrink-0 border-r border-outline-variant/40 bg-surface-container-lowest overflow-y-auto',
          )}
          aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
        >
          <h2
            className={cm.cn(
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              cm.sp('px', 2),
              'text-on-surface tracking-tight',
            )}
          >
            {t('nav.settings', {}, { defaultValue: 'Settings' })}
          </h2>
          <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
            {SECTIONS.map((s) => {
              const active = section === s.key
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSection(s.key)}
                  data-mol-id={`settings-section-${s.key}`}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.fontWeight(active ? 'semibold' : 'medium'),
                    cm.textSize('sm'),
                    'rounded-xl transition-colors text-left',
                    active
                      ? 'bg-primary/10 text-primary-dark'
                      : 'text-on-surface hover:bg-surface-container-low',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <span
                    className={cm.cn(
                      'material-symbols-outlined',
                      active ? '' : 'text-on-surface-variant',
                    )}
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    aria-hidden="true"
                  >
                    {s.icon}
                  </span>
                  {t(`meridian.settings.section.${s.key}`, {}, { defaultValue: s.defaultLabel })}
                </button>
              )
            })}
          </div>
        </nav>

        <section className={cm.cn(cm.flex1, 'min-w-0 bg-surface-container-lowest overflow-y-auto')}>
          <div
            className={cm.cn(
              cm.maxW('4xl'),
              cm.mxAuto,
              cm.sp('p', 8),
              cm.flex({ direction: 'col', gap: 'lg' }),
            )}
          >
            <header>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.sp('mb', 2),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t(
                  `meridian.settings.section.${section}`,
                  {},
                  {
                    defaultValue:
                      SECTIONS.find((s) => s.key === section)?.defaultLabel ?? 'Settings',
                  },
                )}
              </p>
              <h1 className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface')}>
                {t(
                  'meridian.settings.heading',
                  { appName: APP_NAME },
                  { defaultValue: 'Customize your {{appName}} experience' },
                )}
              </h1>
            </header>

            {section === 'account' && (
              <article
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm flex flex-col gap-5',
                )}
                data-mol-id="settings-account"
              >
                <div className={cm.flex({ align: 'center', gap: 'sm', justify: 'between' })}>
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <span
                      className={cm.cn(
                        cm.w(12),
                        cm.h(12),
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.fontWeight('bold'),
                        'rounded-full bg-gradient-to-br from-primary to-secondary text-white',
                      )}
                    >
                      {initials}
                    </span>
                    <div>
                      <p
                        className={cm.cn(
                          cm.textSize('base'),
                          cm.fontWeight('bold'),
                          'text-on-surface',
                        )}
                        data-mol-id="settings-name"
                      >
                        {me?.name ??
                          t('meridian.settings.noName', {}, { defaultValue: '(no name set)' })}
                      </p>
                      <p
                        className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}
                        data-mol-id="settings-email"
                      >
                        {me?.email}
                      </p>
                      {me?.planKey && (
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.sp('mt', 1),
                            'text-primary uppercase tracking-widest font-bold',
                          )}
                        >
                          {me.planKey}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    data-mol-id="settings-edit-profile"
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      cm.textSize('sm'),
                      'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('nav.editProfile', {}, { defaultValue: 'Edit profile' })}
                  </button>
                </div>
                {editing && (
                  <div
                    className={cm.cn(
                      cm.flex({ direction: 'col', gap: 'sm' }),
                      'border-t border-outline-variant/40 pt-4',
                    )}
                  >
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
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        data-mol-id="settings-name-input"
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          'border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
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
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        data-mol-id="settings-email-input"
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          'border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none',
                        )}
                      />
                    </label>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <button
                        type="button"
                        onClick={saveProfile}
                        disabled={savingProfile}
                        data-mol-id="settings-save-profile"
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.fontWeight('semibold'),
                          cm.textSize('sm'),
                          'rounded-full bg-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity',
                        )}
                      >
                        {savingProfile
                          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                          : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false)
                          setEditName(me?.name ?? '')
                          setEditEmail(me?.email ?? '')
                        }}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.fontWeight('medium'),
                          cm.textSize('sm'),
                          'rounded-full border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors',
                        )}
                      >
                        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                      </button>
                    </div>
                  </div>
                )}
                {profileFeedback && (
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-success')}
                    data-mol-id="settings-profile-feedback"
                  >
                    {profileFeedback}
                  </p>
                )}
              </article>
            )}

            {section === 'notifications' && (
              <article
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm flex flex-col',
                )}
                data-mol-id="settings-prefs"
              >
                <h3
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 4),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('nav.preferences', {}, { defaultValue: 'Preferences' })}
                </h3>
                <ul
                  className={cm.cn(
                    cm.flex({ direction: 'col' }),
                    'divide-y divide-outline-variant/40 -mx-6 px-6',
                  )}
                >
                  {(
                    [
                      {
                        key: 'desktop_notifications',
                        defaultLabel: 'Desktop notifications',
                        defaultDesc: 'Notify me about new mail when this tab is open.',
                      },
                      {
                        key: 'sounds',
                        defaultLabel: 'Notification sounds',
                        defaultDesc: 'Play a subtle chime when an urgent thread arrives.',
                      },
                      {
                        key: 'compact',
                        defaultLabel: 'Compact thread rows',
                        defaultDesc: 'Show two extra threads per page in the inbox view.',
                      },
                      {
                        key: 'preview',
                        defaultLabel: 'Show preview pane',
                        defaultDesc: 'Read mail without leaving the inbox list.',
                      },
                      {
                        key: 'send_later',
                        defaultLabel: 'Schedule send',
                        defaultDesc:
                          'Defer outgoing mail until the recipient\u2019s working hours.',
                      },
                    ] as const
                  ).map((item) => (
                    <li
                      key={item.key}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                        cm.sp('py', 4),
                      )}
                    >
                      <span className={cm.flex({ direction: 'col' })}>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'text-on-surface',
                          )}
                        >
                          {t(
                            `meridian.settings.toggle.${item.key}`,
                            {},
                            { defaultValue: item.defaultLabel },
                          )}
                        </span>
                        <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t(
                            `meridian.settings.toggle.${item.key}.desc`,
                            {},
                            { defaultValue: item.defaultDesc },
                          )}
                        </span>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={prefs[item.key]}
                        onClick={() => onTogglePref(item.key)}
                        data-mol-id={`settings-toggle-${item.key}`}
                        className={cm.cn(
                          cm.flex({ align: 'center' }),
                          'h-6 w-11 rounded-full p-0.5 transition-colors',
                          prefs[item.key] ? 'bg-primary' : 'bg-surface-container',
                        )}
                      >
                        <span
                          className={cm.cn(
                            'h-5 w-5 rounded-full bg-white shadow transition-transform',
                            prefs[item.key] ? 'translate-x-5' : 'translate-x-0',
                          )}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </article>
            )}

            {section === 'signatures' && (
              <article
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm flex flex-col gap-3',
                )}
                data-mol-id="settings-signature"
              >
                <header className={cm.flex({ align: 'center', justify: 'between' })}>
                  <h3
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('bold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('meridian.settings.signature', {}, { defaultValue: 'Signature' })}
                  </h3>
                  <button
                    type="button"
                    onClick={saveSignature}
                    data-mol-id="settings-save-signature"
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'text-primary hover:underline',
                    )}
                  >
                    {t('common.save', {}, { defaultValue: 'Save' })}
                  </button>
                </header>
                <textarea
                  value={prefs.signature}
                  onChange={(e) => setPrefs((prev) => ({ ...prev, signature: e.target.value }))}
                  data-mol-id="settings-signature-input"
                  className={cm.cn(
                    cm.sp('p', 4),
                    cm.textSize('sm'),
                    'rounded-xl bg-surface-container-low text-on-surface font-mono whitespace-pre-wrap border border-outline-variant min-h-[100px]',
                  )}
                  placeholder={t(
                    'meridian.settings.signaturePlaceholder',
                    { name: me?.name ?? '', email: me?.email ?? '', appName: APP_NAME },
                    { defaultValue: '{{name}}\n{{appName}}\n{{email}}' },
                  )}
                />
                {signatureSaved && (
                  <p
                    className={cm.cn(cm.textSize('xs'), 'text-success')}
                    data-mol-id="settings-signature-feedback"
                  >
                    {signatureSaved}
                  </p>
                )}
              </article>
            )}

            {section === 'language' && (
              <article
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm flex flex-col gap-3',
                )}
                data-mol-id="settings-language"
              >
                <h3
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('footer.language', {}, { defaultValue: 'Language' })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'common.chooseTheLanguage',
                    {},
                    { defaultValue: 'Choose the language used throughout the app.' },
                  )}
                </p>
                <div className={cm.sp('mt', 2)}>
                  <LanguagePicker />
                </div>
              </article>
            )}

            {section === 'security' && (
              <article
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm flex flex-col gap-3',
                )}
                data-mol-id="settings-security"
              >
                <h3
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t('nav.security', {}, { defaultValue: 'Security' })}
                </h3>
                <button
                  type="button"
                  onClick={signOut}
                  data-mol-id="settings-sign-out"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.fontWeight('bold'),
                    cm.textSize('sm'),
                    'self-start rounded-full text-error border border-error/30 hover:bg-error/10 transition-colors',
                  )}
                >
                  <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                    logout
                  </span>
                  {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
                </button>
              </article>
            )}

            <article
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm flex flex-col gap-3',
              )}
              data-mol-id="settings-appearance"
            >
              <h3
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'common.toggleLightDark',
                  {},
                  { defaultValue: 'Toggle between light and dark mode.' },
                )}
              </p>
              <div className={cm.sp('mt', 2)}>
                <ThemeToggle />
              </div>
            </article>
          </div>
        </section>
      </div>
    </MeridianAppShell>
  )
}

export default Settings
