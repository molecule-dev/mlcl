import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ProgressRing } from '../components/ProgressRing.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

/**
 * Public marketing landing page for Embark — sticky blurred nav, full-bleed
 * teal→violet gradient hero with a glassmorphic dashboard mockup, centered
 * feature trio, numbered "How it works" steps, stats band, testimonial, and a
 * full-bleed gradient CTA band with a dotted overlay.
 *
 * Mirrors reference/flagship-apps-designs/design-employee-onboarding-landing.html.
 */
export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const heroGradient =
    'linear-gradient(135deg, var(--mol-color-primary-light) 0%, var(--mol-color-primary-dark) 50%, var(--mol-color-secondary) 100%)'

  const features = [
    {
      icon: 'checklist',
      color: 'var(--mol-color-primary)',
      wash: 'var(--mol-color-info-light)',
      title: t('landing.feature1.title', {}, { defaultValue: 'Guided checklists' }),
      body: t(
        'landing.feature1.body',
        {},
        {
          defaultValue:
            'Break down complex onboarding processes into bite-sized, achievable tasks. Keep everyone on the same page.',
        },
      ),
    },
    {
      icon: 'draw',
      color: 'var(--mol-color-secondary)',
      wash: 'var(--color-secondary-container, var(--mol-color-secondary-light))',
      title: t('landing.feature2.title', {}, { defaultValue: 'Document signing' }),
      body: t(
        'landing.feature2.body',
        {},
        {
          defaultValue:
            'Handle all paperwork securely in one place. No more lost PDFs or endless email threads tracking down signatures.',
        },
      ),
    },
    {
      icon: 'handshake',
      color: 'var(--mol-color-primary)',
      wash: 'var(--mol-color-info-light)',
      title: t('landing.feature3.title', {}, { defaultValue: 'Team introductions' }),
      body: t(
        'landing.feature3.body',
        {},
        {
          defaultValue:
            'Automate welcome messages and schedule key introductory meetings. Help new hires build their network fast.',
        },
      ),
    },
  ]

  const steps = [
    {
      n: '1',
      title: t('landing.step1.title', {}, { defaultValue: 'Get your personalized plan' }),
      body: t(
        'landing.step1.body',
        {},
        { defaultValue: 'We generate a custom roadmap based on role and department.' },
      ),
    },
    {
      n: '2',
      title: t('landing.step2.title', {}, { defaultValue: 'Complete tasks at your pace' }),
      body: t(
        'landing.step2.body',
        {},
        { defaultValue: 'Interactive checklists guide new hires through their first weeks.' },
      ),
    },
    {
      n: '3',
      title: t('landing.step3.title', {}, { defaultValue: 'Hit your milestones' }),
      body: t(
        'landing.step3.body',
        {},
        { defaultValue: 'Track progress toward 30, 60, and 90-day performance goals.' },
      ),
    },
  ]

  const stats = [
    {
      value: t('landing.stat1.value', {}, { defaultValue: '30 days' }),
      label: t('landing.stat1.label', {}, { defaultValue: 'to full ramp-up' }),
    },
    {
      value: t('landing.stat2.value', {}, { defaultValue: '94%' }),
      label: t('landing.stat2.label', {}, { defaultValue: 'task completion rate' }),
    },
    {
      value: t('landing.stat3.value', {}, { defaultValue: '12,000+' }),
      label: t('landing.stat3.label', {}, { defaultValue: 'new hires onboarded' }),
    },
  ]

  const tasks = [
    {
      icon: 'check',
      accent: 'var(--mol-color-primary-light)',
      chipBg: 'var(--mol-color-info-light)',
      chipColor: 'var(--mol-color-primary)',
      muted: false,
      cta: false,
      title: t('landing.task1.title', {}, { defaultValue: 'Set up email signature' }),
      meta: t('landing.task1.meta', {}, { defaultValue: 'Completed today' }),
    },
    {
      icon: 'edit_document',
      accent: 'var(--mol-color-secondary)',
      chipBg: 'var(--color-secondary-container, var(--mol-color-secondary-light))',
      chipColor: 'var(--mol-color-secondary)',
      muted: false,
      cta: true,
      title: t('landing.task2.title', {}, { defaultValue: 'Sign HR documents' }),
      meta: t('landing.task2.meta', {}, { defaultValue: 'Due in 2 days' }),
    },
    {
      icon: 'groups',
      accent: 'var(--mol-color-border)',
      chipBg: 'var(--color-surface-variant, var(--mol-color-background-secondary))',
      chipColor: 'var(--mol-color-text-tertiary)',
      muted: true,
      cta: false,
      title: t('landing.task3.title', {}, { defaultValue: 'Meet the team' }),
      meta: t('landing.task3.meta', {}, { defaultValue: 'Scheduled for tomorrow' }),
    },
  ]

  const navLinks = [
    { label: t('landing.nav.product', {}, { defaultValue: 'Product' }), to: '/about' },
    { label: t('landing.nav.solutions', {}, { defaultValue: 'Solutions' }), to: '#features' },
    { label: t('landing.nav.resources', {}, { defaultValue: 'Resources' }), to: '#how-it-works' },
    { label: t('landing.nav.pricing', {}, { defaultValue: 'Pricing' }), to: '/pricing' },
  ]

  const footerLinks = [
    { label: t('landing.footer.privacy', {}, { defaultValue: 'Privacy Policy' }), to: '/privacy' },
    { label: t('landing.footer.terms', {}, { defaultValue: 'Terms of Service' }), to: '/terms' },
    { label: t('landing.footer.about', {}, { defaultValue: 'About' }), to: '/about' },
    { label: t('landing.footer.pricing', {}, { defaultValue: 'Pricing' }), to: '/pricing' },
  ]

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface antialiased',
      )}
    >
      {/* Top nav — sticky, blurred */}
      <header
        className={cm.cn('sticky top-0 z-50 backdrop-blur-md', cm.sp('px', 8))}
        style={{
          background:
            'color-mix(in srgb, var(--color-surface, var(--mol-color-surface)) 80%, transparent)',
          borderBottom: '1px solid var(--mol-color-info-light, var(--mol-color-border))',
        }}
      >
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.mxAuto)}
          style={{ maxWidth: '1280px', height: '64px' }}
        >
          <Link
            to="/"
            className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
            style={{ textDecoration: 'none' }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: '26px',
                color: 'var(--mol-color-primary)',
                fontVariationSettings: "'FILL' 1",
              }}
            >
              sailing
            </span>
            <span
              className={cm.cn(cm.fontWeight('bold'), 'text-2xl tracking-tight')}
              style={{ color: 'var(--mol-color-primary)' }}
            >
              {APP_NAME}
            </span>
          </Link>
          <nav className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'hidden md:flex')}>
            {navLinks.map((l) =>
              l.to.startsWith('#') ? (
                <a
                  key={l.label}
                  href={l.to}
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    'text-on-surface-variant transition-colors hover:text-primary',
                  )}
                  style={{ padding: '8px 12px', borderRadius: '8px', textDecoration: 'none' }}
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.label}
                  to={l.to}
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    'text-on-surface-variant transition-colors hover:text-primary',
                  )}
                  style={{ padding: '8px 12px', borderRadius: '8px', textDecoration: 'none' }}
                >
                  {l.label}
                </Link>
              ),
            )}
          </nav>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
            <ThemeToggle />
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cm.cn(cm.fontWeight('semibold'), 'text-on-primary')}
                style={{
                  background: 'var(--mol-color-primary)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                }}
              >
                {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    'hidden md:inline text-on-surface-variant transition-colors hover:text-primary',
                  )}
                  style={{ textDecoration: 'none' }}
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(cm.fontWeight('semibold'), 'text-on-primary')}
                  style={{
                    background: 'var(--mol-color-primary)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                  }}
                >
                  {t('common.getStarted', {}, { defaultValue: 'Get started' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero — full-bleed gradient with glassmorphic dashboard mockup */}
      <section
        className={cm.sp('px', 8)}
        style={{ background: heroGradient, position: 'relative', overflow: 'hidden' }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '800px',
            height: '800px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            filter: 'blur(64px)',
            transform: 'translate(33%, -50%)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'rgba(167, 139, 250, 0.20)',
            filter: 'blur(64px)',
            transform: 'translate(-25%, 33%)',
            pointerEvents: 'none',
          }}
        />
        <div
          className={cm.cn('eo-two-col', cm.mxAuto)}
          style={{
            maxWidth: '1280px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
            gap: '48px',
            alignItems: 'center',
            padding: '96px 0',
            position: 'relative',
          }}
        >
          {/* Left: content */}
          <div style={{ maxWidth: '576px' }}>
            <h1
              className={cm.cn(cm.fontWeight('extrabold'), 'tracking-tight')}
              style={{
                fontSize: 'clamp(40px, 5vw, 60px)',
                lineHeight: 1.1,
                color: 'var(--embark-on-gradient)',
              }}
            >
              {t('landing.headlineLine1', {}, { defaultValue: 'Your journey starts here' })}
            </h1>
            <p
              className={cm.sp('mt', 6)}
              style={{
                fontSize: '20px',
                lineHeight: 1.6,
                color: 'var(--embark-on-gradient-muted)',
                fontWeight: 400,
              }}
            >
              {t(
                'landing.subhead',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'The guided onboarding experience that turns first days into first wins. Equip your new hires with everything they need to succeed from day one.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md' }),
                cm.sp('mt', 8),
                'flex-wrap',
              )}
            >
              <Link
                to="/signup"
                className={cm.cn(cm.fontWeight('semibold'))}
                style={{
                  background: 'var(--mol-color-surface)',
                  color: 'var(--mol-color-primary)',
                  padding: '12px 32px',
                  borderRadius: '8px',
                  fontSize: '18px',
                  boxShadow: '0 10px 24px -8px rgba(2, 20, 25, 0.45)',
                }}
              >
                {t('landing.ctaPrimary', {}, { defaultValue: 'Get started' })}
              </Link>
              <Link
                to="/pricing"
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.flex({ align: 'center', gap: 'xs' }),
                )}
                style={{
                  color: 'var(--embark-on-gradient)',
                  padding: '12px 32px',
                  borderRadius: '8px',
                  fontSize: '18px',
                  border: '1px solid transparent',
                }}
              >
                {t('landing.ctaSecondary', {}, { defaultValue: 'See how it works' })}
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>

          {/* Right: glassmorphic dashboard mockup */}
          <div style={{ maxWidth: '500px', width: '100%', justifySelf: 'end' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.10)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.20)',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 25px 50px -12px rgba(2, 20, 25, 0.45)',
              }}
            >
              {/* Dashboard header card */}
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  cm.sp('p', 5),
                  cm.sp('mb', 4),
                )}
                style={{
                  background: 'var(--mol-color-surface)',
                  borderRadius: '12px',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
                }}
              >
                <div>
                  <h3
                    className={cm.fontWeight('bold')}
                    style={{ fontSize: '18px', color: 'var(--mol-color-text)' }}
                  >
                    {t('landing.mock.welcome', {}, { defaultValue: 'Welcome, Alex!' })}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--mol-color-text-secondary)' }}>
                    {t('landing.mock.day', {}, { defaultValue: 'Day 1 of your journey' })}
                  </p>
                </div>
                <ProgressRing value={65} size={48} stroke={4} color="var(--mol-color-info)" />
              </div>
              {/* Task cards */}
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                {tasks.map((task) => (
                  <div
                    key={task.title}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      cm.sp('p', 4),
                      cm.accentCard({ tone: 'custom' }),
                    )}
                    style={{
                      background: 'var(--mol-color-surface)',
                      borderRadius: '12px',
                      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
                      ['--mol-accent' as string]: task.accent,
                      opacity: task.muted ? 0.75 : 1,
                    }}
                  >
                    <div
                      className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: task.chipBg,
                        color: task.chipColor,
                        flexShrink: 0,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        {task.icon}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4
                        className={cm.fontWeight('semibold')}
                        style={{ fontSize: '14px', color: 'var(--mol-color-text)' }}
                      >
                        {task.title}
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--mol-color-text-tertiary)' }}>
                        {task.meta}
                      </p>
                    </div>
                    {task.cta && (
                      <span
                        className={cm.fontWeight('medium')}
                        style={{
                          background: task.chipBg,
                          color: task.chipColor,
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          flexShrink: 0,
                        }}
                      >
                        {t('landing.mock.start', {}, { defaultValue: 'Start' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature trio — centered */}
      <section
        id="features"
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 24))}
        style={{ background: 'var(--mol-color-surface)' }}
      >
        <div className={cm.cn(cm.mxAuto)} style={{ maxWidth: '1280px' }}>
          <div
            className={cm.cn(cm.textCenter, cm.mxAuto, cm.sp('mb', 16))}
            style={{ maxWidth: '768px' }}
          >
            <h2
              className={cm.cn(cm.fontWeight('bold'), 'tracking-tight')}
              style={{ fontSize: 'clamp(28px, 3.5vw, 36px)', color: 'var(--mol-color-text)' }}
            >
              {t(
                'landing.featureHeadline',
                { appName: APP_NAME },
                { defaultValue: 'Everything you need for a smooth landing' },
              )}
            </h2>
            <p
              className={cm.sp('mt', 4)}
              style={{ fontSize: '18px', color: 'var(--mol-color-text-secondary)' }}
            >
              {t(
                'landing.featureSub',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} streamlines the chaos of day one into a clear, engaging pathway for every new hire.',
                },
              )}
            </p>
          </div>
          <div
            className="eo-triad"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '32px',
            }}
          >
            {features.map((f) => (
              <article
                key={f.title}
                className={cm.cn(
                  cm.sp('p', 8),
                  'transition-transform duration-200 hover:-translate-y-1',
                )}
                style={{
                  background: 'var(--mol-color-surface)',
                  borderRadius: '12px',
                  border:
                    '1px solid var(--mol-color-background-secondary, var(--mol-color-border))',
                  boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.05)',
                }}
              >
                <div
                  className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('mb', 6))}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: f.wash,
                    color: f.color,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '24px', fontVariationSettings: "'FILL' 1" }}
                  >
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(cm.fontWeight('bold'), 'text-xl tracking-tight')}
                  style={{ color: 'var(--mol-color-text)' }}
                >
                  {f.title}
                </h3>
                <p
                  className={cm.cn(cm.sp('mt', 3), 'leading-relaxed')}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                >
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — numbered steps on tinted band */}
      <section
        id="how-it-works"
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 24))}
        style={{ background: 'var(--mol-color-background-secondary)' }}
      >
        <div className={cm.cn(cm.mxAuto)} style={{ maxWidth: '1280px' }}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 16))}>
            <h2
              className={cm.cn(cm.fontWeight('bold'), 'tracking-tight')}
              style={{ fontSize: 'clamp(28px, 3.5vw, 36px)', color: 'var(--mol-color-text)' }}
            >
              {t('landing.how.headline', {}, { defaultValue: 'How it works' })}
            </h2>
            <p
              className={cm.sp('mt', 4)}
              style={{ fontSize: '18px', color: 'var(--mol-color-text-secondary)' }}
            >
              {t(
                'landing.how.sub',
                {},
                { defaultValue: 'A simple, proven process to get your team up to speed.' },
              )}
            </p>
          </div>
          <div style={{ position: 'relative' }}>
            <div
              aria-hidden
              className="hidden md:block"
              style={{
                position: 'absolute',
                top: '32px',
                left: 0,
                width: '100%',
                height: '2px',
                background: 'var(--mol-color-background-tertiary)',
                zIndex: 0,
              }}
            />
            <div
              className="eo-triad"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '48px',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {steps.map((s) => (
                <div
                  key={s.n}
                  className={cm.cn(cm.flex({ direction: 'col', align: 'center' }), cm.textCenter)}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.fontWeight('bold'),
                      cm.sp('mb', 6),
                    )}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'var(--mol-color-primary)',
                      color: 'var(--embark-on-gradient)',
                      fontSize: '24px',
                      border: '4px solid var(--mol-color-surface)',
                      boxShadow:
                        '0 10px 20px -8px color-mix(in srgb, var(--mol-color-primary) 45%, transparent)',
                    }}
                  >
                    {s.n}
                  </div>
                  <h3
                    className={cm.cn(cm.fontWeight('bold'), 'text-xl')}
                    style={{ color: 'var(--mol-color-text)', marginBottom: '8px' }}
                  >
                    {s.title}
                  </h3>
                  <p style={{ color: 'var(--mol-color-text-secondary)', maxWidth: '320px' }}>
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 20))}
        style={{
          background: 'var(--mol-color-background)',
          borderTop: '1px solid var(--mol-color-info-light, var(--mol-color-border))',
          borderBottom: '1px solid var(--mol-color-info-light, var(--mol-color-border))',
        }}
      >
        <div className={cm.cn(cm.mxAuto)} style={{ maxWidth: '1280px' }}>
          <div
            className="eo-triad"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '32px',
            }}
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className={cm.cn(cm.textCenter, cm.sp('p', 8))}
                style={{
                  background: 'var(--mol-color-surface)',
                  borderRadius: '16px',
                  border:
                    '1px solid var(--mol-color-background-secondary, var(--mol-color-border))',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
                }}
              >
                <div
                  className={cm.cn(cm.fontWeight('extrabold'), cm.sp('mb', 2))}
                  style={{
                    fontSize: 'clamp(36px, 4vw, 48px)',
                    lineHeight: 1.1,
                    color: 'var(--mol-color-primary)',
                  }}
                >
                  {s.value}
                </div>
                <div
                  className={cm.fontWeight('medium')}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 24))}
        style={{ background: 'var(--mol-color-surface)' }}
      >
        <div className={cm.cn(cm.textCenter, cm.mxAuto)} style={{ maxWidth: '896px' }}>
          <div className={cm.sp('mb', 8)} style={{ color: 'var(--mol-color-secondary)' }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '40px', fontVariationSettings: "'FILL' 1" }}
            >
              format_quote
            </span>
          </div>
          <blockquote
            className={cm.fontWeight('medium')}
            style={{
              fontSize: 'clamp(22px, 2.5vw, 30px)',
              lineHeight: 1.45,
              color: 'var(--mol-color-text)',
              marginBottom: '40px',
            }}
          >
            {t(
              'landing.testimonial.quote',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} completely transformed our onboarding process. Our new engineers feel welcome immediately and are pushing code to production by week two instead of month two.',
              },
            )}
          </blockquote>
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'xs' }))}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
              )}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--mol-color-info-light)',
                color: 'var(--mol-color-primary)',
                fontSize: '22px',
                border: '2px solid var(--mol-color-info-light)',
                overflow: 'hidden',
              }}
              aria-hidden
            >
              SJ
            </div>
            <div
              className={cm.fontWeight('bold')}
              style={{ fontSize: '18px', color: 'var(--mol-color-text)' }}
            >
              {t('landing.testimonial.name', {}, { defaultValue: 'Sarah Jenkins' })}
            </div>
            <div className={cm.fontWeight('medium')} style={{ color: 'var(--mol-color-primary)' }}>
              {t('landing.testimonial.role', {}, { defaultValue: 'VP of People, TechFlow' })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA band — full-bleed gradient with dotted overlay */}
      <section
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 20))}
        style={{ background: heroGradient, position: 'relative', overflow: 'hidden' }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.10) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
          }}
        />
        <div
          className={cm.cn(cm.textCenter, cm.mxAuto)}
          style={{ maxWidth: '896px', position: 'relative' }}
        >
          <h2
            className={cm.cn(cm.fontWeight('bold'), cm.sp('mb', 8), 'tracking-tight')}
            style={{
              fontSize: 'clamp(28px, 3.5vw, 40px)',
              lineHeight: 1.15,
              color: 'var(--embark-on-gradient)',
            }}
          >
            {t(
              'landing.closing.headline',
              {},
              { defaultValue: 'Ready to make day one feel great?' },
            )}
          </h2>
          <Link
            to="/signup"
            className={cm.cn(cm.fontWeight('bold'), 'inline-block')}
            style={{
              background: 'var(--mol-color-surface)',
              color: 'var(--mol-color-primary)',
              padding: '16px 40px',
              borderRadius: '12px',
              fontSize: '18px',
              boxShadow: '0 20px 40px -12px rgba(2, 20, 25, 0.5)',
            }}
          >
            {t('auth.signup.createYourWorkspace', {}, { defaultValue: 'Start free trial' })}
          </Link>
          <p
            className={cm.sp('mt', 6)}
            style={{ fontSize: '14px', color: 'var(--embark-on-gradient-muted)' }}
          >
            {t(
              'landing.closing.note',
              {},
              { defaultValue: 'No credit card required. 14-day free trial.' },
            )}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 12))}
        style={{
          background: 'var(--mol-color-background-secondary)',
          borderTop: '1px solid var(--mol-color-border)',
        }}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'lg' }),
            cm.mxAuto,
            'flex-wrap',
          )}
          style={{ maxWidth: '1280px' }}
        >
          <div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.sp('mb', 2),
              )}
              style={{ fontSize: '20px', color: 'var(--mol-color-primary)' }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}
              >
                sailing
              </span>
              {APP_NAME}
            </div>
            <p style={{ fontSize: '14px', color: 'var(--mol-color-text-secondary)' }}>
              © {new Date().getFullYear()} {APP_NAME}.{' '}
              {t('landing.footer.built', {}, { defaultValue: 'Built for welcoming teams.' })}
            </p>
          </div>
          <div
            className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'md', justify: 'center' }))}
            style={{ fontSize: '14px' }}
          >
            {footerLinks.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="transition-colors hover:text-primary"
                style={{
                  color: 'var(--mol-color-text-secondary)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px',
                  opacity: 0.85,
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
