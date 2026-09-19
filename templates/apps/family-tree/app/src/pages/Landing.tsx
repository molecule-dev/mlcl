import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { MiniTreePreview } from '../components/MiniTreePreview.js'

const heroGradient = `linear-gradient(135deg, ${BRAND_COLOR}, #65a30d)`

const FEATURES = [
  {
    icon: 'account_tree',
    titleKey: 'landing.features.tree.title',
    titleDefault: 'A tree you can actually navigate',
    bodyKey: 'landing.features.tree.body',
    bodyDefault:
      'Expand any person to see parents, children, and partners as connected cards. Pan, zoom, and re-root the view with one click.',
  },
  {
    icon: 'person_add',
    titleKey: 'landing.features.relationships.title',
    titleDefault: 'Relationships that link both ways',
    bodyKey: 'landing.features.relationships.body',
    bodyDefault:
      'Add a parent, partner, child, or sibling and the connection appears on both profiles automatically — siblings derive from shared parents.',
  },
  {
    icon: 'timeline',
    titleKey: 'landing.features.timeline.title',
    titleDefault: 'A life timeline for every person',
    bodyKey: 'landing.features.timeline.body',
    bodyDefault:
      'Birth, partnerships, children, and death in chronological order — the story behind every branch of the tree.',
  },
  {
    icon: 'lock',
    titleKey: 'landing.features.private.title',
    titleDefault: 'Private by default',
    bodyKey: 'landing.features.private.body',
    bodyDefault:
      'Your research is scoped to your account alone. No public profiles, no data mining, nothing sold — ever.',
  },
]

