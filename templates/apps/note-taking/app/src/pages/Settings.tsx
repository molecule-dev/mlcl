import { useCallback, useEffect, useRef, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import {
  useAuth,
  useChangePassword,
  useHttpClient,
  useTheme,
  useTranslation,
} from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { useBillingStatus } from '../lib/api.js'

const TITLE_FONT = 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif'

interface ProfileResponse {
  id: string
  name: string | null
  email: string | null
  planKey: string | null
  preferences: {
    theme: 'light' | 'dark' | 'sepia'
    serifBody: boolean
    graphHoverPreview: boolean
    realtimeSync: boolean
    lineHeightPercent: number
  }
}

type Section = 'editor' | 'sync' | 'language' | 'account'

const SECTIONS: ReadonlyArray<{ key: Section; icon: string; label: string }> = [
  { key: 'editor', icon: 'edit_note', label: 'Editor' },
  { key: 'sync', icon: 'sync', label: 'Sync' },
  { key: 'language', icon: 'language', label: 'Language' },
  { key: 'account', icon: 'badge', label: 'Account' },
]

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { user, logout } = useAuth<UserProfile>()
  const { status: pwStatus, error: pwError, changePassword, reset: resetPw } = useChangePassword()
  const { setTheme: applyTheme } = useTheme()
  const { status: billingStatus } = useBillingStatus()

  const [section, setSection] = useState<Section>('editor')
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveLabel, setSaveLabel] = useState<string | null>(null)
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [name, setName] = useState('')
  const [serifBody, setSerifBody] = useState(true)
  const [graphHover, setGraphHover] = useState(true)
  const [autoSync, setAutoSync] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light')
  const [lineHeight, setLineHeight] = useState(170)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<ProfileResponse>('/profile/me')
      const p = res.data
      setProfile(p)
      setName(p.name ?? '')
      setSerifBody(p.preferences.serifBody)
      setGraphHover(p.preferences.graphHoverPreview)
      setAutoSync(p.preferences.realtimeSync)
      setTheme(p.preferences.theme)
      setLineHeight(p.preferences.lineHeightPercent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [http])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!showPasswordModal) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPasswordModal(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showPasswordModal])

  const persist = useCallback(
    async (patch: { name?: string; preferences?: Partial<ProfileResponse['preferences']> }) => {
      try {
        const res = await http.patch<ProfileResponse>('/profile/me', patch)
        setProfile(res.data)
        setSaveLabel(t('common.saved', {}, { defaultValue: 'Saved' }))
        setTimeout(() => setSaveLabel(null), 1500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save settings')
      }
    },
    [http, t],
  )

  const persistDebounced = useCallback(
    (patch: { name?: string; preferences?: Partial<ProfileResponse['preferences']> }) => {
      if (flushTimer.current) clearTimeout(flushTimer.current)
      flushTimer.current = setTimeout(() => persist(patch), 500)
    },
    [persist],
  )

  const handlePrefChange = <K extends keyof ProfileResponse['preferences']>(
    key: K,
    value: ProfileResponse['preferences'][K],
  ) => {
    persistDebounced({ preferences: { [key]: value } as Partial<ProfileResponse['preferences']> })
  }

  const handleNameBlur = () => {
    if (!profile) return
    if (name === (profile.name ?? '')) return
    persist({ name })
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      resetPw()
    } catch (_error) {
      // pwError is captured in the hook state; no additional handling needed here
    }
  }

  // Human-readable plan name from /billing/status ("Free" / "Pro" / "Team")
  // rather than the raw internal planKey (e.g. "stripeMonthly").
  const planLabel = billingStatus?.name ?? t('nav.free', {}, { defaultValue: 'Free' })

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 10), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 10), 'mx-auto w-full max-w-6xl')}>
      <header className={cm.cn('mb-10 max-w-2xl')}>
        <p
          className={cm.cn(
            'text-[11px] font-black uppercase tracking-[0.32em] text-on-surface-variant mb-2',
          )}
        >
          {t('settings.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}} · Settings' })}
        </p>
        <h1
          className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface')}
          style={{ fontFamily: TITLE_FONT }}
        >
          {t('settings.title', {}, { defaultValue: 'Tune the writing surface.' })}
        </h1>
        <p className={cm.cn(cm.sp('mt', 3), 'text-on-surface-variant text-base')}>
          {t(
            'settings.subtitle',
            { appName: APP_NAME },
            {
              defaultValue:
                '{{appName}} defaults to a quiet typography-first reading column. Override anything below — your overrides sync across devices.',
            },
          )}
        </p>
        {saveLabel ? (
          <p
            className={cm.cn(
              'text-[11px] font-black uppercase tracking-widest text-emerald-600 mt-3',
            )}
            data-testid="save-status"
            role="status"
          >
            {saveLabel}
          </p>
        ) : null}
        {error ? (
          <p className={cm.cn('text-[12px] font-semibold text-error mt-3')} role="alert">
            {error}
          </p>
        ) : null}
      </header>

      <div className={cm.cn(cm.flex({ direction: 'row' }), 'gap-8 items-start')}>
        <aside className={cm.cn('w-[240px] shrink-0 hidden md:block')}>
          <ul className={cm.cn('space-y-1 sticky top-6')}>
            {SECTIONS.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => setSection(s.key)}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2.5),
                    cm.flex({ align: 'center', gap: 'sm' }),
                    'w-full rounded-xl text-sm font-semibold transition-colors',
                    section === s.key
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface hover:bg-surface-container',
                  )}
                >
                  <span
                    className={cm.cn('material-symbols-outlined text-[18px]')}
                    style={{ fontVariationSettings: section === s.key ? "'FILL' 1" : "'FILL' 0" }}
                    aria-hidden="true"
                  >
                    {s.icon}
                  </span>
                  <span className={cm.cn('flex-1 text-left')}>
                    {t(`settings.section.${s.key}`, {}, { defaultValue: s.label })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className={cm.cn('flex-1 min-w-0 space-y-6')}>
          {section === 'editor' ? (
            <Card
              title={t(
                'settings.editor.title',
                {},
                { defaultValue: 'Typography & writing surface' },
              )}
            >
              <ToggleRow
                label={t('settings.editor.serif.label', {}, { defaultValue: 'Serif body text' })}
                description={t(
                  'settings.editor.serif.body',
                  {},
                  {
                    defaultValue:
                      'Use Georgia for the reading column. Sans-serif keeps in the sidebar and toolbars.',
                  },
                )}
                testId="toggle-serif"
                on={serifBody}
                onToggle={() => {
                  const next = !serifBody
                  setSerifBody(next)
                  handlePrefChange('serifBody', next)
                }}
              />

              <SliderRow
                label={t('settings.editor.lineHeight.label', {}, { defaultValue: 'Line height' })}
                description={t(
                  'settings.editor.lineHeight.body',
                  {},
                  {
                    defaultValue:
                      'How much air between body lines. 170% is the default reading rhythm.',
                  },
                )}
                testId="line-height"
                value={lineHeight}
                onChange={(v) => {
                  setLineHeight(v)
                  handlePrefChange('lineHeightPercent', v)
                }}
              />

              <ToggleRow
                label={t(
                  'settings.editor.graphHover.label',
                  {},
                  { defaultValue: 'Backlink graph hover preview' },
                )}
                description={t(
                  'settings.editor.graphHover.body',
                  {},
                  {
                    defaultValue:
                      'Show a tiny preview card when you hover a [[wikilink]] in the editor.',
                  },
                )}
                testId="toggle-graph-hover"
                on={graphHover}
                onToggle={() => {
                  const next = !graphHover
                  setGraphHover(next)
                  handlePrefChange('graphHoverPreview', next)
                }}
              />

              <ThemeRow
                value={theme}
                onChange={(next) => {
                  setTheme(next)
                  handlePrefChange('theme', next)
                  // Also apply the choice to the live document via the theme
                  // bond — persisting alone would leave the page unchanged.
                  // Sepia has no bond theme; it renders on the light base.
                  applyTheme(next === 'dark' ? 'dark' : 'light')
                }}
              />
            </Card>
          ) : null}

          {section === 'sync' ? (
            <Card title={t('settings.sync.title', {}, { defaultValue: 'How your notes travel' })}>
              <ToggleRow
                label={t('settings.sync.auto.label', {}, { defaultValue: 'Realtime sync' })}
                description={t(
                  'settings.sync.auto.body',
                  {},
                  {
                    defaultValue:
                      'Push every keystroke through the realtime channel. Disable for slower connections.',
                  },
                )}
                testId="toggle-sync"
                on={autoSync}
                onToggle={() => {
                  const next = !autoSync
                  setAutoSync(next)
                  handlePrefChange('realtimeSync', next)
                }}
              />
            </Card>
          ) : null}

          {section === 'language' ? (
            <Card title={t('footer.language', {}, { defaultValue: 'Language' })}>
              <div className={cm.cn(cm.sp('p', 6), cm.stack(3))}>
                <p className={cm.cn('text-sm text-on-surface-variant')}>
                  {t(
                    'common.chooseTheLanguage',
                    {},
                    { defaultValue: 'Choose the language used throughout the app.' },
                  )}
                </p>
                <LanguagePicker />
              </div>
            </Card>
          ) : null}

          {section === 'account' ? (
            <Card title={t('settings.account.title', {}, { defaultValue: 'Account details' })}>
              <Field
                label={t('form.displayName', {}, { defaultValue: 'Display name' })}
                testId="field-name"
              >
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameBlur}
                  className={cm.cn(
                    'w-full bg-surface-container-low/60 px-3 py-2 rounded-lg text-sm font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary',
                  )}
                />
              </Field>

              <Field
                label={t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                testId="field-email"
              >
                <p className={cm.cn('text-sm font-semibold text-on-surface')}>{user?.email}</p>
              </Field>

              <Field label={t('nav.plan', {}, { defaultValue: 'Plan' })} testId="field-plan">
                <p className={cm.cn('text-sm font-semibold text-on-surface')}>{planLabel}</p>
              </Field>

              <div
                className={cm.cn(
                  cm.sp('p', 4),
                  'rounded-xl bg-surface-container-low/40 flex flex-col gap-3',
                )}
              >
                <button
                  type="button"
                  data-testid="open-change-password"
                  onClick={() => setShowPasswordModal(true)}
                  className={cm.cn(
                    'self-start text-sm font-bold text-primary hover:opacity-80 transition-opacity',
                  )}
                >
                  {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
                </button>
                <button
                  type="button"
                  data-testid="logout"
                  onClick={() => logout()}
                  className={cm.cn(
                    'self-start text-sm font-bold text-on-surface-variant hover:text-error transition-colors',
                  )}
                >
                  {t('settings.account.logout', {}, { defaultValue: 'Log out' })}
                </button>
              </div>
            </Card>
          ) : null}
        </section>
      </div>

      {showPasswordModal ? (
        <div
          role="presentation"
          className={cm.cn(
            'fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50',
          )}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPasswordModal(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            className={cm.cn('w-full max-w-md')}
          >
            <form
              data-testid="change-password-form"
              onSubmit={handlePasswordChange}
              className={cm.cn(
                cm.sp('p', 6),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-xl w-full space-y-4',
              )}
            >
              <h2 id="change-password-title" className={cm.cn('text-xl font-bold text-on-surface')}>
                {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
              </h2>
              {pwError ? (
                <p role="alert" className={cm.cn('text-sm text-error')}>
                  {pwError.message ??
                    t(
                      'settings.passwordModal.error',
                      {},
                      {
                        defaultValue:
                          'Could not change password — please check your current password.',
                      },
                    )}
                </p>
              ) : null}
              <div>
                <label
                  htmlFor="current-password"
                  className={cm.cn(
                    'block text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-1',
                  )}
                >
                  {t('settings.passwordModal.current', {}, { defaultValue: 'Current password' })}
                </label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={cm.cn(
                    'w-full bg-surface-container-low/60 px-3 py-2 rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary',
                  )}
                />
              </div>
              <div>
                <label
                  htmlFor="new-password"
                  className={cm.cn(
                    'block text-[11px] font-black uppercase tracking-widest text-on-surface-variant mb-1',
                  )}
                >
                  {t('settings.passwordModal.next', {}, { defaultValue: 'New password' })}
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={cm.cn(
                    'w-full bg-surface-container-low/60 px-3 py-2 rounded-lg text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary',
                  )}
                />
              </div>
              <div className={cm.flex({ align: 'center', justify: 'between' })}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className={cm.cn(
                    'text-sm font-bold text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                </button>
                <button
                  type="submit"
                  disabled={pwStatus === 'pending'}
                  className={cm.cn(
                    'px-4 py-2 rounded-lg text-sm font-bold text-on-primary bg-primary hover:opacity-95 disabled:opacity-50',
                  )}
                >
                  {pwStatus === 'pending'
                    ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                    : t('settings.passwordModal.submit', {}, { defaultValue: 'Save password' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        'rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm',
      )}
    >
      <div className={cm.cn(cm.sp('p', 6), 'border-b border-outline-variant/40')}>
        <h2
          className={cm.cn('text-2xl font-bold tracking-tight text-on-surface')}
          style={{ fontFamily: TITLE_FONT }}
        >
          {title}
        </h2>
      </div>
      <div className={cm.cn('divide-y divide-outline-variant/30')}>{children}</div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  on,
  onToggle,
  testId,
}: {
  label: string
  description: string
  on: boolean
  onToggle: () => void
  testId: string
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }),
        'gap-4',
      )}
    >
      <div className={cm.cn('max-w-xl')}>
        <p className={cm.cn('font-bold text-on-surface')}>{label}</p>
        <p className={cm.cn('text-sm text-on-surface-variant mt-1')}>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        data-testid={testId}
        onClick={onToggle}
        className={cm.cn(
          'relative w-12 h-7 rounded-full transition-colors shrink-0',
          on ? 'bg-primary' : 'bg-surface-container-high',
        )}
      >
        <span
          aria-hidden="true"
          className={cm.cn(
            'absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform',
            on ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}

function SliderRow({
  label,
  description,
  value,
  onChange,
  testId,
}: {
  label: string
  description: string
  value: number
  onChange: (v: number) => void
  testId: string
}) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.sp('p', 6))}>
      <div className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' })}>
        <div className={cm.cn('max-w-xl')}>
          <p className={cm.cn('font-bold text-on-surface')}>{label}</p>
          <p className={cm.cn('text-sm text-on-surface-variant mt-1')}>{description}</p>
        </div>
        <span
          className={cm.cn('text-2xl font-extrabold text-primary tabular-nums')}
          data-testid={`${testId}-value`}
        >
          {value}%
        </span>
      </div>
      <input
        type="range"
        min={140}
        max={200}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cm.cn('w-full mt-4 accent-primary')}
        aria-label={label}
        data-testid={testId}
      />
    </div>
  )
}

function ThemeRow({
  value,
  onChange,
}: {
  value: 'light' | 'dark' | 'sepia'
  onChange: (next: 'light' | 'dark' | 'sepia') => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const options: ReadonlyArray<{ key: 'light' | 'dark' | 'sepia'; label: string }> = [
    { key: 'light', label: t('settings.theme.light', {}, { defaultValue: 'Light' }) },
    { key: 'dark', label: t('settings.theme.dark', {}, { defaultValue: 'Dark' }) },
    { key: 'sepia', label: t('settings.theme.sepia', {}, { defaultValue: 'Sepia' }) },
  ]
  return (
    <div
      className={cm.cn(
        cm.sp('p', 6),
        cm.flex({ align: 'center', justify: 'between', wrap: 'wrap' }),
        'gap-4',
      )}
    >
      <div className={cm.cn('max-w-xl')}>
        <p className={cm.cn('font-bold text-on-surface')}>
          {t('nav.theme', {}, { defaultValue: 'Theme' })}
        </p>
        <p className={cm.cn('text-sm text-on-surface-variant mt-1')}>
          {t(
            'settings.theme.body',
            {},
            {
              defaultValue:
                'Light keeps the editorial column bright. Sepia warms the page for evenings.',
            },
          )}
        </p>
      </div>
      <div className={cm.flex({ align: 'center', gap: 'xs' })}>
        {options.map((opt) => (
          <button
            type="button"
            key={opt.key}
            data-testid={`theme-${opt.key}`}
            onClick={() => onChange(opt.key)}
            aria-pressed={value === opt.key}
            className={cm.cn(
              'px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors',
              value === opt.key
                ? 'bg-primary text-on-primary border-primary'
                : 'border-outline-variant text-on-surface hover:bg-surface-container',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  testId,
}: {
  label: string
  children: React.ReactNode
  testId: string
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.sp('p', 4), 'rounded-xl bg-surface-container-low/40 space-y-2')}
      data-testid={testId}
    >
      <p
        className={cm.cn(
          'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
        )}
      >
        {label}
      </p>
      {children}
    </div>
  )
}

export default Settings
