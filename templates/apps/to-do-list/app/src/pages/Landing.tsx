import { Link, Navigate } from 'react-router'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

const FEATURES = [
  {
    key: 'today',
    defaultTitle: 'Quick capture',
    defaultBody: 'Never lose a thought. Use global shortcuts to capture tasks instantly, anywhere.',
    icon: 'keyboard',
    tile: 'bg-primary-light text-primary',
  },
  {
    key: 'projects',
    defaultTitle: 'Projects + sections',
    defaultBody: 'Group tasks under projects and sections. Drag to reorder; nothing gets lost.',
    icon: 'layers',
    tile: 'bg-tertiary-container text-on-tertiary-container',
  },
  {
    key: 'recurring',
    defaultTitle: 'Recurring & reminders',
    defaultBody:
      'Daily, weekly, monthly — or natural-language ("every Tue at 3pm"). Push reminders.',
    icon: 'calendar_today',
    tile: 'bg-success-light text-success',
  },
  {
    key: 'labels',
    defaultTitle: 'Labels & priorities',
    defaultBody:
      'Three priority tiers, unlimited labels. Filter by combinations across all projects.',
    icon: 'label',
    tile: 'bg-warning-light text-warning',
  },
] as const

/** The design's stylized task-list window — priority dots, badges, a nested
 * subtask, and the completed divider. Decorative: one image role. */
interface MockTask {
  title: string
  dot: string
  badge?: string
  tone?: string
  label?: string
  labelTone?: string
}
const MOCK_TASKS: MockTask[] = [
  {
    title: 'Finalize Q3 Marketing Strategy',
    dot: 'border-error',
    badge: 'landing.mock.overdue',
    tone: 'bg-error-container text-on-error-container',
  },
  {
    title: 'Review legal contracts',
    dot: 'border-error',
    badge: 'landing.mock.today',
    tone: 'bg-warning-light text-warning',
  },
  {
    title: 'Design new onboarding flow',
    dot: 'border-warning',
    badge: 'landing.mock.tomorrow',
    tone: 'bg-warning-light text-warning',
    label: 'Design',
    labelTone: 'bg-tertiary-container text-on-tertiary-container',
  },
  { title: 'Read "Deep Work" chapter 4', dot: 'border-primary' },
  {
    title: 'Weekly team sync',
    dot: 'border-outline-variant',
    label: 'Review',
    labelTone: 'bg-success-light text-success',
  },
]

interface WeekDay {
  day: string
  date: number
  tasks: number
  done?: boolean
  active?: boolean
}
const BADGE_DEFAULTS: Record<string, string> = {
  'landing.mock.overdue': 'Overdue',
  'landing.mock.today': 'Today',
  'landing.mock.tomorrow': 'Tomorrow',
}

const DAY_DEFAULTS: Record<string, string> = {
  'landing.mock.mon': 'Mon',
  'landing.mock.tue': 'Tue',
  'landing.mock.wed': 'Wed',
  'landing.mock.thu': 'Thu',
  'landing.mock.fri': 'Fri',
}

