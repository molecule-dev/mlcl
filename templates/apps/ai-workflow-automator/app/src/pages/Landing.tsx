/**
 * Landing — public marketing home for Dendrite. Hero with workflow animation,
 * features triad, sample-canvas demo, pricing teaser, footer.
 */
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'

import { APP_NAME } from '../branding.js'
import { SafeLink } from '../components/SafeLink.js'
import { WorkflowNode } from '../components/WorkflowNode.js'
import { WorkflowStatusBadge } from '../components/WorkflowStatusBadge.js'
import { loadContent } from '../config.js'

export function Landing() {
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      data-mol-id="page-landing"
      className={'min-h-screen font-body'}
      style={{ background: 'var(--color-background)', color: 'var(--color-panel-text)' }}
    >
      {/* Top nav */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          background: 'var(--color-panel-bg)',
          borderBottom: '1px solid var(--color-panel-border)',
        }}
      >
        <div className={'max-w-7xl mx-auto px-6 py-4 flex items-center justify-between'}>
          <SafeLink to="/" className={'flex items-center gap-2'}>
            <div
              className={'flex items-center justify-center rounded-xl shadow-md'}
              style={{
                width: 36,
                height: 36,
                background:
                  'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
                boxShadow:
                  '0 4px 12px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
              }}
            >
              <span
                className={'material-symbols-outlined text-xl text-white'}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                bolt
              </span>
            </div>
            <span className={'text-xl font-extrabold tracking-tight'}>
              {t('landing.brand', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
            </span>
          </SafeLink>
          <nav
            className={'hidden md:flex items-center gap-8 text-sm font-semibold'}
            style={{ color: 'var(--color-panel-text-muted)' }}
          >
            <a href="#features" className={'hover:text-primary transition-colors'}>
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </a>
            <a href="#templates" className={'hover:text-primary transition-colors'}>
              {t('nav.templates', {}, { defaultValue: 'Templates' })}
            </a>
            <a href="#pricing" className={'hover:text-primary transition-colors'}>
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </a>
          </nav>
          <div className={'flex items-center gap-3'}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                data-mol-id="landing-dashboard"
                className={
                  'px-4 py-2 rounded-full text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5'
                }
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-node-trigger), var(--color-accent-violet))',
                  boxShadow:
                    '0 6px 16px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
                }}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  data-mol-id="landing-signin"
                  className={'text-sm font-bold transition-colors hover:text-primary'}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  data-mol-id="landing-signup"
                  className={
                    'px-4 py-2 rounded-full text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5'
                  }
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-node-trigger), var(--color-accent-violet))',
                    boxShadow:
                      '0 6px 16px color-mix(in srgb, var(--color-node-trigger) 30%, transparent)',
                  }}
                >
                  {t('common.startFree', {}, { defaultValue: 'Start free' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(color-mix(in srgb, var(--color-accent-violet) 8%, transparent) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden
        />
        <div
          className={
            'absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none'
          }
          style={{ background: 'color-mix(in srgb, var(--color-accent-violet) 18%, transparent)' }}
          aria-hidden
        />
        <div
          className={
            'absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none'
          }
          style={{ background: 'color-mix(in srgb, var(--color-node-condition) 18%, transparent)' }}
          aria-hidden
        />

        <div
          className={
            'relative max-w-7xl mx-auto px-6 pt-20 pb-32 grid gap-12 lg:grid-cols-[1.1fr_1fr] items-center'
          }
        >
          <div>
            <div
              className={
                'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6'
              }
              style={{
                background: 'var(--color-surface-hover)',
                color: 'var(--color-accent-violet)',
              }}
            >
              <span
                className={'rounded-full'}
                style={{
                  width: 6,
                  height: 6,
                  background: 'var(--color-accent-violet)',
                  display: 'inline-block',
                }}
              />
              {t('landing.hero.eyebrow', {}, { defaultValue: 'Intelligence in motion' })}
            </div>
            <h1
              className={
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95] mb-6'
              }
            >
              {t(
                'landing.hero.headline',
                {},
                { defaultValue: 'Wire your stack together. Let the work happen.' },
              )}
            </h1>
            <p
              className={'text-lg md:text-xl mb-8 max-w-xl'}
              style={{ color: 'var(--color-panel-text-muted)' }}
            >
              {t(
                'landing.hero.body',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} is the workflow engine for ops teams who outgrew Zapier. Trigger, condition, action — wired to every system you actually use.',
                },
              )}
            </p>
            <div className={'flex flex-wrap items-center gap-3 mb-10'}>
              <Link
                to="/signup"
                data-mol-id="landing-cta-primary"
                className={
                  'inline-flex items-center gap-2 px-6 py-3 rounded-full text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5'
                }
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
                  boxShadow:
                    '0 12px 30px color-mix(in srgb, var(--color-node-trigger) 35%, transparent)',
                }}
              >
                <span className="material-symbols-outlined">bolt</span>
                {t('landing.hero.primaryCta', {}, { defaultValue: 'Build your first workflow' })}
              </Link>
              <a
                href="#templates"
                className={
                  'inline-flex items-center gap-2 px-6 py-3 rounded-full text-base font-bold transition-colors hover:bg-surface'
                }
                style={{
                  background: 'color-mix(in srgb, white 60%, transparent)',
                  color: 'var(--color-panel-text)',
                  border: '1px solid var(--color-panel-border)',
                }}
              >
                <span className="material-symbols-outlined">auto_awesome_motion</span>
                {t('common.browseTemplates', {}, { defaultValue: 'Browse templates' })}
              </a>
            </div>
            <div
              className={'flex items-center gap-6 text-xs font-semibold uppercase tracking-widest'}
              style={{ color: 'var(--color-panel-text-faint)' }}
            >
              <span className={'flex items-center gap-1'}>
                <span
                  className={'material-symbols-outlined text-base'}
                  style={{ color: 'var(--color-node-action)' }}
                >
                  check_circle
                </span>
                {t('landing.hero.proof.free', {}, { defaultValue: 'Free for 1k runs/mo' })}
              </span>
              <span className={'flex items-center gap-1'}>
                <span
                  className={'material-symbols-outlined text-base'}
                  style={{ color: 'var(--color-node-action)' }}
                >
                  check_circle
                </span>
                {t('landing.hero.proof.soc2', {}, { defaultValue: 'SOC 2 Type II' })}
              </span>
              <span className={'flex items-center gap-1'}>
                <span
                  className={'material-symbols-outlined text-base'}
                  style={{ color: 'var(--color-node-action)' }}
                >
                  check_circle
                </span>
                {t('landing.hero.proof.ai', {}, { defaultValue: 'AI nodes built-in' })}
              </span>
            </div>
          </div>

          {/* Demo canvas — mirrors the auth'd builder */}
          <div
            className={'rounded-2xl shadow-2xl relative p-6 md:p-8 overflow-hidden'}
            style={{
              background: 'var(--color-surface)',
              boxShadow: '0 30px 60px color-mix(in srgb, var(--color-panel-text) 18%, transparent)',
              border: '1px solid var(--color-panel-border)',
            }}
          >
            <div className={'flex items-center justify-between mb-4'}>
              <div className={'flex items-center gap-2'}>
                <span
                  className={'rounded-full'}
                  style={{ width: 10, height: 10, background: '#fb7185' }}
                />
                <span
                  className={'rounded-full'}
                  style={{ width: 10, height: 10, background: '#fbbf24' }}
                />
                <span
                  className={'rounded-full'}
                  style={{ width: 10, height: 10, background: '#34d399' }}
                />
              </div>
              <WorkflowStatusBadge status="running" size="sm" />
            </div>
            <div
              className={'rounded-xl p-4 relative'}
              style={{
                background: 'var(--color-canvas)',
                backgroundImage: 'radial-gradient(var(--color-canvas-dot) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                minHeight: 360,
              }}
            >
              <div className={'flex flex-col gap-4'}>
                <WorkflowNode
                  kind="trigger"
                  icon="webhook"
                  title={t('landing.demo.trigger.title', {}, { defaultValue: 'Inbound webhook' })}
                  subtitle={t(
                    'landing.demo.trigger.subtitle',
                    {},
                    { defaultValue: 'POST /forms/contact' },
                  )}
                />
                <span
                  className={'material-symbols-outlined text-2xl mx-4'}
                  style={{ color: 'var(--color-accent-violet-light)' }}
                >
                  arrow_downward
                </span>
                <WorkflowNode
                  kind="condition"
                  icon="psychology"
                  title={t('landing.demo.condition.title', {}, { defaultValue: 'Score ≥ medium?' })}
                  subtitle={t(
                    'landing.demo.condition.subtitle',
                    {},
                    { defaultValue: 'AI intent classifier' },
                  )}
                />
                <span
                  className={'material-symbols-outlined text-2xl mx-4'}
                  style={{ color: 'var(--color-accent-violet-light)' }}
                >
                  arrow_downward
                </span>
                <WorkflowNode
                  kind="action"
                  icon="forum"
                  title={t('landing.demo.action.title', {}, { defaultValue: 'Notify the rep' })}
                  subtitle={t(
                    'landing.demo.action.subtitle',
                    {},
                    { defaultValue: 'Round-robin · territory' },
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features triad */}
      <section id="features" className={'max-w-7xl mx-auto px-6 py-20'}>
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div
            className={'text-xs font-bold uppercase tracking-widest mb-2'}
            style={{ color: 'var(--color-node-condition)' }}
          >
            {t('common.howItWorks', {}, { defaultValue: 'How it works' })}
          </div>
          <h2 className={'text-4xl md:text-5xl font-extrabold tracking-tight'}>
            {t(
              'landing.features.heading',
              {},
              { defaultValue: 'Three node types. Infinite shapes.' },
            )}
          </h2>
          <p className={'text-base mt-3'} style={{ color: 'var(--color-panel-text-muted)' }}>
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
                'p-6 rounded-2xl bg-surface shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg'
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
              <h3 className={'text-xl font-extrabold tracking-tight mb-2'}>
                {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
              </h3>
              <p className={'text-sm'} style={{ color: 'var(--color-panel-text-muted)' }}>
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
            <div
              className={'text-xs font-bold uppercase tracking-widest mb-2'}
              style={{ color: 'var(--color-node-condition)' }}
            >
              {t('landing.templates.eyebrow', {}, { defaultValue: 'Start in seconds' })}
            </div>
            <h2 className={'text-4xl md:text-5xl font-extrabold tracking-tight mb-3'}>
              {t('landing.templates.heading', {}, { defaultValue: 'A library of vetted recipes.' })}
            </h2>
            <p className={'text-base mb-6'} style={{ color: 'var(--color-panel-text-muted)' }}>
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
                'inline-flex items-center gap-2 text-sm font-bold transition-colors hover:underline'
              }
              style={{ color: 'var(--color-accent-violet)' }}
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
                  'p-5 rounded-xl bg-surface shadow-sm block transition-all hover:-translate-y-0.5 hover:shadow-md'
                }
                style={{ border: '1px solid var(--color-panel-border)' }}
              >
                <div
                  className={'text-xs font-bold uppercase tracking-widest mb-1'}
                  style={{ color: 'var(--color-node-condition)' }}
                >
                  {t(tpl.catKey, {}, { defaultValue: tpl.catDefault })}
                </div>
                <h4 className={'text-base font-bold mb-3'}>
                  {t(tpl.titleKey, {}, { defaultValue: tpl.titleDefault })}
                </h4>
                <div
                  className={'flex items-center justify-between text-xs'}
                  style={{ color: 'var(--color-panel-text-faint)' }}
                >
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
          <div
            className={'text-xs font-bold uppercase tracking-widest mb-2'}
            style={{ color: 'var(--color-node-condition)' }}
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </div>
          <h2 className={'text-4xl md:text-5xl font-extrabold tracking-tight'}>
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
              className={'p-6 rounded-2xl bg-surface shadow-sm'}
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
                    'inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3'
                  }
                  style={{
                    background: 'var(--color-surface-hover)',
                    color: 'var(--color-accent-violet)',
                  }}
                >
                  {t('status.mostPopular', {}, { defaultValue: 'Most popular' })}
                </span>
              )}
              <h3 className={'text-2xl font-extrabold tracking-tight'}>
                {t(tier.nameKey, {}, { defaultValue: tier.nameDefault })}
              </h3>
              <div className={'text-4xl font-extrabold tracking-tight mt-2'}>
                {t(tier.priceKey, {}, { defaultValue: tier.priceDefault })}
                <span
                  className={'text-base font-semibold'}
                  style={{ color: 'var(--color-panel-text-faint)' }}
                >
                  /mo
                </span>
              </div>
              <p className={'text-sm mt-2'} style={{ color: 'var(--color-panel-text-muted)' }}>
                {t(tier.descKey, {}, { defaultValue: tier.descDefault })}
              </p>
              <Link
                to="/signup"
                className={
                  'block text-center mt-5 py-2.5 rounded-full text-sm font-bold transition-colors'
                }
                style={{
                  background: tier.highlight
                    ? 'var(--color-accent-violet-strong)'
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
      <footer
        className={'mt-20 border-t'}
        style={{ borderColor: 'var(--color-panel-border)', background: 'var(--color-surface)' }}
      >
        <div
          className={
            'max-w-7xl mx-auto px-6 py-10 flex flex-wrap items-center justify-between gap-4'
          }
        >
          <div className={'flex items-center gap-2'}>
            <div
              className={'flex items-center justify-center rounded-lg'}
              style={{
                width: 28,
                height: 28,
                background:
                  'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
              }}
            >
              <span
                className={'material-symbols-outlined text-base text-white'}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                bolt
              </span>
            </div>
            <span className={'text-base font-extrabold'}>{APP_NAME}</span>
            <span
              className={'text-xs font-semibold uppercase tracking-widest ml-2'}
              style={{ color: 'var(--color-panel-text-faint)' }}
            >
              {t('landing.footer.tagline', {}, { defaultValue: 'Intelligence in motion' })}
            </span>
          </div>
          <nav
            className={'flex items-center gap-6 text-xs font-bold uppercase tracking-widest'}
            style={{ color: 'var(--color-panel-text-faint)' }}
          >
            <LegalModalLinks
              linkClassName={'hover:text-primary transition-colors'}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
            />
            <Link to="/about" className={'hover:text-primary transition-colors'}>
              {t('footer.about', { appName: APP_NAME }, { defaultValue: 'About {{appName}}' })}
            </Link>
            <Link to="/help" className={'hover:text-primary transition-colors'}>
              {t('landing.footer.help', {}, { defaultValue: 'Help' })}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

export default Landing
