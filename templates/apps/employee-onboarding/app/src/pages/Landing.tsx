import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ProgressRing } from '../components/ProgressRing.js'
import { ThemeToggle } from '../components/ThemeToggle.js'

/**
 * Public marketing landing page for Embark — gradient hero, feature triad,
 * sample dashboard preview that mirrors the auth'd hero, and a closing CTA.
 *
 * Translated from §14 (Marketing Editorial Hero) of POLISHED-PATTERN-CATALOG.md
 * and personal-finance/Home.tsx.
 */
export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface antialiased',
      )}
    >
      {/* Top nav */}
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('px', 8))}
        style={{
          height: '72px',
          borderBottom: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
        }}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background:
                'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
              color: 'var(--mol-color-surface)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              rocket_launch
            </span>
          </div>
          <span className={cm.cn(cm.fontWeight('bold'), 'text-lg tracking-tight')}>{APP_NAME}</span>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="font-bold text-white"
              style={{
                background:
                  'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
                padding: '10px 20px',
                borderRadius: '999px',
                boxShadow: '0 4px 14px -4px rgba(13, 148, 136, 0.5)',
              }}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link to="/login" className="font-medium text-on-surface transition-colors">
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className="font-bold text-white"
                style={{
                  background:
                    'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
                  padding: '10px 20px',
                  borderRadius: '999px',
                  boxShadow: '0 4px 14px -4px rgba(13, 148, 136, 0.5)',
                }}
              >
                {t('common.getStarted', {}, { defaultValue: 'Get started' })}
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16))}
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '-120px',
            left: '-100px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'rgba(13, 148, 136, 0.18)',
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '40px',
            right: '-100px',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.18)',
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />
        <div
          className={cm.cn(cm.maxW('full'), cm.mxAuto)}
          style={{ maxWidth: '1100px', position: 'relative' }}
        >
          <p
            className="text-[11px] font-black uppercase tracking-[0.3em]"
            style={{ color: 'var(--mol-color-primary)' }}
          >
            {t('landing.eyebrow', {}, { defaultValue: APP_TAGLINE })}
          </p>
          <h1
            className="font-extrabold tracking-tight"
            style={{ fontSize: 'clamp(44px, 7vw, 84px)', lineHeight: 0.95, marginTop: '16px' }}
          >
            {t('landing.headlineLine1', {}, { defaultValue: 'New hires deserve' })}
            <br />
            <span
              style={{
                background:
                  'linear-gradient(90deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('landing.headlineLine2', {}, { defaultValue: 'a warmer welcome.' })}
            </span>
          </h1>
          <p
            className={cm.cn(cm.sp('mt', 6), 'text-lg text-on-surface-variant')}
            style={{ maxWidth: '640px' }}
          >
            {t(
              'landing.subhead',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} guides every new teammate through their first 90 days — paperwork, training, milestones, and meaningful introductions, all in one calm, confident place.',
              },
            )}
          </p>
          <div
            className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), cm.sp('mt', 10), 'flex-wrap')}
          >
            <Link
              to="/signup"
              className="font-bold text-white"
              style={{
                background:
                  'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
                padding: '16px 32px',
                borderRadius: '999px',
                boxShadow: '0 12px 30px -12px rgba(13, 148, 136, 0.6)',
              }}
            >
              {t('landing.ctaPrimary', {}, { defaultValue: 'Start your first 90 days' })}
            </Link>
            <Link
              to="/login"
              className="font-semibold text-on-surface"
              style={{
                padding: '16px 28px',
                borderRadius: '999px',
                border: '1px solid var(--color-border, var(--mol-color-border-secondary))',
              }}
            >
              {t('landing.ctaSecondary', {}, { defaultValue: 'I already have an account' })}
            </Link>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'lg' }),
              cm.sp('mt', 10),
              'flex-wrap text-sm text-on-surface-variant',
            )}
          >
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '18px', color: 'var(--mol-color-success)' }}
              >
                verified
              </span>
              {t('landing.proof.spec', {}, { defaultValue: 'SOC 2 + GDPR ready' })}
            </span>
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '18px', color: 'var(--mol-color-primary)' }}
              >
                schedule
              </span>
              {t('landing.proof.time', {}, { defaultValue: '14-day free trial' })}
            </span>
            <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '18px', color: 'var(--mol-color-secondary)' }}
              >
                diversity_3
              </span>
              {t('landing.proof.teams', {}, { defaultValue: 'Built for teams of 50–5,000' })}
            </span>
          </div>
        </div>
      </section>

      {/* Sample dashboard preview that mirrors auth'd hero */}
      <section className={cm.cn(cm.sp('px', 8), cm.sp('pb', 16))}>
        <div className={cm.cn(cm.maxW('full'), cm.mxAuto)} style={{ maxWidth: '1100px' }}>
          <div
            className={cm.cn(cm.sp('p', 8))}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '2rem',
              background:
                'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-primary-dark) 50%, var(--mol-color-secondary) 100%)',
              color: 'var(--mol-color-surface)',
              boxShadow: '0 30px 60px -20px rgba(13, 148, 136, 0.4)',
            }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                right: '-100px',
                bottom: '-100px',
                width: '380px',
                height: '380px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                filter: 'blur(60px)',
              }}
            />
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'lg' }),
                'flex-wrap',
              )}
              style={{ position: 'relative' }}
            >
              <div style={{ flex: '1 1 320px' }}>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.2em]"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {t(
                    'landing.preview.eyebrow',
                    {},
                    { defaultValue: 'Day 14 of 90 — sample dashboard' },
                  )}
                </p>
                <h2
                  className="font-extrabold tracking-tight"
                  style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.05, marginTop: '8px' }}
                >
                  {t('landing.preview.headline', {}, { defaultValue: 'Welcome back, Maya.' })}
                </h2>
                <p
                  style={{ marginTop: '12px', maxWidth: '480px', color: 'rgba(255,255,255,0.92)' }}
                >
                  {t(
                    'landing.preview.body',
                    {},
                    {
                      defaultValue:
                        'Up next: Meet your buddy for a 30-minute coffee chat — Tue 10:00 AM.',
                    },
                  )}
                </p>
                <div className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mt', 6), 'flex-wrap')}>
                  {[
                    { label: 'Tasks', value: '12/18' },
                    { label: 'Milestones', value: '2/3' },
                    { label: 'Streak', value: '7 days' },
                  ].map((p) => (
                    <span
                      key={p.label}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.18)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.25)',
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '14px' }}>{p.value}</span>
                      <span
                        className="text-[10px] uppercase tracking-[0.18em]"
                        style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}
                      >
                        {p.label}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <div
                className={cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }))}
                style={{ flex: '0 0 auto' }}
              >
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <ProgressRing
                    value={68}
                    size={120}
                    stroke={10}
                    color="#ffffff"
                    showText={false}
                  />
                </div>
                <p
                  className="font-extrabold tracking-tighter"
                  style={{ fontSize: '40px', lineHeight: 1, color: 'var(--mol-color-surface)' }}
                >
                  68%
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature triad */}
      <section
        className={cm.cn(cm.sp('px', 8), cm.sp('py', 16))}
        style={{ background: 'var(--color-surface-container-lowest, var(--mol-color-surface))' }}
      >
        <div className={cm.cn(cm.maxW('full'), cm.mxAuto)} style={{ maxWidth: '1100px' }}>
          <p
            className="text-[11px] font-black uppercase tracking-[0.3em]"
            style={{ color: 'var(--mol-color-secondary)' }}
          >
            {t(
              'landing.featureEyebrow',
              { appName: APP_NAME },
              { defaultValue: 'Why {{appName}}' },
            )}
          </p>
          <h2
            className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 2), 'tracking-tight')}
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.05 }}
          >
            {t(
              'landing.featureHeadline',
              { appName: APP_NAME },
              { defaultValue: 'Three ways {{appName}} earns trust on day one.' },
            )}
          </h2>
          <div
            className={cm.sp('mt', 10)}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {[
              {
                icon: 'checklist',
                color: 'var(--mol-color-primary)',
                title: t('landing.feature1.title', {}, { defaultValue: 'A guided checklist' }),
                body: t(
                  'landing.feature1.body',
                  {},
                  {
                    defaultValue:
                      'Every task — paperwork, accounts, intros — pre-staged with due dates and the right owner.',
                  },
                ),
              },
              {
                icon: 'school',
                color: 'var(--mol-color-secondary)',
                title: t('landing.feature2.title', {}, { defaultValue: 'Role-aware training' }),
                body: t(
                  'landing.feature2.body',
                  {},
                  {
                    defaultValue:
                      'Modules unlock at 30/60/90 milestones, tuned to the role and team a hire is joining.',
                  },
                ),
              },
              {
                icon: 'diversity_3',
                color: 'var(--mol-color-warning)',
                title: t('landing.feature3.title', {}, { defaultValue: 'Real introductions' }),
                body: t(
                  'landing.feature3.body',
                  {},
                  {
                    defaultValue:
                      'Buddies, managers, and cross-functional intros scheduled — so nobody starts alone.',
                  },
                ),
              },
            ].map((f) => (
              <article
                key={f.title}
                className={cm.cn(
                  cm.sp('p', 6),
                  'transition-transform duration-200 hover:-translate-y-1',
                )}
                style={{
                  background: 'var(--color-surface, var(--mol-color-surface))',
                  borderRadius: '20px',
                  border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
                }}
              >
                <div
                  className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: `color-mix(in srgb, ${f.color} 14%, transparent)`,
                    color: f.color,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(cm.fontWeight('bold'), cm.sp('mt', 5), 'text-xl tracking-tight')}
                >
                  {f.title}
                </h3>
                <p className={cm.cn(cm.textMuted, cm.sp('mt', 2), 'text-sm leading-relaxed')}>
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className={cm.cn(cm.sp('px', 8), cm.sp('py', 16))}>
        <div
          className={cm.cn(cm.maxW('full'), cm.mxAuto, cm.textCenter, cm.sp('p', 12))}
          style={{
            maxWidth: '900px',
            borderRadius: '2rem',
            background:
              'linear-gradient(135deg, rgba(13, 148, 136, 0.10) 0%, rgba(139, 92, 246, 0.10) 100%)',
            border: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
          }}
        >
          <h2
            className={cm.fontWeight('bold')}
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.05 }}
          >
            {t('landing.closing.headline', {}, { defaultValue: 'Make day one feel like home.' })}
          </h2>
          <p
            className={cm.cn(cm.textMuted, cm.sp('mt', 3))}
            style={{ maxWidth: '520px', margin: '12px auto 0' }}
          >
            {t(
              'landing.closing.body',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Spin up {{appName}} for your team in under five minutes — bring your own SSO, branding, and timeline.',
              },
            )}
          </p>
          <Link
            to="/signup"
            className="inline-block font-bold text-white"
            style={{
              marginTop: '24px',
              background:
                'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-secondary) 100%)',
              padding: '16px 36px',
              borderRadius: '999px',
              boxShadow: '0 12px 30px -12px rgba(13, 148, 136, 0.6)',
            }}
          >
            {t('auth.signup.createYourWorkspace', {}, { defaultValue: 'Create your workspace' })}
          </Link>
        </div>
      </section>

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 6),
          'flex-wrap',
        )}
        style={{
          borderTop: '1px solid var(--color-border, var(--mol-color-background-tertiary))',
          color: 'var(--color-foreground-secondary, var(--mol-color-text-secondary))',
        }}
      >
        <p>
          © {new Date().getFullYear()} {APP_NAME}.{' '}
          {t('landing.footer.rights', {}, { defaultValue: 'All rights reserved.' })}
        </p>
        <p className="uppercase tracking-[0.2em]">
          {t('landing.footer.tagline', {}, { defaultValue: 'Built with Molecule.dev' })}
        </p>
      </footer>
    </div>
  )
}
