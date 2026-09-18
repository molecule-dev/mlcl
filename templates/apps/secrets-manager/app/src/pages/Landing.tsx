import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ArcanumBrandMark } from '../components/ArcanumBrandMark.js'
import { SecretRow } from '../components/SecretRow.js'
import { SecretStatusPill } from '../components/SecretStatusPill.js'
import { VaultCard, type VaultCardData } from '../components/VaultCard.js'

const SAMPLE_VAULTS: VaultCardData[] = [
  {
    id: 'sample-prod',
    name: 'acme-prod',
    path: 'acme/prod/payments',
    environment: 'production',
    secretCount: 184,
    memberCount: 6,
    nextRotation: 'in 3 days',
    rotationTone: 'expiring',
    lastEvent: 'Rotated 2h ago',
  },
  {
    id: 'sample-staging',
    name: 'acme-staging',
    path: 'acme/staging/api',
    environment: 'staging',
    secretCount: 92,
    memberCount: 11,
    nextRotation: 'in 27 days',
    rotationTone: 'active',
    lastEvent: 'Locked 14m ago',
  },
  {
    id: 'sample-dev',
    name: 'acme-dev',
    path: 'acme/dev/local',
    environment: 'dev',
    secretCount: 47,
    memberCount: 23,
    nextRotation: 'never',
    rotationTone: 'inherited',
    lastEvent: 'Updated 4d ago',
  },
]