const TRUSTED_BY = [
  { initials: 'JH', color: '#15803d' },
  { initials: 'MR', color: '#b45309' },
  { initials: 'AD', color: '#166534' },
  { initials: 'EK', color: '#0f766e' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-background font-body text-on-surface relative overflow-hidden',
      )}
    >
      {/* TopNavBar */}
      <header
        className={cm.cn(
          'fixed top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10',
        )}
      >
        <div
          className={cm.cn(
            'max-w-7xl',
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
          )}
        >
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <div
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
              )}
              style={{ background: heroGradient }}
            >
              <span
                className={cm.cn('material-symbols-outlined text-white text-base')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_tree
              </span>
            </div>
            <span className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {APP_NAME}
            </span>
          </Link>
          <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <a
              href="#private"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            </a>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </nav>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            {isAuthenticated ? (
              <Link
                to="/tree"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-white rounded-lg hover:shadow-lg transition-all',
                )}
                style={{ background: heroGradient }}
              >
                {t('common.goToTree', {}, { defaultValue: 'Go to your tree' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-on-surface-variant hover:text-primary transition-colors',
                  )}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('bold'),
                    'text-white rounded-lg hover:shadow-lg transition-all',
                  )}
                  style={{ background: heroGradient }}
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Decorative orbs */}
      <div
        className={cm.cn('absolute inset-0 -z-10 overflow-hidden pointer-events-none')}
        aria-hidden="true"
      >
        <div
          className={cm.cn(
            'w-[40%] h-[40%] rounded-full absolute top-[-10%] right-[-10%] bg-primary/15 blur-[120px]',
          )}
        />
        <div
          className={cm.cn(
            'w-[40%] h-[40%] rounded-full absolute bottom-[-10%] left-[-10%] bg-secondary/15 blur-[120px]',
          )}
        />
      </div>

      {/* Hero */}
      <main className={cm.cn('max-w-7xl', cm.mxAuto, cm.sp('px', 6), 'pt-32 pb-20')}>
        <div
          className={cm.cn(
            cm.grid({ gap: 'lg' }),
            'grid-cols-1 lg:grid-cols-2 lg:gap-16 items-center',
          )}
        >
          <div>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                'inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6',
              )}
              style={{
                backgroundColor: 'var(--color-tree-partner-bg)',
                color: 'var(--color-tree-partner)',
              }}
            >
              <span className={cm.cn('material-symbols-outlined text-xs')}>spa</span>
              {t(
                'landing.hero.eyebrow',
                {},
                { defaultValue: 'Ancestry-lite · Private by default' },
              )}
            </span>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold',
              )}
            >
              {t('landing.hero.title', {}, { defaultValue: 'Your family, connected.' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 6),
                cm.maxW('lg'),
                'text-on-surface-variant',
              )}
            >
              {t(
                'landing.hero.subtitle',
                {},
                {
                  defaultValue:
                    'Start with yourself. Add parents, partners, and children — and watch the branches grow into a navigable tree with a life timeline for every person.',
                },
              )}
            </p>

            {/* Hero CTAs */}
            <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md' }), cm.sp('mt', 8))}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('base'),
                  cm.fontWeight('bold'),
                  'text-white rounded-xl hover:shadow-xl transform hover:scale-[0.98] transition-all',
                )}
                style={{ background: heroGradient }}
              >
                {t('landing.hero.primaryCta', {}, { defaultValue: 'Plant your tree' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.textSize('base'),
                  cm.fontWeight('semibold'),
                  'border border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container rounded-xl transition-all',
                )}
              >
                <span className="material-symbols-outlined">login</span>
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>

            {/* Social proof */}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('mt', 8),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
            >
              <span className={cm.cn('flex -space-x-2')}>
                {TRUSTED_BY.map((p) => (
                  <span
                    key={p.initials}
                    className={cm.cn(
                      'w-8 h-8 rounded-full border-2 border-surface flex items-center justify-center text-[11px] font-bold text-white',
                    )}
                    style={{ backgroundColor: p.color }}
                    aria-hidden="true"
                  >
                    {p.initials}
                  </span>
                ))}
              </span>
              <span className={cm.fontWeight('medium')}>
                {t(
                  'landing.hero.trustedBy',
                  { count: '18,000' },
                  { defaultValue: 'Trusted by {{count}}+ family historians' },
                )}
              </span>
            </div>
          </div>

          {/* Sample tree preview card */}
          <div className={cm.cn('relative')}>
            <MiniTreePreview />
            <div
              className={cm.cn(
                'absolute -top-4 -right-4 px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-white shadow-lg',
              )}
              style={{ background: heroGradient }}
            >
              {t('landing.hero.previewLabel', {}, { defaultValue: 'Live preview' })}
            </div>
          </div>
        </div>

        {/* Feature quad */}
        <section id="features" className={cm.cn(cm.sp('mt', 16), cm.sp('py', 12))}>
          <div className={cm.cn(cm.maxW('2xl'), cm.mxAuto, cm.textCenter, cm.sp('mb', 12))}>
            <p
              className={cm.cn('text-[10px] font-bold uppercase tracking-widest text-primary mb-3')}
            >
              {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                'tracking-tight',
              )}
            >
              {t(
                'landing.features.heading',
                {},
                { defaultValue: 'Built for family historians, not filing cabinets.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
              {t(
                'landing.features.subheading',
                {},
                {
                  defaultValue:
                    'Everything a growing tree needs — and nothing that gets between you and the people in it.',
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <article
                key={f.titleKey}
                className={cm.cn(
                  cm.sp('p', 8),
                  'bg-surface-container-low rounded-xl border border-outline-variant/10 hover:bg-surface-container transition-colors',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(12),
                    cm.h(12),
                    'mb-6 rounded-xl text-primary',
                  )}
                  style={{ backgroundColor: 'color-mix(in srgb, ' + BRAND_COLOR + ' 14%, white)' }}
                  aria-hidden="true"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                </div>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), cm.sp('mb', 2))}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Privacy band */}
        <section
          id="private"
          className={cm.cn(
            cm.sp('mt', 16),
            cm.sp('p', 12),
            'rounded-[2rem] text-white relative overflow-hidden',
          )}
          style={{ backgroundColor: 'var(--color-hero-bg)' }}
        >
          <div
            className={cm.cn('absolute inset-0')}
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, rgba(21, 128, 61, 0.55) 0%, transparent 35%),' +
                'radial-gradient(circle at 80% 60%, rgba(101, 163, 13, 0.30) 0%, transparent 30%),' +
                'linear-gradient(135deg, var(--color-hero-bg) 0%, var(--color-hero-bg-gradient-end) 100%)',
            }}
            aria-hidden="true"
          />
          <div className={cm.cn('relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8')}>
            {[
              {
                icon: 'lock',
                label: 'Yours alone',
                body: 'Every record lives under your account. No public family pages, no auto-sharing.',
              },
              {
                icon: 'verified',
                label: 'Sourced or noted',
                body: 'Attach research notes to every person — where a fact came from matters as much as the fact.',
              },
              {
                icon: 'download',
                label: 'Leaves with you',
                body: 'Export your full tree whenever you like. Your research is never held hostage.',
              },
            ].map((s) => (
              <div key={s.label}>
                <div
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 3),
                    'bg-surface/10 backdrop-blur-md',
                  )}
                  aria-hidden="true"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {s.icon}
                  </span>
                </div>
                <p
                  className={cm.cn(
                    'text-[11px] font-bold uppercase tracking-widest text-lime-300/90',
                  )}
                >
                  {t(
                    `landing.private.${s.label.replace(/\W+/g, '')}.label`,
                    {},
                    { defaultValue: s.label },
                  )}
                </p>
                <p
                  className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), cm.sp('mt', 1))}
                >
                  {t(
                    `landing.private.${s.label.replace(/\W+/g, '')}.body`,
                    {},
                    { defaultValue: s.body },
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Marketing footer */}
        <footer
          className={cm.cn(cm.sp('mt', 16), cm.sp('py', 12), 'border-t border-outline-variant/20')}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'md' }))}>
            <Link
              to="/"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'tracking-tight',
              )}
            >
              <div
                className={cm.cn(
                  cm.w(8),
                  cm.h(8),
                  cm.roundedFull,
                  cm.flex({ align: 'center', justify: 'center' }),
                )}
                style={{ background: heroGradient }}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-white text-base')}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  account_tree
                </span>
              </div>
              {APP_NAME}
            </Link>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'landing.footer.copyright',
                { year: new Date().getFullYear(), appName: APP_NAME },
                { defaultValue: '© {{year}} {{appName}}. All rights reserved.' },
              )}
            </p>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant uppercase tracking-widest font-bold',
              )}
            >
              {t('landing.footer.tagline', {}, { defaultValue: 'Your family, connected' })}
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}