const WEEK_DAYS: WeekDay[] = [
  { day: 'landing.mock.mon', date: 12, tasks: 8, done: true },
  { day: 'landing.mock.tue', date: 13, tasks: 5 },
  { day: 'landing.mock.wed', date: 14, tasks: 12, active: true },
  { day: 'landing.mock.thu', date: 15, tasks: 3 },
  { day: 'landing.mock.fri', date: 16, tasks: 6 },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { isAuthenticated, state } = useAuth()

  // Once auth has hydrated, signed-in visitors land in the app, not the
  // marketing page. Without this, post-signup/login navigations to "/"
  // dump authenticated users back into the public landing instead of
  // /today, making the product feel broken.
  if (state.initialized && isAuthenticated) {
    return <Navigate to="/today" replace />
  }

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <nav
        className={cm.cn(
          'fixed inset-x-0 top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40 shadow-sm',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link to="/" className={cm.cn('text-2xl font-extrabold tracking-tight text-primary')}>
            {APP_NAME}
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'md' })}>
            <Link
              to="/pricing"
              className={cm.cn('text-sm font-medium text-on-surface-variant hover:text-primary')}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
            <Link
              to="/login"
              className={cm.cn('text-sm font-medium text-on-surface-variant hover:text-primary')}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className={cm.cn(
                'px-4 py-2 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors',
              )}
            >
              {t('common.getStarted', {}, { defaultValue: 'Get Started' })}
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20 pb-16">
        {/* Hero — headline left, stylized task-list window right */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'grid grid-cols-1 items-center gap-12 py-16 md:grid-cols-2 md:py-24',
          )}
        >
          <div className="space-y-8">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">
              {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}{' '}
              <span className="text-primary">
                {t('landing.heroTitleAccent', {}, { defaultValue: '— one task at a time' })}
              </span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-on-surface-variant md:text-xl">
              {t(
                'landing.heroSubtitle',
                {},
                {
                  defaultValue:
                    'Capture thoughts, plan your day, and track progress across projects. The pragmatic, focused to-do list for high achievers.',
                },
              )}
            </p>
            <div className="flex flex-col gap-4 pt-4 sm:flex-row">
              <Link
                to="/signup"
                data-mol-id="landing-hero-cta"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 font-medium text-on-primary transition-colors hover:bg-primary-hover"
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-8 py-3 font-medium text-on-surface transition-colors hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                  play_circle
                </span>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>
            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-success" aria-hidden="true">
                check_circle
              </span>
              {t('landing.proof', {}, { defaultValue: 'No credit card required. Cancel anytime.' })}
            </div>
          </div>

          {/* Stylized mock window — the design's task list */}
          <div className="relative mx-auto w-full max-w-[520px]">
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 rotate-1 rounded-xl bg-gradient-to-br from-primary-light to-success-light shadow-lg"
            />
            <div
              role="img"
              aria-label={t(
                'landing.mock.label',
                {},
                { defaultValue: 'Preview of a task list with priorities and completed items' },
              )}
              data-testid="landing-task-mock"
              className="overflow-hidden rounded-lg border border-outline-variant bg-surface shadow-md"
            >
              {/* Quick add bar */}
              <div className="flex h-12 items-center border-b border-outline-variant/40 bg-surface-container-low px-4">
                <span
                  className="material-symbols-outlined mr-3 text-xl text-primary"
                  aria-hidden="true"
                >
                  add
                </span>
                <span className="text-sm text-on-surface-variant/70">
                  {t('landing.mock.quickAdd', {}, { defaultValue: 'Add a task...' })}
                </span>
              </div>
              {/* Task list */}
              <div className="p-2">
                {MOCK_TASKS.map((task) => (
                  <div
                    key={task.title}
                    className="flex items-center rounded-md border-b border-outline-variant/25 p-2 last:border-0"
                  >
                    <span
                      aria-hidden="true"
                      className={`h-5 w-5 shrink-0 rounded-full border-2 bg-surface ${task.dot}`}
                    />
                    <div className="flex flex-grow items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base text-on-surface">{task.title}</span>
                        {task.label && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${task.labelTone}`}
                          >
                            {task.label}
                          </span>
                        )}
                      </div>
                      {task.badge && (
                        <span
                          className={`ml-4 rounded px-2 py-0.5 text-xs font-medium ${task.tone}`}
                        >
                          {t(
                            task.badge,
                            {},
                            { defaultValue: BADGE_DEFAULTS[task.badge] ?? task.badge },
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {/* Subtask */}
                <div className="relative flex items-center p-2 pl-8">
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1/2 left-4 top-0 w-px bg-outline-variant/50"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 h-px w-4 bg-outline-variant/50"
                  />
                  <span
                    aria-hidden="true"
                    className="relative z-10 mr-3 h-5 w-5 shrink-0 rounded-full border-2 border-warning bg-surface"
                  />
                  <span className="text-sm text-on-surface-variant">
                    {t('landing.mock.subtask', {}, { defaultValue: 'Wireframe initial screens' })}
                  </span>
                </div>
                {/* Completed */}
                <div aria-hidden="true" className="my-3 border-t border-outline-variant/40" />
                {(['Prepare monthly report', 'Reply to client emails'] as const).map((title) => (
                  <div key={title} className="flex items-center p-2 opacity-50">
                    <span className="mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-outline-variant">
                      <span
                        className="material-symbols-outlined text-[14px] text-on-primary"
                        aria-hidden="true"
                      >
                        check
                      </span>
                    </span>
                    <span className="text-base text-on-surface-variant line-through">{title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Value row */}
        <section
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'border-t border-outline-variant/40 py-16',
          )}
        >
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className="rounded-xl border border-outline-variant/40 bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${f.tile}`}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold tracking-tight">
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Week showcase — the design's dark "see your week at a glance" band */}
        <section className="relative overflow-hidden bg-inverse-surface py-24 text-inverse-on-surface">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'relative z-10')}>
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                {t('landing.week.heading', {}, { defaultValue: 'See your week at a glance' })}
              </h2>
              <p className="mx-auto max-w-2xl text-on-surface-variant">
                {t(
                  'landing.week.body',
                  {},
                  {
                    defaultValue:
                      'Plan your capacity and distribute workload evenly across the week.',
                  },
                )}
              </p>
            </div>
            <div aria-hidden="true" className="flex snap-x gap-4 overflow-x-auto pb-8">
              {WEEK_DAYS.map((d) => (
                <div
                  key={d.date}
                  className={`min-w-[140px] flex-1 snap-center rounded-lg border p-4 ${
                    d.active
                      ? 'z-10 scale-105 border-primary bg-primary text-on-primary shadow-lg'
                      : 'border-white/10 bg-white/5 opacity-60'
                  }`}
                >
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider opacity-80">
                    {t(d.day, {}, { defaultValue: DAY_DEFAULTS[d.day] ?? d.day })}
                  </div>
                  <div className="mb-4 text-2xl font-bold tracking-tight">{d.date}</div>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <span className="material-symbols-outlined text-[16px]">
                      {d.done ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span>
                      {t(
                        'landing.mock.taskCount',
                        { count: d.tasks },
                        { defaultValue: '{{count}} tasks' },
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats band — indigo, per the design */}
        <section className="bg-primary py-12 text-on-primary">
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'text-center')}>
            <div className="mb-2 text-4xl font-bold tracking-tight tabular-nums md:text-5xl">
              {t('landing.stats.value', {}, { defaultValue: '2,419,082' })}
            </div>
            <div className="text-lg font-medium opacity-90">
              {t(
                'landing.stats.caption',
                { app: APP_NAME },
                { defaultValue: 'tasks completed this week by {{app}} users' },
              )}
            </div>
          </div>
        </section>

        {/* Download CTA (design) has no analog — this is a web app; keep the
            signup CTA strip in its place. */}
        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3 className={cm.cn('text-3xl font-bold tracking-tight mb-4')}>
              {t('landing.ctaHeading', {}, { defaultValue: 'Master your momentum' })}
            </h3>
            <p className={cm.cn('text-base text-on-surface-variant max-w-xl mx-auto mb-8')}>
              {t(
                'landing.ctaBody',
                {},
                { defaultValue: 'Free forever for personal use. Pro plan when you grow.' },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex items-center gap-2 px-10 py-4 font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-hover transition-colors',
              )}
            >
              {t('common.startFree', {}, { defaultValue: 'Start free' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-outline-variant/40 bg-surface-container-low py-12">
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 8 }),
            'md:flex-row',
          )}
        >
          <div className="text-xl font-black tracking-tight text-primary">{APP_NAME}</div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 6 }), 'flex-wrap justify-center')}>
            <Link
              to="/privacy"
              className="text-sm text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4"
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </Link>
            <Link
              to="/terms"
              className="text-sm text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4"
            >
              {t('nav.terms', {}, { defaultValue: 'Terms' })}
            </Link>
            <Link
              to="/pricing"
              className="text-sm text-on-surface-variant transition-colors hover:text-primary hover:underline underline-offset-4"
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'landing.copyright',
              { year: new Date().getFullYear(), app: APP_NAME },
              { defaultValue: '© {{year}} {{app}}' },
            )}
            {' — Built with '}
            <a
              href="https://molecule.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
            >
              Molecule.dev
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
