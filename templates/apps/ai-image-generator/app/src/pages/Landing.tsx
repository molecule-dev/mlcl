import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { useHttpClient, useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandLogo } from '../components/BrandLogo.js'
import { type Generation, GenerationCard } from '../components/GenerationCard.js'
import { PromptComposer } from '../components/PromptComposer.js'
import { adaptGeneration } from '../lib/api-adapters.js'

const FEATURES = [
  {
    icon: 'brush',
    titleKey: 'landing.features.studio.title',
    title: 'Studio-grade models',
    bodyKey: 'landing.features.studio.body',
    body: 'Diffusion models trained on millions of high-resolution professional images — portraiture, illustration, product, concept art.',
  },
  {
    icon: 'tune',
    titleKey: 'landing.features.controls.title',
    title: 'Total prompt control',
    bodyKey: 'landing.features.controls.body',
    body: 'Style chips, aspect-ratio dial, seed lock and CFG slider — all the levers you expect, none of the friction.',
  },
  {
    icon: 'auto_stories',
    titleKey: 'landing.features.collections.title',
    title: 'Living collections',
    bodyKey: 'landing.features.collections.body',
    body: 'Group runs into mood-boards, share them, iterate as a team. {{appName}} remembers your seeds and your taste.',
  },
]

const PLAN_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$0',
    period: '/mo',
    blurb: '120 credits to play, ideal for sketchpad ideation.',
    features: [
      '120 credits / month',
      `${APP_NAME} Flash drafts`,
      'Public gallery',
      'Community styles',
    ],
    cta: 'Start free',
    highlighted: false,
  },
  {
    id: 'creator',
    name: 'Creator',
    price: '$24',
    period: '/mo',
    blurb: 'For working artists shipping client work weekly.',
    features: [
      '4,000 credits / month',
      `${APP_NAME} XL v3 + Print`,
      'Private collections',
      'Upscale 4× included',
      'Priority queue',
    ],
    cta: 'Try Creator',
    highlighted: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '$96',
    period: '/mo',
    blurb: 'Shared library, brand styles and dedicated throughput.',
    features: [
      '20,000 credits / seat',
      'Team collections',
      'Custom style fine-tunes',
      'API access',
      'SLA support',
    ],
    cta: 'Talk to sales',
    highlighted: false,
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const isAuthenticated = useIsAuthenticated()
  const [galleryItems, setGalleryItems] = useState<Generation[]>([])
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    http
      .get<Record<string, unknown>[]>('/api/gallery/public?limit=8')
      .then((res) => {
        if (!mountedRef.current) return
        const arr = Array.isArray(res.data) ? res.data : []
        setGalleryItems(arr.map(adaptGeneration))
      })
      .catch(() => {
        if (!mountedRef.current) return
        setGalleryItems([])
      })
    return () => {
      mountedRef.current = false
    }
  }, [http])

  const navigate = useNavigate()
  const submitPrompt = useCallback(
    (prompt: string) => {
      // Sending visitors to signup is the right CTA for the marketing prompt-bar;
      // we forward the prompt so the signed-up user lands in /generate primed
      // with their original idea.
      const params = new URLSearchParams()
      if (prompt.trim()) params.set('prompt', prompt.trim())
      navigate(`/signup${params.toString() ? `?${params.toString()}` : ''}`)
    },
    [navigate],
  )

  return (
    <div
      className={cm.cn('relative overflow-x-hidden bg-background text-on-background antialiased')}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('px', 8),
          cm.sp('py', 4),
          'sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10',
        )}
      >
        <BrandLogo showTagline={false} />
        <nav
          className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex font-medium')}
          aria-label={t('landing.nav', {}, { defaultValue: 'Marketing navigation' })}
        >
          <a
            href="#features"
            className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <a
            href="#gallery"
            className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
          >
            {t('landing.menu.gallery', {}, { defaultValue: 'Gallery' })}
          </a>
          <a
            href="#pricing"
            className={cm.cn('text-on-surface-variant hover:text-primary transition-colors')}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </a>
        </nav>
        <div className={cm.flex({ align: 'center', gap: 'sm' })}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow',
              )}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                dashboard
              </span>
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('bold'),
                  cm.textSize('sm'),
                  'rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow',
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  auto_awesome
                </span>
                {t('landing.cta', {}, { defaultValue: 'Start creating' })}
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'lg' }),
            cm.sp('px', 6),
            cm.sp('py', 16),
            'relative text-center',
          )}
        >
          <div className={cm.cn('pointer-events-none absolute inset-0 overflow-hidden -z-10')}>
            <div
              className={cm.cn(
                'absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-gradient-to-tr from-primary/30 to-secondary/30 blur-[140px]',
              )}
            />
            <div
              className={cm.cn(
                'absolute top-0 right-0 w-[420px] h-[420px] rounded-full bg-primary-container/40 blur-[100px]',
              )}
            />
          </div>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              'rounded-full bg-primary-container/40 text-primary uppercase tracking-widest border border-primary/20',
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              bolt
            </span>
            {t(
              'landing.eyebrow',
              { appName: APP_NAME },
              { defaultValue: 'Now serving {{appName}} XL v3' },
            )}
          </span>
          <h1
            className={cm.cn(
              cm.fontWeight('bold'),
              'max-w-4xl text-5xl md:text-7xl tracking-tighter leading-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-fuchsia-500 to-secondary',
            )}
          >
            {t('landing.heroTitle', {}, { defaultValue: APP_TAGLINE })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              'max-w-2xl text-on-surface-variant leading-relaxed',
            )}
          >
            {t(
              'landing.heroBody',
              {},
              {
                defaultValue:
                  'Transform your imagination into stunning visual reality. The next generation of generative AI built for creators, dreamers, and visionaries.',
              },
            )}
          </p>
          <div className={cm.cn(cm.w('full'), 'max-w-3xl pt-4')}>
            <PromptComposer onSubmit={submitPrompt} />
          </div>
        </section>

        <section
          id="features"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'bg-surface-container-low')}
        >
          <div className={cm.cn('mx-auto max-w-6xl')}>
            <div
              className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textCenter, 'mb-12')}
            >
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t(
                  'landing.featuresEyebrow',
                  { appName: APP_NAME },
                  { defaultValue: 'Why {{appName}}' },
                )}
              </span>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-3xl md:text-4xl tracking-tight text-on-surface',
                )}
              >
                {t(
                  'landing.featuresTitle',
                  {},
                  { defaultValue: 'Everything you need to render the impossible' },
                )}
              </h2>
            </div>
            <div className={cm.cn('grid gap-6 md:grid-cols-3')}>
              {FEATURES.map((feature) => (
                <article
                  key={feature.icon}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'sm' }),
                    cm.sp('p', 6),
                    'rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm transition-transform',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-12 w-12 rounded-xl bg-primary-container/50 text-primary',
                    )}
                  >
                    <span className="material-symbols-outlined">{feature.icon}</span>
                  </span>
                  <h3
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      cm.textSize('xl'),
                      'tracking-tight text-on-surface',
                    )}
                  >
                    {t(feature.titleKey, {}, { defaultValue: feature.title })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}
                  >
                    {t(feature.bodyKey, { appName: APP_NAME }, { defaultValue: feature.body })}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="gallery" className={cm.cn(cm.sp('px', 6), cm.sp('py', 16))}>
          <div className={cm.cn('mx-auto max-w-6xl')}>
            <div
              className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textCenter, 'mb-12')}
            >
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t('landing.galleryEyebrow', {}, { defaultValue: 'From the dreamscape' })}
              </span>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-3xl md:text-4xl tracking-tight text-on-surface',
                )}
              >
                {t('landing.galleryTitle', {}, { defaultValue: 'Real prompts, real renders' })}
              </h2>
            </div>
            {galleryItems.length === 0 ? (
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant text-center max-w-2xl mx-auto',
                )}
              >
                {t(
                  'landing.galleryEmpty',
                  {},
                  {
                    defaultValue:
                      'Public gallery is filling up — sign up to be among the first creators showcased here.',
                  },
                )}
              </p>
            ) : (
              <div className={cm.cn('grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4')}>
                {galleryItems.slice(0, 8).map((g) => (
                  <GenerationCard key={g.id} generation={g} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section
          id="pricing"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'bg-surface-container-low')}
        >
          <div className={cm.cn('mx-auto max-w-6xl')}>
            <div
              className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), cm.textCenter, 'mb-12')}
            >
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.textSize('xs'),
                  'uppercase tracking-widest text-primary',
                )}
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </span>
              <h2
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-3xl md:text-4xl tracking-tight text-on-surface',
                )}
              >
                {t(
                  'landing.pricingTitle',
                  {},
                  { defaultValue: 'Plans that scale with your imagination' },
                )}
              </h2>
            </div>
            <div className={cm.cn('grid gap-6 md:grid-cols-3')}>
              {PLAN_TIERS.map((tier) => (
                <article
                  key={tier.id}
                  className={cm.cn(
                    cm.flex({ direction: 'col', gap: 'md' }),
                    cm.sp('p', 6),
                    'rounded-3xl border bg-surface-container-lowest shadow-sm transition-all',
                    tier.highlighted
                      ? 'border-primary ring-2 ring-primary/20 shadow-primary/15'
                      : 'border-outline-variant/15',
                  )}
                >
                  <div className={cm.flex({ direction: 'col', gap: 'xs' })}>
                    <span
                      className={cm.cn(
                        cm.fontWeight('bold'),
                        cm.textSize('xs'),
                        'uppercase tracking-widest',
                        tier.highlighted ? 'text-primary' : 'text-on-surface-variant',
                      )}
                    >
                      {t(`landing.tiers.${tier.id}.name`, {}, { defaultValue: tier.name })}
                    </span>
                    <div className={cm.flex({ align: 'baseline', gap: 'xs' })}>
                      <span
                        className={cm.cn(
                          cm.fontWeight('bold'),
                          'text-4xl tracking-tighter text-on-surface font-mono',
                        )}
                      >
                        {tier.price}
                      </span>
                      <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {tier.period}
                      </span>
                    </div>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {t(`landing.tiers.${tier.id}.blurb`, {}, { defaultValue: tier.blurb })}
                    </p>
                  </div>
                  <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'flex-1')}>
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.textSize('sm'),
                          'text-on-surface',
                        )}
                      >
                        <span
                          className={cm.cn('material-symbols-outlined text-primary')}
                          style={{ fontSize: 18 }}
                        >
                          check_circle
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                      cm.sp('py', 3),
                      cm.fontWeight('bold'),
                      'rounded-xl transition-all',
                      tier.highlighted
                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50'
                        : 'bg-surface-container text-primary hover:bg-primary/10',
                    )}
                  >
                    {t(`landing.tiers.${tier.id}.cta`, {}, { defaultValue: tier.cta })}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), cm.textCenter)}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
              cm.sp('p', 12),
              'mx-auto max-w-4xl rounded-[2rem] bg-gradient-to-br from-primary to-secondary text-white shadow-xl shadow-primary/40 relative overflow-hidden',
            )}
          >
            <div
              className={cm.cn(
                'absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-surface/15 blur-3xl pointer-events-none',
              )}
            />
            <h2 className={cm.cn(cm.fontWeight('bold'), 'text-3xl md:text-5xl tracking-tighter')}>
              {t('landing.finalCtaTitle', {}, { defaultValue: 'Ready to dream out loud?' })}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'max-w-xl text-white/85')}>
              {t(
                'landing.finalCtaBody',
                {},
                {
                  defaultValue:
                    'Generate your first 120 credits worth of imagery free. No card required.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 6),
                cm.sp('py', 3),
                cm.fontWeight('bold'),
                'rounded-full bg-surface text-primary shadow-lg hover:shadow-xl transition-all',
              )}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              {t('landing.finalCta', {}, { defaultValue: 'Create your first dream' })}
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.sp('px', 8),
          cm.sp('py', 6),
          'border-t border-outline-variant/10 text-on-surface-variant text-sm',
        )}
      >
        <BrandLogo showTagline={false} />
        <p>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), appName: APP_NAME },
            { defaultValue: '© {{year}} {{appName}} Labs. Built with Molecule.dev.' },
          )}
        </p>
      </footer>
    </div>
  )
}

export default Landing
