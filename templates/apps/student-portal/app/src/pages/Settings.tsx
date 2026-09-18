import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

interface PreferenceRow {
  id: string
  icon: string
  title: string
  body: string
  controlLabel: string
  enabled?: boolean
}

const PREFERENCES: readonly PreferenceRow[] = [
  {
    id: 'grade-postings',
    icon: 'grade',
    title: 'Grade postings',
    body: 'Notify me when a teacher posts a new grade or rubric note.',
    controlLabel: 'Push + email',
    enabled: true,
  },
  {
    id: 'assignment-reminders',
    icon: 'assignment',
    title: 'Assignment reminders',
    body: '24 hours before any assignment is due.',
    controlLabel: 'Push only',
    enabled: true,
  },
  {
    id: 'attendance',
    icon: 'how_to_reg',
    title: 'Attendance alerts',
    body: 'Family receives a same-day note when you’re marked absent or tardy.',
    controlLabel: 'Email family',
    enabled: true,
  },
  {
    id: 'announcements',
    icon: 'campaign',
    title: 'School announcements',
    body: 'School-wide messages from the front office.',
    controlLabel: 'In-app only',
    enabled: false,
  },
] as const

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))} data-mol-id="page-settings">
      <header className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
        <p className={cm.cn(cm.textSize('sm'), 'font-bold uppercase tracking-widest text-primary')}>
          {t('settings.eyebrow', {}, { defaultValue: 'Account · Riley Carter' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), 'font-extrabold tracking-tight text-on-surface')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'settings.subtitle',
            {},
            { defaultValue: 'Profile, notification routing, and family-sharing controls.' },
          )}
        </p>
      </header>

      <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 lg:grid-cols-3')}>
        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-gradient-to-br from-primary to-primary-container text-on-primary lg:col-span-1',
          )}
        >
          <span
            className={cm.cn(
              cm.w(14),
              cm.h(14),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-white/20 backdrop-blur-md text-2xl font-extrabold',
            )}
          >
            R
          </span>
          <p className={cm.cn(cm.textSize('xl'), cm.sp('mt', 4), 'font-extrabold tracking-tight')}>
            {t('settings.profile.name', {}, { defaultValue: 'Riley Carter' })}
          </p>
          <p className={cm.cn(cm.textSize('sm'), 'opacity-80')}>
            {t('settings.profile.school', {}, { defaultValue: 'Bayside High · Class of 2027' })}
          </p>
          <dl
            className={cm.cn(
              cm.sp('mt', 6),
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.textSize('sm'),
            )}
          >
            <div className={cm.flex({ justify: 'between' })}>
              <dt className={cm.cn('opacity-80')}>
                {t('settings.profile.studentId', {}, { defaultValue: 'Student ID' })}
              </dt>
              <dd className={cm.cn('font-bold tabular-nums')}>#46524</dd>
            </div>
            <div className={cm.flex({ justify: 'between' })}>
              <dt className={cm.cn('opacity-80')}>
                {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
              </dt>
              <dd className={cm.cn('font-bold')}>riley@bayside.edu</dd>
            </div>
            <div className={cm.flex({ justify: 'between' })}>
              <dt className={cm.cn('opacity-80')}>{t('nav.plan', {}, { defaultValue: 'Plan' })}</dt>
              <dd className={cm.cn('font-bold')}>Family</dd>
            </div>
          </dl>
        </div>

        <div
          className={cm.cn(
            cm.sp('p', 6),
            'rounded-2xl bg-surface-container-lowest shadow-sm lg:col-span-2 flex flex-col gap-4',
          )}
        >
          <header className={cm.flex({ align: 'center', justify: 'between' })}>
            <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
              {t('nav.notificationPreferences', {}, { defaultValue: 'Notification preferences' })}
            </h2>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t('settings.preferences.eyebrow', {}, { defaultValue: 'Per-channel routing' })}
            </span>
          </header>
          <ul className={cm.flex({ direction: 'col' })}>
            {PREFERENCES.map((p) => (
              <li
                key={p.id}
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
                  cm.sp('px', 4),
                  cm.sp('py', 4),
                  'border-b border-outline-variant/30 last:border-b-0',
                )}
              >
                <div className={cm.flex({ align: 'center', gap: 'md' })}>
                  <span
                    className={cm.cn(
                      cm.sp('p', 3),
                      'inline-flex rounded-xl bg-primary/10 text-primary',
                    )}
                  >
                    <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                      {p.icon}
                    </span>
                  </span>
                  <div>
                    <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>
                      {t(`settings.pref.${p.id}.title`, {}, { defaultValue: p.title })}
                    </p>
                    <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant max-w-md')}>
                      {t(`settings.pref.${p.id}.body`, {}, { defaultValue: p.body })}
                    </p>
                  </div>
                </div>
                <span
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.roundedFull,
                    'text-[10px] font-black uppercase tracking-widest',
                    p.enabled
                      ? 'bg-success-light text-success'
                      : 'bg-surface-container text-on-surface-variant',
                  )}
                >
                  {p.enabled ? p.controlLabel : t('settings.pref.off', {}, { defaultValue: 'Off' })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
            {t('footer.language', {}, { defaultValue: 'Language' })}
          </h2>
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'font-bold uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('settings.language.eyebrow', {}, { defaultValue: 'App language' })}
          </span>
        </header>
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
      <section
        className={cm.cn(cm.sp('p', 6), 'rounded-2xl bg-surface-container-lowest shadow-sm')}
      >
        <header className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('mb', 4))}>
          <h2 className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
            {t('settings.security.title', {}, { defaultValue: 'Security & sign-in' })}
          </h2>
        </header>
        <ul className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
          {[
            { id: 'password', icon: 'lock', label: 'Password', body: 'Last changed 26 days ago' },
            { id: '2fa', icon: 'shield', label: 'Two-step', body: 'On (authenticator app)' },
            {
              id: 'devices',
              icon: 'devices',
              label: 'Devices',
              body: '2 trusted · 1 phone, 1 laptop',
            },
          ].map((row) => (
            <li
              key={row.id}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('p', 4),
                'rounded-xl bg-surface-container-low',
              )}
            >
              <span
                className={cm.cn(cm.sp('p', 2), 'inline-flex rounded-lg bg-surface text-primary')}
              >
                <span className={cm.cn('material-symbols-outlined')} aria-hidden="true">
                  {row.icon}
                </span>
              </span>
              <div>
                <p className={cm.cn(cm.textSize('sm'), 'font-bold text-on-surface')}>
                  {t(`settings.security.${row.id}.label`, {}, { defaultValue: row.label })}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {t(`settings.security.${row.id}.body`, {}, { defaultValue: row.body })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default Settings
export { Settings as SettingsPage }
