import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { CommandPaletteCard, type PaletteResult } from '../components/CommandPaletteCard.js'
import { KbdBadge } from '../components/KbdBadge.js'
import { type SnippetItem, SnippetRow } from '../components/SnippetRow.js'

const PALETTE_RESULTS: ReadonlyArray<PaletteResult> = [
  {
    id: 'r1',
    icon: 'terminal',
    preview: 'git init && git add . && git commit -m "initial commit"',
    category: 'code',
    shortcut: '↵',
    iconColor: 'var(--color-primary)',
  },
  {
    id: 'r2',
    icon: 'link',
    preview: 'https://github.com/yank/cli-tool',
    category: 'url',
    shortcut: '⌘2',
  },
  { id: 'r3', icon: 'lock', preview: '••••••••••••••••', category: 'credential', shortcut: '⌘3' },
  {
    id: 'r4',
    icon: 'push_pin',
    preview: 'tail -f /var/log/system.log | grep ERROR',
    category: 'code',
    shortcut: '⌘4',
  },
]

const SHOWCASE_SNIPPETS: ReadonlyArray<SnippetItem> = [
  {
    id: 's1',
    preview: 'npm install -D tailwindcss postcss autoprefixer',
    category: 'code',
    sourceIcon: 'terminal',
    sourceLabel: 'iTerm2',
    timestamp: '2m ago',
  },
  {
    id: 's2',
    preview: 'const debounce = (func, wait) => { let timeout; ...',
    category: 'code',
    sourceIcon: 'terminal',
    sourceLabel: 'VS Code',
    timestamp: '1h ago',
  },
  {
    id: 's3',
    preview: 'https://figma.com/file/12345/yank-design-system',
    category: 'url',
    sourceIcon: 'design_services',
    sourceLabel: 'Figma',
    timestamp: '3h ago',
    pinned: true,
  },
  {
    id: 's4',
    preview: '"The quick brown fox jumps over the lazy dog"',
    category: 'text',
    sourceIcon: 'description',
    sourceLabel: 'Notion',
    timestamp: 'Yesterday',
  },
  {
    id: 's5',
    preview: '••••••••••••••••••••••••••••',
    category: 'credential',
    sourceIcon: 'web',
    sourceLabel: 'Chrome',
    timestamp: 'Yesterday',
    encrypted: true,
  },
]