const SAMPLE_SECRETS = [
  {
    id: 'demo-stripe',
    key: 'STRIPE_SECRET_KEY',
    path: 'acme/prod/payments',
    value: 'sk_live_4eC39HqLyjWDarjtT1zdp7dc',
    status: 'active' as const,
    lastRotated: '3 days ago',
  },
  {
    id: 'demo-db',
    key: 'DATABASE_URL',
    path: 'acme/prod/db',
    value: 'postgres://prod:<redacted>@db.acme.internal:5432/core',
    status: 'expiring' as const,
    lastRotated: '88 days ago',
  },
  {
    id: 'demo-jwt',
    key: 'JWT_SIGNING_KEY',
    path: 'acme/prod/auth',
    value: 'mol_jwt_8d2fa6b31abc44e09c1f5e72a13b48e6',
    status: 'active' as const,
    lastRotated: '12 days ago',
  },
  {
    id: 'demo-deprecated',
    key: 'LEGACY_S3_KEY',
    path: 'acme/prod/legacy',
    value: 'AKIAIOSFODNN7EXAMPLEDEPRECATED',
    status: 'revoked' as const,
    lastRotated: '180 days ago',
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(
        'relative min-h-screen overflow-hidden bg-background font-body antialiased text-text',
      )}
    >
      <div className="glow-emerald" aria-hidden="true" />
      <div className="glow-violet" aria-hidden="true" />

      <header
        className={cm.cn(
          'relative z-10 flex h-14 items-center justify-between border-b border-border/60 bg-surface/40 px-6 backdrop-blur-md',
        )}
      >
        <Link to="/" className={cm.cn('inline-flex items-baseline')}>
          <ArcanumBrandMark size="md" />
        </Link>
        <nav
          className={cm.cn(
            'hidden items-center gap-6 font-mono text-xs uppercase tracking-widest text-muted md:flex',
          )}
        >
          <a href="#vaults" className={cm.cn('transition-colors hover:text-text')}>
            {t('landing.nav.vaults', {}, { defaultValue: 'Vaults' })}
          </a>
          <a href="#rotations" className={cm.cn('transition-colors hover:text-text')}>
            {t('landing.nav.rotations', {}, { defaultValue: 'Rotations' })}
          </a>
          <a href="#audit" className={cm.cn('transition-colors hover:text-text')}>
            {t('landing.nav.audit', {}, { defaultValue: 'Audit' })}
          </a>
          <Link to="/pricing" className={cm.cn('transition-colors hover:text-text')}>
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
        </nav>
        <div className={cm.cn('flex items-center gap-2')}>
          {isAuthenticated ? (
            <Link
              to="/vaults"
              data-mol-id="landing-nav-dashboard"
              className={cm.cn(
                'inline-flex h-8 items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90',
              )}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                arrow_forward
              </span>
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  'inline-flex h-8 items-center rounded border border-border bg-surface px-3 font-headline text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  'inline-flex h-8 items-center gap-1 rounded bg-primary px-3 font-headline text-xs font-bold text-on-primary transition-colors hover:bg-primary/90',
                )}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                  arrow_forward
                </span>
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className={cm.cn('relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-12')}>
        <div className={cm.cn('flex flex-col items-center gap-6 text-center')}>
          <span
            className={cm.cn(
              'inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-primary',
            )}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
              shield_lock
            </span>
            {t(
              'landing.kicker',
              {},
              { defaultValue: 'Zero-knowledge secrets · AES-256 · Audit-ready' },
            )}
          </span>
          <h1
            className={cm.cn(
              'max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight text-text md:text-6xl lg:text-7xl',
            )}
          >
            {t('landing.heroLine1', {}, { defaultValue: 'Secrets die' })}{' '}
            <span className={cm.cn('text-primary')}>
              {t('landing.heroLine2', {}, { defaultValue: 'in the open.' })}
            </span>
          </h1>
          <p className={cm.cn('max-w-2xl font-body text-base text-muted md:text-lg')}>
            {t(
              'landing.subhead',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} is a vault for the people who ship — encrypted secrets, signed rotations, and an audit trail your security team will actually read.',
              },
            )}
          </p>
          <div className={cm.cn('mt-2 flex flex-wrap items-center justify-center gap-3')}>
            <Link
              to="/signup"
              className={cm.cn(
                'inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 font-headline font-bold text-on-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90',
              )}
            >
              {t('landing.cta', {}, { defaultValue: 'Create your vault' })}
              <span
                aria-hidden="true"
                className="material-symbols-outlined"
                style={{ fontSize: '1rem' }}
              >
                arrow_forward
              </span>
            </Link>
            <a
              href="#demo"
              className={cm.cn(
                'inline-flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-5 font-headline font-semibold text-text transition-colors hover:border-primary',
              )}
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined"
                style={{ fontSize: '1rem' }}
              >
                play_circle
              </span>
              {t('landing.watchDemo', {}, { defaultValue: 'Watch the 90s tour' })}
            </a>
          </div>
          <div
            className={cm.cn(
              'mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-widest text-muted/80',
            )}
          >
            <span>{t('landing.proof.soc2', {}, { defaultValue: 'SOC 2 Type II' })}</span>
            <span aria-hidden="true">·</span>
            <span>{t('landing.proof.iso', {}, { defaultValue: 'ISO 27001' })}</span>
            <span aria-hidden="true">·</span>
            <span>{t('landing.proof.gdpr', {}, { defaultValue: 'GDPR-ready' })}</span>
            <span aria-hidden="true">·</span>
            <span>{t('landing.proof.scim', {}, { defaultValue: 'SCIM 2.0' })}</span>
          </div>
        </div>
      </section>

      {/* Sample auth'd surface — gives logged-out visitors a peek at the inside. */}
      <section id="demo" className={cm.cn('relative z-10 mx-auto max-w-6xl px-6 pb-16')}>
        <div
          className={cm.cn(
            'overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl',
          )}
        >
          <header
            className={cm.cn(
              'flex items-center justify-between border-b border-border bg-surface-secondary px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-muted',
            )}
          >
            <div className={cm.cn('flex items-center gap-2')}>
              <span
                aria-hidden="true"
                className={cm.cn('inline-block h-2 w-2 rounded-full bg-error')}
              />
              <span
                aria-hidden="true"
                className={cm.cn('inline-block h-2 w-2 rounded-full bg-warning')}
              />
              <span
                aria-hidden="true"
                className={cm.cn('inline-block h-2 w-2 rounded-full bg-primary')}
              />
              <span className={cm.cn('ml-2')}>
                {t('landing.demo.path', {}, { defaultValue: 'arcanum › acme › prod › payments' })}
              </span>
            </div>
            <SecretStatusPill tone="production" />
          </header>
          <div className={cm.cn('grid gap-3 border-b border-border/60 p-4 md:grid-cols-3')}>
            {SAMPLE_VAULTS.map((vault) => (
              <VaultCard key={vault.id} vault={vault} />
            ))}
          </div>
          <div className={cm.cn('divide-y divide-border/60')}>
            {SAMPLE_SECRETS.map((secret) => (
              <SecretRow key={secret.id} secret={secret} />
            ))}
          </div>
        </div>
      </section>

      {/* Feature triad */}
      <section id="vaults" className={cm.cn('relative z-10 mx-auto max-w-6xl px-6 pb-20')}>
        <div className={cm.cn('grid gap-4 md:grid-cols-3')}>
          {[
            {
              icon: 'lock',
              title: t(
                'landing.feature.vault.title',
                {},
                { defaultValue: 'Envelope-encrypted vaults' },
              ),
              body: t(
                'landing.feature.vault.body',
                {},
                {
                  defaultValue:
                    'Per-vault data keys wrapped by an AES-256 master. The server never sees your plaintext — even we cannot read your secrets.',
                },
              ),
            },
            {
              icon: 'autorenew',
              title: t('landing.feature.rotation.title', {}, { defaultValue: 'Signed rotations' }),
              body: t(
                'landing.feature.rotation.body',
                {},
                {
                  defaultValue:
                    'Schedule rotations per environment, ship signed webhooks to your CI, and watch every change land in the audit log.',
                },
              ),
            },
            {
              icon: 'history',
              title: t(
                'landing.feature.audit.title',
                {},
                { defaultValue: 'Audit trail you will read' },
              ),
              body: t(
                'landing.feature.audit.body',
                {},
                {
                  defaultValue:
                    'Who, when, from where, and why — every read, write, rotate, and revoke is searchable for seven years.',
                },
              ),
            },
          ].map((feature) => (
            <article
              key={feature.icon}
              className={cm.cn(
                'flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/50',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary',
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                  {feature.icon}
                </span>
              </span>
              <h3 className={cm.cn('font-headline text-lg font-semibold text-text')}>
                {feature.title}
              </h3>
              <p className={cm.cn('font-body text-sm text-muted')}>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Pricing teaser + CTA */}
      <section id="pricing" className={cm.cn('relative z-10 mx-auto max-w-4xl px-6 pb-20')}>
        <div
          className={cm.cn(
            'flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center',
          )}
        >
          <span className={cm.cn('font-mono text-[11px] uppercase tracking-widest text-muted')}>
            {t(
              'landing.cta.kicker',
              {},
              { defaultValue: 'Free for 5 secrets · paid plans from $15/mo' },
            )}
          </span>
          <h2 className={cm.cn('font-headline text-3xl font-extrabold text-text md:text-4xl')}>
            {t(
              'landing.cta.heading',
              {},
              { defaultValue: 'The vault your security team approves of.' },
            )}
          </h2>
          <Link
            to="/signup"
            className={cm.cn(
              'mt-2 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 font-headline font-bold text-on-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90',
            )}
          >
            {t('landing.cta.button', {}, { defaultValue: 'Create your vault' })}
            <span
              aria-hidden="true"
              className="material-symbols-outlined"
              style={{ fontSize: '1rem' }}
            >
              arrow_forward
            </span>
          </Link>
        </div>
      </section>

      <footer
        className={cm.cn(
          'relative z-10 border-t border-border/60 bg-background/80 py-6 text-center font-mono text-[11px] uppercase tracking-widest text-muted',
        )}
      >
        <span>© {APP_NAME} · </span>
        <span>{t('landing.footerSlogan', {}, { defaultValue: 'Secrets die in the open.' })}</span>
      </footer>
    </div>
  )
}

export default Landing
