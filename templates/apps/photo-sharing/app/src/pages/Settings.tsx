import { useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { ApiError, apiGet, apiPatch } from '../lib/api.js'

const SECTIONS = ['profile', 'gallery', 'privacy', 'notifications'] as const
type Section = (typeof SECTIONS)[number]

interface UserProps {
  id: string
  name?: string | null
  username?: string | null
  email?: string | null
  oauthData?: Record<string, unknown> | null
}

interface CurrentUser {
  props: UserProps
}

interface PhotoPrefs {
  bio?: string
  location?: string
  showExif?: boolean
  showLocation?: boolean
  watermarkLarge?: boolean
  allowDownload?: boolean
  publicProfile?: boolean
  searchable?: boolean
  blockAi?: boolean
  notifyFeatured?: boolean
  notifyComments?: boolean
  notifyFollows?: boolean
  weeklyDigest?: boolean
}

const DEFAULT_PREFS: PhotoPrefs = {
  bio: '',
  location: '',
  showExif: true,
  showLocation: true,
  watermarkLarge: false,
  allowDownload: false,
  publicProfile: true,
  searchable: true,
  blockAi: true,
  notifyFeatured: true,
  notifyComments: true,
  notifyFollows: false,
  weeklyDigest: true,
}

function readPrefs(user: UserProps | null): PhotoPrefs {
  const raw = user?.oauthData?.['photoPrefs']
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFS }
  return { ...DEFAULT_PREFS, ...(raw as PhotoPrefs) }
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [section, setSection] = useState<Section>('profile')
  const [user, setUser] = useState<UserProps | null>(null)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [prefs, setPrefs] = useState<PhotoPrefs>({ ...DEFAULT_PREFS })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const refresh = async () => {
    try {
      // /api/users/me returns `{ props: {...userProps}, plan, ... }`. The
      // settings UI only cares about `props`.
      const me = await apiGet<CurrentUser>('/users/me')
      const props = me.props
      setUser(props)
      setName(props.name ?? '')
      setUsername(props.username ?? '')
      setEmail(props.email ?? '')
      setPrefs(readPrefs(props))
      setError(null)
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? `${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err)
      setError(detail)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const save = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    try {
      const oauthData = { ...(user.oauthData ?? {}), photoPrefs: prefs }
      // Backend rejects empty-string username with a 400 because the
      // `users.username` column is unique and NULLable, but `""` is the
      // unique-collision value. Send `null` to clear, or omit when the
      // user hasn't picked one. Same for `name`.
      const payload: Record<string, unknown> = { oauthData }
      const trimmedName = name.trim()
      if (trimmedName) payload.name = trimmedName
      else if (user.name) payload.name = null
      const trimmedUsername = username.trim()
      if (trimmedUsername) payload.username = trimmedUsername
      else if (user.username) payload.username = null
      const trimmedEmail = email.trim()
      if (trimmedEmail && trimmedEmail !== (user.email ?? '')) payload.email = trimmedEmail
      await apiPatch<UserProps>(`/users/${user.id}`, payload)
      await refresh()
      setSavedAt(Date.now())
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? `${err.status}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err)
      setError(detail)
    } finally {
      setSaving(false)
    }
  }

  const setPref = <K extends keyof PhotoPrefs>(key: K, value: PhotoPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }))
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, 'space-y-8')}>
      <header className={'space-y-2'}>
        <p className="text-[11px] font-black uppercase tracking-widest text-primary">
          {t('settings.eyebrow', {}, { defaultValue: 'Account & preferences' })}
        </p>
        <h1
          className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight leading-[1.05]')}
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
      </header>

      {error && (
        <p className={'text-sm text-error'} role="alert" data-testid="settings-error">
          {error}
        </p>
      )}
      {savedAt && (
        <p
          className={'text-sm text-success-text'}
          role="status"
          data-testid="settings-saved-banner"
        >
          {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
        </p>
      )}

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
        <aside className={'col-span-12 md:col-span-3'}>
          <nav
            className={'space-y-1'}
            aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
          >
            {SECTIONS.map((s) => {
              const isActive = section === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSection(s)}
                  data-testid={`settings-tab-${s}`}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block w-full text-left rounded-md transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary pl-2'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {t(
                    `settings.section.${s}`,
                    {},
                    { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className={'col-span-12 md:col-span-9 space-y-4'}>
          {!user ? (
            <p
              className={'text-sm text-on-surface-variant italic py-12 text-center'}
              data-testid="settings-loading"
            >
              {t('common.loading', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : (
            <>
              {section === 'profile' && (
                <section
                  className={cm.cn(
                    cm.sp('p', 6),
                    'bg-surface-container-lowest rounded-2xl shadow-sm space-y-4',
                  )}
                >
                  <h2
                    className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}
                    style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                  >
                    {t('settings.profile.heading', {}, { defaultValue: 'Photographer profile' })}
                  </h2>
                  <Field
                    label={t('form.displayName', {}, { defaultValue: 'Display name' })}
                    value={name}
                    onChange={setName}
                    testid="settings-name"
                  />
                  <Field
                    label={t('settings.profile.handle', {}, { defaultValue: 'Handle' })}
                    value={username}
                    onChange={setUsername}
                    testid="settings-username"
                  />
                  <Field
                    label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                    value={email}
                    onChange={setEmail}
                    type="email"
                    testid="settings-email"
                  />
                  <Field
                    label={t('settings.profile.location', {}, { defaultValue: 'Based in' })}
                    value={prefs.location ?? ''}
                    onChange={(v) => setPref('location', v)}
                    testid="settings-location"
                  />
                  <label className="block">
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'block font-black uppercase tracking-widest text-on-surface-variant',
                        cm.sp('mb', 1),
                      )}
                    >
                      {t('form.bio', {}, { defaultValue: 'Bio' })}
                    </span>
                    <textarea
                      value={prefs.bio ?? ''}
                      onChange={(e) => setPref('bio', e.target.value)}
                      rows={3}
                      data-testid="settings-bio"
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        'w-full border border-outline-variant rounded-md bg-surface focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors resize-none',
                      )}
                    />
                  </label>
                  <div
                    className={cm.cn(cm.sp('pt', 2), cm.stack(2))}
                    data-mol-id="settings-language"
                  >
                    <h3
                      className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}
                      style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                    >
                      {t('footer.language', {}, { defaultValue: 'Language' })}
                    </h3>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        cm.sp('mb', 2),
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
                  </div>
                  <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
                    <div className={cm.sp('mb', 6)}>
                      <h3
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          cm.textSize('lg'),
                          'text-on-surface',
                        )}
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
                </section>
              )}

              {section === 'gallery' && (
                <section
                  className={cm.cn(
                    cm.sp('p', 6),
                    'bg-surface-container-lowest rounded-2xl shadow-sm space-y-3',
                  )}
                >
                  <h2
                    className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}
                    style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                  >
                    {t('settings.gallery.heading', {}, { defaultValue: 'Gallery preferences' })}
                  </h2>
                  <Toggle
                    label={t(
                      'settings.gallery.exif',
                      {},
                      { defaultValue: 'Display EXIF data on photo pages' },
                    )}
                    checked={!!prefs.showExif}
                    onChange={(v) => setPref('showExif', v)}
                    testid="settings-show-exif"
                  />
                  <Toggle
                    label={t(
                      'settings.gallery.location',
                      {},
                      { defaultValue: 'Display location metadata' },
                    )}
                    checked={!!prefs.showLocation}
                    onChange={(v) => setPref('showLocation', v)}
                    testid="settings-show-location"
                  />
                  <Toggle
                    label={t(
                      'settings.gallery.watermark',
                      {},
                      { defaultValue: 'Add subtle watermark to large variants' },
                    )}
                    checked={!!prefs.watermarkLarge}
                    onChange={(v) => setPref('watermarkLarge', v)}
                    testid="settings-watermark"
                  />
                  <Toggle
                    label={t(
                      'settings.gallery.allowDownload',
                      {},
                      { defaultValue: 'Allow downloads of original files' },
                    )}
                    checked={!!prefs.allowDownload}
                    onChange={(v) => setPref('allowDownload', v)}
                    testid="settings-allow-download"
                  />
                </section>
              )}

              {section === 'privacy' && (
                <section
                  className={cm.cn(
                    cm.sp('p', 6),
                    'bg-surface-container-lowest rounded-2xl shadow-sm space-y-3',
                  )}
                >
                  <h2
                    className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}
                    style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                  >
                    {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                  </h2>
                  <Toggle
                    label={t(
                      'settings.privacy.publicProfile',
                      {},
                      { defaultValue: 'Public profile (anyone can view your portfolio)' },
                    )}
                    checked={!!prefs.publicProfile}
                    onChange={(v) => setPref('publicProfile', v)}
                    testid="settings-public-profile"
                  />
                  <Toggle
                    label={t(
                      'settings.privacy.indexable',
                      {},
                      { defaultValue: 'Index portfolio in search engines' },
                    )}
                    checked={!!prefs.searchable}
                    onChange={(v) => setPref('searchable', v)}
                    testid="settings-searchable"
                  />
                  <Toggle
                    label={t(
                      'settings.privacy.aiTraining',
                      {},
                      { defaultValue: 'Block AI scrapers (X-Robots-Tag noai)' },
                    )}
                    checked={!!prefs.blockAi}
                    onChange={(v) => setPref('blockAi', v)}
                    testid="settings-block-ai"
                  />
                </section>
              )}

              {section === 'notifications' && (
                <section
                  className={cm.cn(
                    cm.sp('p', 6),
                    'bg-surface-container-lowest rounded-2xl shadow-sm space-y-3',
                  )}
                >
                  <h2
                    className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight')}
                    style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                  >
                    {t('settings.notifications', {}, { defaultValue: 'Notifications' })}
                  </h2>
                  <Toggle
                    label={t(
                      'settings.notifications.featured',
                      {},
                      { defaultValue: 'When my photo is featured in a gallery' },
                    )}
                    checked={!!prefs.notifyFeatured}
                    onChange={(v) => setPref('notifyFeatured', v)}
                    testid="settings-notify-featured"
                  />
                  <Toggle
                    label={t(
                      'settings.notifications.comments',
                      {},
                      { defaultValue: 'New comments on my photos' },
                    )}
                    checked={!!prefs.notifyComments}
                    onChange={(v) => setPref('notifyComments', v)}
                    testid="settings-notify-comments"
                  />
                  <Toggle
                    label={t(
                      'settings.notifications.follows',
                      {},
                      { defaultValue: 'New followers' },
                    )}
                    checked={!!prefs.notifyFollows}
                    onChange={(v) => setPref('notifyFollows', v)}
                    testid="settings-notify-follows"
                  />
                  <Toggle
                    label={t(
                      'settings.notifications.weeklyDigest',
                      {},
                      { defaultValue: 'Weekly editorial digest' },
                    )}
                    checked={!!prefs.weeklyDigest}
                    onChange={(v) => setPref('weeklyDigest', v)}
                    testid="settings-weekly-digest"
                  />
                </section>
              )}

              <div className={cm.cn(cm.flex({ justify: 'end', gap: 'sm' }), 'pt-2')}>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  data-testid="settings-save"
                  className={cm.cn(
                    cm.sp('px', 6),
                    'py-2.5 rounded-full text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {saving
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  readOnly,
  testid,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  readOnly?: boolean
  testid?: string
}) {
  const cm = getClassMap()
  return (
    <label className="block">
      <span
        className={cm.cn(
          cm.textSize('xs'),
          'block font-black uppercase tracking-widest text-on-surface-variant',
          cm.sp('mb', 1),
        )}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        data-testid={testid}
        className={cm.cn(
          cm.sp('px', 3),
          cm.sp('py', 2),
          'w-full border border-outline-variant rounded-md bg-surface focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors',
          readOnly && 'opacity-70 cursor-not-allowed',
        )}
      />
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  testid,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  testid?: string
}) {
  const cm = getClassMap()
  return (
    <label className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'cursor-pointer')}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testid}
        className={cm.cn(cm.h(4), cm.w(4))}
      />
      <span className={cm.cn(cm.textSize('sm'))}>{label}</span>
    </label>
  )
}
