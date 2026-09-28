/**
 * Landing — public marketing home for Dendrite. Hero with workflow canvas
 * (bezier-connected node cards on a dot grid), features triad, sample
 * templates, pricing teaser, footer. Light Stitch design via .landing-scope.
 */
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { SafeLink } from '../components/SafeLink.js'
import { WorkflowStatusBadge } from '../components/WorkflowStatusBadge.js'
import { loadContent } from '../config.js'

export function Landing() {
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      data-mol-id="page-landing"
      // .landing-scope pins the Stitch LIGHT palette inside this wrapper so
      // the landing matches the design regardless of the app's dark default
      // (see the .landing-scope block in index.css).
      className={'landing-scope min-h-screen bg-white text-slate-800 font-body antialiased'}
    >
      {/* Top nav */}
      <header
        className={
          'sticky top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm'
        }
      >
        <div className={'flex justify-between items-center px-6 py-4 max-w-7xl mx-auto'}>
          <div className={'flex items-center gap-8'}>
            <SafeLink to="/" className={'flex items-center gap-2'}>
              <span
                className={'material-symbols-outlined font-bold text-3xl text-violet-700'}
                aria-hidden="true"
              >
                hub
              </span>
              <span className={'text-2xl font-black tracking-tighter text-violet-700'}>
                {t('landing.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
              </span>
            </SafeLink>
            <nav className={'hidden md:flex items-center gap-6'}>
              <a
                href="#features"
                className={
                  'text-violet-600 text-sm font-semibold border-b-2 border-violet-600 pb-1'
                }
              >
                {t('nav.features', {}, { defaultValue: 'Platform' })}
              </a>
              <a
                href="#templates"
                className={
                  'text-slate-600 hover:text-violet-500 transition-colors text-sm font-medium rounded-lg px-2 py-1 hover:bg-slate-50'
                }
              >
                {t('nav.templates', {}, { defaultValue: 'Workflows' })}
              </a>
              <a
                href="#pricing"
                className={
                  'text-slate-600 hover:text-violet-500 transition-colors text-sm font-medium rounded-lg px-2 py-1 hover:bg-slate-50'
                }
              >
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </a>
            </nav>
          </div>
          <div className={'flex items-center gap-4'}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="landing-dashboard"
                className={
                  'inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg shadow-md shadow-violet-500/20 transition-all hover:-translate-y-0.5'
                }
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  data-mol-id="landing-signin"
                  className={
                    'hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors'
                  }
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Log In' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-signup"
                  className={
                    'inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg shadow-md shadow-violet-500/20 transition-all hover:-translate-y-0.5'
                  }
                >
                  {t('common.startFree', {}, { defaultValue: 'Get Started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className={'pt-32 pb-20 px-6 lg:pt-40 lg:pb-32 overflow-hidden relative'}>
        <div
          className={
            'absolute inset-0 bg-violet-50/50 -z-10 [mask-image:linear-gradient(to_bottom,white,transparent)]'
          }
          aria-hidden="true"
        />
        <div
          className={'max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-8 items-center relative'}
        >
          <div className={'max-w-2xl'}>
            {/* Announcement badge */}
            <div
              className={
                'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-6'
              }
            >
              <span className={'relative flex h-2 w-2'} aria-hidden="true">
                <span
                  className={
                    'animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75'
                  }
                />
                <span className={'relative inline-flex rounded-full h-2 w-2 bg-violet-500'} />
              </span>
              {t(
                'landing.hero.eyebrow',
                { appName: APP_NAME },
                { defaultValue: '{{appName}} AI v2.0 is live' },
              )}
            </div>

            <h1
              className={
                'text-5xl lg:text-6xl xl:text-[64px] font-bold text-slate-900 leading-[1.1] tracking-tight mb-6'
              }
              data-mol-id="landing-headline"
            >
              {t('landing.hero.headline', {}, { defaultValue: 'Intelligence in ' })}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-cyan-500">
                {t('landing.hero.headlineAccent', {}, { defaultValue: 'motion' })}
              </span>
            </h1>

            <p className={'text-xl text-slate-600 mb-8 leading-relaxed max-w-lg'}>
              {t(
                'landing.hero.body',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Build AI-powered workflows in minutes, not weeks. Automate complex logic visually with precision and ease.',
                },
              )}
            </p>

            <div className={'flex flex-col sm:flex-row gap-4'}>
              <Link
                to="/signup"
                data-mol-id="landing-cta-primary"
                className={
                  'inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:-translate-y-0.5'
                }
              >
                {t('landing.hero.primaryCta', {}, { defaultValue: 'Start Building Free' })}
                <span className={'material-symbols-outlined ml-2 text-xl'} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <a
                href="#templates"
                className={
                  'inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-all hover:-translate-y-0.5'
                }
              >
                <span
                  className={'material-symbols-outlined mr-2 text-xl text-slate-400'}
                  aria-hidden="true"
                >
                  play_circle
                </span>
                {t('common.browseTemplates', {}, { defaultValue: 'View Demo' })}
              </a>
            </div>

            <div
              className={
                'mt-10 flex items-center gap-6 text-xs font-semibold uppercase tracking-widest text-slate-500'
              }
            >
              <span className={'flex items-center gap-1'}>
                <span
                  className={'material-symbols-outlined text-base text-green-500'}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                {t('landing.hero.proof.free', {}, { defaultValue: 'Free for 1k runs/mo' })}
              </span>
              <span className={'flex items-center gap-1'}>
                <span
                  className={'material-symbols-outlined text-base text-green-500'}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                {t('landing.hero.proof.soc2', {}, { defaultValue: 'SOC 2 Type II' })}
              </span>
              <span className={'flex items-center gap-1'}>
                <span
                  className={'material-symbols-outlined text-base text-green-500'}
                  aria-hidden="true"
                >
                  check_circle
                </span>
                {t('landing.hero.proof.ai', {}, { defaultValue: 'AI nodes built-in' })}
              </span>
            </div>
          </div>

          {/* Demo canvas — dot grid with bezier-connected node cards */}
          <div className={'relative lg:ml-10'}>
            <div
              className={
                'relative h-[400px] lg:h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden workflow-grid'
              }
            >
              <div className={'absolute top-4 right-4 z-10'}>
                <WorkflowStatusBadge status="running" size="sm" />
              </div>

              {/* Bezier connections */}
              <svg className={'absolute inset-0 w-full h-full z-[1]'} aria-hidden="true">
                <path className={'bezier-line'} d="M 120 150 C 200 150, 150 250, 250 250" />
                <path
                  className={'bezier-line-animated'}
                  d="M 120 150 C 200 150, 150 250, 250 250"
                />
                <path className={'bezier-line'} d="M 350 250 C 420 250, 400 150, 480 150" />
                <path
                  className={'bezier-line-animated'}
                  d="M 350 250 C 420 250, 400 150, 480 150"
                  style={{ animationDelay: '0.5s' }}
                />
              </svg>

              {/* Trigger node */}
              <div
                data-mol-id="landing-demo-trigger"
                className={
                  'absolute left-[20px] top-[140px] bg-white border border-slate-200 rounded-xl p-4 shadow-sm w-44 z-10 flex flex-col gap-2 relative overflow-hidden hover:shadow-md transition-shadow'
                }
              >
                <div
                  className={'absolute left-0 top-0 bottom-0 w-1 bg-violet-500'}
                  aria-hidden="true"
                />
                <div className={'flex items-center gap-2 text-slate-700 font-medium text-sm'}>
                  <span
                    className={'material-symbols-outlined text-violet-500 text-lg'}
                    aria-hidden="true"
                  >
                    webhook
                  </span>
                  {t('landing.demo.trigger.title', {}, { defaultValue: 'Inbound webhook' })}
                </div>
                <div className={'text-xs text-slate-400'}>
                  {t('landing.demo.trigger.subtitle', {}, { defaultValue: 'POST /forms/contact' })}
                </div>
              </div>

              {/* Condition node */}
              <div
                data-mol-id="landing-demo-condition"
                className={
                  'absolute left-[190px] top-[250px] bg-white border border-slate-200 rounded-xl p-4 shadow-sm w-44 z-10 flex flex-col gap-2 relative overflow-hidden hover:shadow-md transition-shadow'
                }
              >
                <div
                  className={'absolute left-0 top-0 bottom-0 w-1 bg-cyan-500'}
                  aria-hidden="true"
                />
                <div className={'flex items-center gap-2 text-slate-700 font-medium text-sm'}>
                  <span
                    className={'material-symbols-outlined text-cyan-500 text-lg'}
                    aria-hidden="true"
                  >
                    psychology
                  </span>
                  {t('landing.demo.condition.title', {}, { defaultValue: 'Score ≥ medium?' })}
                </div>
                <div className={'text-xs text-slate-400'}>
                  {t(
                    'landing.demo.condition.subtitle',
                    {},
                    { defaultValue: 'AI intent classifier' },
                  )}
                </div>
              </div>

              {/* Action node */}
              <div
                data-mol-id="landing-demo-action"
                className={
                  'absolute left-[380px] top-[120px] bg-white border border-slate-200 rounded-xl p-4 shadow-sm w-44 z-10 flex flex-col gap-2 relative overflow-hidden hover:shadow-md transition-shadow'
                }
              >
                <div
                  className={'absolute left-0 top-0 bottom-0 w-1 bg-green-500'}
                  aria-hidden="true"
                />
                <div className={'flex items-center gap-2 text-slate-700 font-medium text-sm'}>
                  <span
                    className={'material-symbols-outlined text-green-500 text-lg'}
                    aria-hidden="true"
                  >
                    forum
                  </span>
                  {t('landing.demo.action.title', {}, { defaultValue: 'Notify the rep' })}
                </div>
                <div className={'text-xs text-slate-400'}>
                  {t(
                    'landing.demo.action.subtitle',
                    {},
                    { defaultValue: 'Round-robin · territory' },
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features triad */}
      <section id="features" className={'max-w-7xl mx-auto px-6 py-20'}>
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className={'text-xs font-bold uppercase tracking-widest mb-2 text-violet-600'}>
            {t('common.howItWorks', {}, { defaultValue: 'How it works' })}
          </div>
          <h2 className={'text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900'}>
            {t(
              'landing.features.heading',
              {},
              { defaultValue: 'Three node types. Infinite shapes.' },
            )}
          </h2>
          <p className={'text-base mt-3 text-slate-600'}>
            {t(
              'landing.features.body',
              {},
              {
                defaultValue:
                  'Triggers fire. Conditions branch. Actions ship the work. Compose them visually, version them like code.',
              },
            )}
          </p>
        </div>
        <div className={'grid gap-6 grid-cols-1 md:grid-cols-3'}>
          {[
            {
              id: 'triggers',
              icon: 'webhook',
              titleKey: 'landing.features.triggers.title',
              titleDefault: 'Triggers',
              bodyKey: 'landing.features.triggers.body',
              bodyDefault:
                'Webhooks, cron, polling, or events from any connected app. Fan in or out — your call.',
              color: 'var(--color-node-trigger)',
            },
            {
              id: 'conditions',
              icon: 'rule',
              titleKey: 'landing.features.conditions.title',
              titleDefault: 'Conditions',
              bodyKey: 'landing.features.conditions.body',
              bodyDefault:
                'Boolean logic, expression DSL, or natural-language conditions powered by AI bonds.',
              color: 'var(--color-node-condition)',
            },
            {
              id: 'actions',
              icon: 'rocket_launch',
              titleKey: 'landing.features.actions.title',
              titleDefault: 'Actions',
              bodyKey: 'landing.features.actions.body',
              bodyDefault:
                'HTTP, queues, message channels, or any signed integration. Multi-step actions with rollback.',
              color: 'var(--color-node-action)',
            },
          ].map((f) => (
            <div
              key={f.id}
              className={
                'p-6 rounded-2xl bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg'
              }
              style={{
                border: '1px solid var(--color-panel-border)',
                borderTop: `4px solid ${f.color}`,
              }}
            >
              <div
                className={'flex items-center justify-center rounded-xl mb-4'}
                style={{
                  width: 56,
                  height: 56,
                  background: `color-mix(in srgb, ${f.color} 12%, transparent)`,
                }}
              >
                <span
                  className="material-symbols-outlined text-3xl"
                  style={{ color: f.color, fontVariationSettings: "'FILL' 1" }}
                >
                  {f.icon}
                </span>
              </div>
              <h3 className={'text-xl font-extrabold tracking-tight mb-2 text-slate-900'}>
                {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
              </h3>
              <p className={'text-sm text-slate-600'}>
                {t(f.bodyKey, {}, { defaultValue: f.bodyDefault })}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Templates teaser */}
      <section id="templates" className={'max-w-7xl mx-auto px-6 py-20'}>
        <div className={'grid gap-8 lg:grid-cols-[1fr_1.5fr] items-center'}>
          <div>
            <div className={'text-xs font-bold uppercase tracking-widest mb-2 text-violet-600'}>
              {t('landing.templates.eyebrow', {}, { defaultValue: 'Start in seconds' })}
            </div>
            <h2
              className={'text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-slate-900'}
            >
              {t('landing.templates.heading', {}, { defaultValue: 'A library of vetted recipes.' })}
            </h2>
            <p className={'text-base mb-6 text-slate-600'}>
              {t(
                'landing.templates.body',
                {},
                {
                  defaultValue:
                    'Pre-wired workflows for every team — sales, support, dev-ops, finance. Install with one click; tweak anything.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={
                'inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-500 transition-colors hover:underline'
              }
            >
              {t('landing.templates.cta', {}, { defaultValue: 'Sign up to browse templates →' })}
            </Link>
          </div>
          <div className={'grid gap-4 grid-cols-1 sm:grid-cols-2'}>
            {[
              {
                titleKey: 'landing.templates.examples.sales',
                catKey: 'landing.templates.cat.sales',
                titleDefault: 'Inbound lead routing',
                catDefault: 'Sales',
              },
              {
                titleKey: 'landing.templates.examples.finance',
                catKey: 'landing.templates.cat.finance',
                titleDefault: 'Receipt aggregation',
                catDefault: 'Finance',
              },
              {
                titleKey: 'landing.templates.examples.oncall',
                catKey: 'landing.templates.cat.oncall',
                titleDefault: 'On-call escalation',
                catDefault: 'On-call',
              },
              {
                titleKey: 'landing.templates.examples.analytics',
                catKey: 'landing.templates.cat.analytics',
                titleDefault: 'Daily metrics digest',
                catDefault: 'Analytics',
              },
            ].map((tpl) => (
              <Link
                key={tpl.titleKey}
                to="/signup"
                className={
                  'p-5 rounded-xl bg-white shadow-sm block transition-all hover:-translate-y-0.5 hover:shadow-md'
                }
                style={{ border: '1px solid var(--color-panel-border)' }}
              >
                <div className={'text-xs font-bold uppercase tracking-widest mb-1 text-cyan-600'}>
                  {t(tpl.catKey, {}, { defaultValue: tpl.catDefault })}
                </div>
                <h4 className={'text-base font-bold mb-3 text-slate-900'}>
                  {t(tpl.titleKey, {}, { defaultValue: tpl.titleDefault })}
                </h4>
                <div className={'flex items-center justify-between text-xs text-slate-400'}>
                  <span className={'flex items-center gap-1'}>
                    <span className={'material-symbols-outlined text-sm'}>account_tree</span>
                    {t('landing.templates.signupHint', {}, { defaultValue: 'Sign up to install' })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className={'max-w-7xl mx-auto px-6 py-20'}>
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className={'text-xs font-bold uppercase tracking-widest mb-2 text-violet-600'}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </div>
          <h2 className={'text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900'}>
            {t('landing.pricing.heading', {}, { defaultValue: 'Pay for runs, not seats.' })}
          </h2>
        </div>
        <div className={'grid gap-4 grid-cols-1 md:grid-cols-3 max-w-5xl mx-auto'}>
          {[
            {
              id: 'starter',
              nameKey: 'landing.pricing.starter.name',
              nameDefault: 'Starter',
              priceKey: 'landing.pricing.starter.price',
              priceDefault: '$0',
              descKey: 'landing.pricing.starter.desc',
              descDefault: '1k runs · 5 workflows',
              highlight: false,
            },
            {
              id: 'team',
              nameKey: 'landing.pricing.team.name',
              nameDefault: 'Team',
              priceKey: 'landing.pricing.team.price',
              priceDefault: '$49',
              descKey: 'landing.pricing.team.desc',
              descDefault: '50k runs · 50 workflows · AI nodes',
              highlight: true,
            },
            {
              id: 'scale',
              nameKey: 'landing.pricing.scale.name',
              nameDefault: 'Scale',
              priceKey: 'landing.pricing.scale.price',
              priceDefault: '$249',
              descKey: 'landing.pricing.scale.desc',
              descDefault: '1M runs · unlimited workflows · SSO + audit',
              highlight: false,
            },
          ].map((tier) => (
            <div
              key={tier.id}
              className={'p-6 rounded-2xl bg-white shadow-sm'}
              style={{
                border: tier.highlight
                  ? '2px solid var(--color-accent-violet)'
                  : '1px solid var(--color-panel-border)',
                boxShadow: tier.highlight
                  ? '0 16px 40px color-mix(in srgb, var(--color-accent-violet) 18%, transparent)'
                  : undefined,
              }}
            >
              {tier.highlight && (
                <span
                  className={
                    'inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3 bg-violet-100 text-violet-700'
                  }
                >
                  {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
                </span>
              )}
              <h3 className={'text-2xl font-extrabold tracking-tight text-slate-900'}>
                {t(tier.nameKey, {}, { defaultValue: tier.nameDefault })}
              </h3>
              <div className={'text-4xl font-extrabold tracking-tight mt-2 text-slate-900'}>
                {t(tier.priceKey, {}, { defaultValue: tier.priceDefault })}
                <span className={'text-base font-semibold text-slate-400'}>/mo</span>
              </div>
              <p className={'text-sm mt-2 text-slate-600'}>
                {t(tier.descKey, {}, { defaultValue: tier.descDefault })}
              </p>
              <Link
                to="/signup"
                className={
                  'block text-center mt-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5'
                }
                style={{
                  background: tier.highlight
                    ? 'linear-gradient(to right, var(--color-node-trigger), #4f46e5)'
                    : 'var(--color-surface-hover)',
                  color: tier.highlight ? 'white' : 'var(--color-panel-text)',
                }}
              >
                {tier.id === 'scale'
                  ? t('landing.pricing.contact', {}, { defaultValue: 'Talk to sales' })
                  : t('common.startFree', {}, { defaultValue: 'Start free' })}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className={'w-full py-12 px-6 border-t border-slate-200 bg-slate-50 mt-20 text-sm'}>
        <div className={'max-w-7xl mx-auto'}>
          <div className={'grid grid-cols-2 md:grid-cols-5 gap-8 mb-12'}>
            <div className={'col-span-2 md:col-span-1 flex flex-col gap-4'}>
              <span className={'text-xl font-bold text-slate-900 flex items-center gap-2'}>
                <span className={'material-symbols-outlined text-violet-600'} aria-hidden="true">
                  hub
                </span>
                {APP_NAME}
              </span>
              <p className={'text-slate-500 leading-relaxed'}>
                {t(
                  'landing.footer.tagline',
                  {},
                  { defaultValue: 'Automating the world\u2019s most complex workflows with AI.' },
                )}
              </p>
            </div>
            <div className={'flex flex-col gap-3'}>
              <h4 className={'font-semibold text-slate-900 mb-2'}>
                {t('landing.footer.product', {}, { defaultValue: 'Product' })}
              </h4>
              <a href="#features" className={'text-violet-600 font-medium hover:underline'}>
                {t('nav.features', {}, { defaultValue: 'Features' })}
              </a>
              <a
                href="#templates"
                className={'text-slate-500 hover:text-violet-500 hover:underline'}
              >
                {t('nav.templates', {}, { defaultValue: 'Workflows' })}
              </a>
              <a href="#pricing" className={'text-slate-500 hover:text-violet-500 hover:underline'}>
                {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
              </a>
            </div>
            <div className={'flex flex-col gap-3'}>
              <h4 className={'font-semibold text-slate-900 mb-2'}>
                {t('landing.footer.company', {}, { defaultValue: 'Company' })}
              </h4>
              <SafeLink
                to="/about"
                className={'text-slate-500 hover:text-violet-500 hover:underline'}
              >
                {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About' })}
              </SafeLink>
            </div>
            <div className={'flex flex-col gap-3'}>
              <h4 className={'font-semibold text-slate-900 mb-2'}>
                {t('landing.footer.support', {}, { defaultValue: 'Support' })}
              </h4>
              <SafeLink
                to="/help"
                className={'text-slate-500 hover:text-violet-500 hover:underline'}
              >
                {t('landing.footer.help', {}, { defaultValue: 'Help Center' })}
              </SafeLink>
            </div>
            <div className={'flex flex-col gap-3'}>
              <h4 className={'font-semibold text-slate-900 mb-2'}>
                {t('landing.footer.legal', {}, { defaultValue: 'Legal' })}
              </h4>
              <LegalModalLinks
                linkClassName={'text-slate-500 hover:text-violet-500 hover:underline'}
                appName={APP_NAME}
                loadContent={loadContent}
                privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy Policy' })}
                termsLabel={t('nav.terms', {}, { defaultValue: 'Terms of Service' })}
              />
            </div>
          </div>
          <div
            className={
              'flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-200 gap-4'
            }
          >
            <p className={'text-slate-500'}>
              {t(
                'common.copyrightBuiltWithMolecule',
                { year: new Date().getFullYear(), app: `${APP_NAME} AI` },
                { defaultValue: '© {{year}} {{app}}. All rights reserved.' },
              )}
              {' — Built with '}
              <a
                href="https://molecule.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium"
              >
                Molecule.dev
              </a>
            </p>
            <div className={'flex items-center gap-4 text-slate-400'}>
              <span className={'material-symbols-outlined'} aria-hidden="true">
                share
              </span>
              <span className={'material-symbols-outlined'} aria-hidden="true">
                forum
              </span>
              <span className={'material-symbols-outlined'} aria-hidden="true">
                mail
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
