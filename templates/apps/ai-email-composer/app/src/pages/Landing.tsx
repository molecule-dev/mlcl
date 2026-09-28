import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { PublicNav } from '../components/PublicNav.js'

const FEATURES = [
  {
    key: 'compose',
    defaultTitle: 'Compose with intent',
    defaultBody: `Tell ${APP_NAME} what you're trying to say — it returns a polished draft in your voice, every time.`,
    icon: 'auto_awesome',
    accent: 'primary' as const,
  },
  {
    key: 'tone',
    defaultTitle: 'Tune the tone',
    defaultBody: `Switch between Formal, Friendly, and Persuasive with one tap. ${APP_NAME} rewrites without losing your meaning.`,
    icon: 'tune',
    accent: 'secondary' as const,
  },
  {
    key: 'templates',
    defaultTitle: 'Ready-to-send templates',
    defaultBody:
      'Start from sales, recruiting, and executive playbooks battle-tested by top performers.',
    icon: 'dashboard_customize',
    accent: 'tertiary' as const,
  },
  {
    key: 'analytics',
    defaultTitle: 'Open and reply analytics',
    defaultBody: `See which templates land and which fall flat. ${APP_NAME} learns from your wins and improves every draft.`,
    icon: 'insights',
    accent: 'success' as const,
  },
] as const

const ACCENT_BG = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  tertiary: 'bg-tertiary/10 text-tertiary',
  success: 'bg-success/10 text-success',
}

/* Decorative wordmarks for the social-proof band (stand-ins for the design's
   grayscale logo strip — no external images so the page renders offline). */
const LOGOS = [
  { key: 'atlas', name: 'Atlas & Co' },
  { key: 'northwind', name: 'Northwind' },
  { key: 'helios', name: 'Helios Labs' },
  { key: 'meridian', name: 'Meridian' },
  { key: 'cobalt', name: 'Cobalt Partners' },
] as const