const FEATURE_CARDS = [
  {
    key: 'searchEverywhere',
    icon: 'search',
    defaultTitle: 'Search every snippet',
    defaultBody:
      'Full-text + fuzzy across every clip you have ever copied. Sub-millisecond on 100k+ snippets.',
  },
  {
    key: 'crossDevice',
    icon: 'devices',
    defaultTitle: 'Sync across devices',
    defaultBody:
      'macOS, Windows, Linux, iOS, Android, web. End-to-end encrypted in transit and at rest.',
  },
  {
    key: 'paletteFirst',
    icon: 'keyboard_command_key',
    defaultTitle: 'Command-palette first',
    defaultBody:
      'Open the palette anywhere with ⌘K. Pick a clip with arrow keys. Paste with Enter. Hands stay on the keyboard.',
  },
  {
    key: 'encrypted',
    icon: 'lock',
    defaultTitle: 'Encrypted by default',
    defaultBody:
      'Mark anything as a credential and it is AES-encrypted, hidden from previews, and unlocked only on demand.',
  },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      {/* Top nav */}
      <nav
        className={cm.cn(
          'sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/40',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.flex({ align: 'center', justify: 'between' }),
            'h-16',
          )}
        >
          <Link
            to="/"
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'tracking-tighter lowercase')}
            style={{ color: 'var(--color-primary)' }}
          >
            <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'))}>
              {APP_NAME.toLowerCase()}
            </span>
            <span
              aria-hidden="true"
              className={cm.cn('rounded-full')}
              style={{ width: 6, height: 6, background: 'var(--color-primary)' }}
            />
          </Link>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'hidden md:flex',
            )}
          >
            <a
              href="#features"
              className={cm.cn(
                'inline-flex items-center min-h-[36px] px-1 text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <a
              href="#workflow"
              className={cm.cn(
                'inline-flex items-center min-h-[36px] px-1 text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('landing.navWorkflow', {}, { defaultValue: 'Workflow' })}
            </a>
            <Link
              to="/pricing"
              className={cm.cn(
                'inline-flex items-center min-h-[36px] px-1 text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            {isAuthenticated ? (
              <Link
                to="/clips"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'rounded-md text-white transition-all hover:opacity-90 active:scale-[0.98]',
                )}
                style={{ background: 'var(--color-primary)' }}
              >
                <span>{t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}</span>
                <KbdBadge>⌘K</KbdBadge>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    'hidden md:inline-block text-on-surface-variant hover:text-on-surface rounded-md hover:bg-surface-container-low transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-md text-white transition-all hover:opacity-90 active:scale-[0.98]',
                  )}
                  style={{ background: 'var(--color-primary)' }}
                >
                  <span>
                    {t('landing.getYank', { app: APP_NAME }, { defaultValue: 'Get {{app}}' })}
                  </span>
                  <KbdBadge>⌘K</KbdBadge>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-primary) 15%, transparent), transparent 60%),' +
              'radial-gradient(ellipse at 80% 50%, color-mix(in srgb, var(--color-secondary) 8%, transparent), transparent 50%)',
          }}
        />
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('pt', 24),
            cm.sp('pb', 16),
            cm.textCenter,
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'uppercase tracking-widest font-mono',
            )}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('landing.eyebrow', {}, { defaultValue: 'Clipboard manager · v2.1' })}
          </p>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              'tracking-tighter text-5xl md:text-7xl text-on-surface mb-6',
            )}
          >
            {t('landing.heroLeading', {}, { defaultValue: 'Copy once,' })}{' '}
            <span style={{ color: 'var(--color-primary)' }}>
              {t('landing.heroTrailing', {}, { defaultValue: 'find forever.' })}
            </span>
          </h1>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.sp('mb', 10),
              'text-on-surface-variant max-w-2xl mx-auto leading-relaxed',
            )}
          >
            {t(
              'landing.heroBody',
              { tagline: APP_TAGLINE },
              {
                defaultValue:
                  'A clipboard manager built for keyboard-first workflows. Access every snippet you have ever copied across every device.',
              },
            )}
          </p>

          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              'sm:flex-row sm:justify-center',
            )}
          >
            <Link
              to="/signup"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('px', 6),
                cm.sp('py', 4),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'w-full sm:w-auto rounded-lg text-white transition-all hover:opacity-90 active:scale-[0.98] group',
              )}
              style={{
                background: 'var(--color-primary)',
                boxShadow:
                  '0 8px 24px -8px color-mix(in srgb, var(--color-primary) 50%, transparent)',
              }}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                download
              </span>
              <span>{t('landing.heroCtaPrimary', {}, { defaultValue: 'Download for macOS' })}</span>
              <KbdBadge>⌘⇧V</KbdBadge>
            </Link>
            <Link
              to="/signup"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('px', 6),
                cm.sp('py', 4),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'w-full sm:w-auto rounded-lg bg-surface border border-outline-variant text-on-surface hover:bg-surface-container-low transition-all active:scale-[0.98]',
              )}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                window
              </span>
              <span>{t('landing.heroCtaSecondary', {}, { defaultValue: 'Get for Windows' })}</span>
              <KbdBadge>⊞⇧V</KbdBadge>
            </Link>
            <Link
              to="/clips"
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                cm.sp('px', 4),
                cm.sp('py', 4),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'w-full sm:w-auto rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors',
              )}
            >
              {t('landing.heroCtaTertiary', {}, { defaultValue: 'Try in browser' })}
            </Link>
          </div>
        </div>

        {/* Command palette mockup */}
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('pb', 24))}>
          <CommandPaletteCard query="git init" results={PALETTE_RESULTS} activeIndex={0} />
        </div>
      </header>

      {/* Dense list showcase */}
      <section
        id="workflow"
        className={cm.cn('bg-surface-container-low border-y border-outline-variant/40')}
      >
        <div className={cm.cn(cm.maxW('5xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 24))}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
            <h2
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'tracking-tight text-on-surface',
              )}
            >
              {t(
                'landing.denseHeading',
                {},
                { defaultValue: 'Insanely dense, ridiculously fast.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t(
                'landing.denseSubheading',
                {},
                { defaultValue: 'No grid views. No wasted space. Just your snippets.' },
              )}
            </p>
          </div>

          <div
            className={cm.cn(
              'rounded-xl border border-outline-variant/40 overflow-hidden bg-surface',
            )}
            style={{ boxShadow: '0 12px 32px -12px rgba(91,106,191,0.18)' }}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                cm.sp('px', 4),
                cm.sp('py', 3),
                'border-b border-outline-variant/40 bg-surface-container-lowest',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant font-mono',
                )}
              >
                {t('landing.allClips', {}, { defaultValue: 'All clips' })}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant font-mono')}>
                {t('landing.demoItemCount', {}, { defaultValue: '1,284 items' })}
              </span>
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('p', 2))}>
              {SHOWCASE_SNIPPETS.map((s) => (
                <SnippetRow key={s.id} snippet={s} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section
        id="features"
        className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 24))}
      >
        <div className={cm.cn(cm.textCenter, cm.sp('mb', 12))}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mb', 2),
              'uppercase tracking-widest font-mono',
            )}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('landing.featuresEyebrow', {}, { defaultValue: 'Built for power users' })}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t(
              'landing.featuresHeading',
              {},
              { defaultValue: 'Everything a copy-paste-heavy workflow needs.' },
            )}
          </h2>
        </div>
        <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}>
          {FEATURE_CARDS.map((card) => (
            <div
              key={card.key}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'md' }),
                cm.sp('p', 6),
                'rounded-xl bg-surface-container-lowest border border-outline-variant/40 hover:-translate-y-0.5 hover:shadow-lg transition-all',
              )}
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-3xl"
                style={{ color: 'var(--color-primary)' }}
              >
                {card.icon}
              </span>
              <h3
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.fontWeight('bold'),
                  'text-on-surface tracking-tight',
                )}
              >
                {t(`landing.feature.${card.key}.title`, {}, { defaultValue: card.defaultTitle })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                {t(`landing.feature.${card.key}.body`, {}, { defaultValue: card.defaultBody })}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className={cm.cn('border-t border-outline-variant/40')}>
        <div
          className={cm.cn(
            cm.maxW('4xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 16),
            cm.textCenter,
          )}
        >
          <h3
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              cm.sp('mb', 4),
              'tracking-tight text-on-surface',
            )}
          >
            {t('landing.ctaHeading', {}, { defaultValue: 'Stop hunting for that one snippet.' })}
          </h3>
          <p
            className={cm.cn(
              cm.textSize('base'),
              cm.sp('mb', 8),
              'text-on-surface-variant max-w-xl mx-auto',
            )}
          >
            {t(
              'landing.ctaBody',
              {},
              { defaultValue: 'Free for personal use. Pro at $15/mo. Team at $49/mo.' },
            )}
          </p>
          <Link
            to="/signup"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
              cm.sp('px', 8),
              cm.sp('py', 4),
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'inline-flex rounded-lg text-white transition-all hover:opacity-90 active:scale-[0.98]',
            )}
            style={{
              background: 'var(--color-primary)',
              boxShadow:
                '0 12px 24px -8px color-mix(in srgb, var(--color-primary) 50%, transparent)',
            }}
          >
            <span>{t('landing.ctaButton', {}, { defaultValue: 'Start yanking — free' })}</span>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </section>

      <footer
        className={cm.cn(
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'text-on-surface-variant border-t border-outline-variant/40',
        )}
      >
        <p>
          {t(
            'common.copyrightBuiltWithMolecule',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '© {{year}} {{app}}. Built with Molecule.' },
          )}
        </p>
      </footer>
    </div>
  )
}

export default Landing
export { Landing as LandingPage }
