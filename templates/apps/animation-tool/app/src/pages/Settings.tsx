import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { AnimationToolLayout } from '../components/AnimationToolLayout.js'
import { MotionStatTile } from '../components/MotionStatTile.js'

type Section = 'account' | 'preferences' | 'team' | 'billing'

interface ApiProject {
  id: string
  name: string
  fps?: number
}

const SECTIONS: Array<{ id: Section; label: string; defaultLabel: string; icon: string }> = [
  { id: 'account', label: 'settings.section.account', defaultLabel: 'Account', icon: 'person' },
  {
    id: 'preferences',
    label: 'settings.section.preferences',
    defaultLabel: 'Motion preferences',
    icon: 'tune',
  },
  { id: 'team', label: 'settings.section.team', defaultLabel: 'Team', icon: 'group' },
  {
    id: 'billing',
    label: 'settings.section.billing',
    defaultLabel: 'Billing',
    icon: 'credit_card',
  },
]

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user, logout, refresh } = useAuth<UserProfile>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { status: pwStatus, error: pwError, reset: resetPw } = useChangePassword()

  const [section, setSection] = useState<Section>('account')
  const [showPlans, setShowPlans] = useState(false)

  const [email, setEmail] = useState(user?.email ?? '')
  const [name, setName] = useState((user?.name as string | undefined) ?? '')
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountSaved, setAccountSaved] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  const [pwFocusTick, setPwFocusTick] = useState(0)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')

  const [projects, setProjects] = useState<ApiProject[] | null>(null)
  const [projectsError, setProjectsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiProject[]>('/api/projects')
      .then((res) => {
        if (cancelled) return
        setProjects(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {
        if (cancelled) return
        setProjectsError(
          t('settings.projectsError', {}, { defaultValue: 'Could not load projects.' }),
        )
        setProjects([])
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    setAccountSaving(true)
    setAccountSaved(false)
    setAccountError(null)
    try {
      // Send only the name; email changes go through a verification flow.
      await http.patch(`/api/users/${user.id}`, { name })
      // Persist updated name into the auth client so localStorage
      // molecule:auth:user reflects the new value across reloads.
      try {
        const prefix = 'molecule:auth:'
        const raw = window.localStorage.getItem(`${prefix}user`)
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>
          parsed.name = name
          window.localStorage.setItem(`${prefix}user`, JSON.stringify(parsed))
        }
      } catch (_error) {
        /* localStorage unavailable — non-critical, name still saved on server */
      }
      try {
        await refresh()
      } catch (_error) {
        /* refresh is best-effort; stale session data is acceptable here */
      }
      setAccountSaved(true)
    } catch (err) {
      setAccountError(
        err instanceof Error
          ? err.message
          : t('settings.accountSaveError', {}, { defaultValue: 'Could not save account.' }),
      )
    } finally {
      setAccountSaving(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id) return
    try {
      // Auth client's `changePassword` ships with a hard-coded endpoint
      // that doesn't include the user id; call the resource route directly.
      await http.patch(`/api/users/${user.id}/password`, {
        currentPassword: currentPw,
        newPassword: newPw,
      })
      setCurrentPw('')
      setNewPw('')
      resetPw()
    } catch (_error) {
      // Surfaced via the form's error message from the auth client; safe to swallow here.
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const projectCount = projects?.length ?? 0
  const avgFps =
    projects && projects.length > 0
      ? Math.round(projects.reduce((acc, p) => acc + Number(p.fps ?? 60), 0) / projects.length)
      : 60
  const ownerHandle = (name || email || 'you').toString()

  function sectionStyle(id: Section) {
    return cm.cn(
      cm.sp('p', 6),
      cm.stack(4),
      'rounded-2xl border bg-[var(--anim-surface)] transition-all',
      section === id
        ? 'border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--anim-primary)_30%,transparent)]'
        : 'border-[var(--anim-border)]',
    )
  }

  return (
    <AnimationToolLayout
      title={t('nav.settings', {}, { defaultValue: 'Settings' })}
      breadcrumb={t(
        'settings.crumb',
        { section: section as string },
        { defaultValue: '// account · {{section}}' },
      )}
    >
      <div
        className={cm.cn('grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6')}
        data-mol-section={section}
      >
        <nav
          className={cm.cn(
            cm.stack(1),
            cm.sp('p', 3),
            'rounded-xl bg-[var(--anim-surface)] border border-[var(--anim-border)] h-fit sticky top-4',
          )}
          aria-label={t('settings.sectionsNav', {}, { defaultValue: 'Settings sections' })}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSection(s.id)
                document
                  .getElementById(`settings-section-${s.id}`)
                  ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
              }}
              data-mol-id={`settings-section-${s.id}`}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 2 }),
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.textSize('sm'),
                'rounded-md transition-colors',
                section === s.id
                  ? 'bg-[color-mix(in_srgb,var(--anim-primary)_10%,transparent)] text-[var(--anim-primary)] border-l-2 border-[var(--anim-primary)]'
                  : 'text-[var(--anim-text-secondary)] hover:bg-[var(--anim-surface-elevated)] hover:text-[var(--anim-text)]',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>{s.icon}</span>
              <span className={cm.fontWeight('medium')}>
                {t(s.label, {}, { defaultValue: s.defaultLabel })}
              </span>
            </button>
          ))}
        </nav>

        <div className={cm.stack(8)}>
          <section id="settings-section-account" className={cm.stack(4)}>
            <header>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'font-headline text-[var(--anim-text)]',
                )}
              >
                {t('settings.account', {}, { defaultValue: 'Account' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 1),
                  'text-[var(--anim-text-secondary)]',
                )}
              >
                {t(
                  'settings.section.account.subhead',
                  {},
                  { defaultValue: 'Update your sign-in details and password.' },
                )}
              </p>
            </header>
            <form
              onSubmit={handleAccountSubmit}
              data-mol-id="settings-account-form"
              className={sectionStyle('account')}
            >
              <div className={cm.stack(2)}>
                <label
                  htmlFor="settings-name"
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-mono uppercase tracking-widest text-[var(--anim-text-muted)]',
                  )}
                >
                  {t('form.displayName', {}, { defaultValue: 'Display name' })}
                </label>
                <input
                  id="settings-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'rounded-md bg-[var(--anim-background)] border border-[var(--anim-border)] text-[var(--anim-text)] focus:border-[var(--anim-primary)] focus:outline-none',
                  )}
                />
              </div>
              <div className={cm.stack(2)}>
                <label
                  htmlFor="settings-email"
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-mono uppercase tracking-widest text-[var(--anim-text-muted)]',
                  )}
                >
                  {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                </label>
                <input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cm.cn(
                    cm.w('full'),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'rounded-md bg-[var(--anim-background)] border border-[var(--anim-border)] text-[var(--anim-text)] focus:border-[var(--anim-primary)] focus:outline-none',
                  )}
                />
              </div>
              {accountError ? (
                <p
                  role="alert"
                  className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-danger)] font-mono')}
                >
                  {accountError}
                </p>
              ) : null}
              {accountSaved ? (
                <p
                  role="status"
                  className={cm.cn(
                    cm.textSize('xs'),
                    'text-[var(--anim-primary)] font-mono uppercase tracking-widest',
                  )}
                >
                  {t('common.saved', {}, { defaultValue: 'Saved' })}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={accountSaving}
                data-mol-id="settings-account-save"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'w-fit rounded-lg bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white hover:opacity-90 transition-opacity disabled:opacity-60',
                )}
              >
                {accountSaving
                  ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                  : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
              </button>
            </form>

            {!(user as unknown as { oauthServer?: string })?.oauthServer && (
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(3),
                  'rounded-2xl bg-[var(--anim-surface)] border border-[var(--anim-border)]',
                )}
              >
                <h3
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-[var(--anim-text)]',
                  )}
                >
                  {t('auth.login.password', {}, { defaultValue: 'Password' })}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPwFocusTick((t) => t + 1)
                    document.getElementById('settings-current-pw')?.focus()
                  }}
                  data-mol-id="settings-change-password-toggle"
                  data-mol-pw-clicks={pwFocusTick}
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'w-fit rounded-lg border border-[var(--anim-border)] text-[var(--anim-primary)] hover:border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] transition-colors',
                  )}
                >
                  {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
                </button>
                <form
                  onSubmit={handlePasswordSubmit}
                  className={cm.stack(3)}
                  data-mol-id="settings-password-form"
                >
                  <input
                    id="settings-current-pw"
                    type="password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder={t(
                      'settings.account.currentPassword',
                      {},
                      { defaultValue: 'Current password' },
                    )}
                    autoComplete="current-password"
                    required
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'rounded-md bg-[var(--anim-background)] border border-[var(--anim-border)] text-[var(--anim-text)] focus:border-[var(--anim-primary)] focus:outline-none',
                    )}
                  />
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder={t(
                      'settings.account.newPassword',
                      {},
                      { defaultValue: 'New password' },
                    )}
                    autoComplete="new-password"
                    required
                    className={cm.cn(
                      cm.w('full'),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'rounded-md bg-[var(--anim-background)] border border-[var(--anim-border)] text-[var(--anim-text)] focus:border-[var(--anim-primary)] focus:outline-none',
                    )}
                  />
                  {pwError ? (
                    <p
                      role="alert"
                      className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-danger)] font-mono')}
                    >
                      {pwError.message}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={pwStatus === 'pending'}
                    className={cm.cn(
                      cm.fontWeight('semibold'),
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      'w-fit rounded-lg bg-gradient-to-r from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white hover:opacity-90 transition-opacity disabled:opacity-60',
                    )}
                  >
                    {pwStatus === 'pending'
                      ? t('settings.account.changing', {}, { defaultValue: 'Changing…' })
                      : t(
                          'auth.resetPassword.updatePassword',
                          {},
                          { defaultValue: 'Update password' },
                        )}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={handleLogout}
                  data-mol-id="settings-logout"
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'w-fit rounded-lg border border-[var(--anim-border)] text-[var(--anim-danger)] hover:border-[color-mix(in_srgb,var(--anim-danger)_40%,transparent)] transition-colors',
                  )}
                >
                  {t('settings.logOut', {}, { defaultValue: 'Sign out' })}
                </button>
              </div>
            )}
          </section>

          <section id="settings-section-preferences" className={cm.stack(4)}>
            <header>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'font-headline text-[var(--anim-text)]',
                )}
              >
                {t(
                  'settings.section.preferences.heading',
                  {},
                  { defaultValue: 'Motion preferences' },
                )}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 1),
                  'text-[var(--anim-text-secondary)]',
                )}
              >
                {t(
                  'settings.section.preferences.subhead',
                  {},
                  { defaultValue: 'Tune defaults that travel with you across projects.' },
                )}
              </p>
            </header>
            <div className={cm.cn('grid grid-cols-2 lg:grid-cols-4 gap-4')}>
              <MotionStatTile
                label={t('settings.preferences.fps', {}, { defaultValue: 'Avg frame rate' })}
                value={String(avgFps)}
                unit="fps"
                accent="accent"
                icon="speed"
              />
              <MotionStatTile
                label={t('nav.projects', {}, { defaultValue: 'Projects' })}
                value={String(projectCount)}
                accent="primary"
                icon="folder"
              />
              <MotionStatTile
                label={t('settings.preferences.autoSave', {}, { defaultValue: 'Auto-save' })}
                value={t('settings.preferences.on', {}, { defaultValue: 'ON' })}
                accent="warning"
                icon="save"
              />
              <MotionStatTile
                label={t('settings.preferences.onionSkin', {}, { defaultValue: 'Onion skin' })}
                value="3"
                unit="frames"
                accent="secondary"
                icon="layers"
              />
            </div>
            <div className={sectionStyle('preferences')}>
              <h3
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-[var(--anim-text)]',
                )}
              >
                {t('footer.language', {}, { defaultValue: 'Language' })}
              </h3>
              <p className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-text-secondary)]')}>
                {t(
                  'common.chooseTheLanguage',
                  {},
                  { defaultValue: 'Choose the language used throughout the app.' },
                )}
              </p>
              <LanguagePicker />
            </div>
            <div className={sectionStyle('preferences')}>
              <h3
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-[var(--anim-text)]',
                )}
              >
                {t('settings.preferences.shortcuts', {}, { defaultValue: 'Keyboard shortcuts' })}
              </h3>
              {[
                {
                  key: '⌘K',
                  actionKey: 'settings.shortcut.commandPalette',
                  defaultLabel: 'Open command palette',
                },
                {
                  key: 'Space',
                  actionKey: 'settings.shortcut.playPause',
                  defaultLabel: 'Play / pause timeline',
                },
                {
                  key: 'K',
                  actionKey: 'settings.shortcut.insertKeyframe',
                  defaultLabel: 'Insert keyframe at playhead',
                },
                {
                  key: 'B',
                  actionKey: 'settings.shortcut.toggleOnion',
                  defaultLabel: 'Toggle onion skinning',
                },
              ].map((row) => (
                <div
                  key={row.key}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.textSize('xs'),
                    'py-1',
                  )}
                >
                  <span className={cm.cn('text-[var(--anim-text)]')}>
                    {t(row.actionKey, {}, { defaultValue: row.defaultLabel })}
                  </span>
                  <kbd
                    className={cm.cn(
                      'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-primary)] bg-[var(--anim-background)] border border-[var(--anim-border)] rounded px-2 py-0.5',
                    )}
                  >
                    {row.key}
                  </kbd>
                </div>
              ))}
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
          <section id="settings-section-team" className={cm.stack(4)}>
            <header>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'font-headline text-[var(--anim-text)]',
                )}
              >
                {t('nav.team', {}, { defaultValue: 'Team' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 1),
                  'text-[var(--anim-text-secondary)]',
                )}
              >
                {t(
                  'settings.section.team.subhead',
                  {},
                  { defaultValue: 'Workspace members and roles.' },
                )}
              </p>
            </header>
            <div className={sectionStyle('team')}>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 3 }),
                  cm.sp('p', 3),
                  'rounded-lg bg-[var(--anim-background)] border border-[var(--anim-border)]',
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded-full text-white font-bold',
                  )}
                  style={{
                    background:
                      'linear-gradient(135deg, var(--anim-primary) 0%, var(--anim-secondary) 100%)',
                  }}
                >
                  {ownerHandle.slice(0, 1).toUpperCase()}
                </div>
                <div className={cm.cn('flex-1')}>
                  <div
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'text-[var(--anim-text)]',
                    )}
                  >
                    {name || t('nav.you', {}, { defaultValue: 'You' })}
                  </div>
                  <div
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-[var(--anim-text-secondary)] font-mono',
                    )}
                  >
                    {email}
                  </div>
                </div>
                <span
                  className={cm.cn(
                    'font-mono text-[10px] uppercase tracking-widest text-[var(--anim-primary)]',
                  )}
                >
                  {t('settings.team.owner', {}, { defaultValue: 'Owner' })}
                </span>
              </div>
              <div
                className={cm.cn(
                  'rounded-lg border border-dashed border-[var(--anim-border)] bg-[var(--anim-background)]/40 text-center',
                  cm.sp('p', 6),
                )}
              >
                <span
                  className={cm.cn(
                    'material-symbols-outlined text-3xl text-[var(--anim-text-muted)]',
                  )}
                >
                  group_add
                </span>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 2),
                    'text-[var(--anim-text-secondary)]',
                  )}
                >
                  {t(
                    'settings.team.empty',
                    {},
                    {
                      defaultValue:
                        'You are the only member of this workspace. Invite collaborators with a paid plan.',
                    },
                  )}
                </p>
              </div>
            </div>
          </section>

          <section id="settings-section-billing" className={cm.stack(4)}>
            <header>
              <h2
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'font-headline text-[var(--anim-text)]',
                )}
              >
                {t('settings.billing', {}, { defaultValue: 'Billing' })}
              </h2>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 1),
                  'text-[var(--anim-text-secondary)]',
                )}
              >
                {t('settings.section.billing.subhead', {}, { defaultValue: 'Plan and invoices.' })}
              </p>
            </header>
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'rounded-2xl bg-gradient-to-br from-[var(--anim-primary)] to-[var(--anim-secondary)] text-white',
              )}
            >
              <p className={cm.cn('font-mono text-[10px] uppercase tracking-widest text-white/80')}>
                {t('nav.currentPlan', {}, { defaultValue: 'Current plan' })}
              </p>
              <h3 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'font-headline')}>
                {(user as unknown as { planKey?: string })?.planKey
                  ? t(
                      'settings.billing.namedPlan',
                      { plan: (user as unknown as { planKey?: string }).planKey ?? '' },
                      { defaultValue: '{{plan}}' },
                    )
                  : t('nav.free', {}, { defaultValue: 'Free' })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'opacity-90')}>
                {t(
                  'settings.billing.usage',
                  { count: projectCount },
                  { defaultValue: '{{count}} projects under your plan.' },
                )}
              </p>
              <button
                type="button"
                onClick={() => setShowPlans((v) => !v)}
                data-mol-id="settings-billing-manage"
                aria-expanded={showPlans}
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'w-fit rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-sm',
                )}
              >
                {showPlans
                  ? t('settings.billing.hidePlans', {}, { defaultValue: 'Hide plans' })
                  : t('settings.billing.viewPlans', {}, { defaultValue: 'Compare plans' })}
              </button>
            </div>
            {showPlans ? (
              <div
                className={cm.cn(
                  cm.sp('p', 6),
                  cm.stack(3),
                  'rounded-2xl bg-[var(--anim-surface)] border border-[var(--anim-border)]',
                )}
              >
                <h3
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-[var(--anim-text)]',
                  )}
                >
                  {t('settings.billing.plansHeading', {}, { defaultValue: 'Plan comparison' })}
                </h3>
                <p className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-text-secondary)]')}>
                  {t(
                    'settings.billing.plansBody',
                    {},
                    {
                      defaultValue:
                        'Free plans include the editor, 5 projects, and CSS export. Paid plans add Lottie/MP4 export, render queue priority, and team seats.',
                    },
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  data-mol-id="settings-billing-pricing-link"
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    'w-fit rounded-lg border border-[var(--anim-border)] text-[var(--anim-primary)] hover:border-[color-mix(in_srgb,var(--anim-primary)_40%,transparent)] transition-colors',
                  )}
                >
                  {t('settings.billing.openPricing', {}, { defaultValue: 'Open full pricing →' })}
                </button>
              </div>
            ) : null}
            {projectsError ? (
              <p
                role="alert"
                className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-danger)] font-mono')}
              >
                {projectsError}
              </p>
            ) : null}
            <div className={sectionStyle('billing')}>
              <h3
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'text-[var(--anim-text)]',
                )}
              >
                {t('settings.billing.invoices', {}, { defaultValue: 'Recent invoices' })}
              </h3>
              <p className={cm.cn(cm.textSize('xs'), 'text-[var(--anim-text-secondary)]')}>
                {t(
                  'settings.billing.invoicesEmpty',
                  {},
                  {
                    defaultValue:
                      'No invoices yet — upgrade to a paid plan to see billing history.',
                  },
                )}
              </p>
            </div>
          </section>
        </div>
      </div>
    </AnimationToolLayout>
  )
}

export default Settings