const CTA_GRADIENT = {
  background: 'linear-gradient(90deg, var(--color-primary-hover) 0%, var(--color-primary) 100%)',
}

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <PublicNav />

      <main>
        {/* Hero — centered headline + subcopy, CTA pair, then the product
            mockup card (editor + AI panel) floating on a soft brand glow. */}
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              'mx-auto',
              cm.sp('px', 6),
              'pt-16 pb-24 text-center relative',
            )}
          >
            <h1
              className={cm.cn(
                cm.sp('mb', 6),
                'text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight',
              )}
              style={{ letterSpacing: '-0.02em' }}
            >
              {t('landing.heroTitle', {}, { defaultValue: 'Every word, perfected.' })}
            </h1>
            <p
              className={cm.cn(
                'text-xl md:text-2xl text-on-surface-variant max-w-3xl mx-auto',
                cm.sp('mb', 10),
                'leading-relaxed',
              )}
            >
              {t(
                'landing.heroSubtitle',
                { tagline: APP_TAGLINE, app: APP_NAME },
                {
                  defaultValue: `${APP_NAME} writes high-stakes emails with you — sales outreach, recruiting, executive intros — in the tone you want, the moment you need it.`,
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('medium'),
                  'inline-flex w-full sm:w-auto text-white rounded-xl transition-opacity hover:opacity-90 text-lg',
                )}
                style={{
                  background: CTA_GRADIENT.background,
                  boxShadow:
                    '0 12px 40px color-mix(in srgb, var(--color-primary) 15%, transparent)',
                }}
              >
                {t('landing.heroCta', {}, { defaultValue: 'Start writing' })}
              </Link>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('medium'),
                  'inline-flex w-full sm:w-auto bg-surface-container-high text-primary rounded-xl font-medium text-lg transition-colors hover:bg-surface-container-highest',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
            </div>

            {/* Stylized product mockup */}
            <div className={cm.cn('mt-20 relative max-w-5xl mx-auto text-left')}>
              <div
                aria-hidden="true"
                className={cm.cn('absolute inset-0 rounded-full blur-3xl')}
                style={{
                  background: 'color-mix(in srgb, var(--color-primary) 5%, transparent)',
                }}
              />
              <div
                className={cm.cn(
                  'relative bg-surface-container-lowest rounded-xl overflow-hidden flex flex-col md:flex-row',
                  'border border-surface-container-low',
                )}
                style={{
                  boxShadow:
                    '0 20px 60px color-mix(in srgb, var(--color-primary) 10%, transparent)',
                }}
              >
                {/* Editor pane */}
                <div className={cm.cn('flex-1', cm.sp('p', 8), 'md:p-12')}>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('mb', 6),
                      'border-b border-surface-container-low pb-4',
                    )}
                  >
                    <span
                      className={cm.cn('text-on-surface-variant text-sm uppercase tracking-wider')}
                    >
                      {t('landing.mockup.toLabel', {}, { defaultValue: 'To:' })}
                    </span>
                    <span
                      className={cm.cn(
                        'bg-surface-container-low px-3 py-1 rounded-full text-sm font-medium',
                      )}
                    >
                      {t(
                        'landing.mockup.toValue',
                        {},
                        { defaultValue: 'executive.team@company.com' },
                      )}
                    </span>
                  </div>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('mb', 8))}>
                    <span
                      className={cm.cn('text-on-surface-variant text-sm uppercase tracking-wider')}
                    >
                      {t('landing.mockup.subjectLabel', {}, { defaultValue: 'Subject:' })}
                    </span>
                    <span className={cm.cn('text-lg font-medium')}>
                      {t(
                        'landing.mockup.subjectValue',
                        {},
                        { defaultValue: 'Q3 Strategy Alignment & Key Deliverables' },
                      )}
                    </span>
                  </div>
                  <div
                    className={cm.cn(
                      'font-georgia text-lg leading-relaxed text-on-surface space-y-6',
                    )}
                  >
                    <p>{t('landing.mockup.letterSalutation', {}, { defaultValue: 'Team,' })}</p>
                    <p>
                      {t(
                        'landing.mockup.letterBody',
                        {},
                        {
                          defaultValue:
                            'As we close out a successful quarter, I want to pivot our focus to the upcoming deliverables. Our primary objective remains accelerating market penetration in the EMEA region.',
                        },
                      )}
                    </p>
                    <p>
                      {t(
                        'landing.mockup.letterAsk',
                        {},
                        {
                          defaultValue:
                            'Please review the attached brief and come prepared with initial resource allocations by Thursday.',
                        },
                      )}
                    </p>
                    <p>
                      {t('landing.mockup.letterSignoff', {}, { defaultValue: 'Best regards,' })}
                      <br />
                      {t(
                        'landing.mockup.letterSignature',
                        {},
                        { defaultValue: 'Director of Strategy' },
                      )}
                    </p>
                  </div>
                </div>

                {/* AI suggestions pane */}
                <div
                  className={cm.cn(
                    'w-full md:w-80 bg-surface-container-low border-t md:border-t-0 md:border-l border-surface-container',
                    cm.sp('p', 6),
                  )}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.sp('mb', 6),
                      'text-primary',
                    )}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined')}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      auto_awesome
                    </span>
                    <span className={cm.fontWeight('medium')}>
                      {t(
                        'landing.mockup.assistantName',
                        { app: APP_NAME },
                        { defaultValue: `${APP_NAME} Assistant` },
                      )}
                    </span>
                  </div>
                  <div className={cm.cn('space-y-4')}>
                    <div className={cm.cn('bg-surface-container-lowest p-4 rounded-xl shadow-sm')}>
                      <span
                        className={cm.cn(
                          'bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
                        )}
                      >
                        {t('landing.mockup.badgeRefineTone', {}, { defaultValue: 'Refine Tone' })}
                      </span>
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2 mb-3')}>
                        {t(
                          'landing.mockup.suggestionTone',
                          {},
                          {
                            defaultValue:
                              'Make the objective sound more authoritative and action-oriented.',
                          },
                        )}
                      </p>
                      <span
                        className={cm.cn(
                          'text-primary text-sm font-medium hover:underline cursor-default',
                        )}
                      >
                        {t(
                          'landing.mockup.applySuggestion',
                          {},
                          { defaultValue: 'Apply Suggestion' },
                        )}
                      </span>
                    </div>
                    <div
                      className={cm.cn(
                        'bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/15',
                      )}
                    >
                      <span
                        className={cm.cn(
                          'bg-surface-container-highest text-on-surface px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
                        )}
                      >
                        {t('landing.mockup.badgeClarity', {}, { defaultValue: 'Clarity Check' })}
                      </span>
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
                        {t(
                          'landing.mockup.suggestionClarity',
                          {},
                          {
                            defaultValue:
                              'Specify the exact time on Thursday for the resource allocations.',
                          },
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social-proof band */}
        <section className="border-y border-surface-container-low bg-surface-container-lowest py-10">
          <div className={cm.cn(cm.maxW('7xl'), 'mx-auto', cm.sp('px', 6), cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                'uppercase tracking-widest text-on-surface-variant',
                cm.sp('mb', 6),
              )}
            >
              {t('landing.trustedLabel', {}, { defaultValue: 'Trusted by professionals at' })}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale">
              {LOGOS.map((logo) => (
                <span
                  key={logo.key}
                  className={cm.cn(
                    'text-xl font-bold tracking-tight text-on-surface whitespace-nowrap',
                  )}
                >
                  {t(`landing.logo.${logo.key}`, {}, { defaultValue: logo.name })}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section
          id="features"
          className={cm.cn(cm.maxW('7xl'), 'mx-auto', cm.sp('px', 6), 'py-24')}
        >
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 16))}>
            <h2 className={cm.cn('text-3xl md:text-4xl font-bold tracking-tight', cm.sp('mb', 4))}>
              {t('landing.featuresHeading', {}, { defaultValue: 'Built for high-stakes outreach' })}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant max-w-2xl mx-auto')}>
              {t(
                'landing.featuresSubheading',
                { app: APP_NAME },
                {
                  defaultValue: `${APP_NAME} handles the wording so you can focus on the relationship.`,
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 8),
                  'bg-surface-container-lowest rounded-xl transition-colors duration-300 hover:bg-surface-container-low',
                )}
              >
                <span
                  className={cm.cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    cm.sp('mb', 6),
                    ACCENT_BG[f.accent],
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </span>
                <h3 className={cm.cn(cm.textSize('xl'), cm.sp('mb', 3), 'font-semibold')}>
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn('text-on-surface-variant leading-relaxed')}>
                  {t(`landing.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA — full-bleed brand gradient band */}
        <section className="py-24 text-center px-6" style={CTA_GRADIENT}>
          <h2
            className={cm.cn('text-3xl md:text-5xl font-bold tracking-tight', cm.sp('mb', 6))}
            style={{ color: 'var(--color-on-primary)' }}
          >
            {t('landing.ctaHeading', {}, { defaultValue: 'Send your next reply with confidence' })}
          </h2>
          <p
            className={cm.cn(cm.textSize('lg'), cm.sp('mb', 10), 'max-w-2xl mx-auto')}
            style={{
              color: 'color-mix(in srgb, var(--color-on-primary) 72%, var(--color-primary))',
            }}
          >
            {t(
              'landing.ctaBody',
              {},
              {
                defaultValue: 'Free for the first 50 sends. No credit card required.',
              },
            )}
          </p>
          <Link
            to="/signup"
            className={cm.cn(
              cm.sp('px', 8),
              cm.sp('py', 4),
              cm.fontWeight('medium'),
              'inline-flex bg-surface-container-lowest text-primary rounded-xl text-lg transition-colors hover:bg-surface-container-high shadow-lg',
            )}
          >
            {t('landing.heroCta', {}, { defaultValue: 'Start writing' })}
          </Link>
        </section>
      </main>

      {/* Footer — 4-column Stitch layout with the shared AppFooter strip
          (language picker, legal surfaces, version) preserved underneath. */}
      <footer className="bg-surface-container-low border-t border-surface-container">
        <div className={cm.cn(cm.maxW('7xl'), 'mx-auto', cm.sp('px', 6), 'py-16')}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            <div className="col-span-2 md:col-span-1">
              <span
                className={cm.cn(
                  'text-xl font-bold tracking-tighter text-primary block',
                  cm.sp('mb', 4),
                )}
              >
                {APP_NAME}
              </span>
              <p className={cm.cn('text-on-surface-variant', cm.textSize('sm'))}>
                {t(
                  'landing.copyright',
                  { year: new Date().getFullYear(), app: APP_NAME },
                  { defaultValue: '© {{year}} {{app}}. Composed with care.' },
                )}
              </p>
            </div>
            <FooterColumn
              title={t('landing.footer.product', {}, { defaultValue: 'Product' })}
              links={[
                {
                  label: t('landing.footer.features', {}, { defaultValue: 'Features' }),
                  href: '#features',
                },
                {
                  label: t('landing.footer.pricing', {}, { defaultValue: 'Pricing' }),
                  href: '/pricing',
                },
              ]}
            />
            <FooterColumn
              title={t('landing.footer.company', {}, { defaultValue: 'Company' })}
              links={[
                {
                  label: t('landing.footer.about', {}, { defaultValue: 'About Us' }),
                  href: '/about',
                },
              ]}
            />
            <FooterColumn
              title={t('landing.footer.legal', {}, { defaultValue: 'Legal' })}
              links={[
                {
                  label: t('landing.footer.privacy', {}, { defaultValue: 'Privacy Policy' }),
                  href: '/privacy',
                },
                {
                  label: t('landing.footer.terms', {}, { defaultValue: 'Terms of Service' }),
                  href: '/terms',
                },
              ]}
            />
          </div>
          <div
            className={cm.cn(
              cm.textSize('sm'),
              'text-on-surface-variant border-t border-outline-variant/40',
              cm.sp('mt', 12),
              cm.sp('pt', 8),
            )}
          >
            <Footer />
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <h4 className="font-semibold text-on-surface mb-4">{title}</h4>
      <ul className="space-y-3 text-sm text-on-surface-variant">
        {links.map((link) => (
          <li key={link.href}>
            {link.href.startsWith('#') ? (
              <a href={link.href} className="hover:text-primary transition-colors">
                {link.label}
              </a>
            ) : (
              <Link to={link.href} className="hover:text-primary transition-colors">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Landing
export { Landing as LandingPage }
