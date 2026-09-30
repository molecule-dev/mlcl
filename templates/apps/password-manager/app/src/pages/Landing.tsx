import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { VaultHeroCard } from '../components/VaultHeroCard.js'

const HERO_CHIPS = [
  { icon: 'lock', labelKey: 'landing.chips.aes', defaultLabel: 'AES-256' },
  { icon: 'visibility_off', labelKey: 'landing.chips.zero', defaultLabel: 'Zero-knowledge' },
  { icon: 'policy', labelKey: 'landing.chips.soc2', defaultLabel: 'SOC 2 Certified' },
]

const FEATURES = [
  {
    icon: 'auto_awesome',
    titleKey: 'landing.features.generator.title',
    titleDefault: 'Unguessable in one tap',
    bodyKey: 'landing.features.generator.body',
    bodyDefault:
      'Generate AES-256 keys, passphrases, and PINs entirely on-device — never logged, never synced in the clear.',
  },
  {
    icon: 'shield_lock',
    titleKey: 'landing.features.zero.title',
    titleDefault: 'Zero-knowledge by design',
    bodyKey: 'landing.features.zero.body',
    bodyDefault:
      'Your master password derives the encryption key locally. {{appName}} servers can never read your vault.',
  },
  {
    icon: 'group',
    titleKey: 'landing.features.share.title',
    titleDefault: 'Share without exposing',
    bodyKey: 'landing.features.share.body',
    bodyDefault:
      'Per-user envelope encryption, granular roles, and a tamper-proof audit trail for every shared vault.',
  },
]

const TRUST = [
  { value: '294M+', labelKey: 'landing.trust.items', defaultLabel: 'Items sealed' },
  { value: '0', labelKey: 'landing.trust.breaches', defaultLabel: 'Master breaches' },
  { value: '99.99%', labelKey: 'landing.trust.uptime', defaultLabel: 'Uptime' },
  { value: '11ms', labelKey: 'landing.trust.unlock', defaultLabel: 'Avg unlock' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-surface-container-low/30 text-on-surface antialiased',
      )}
    >
      <nav
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-primary-light/40',
        )}
      >
        <BrandWordmark size="lg" />
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'lg' }),
            // AFTER cm.flex: twMerge keeps the last display class, so this
            // must come second or `flex` overrides `hidden` at every width.
            'hidden md:flex',
          )}
        >
          <a
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
            href="#features"
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <a
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
            href="#security"
          >
            {t('nav.security', {}, { defaultValue: 'Security' })}
          </a>
          <Link
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('medium'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
            to="/pricing"
          >
            {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
          </Link>
        </div>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          {isAuthenticated ? (
            <Link
              to="/vault"
              className={cm.cn(
                cm.sp('px', 5),
                cm.sp('py', 2),
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                'bg-primary hover:bg-primary-hover text-white rounded-lg shadow-sm transition-colors active:scale-95',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('landing.nav.signIn', {}, { defaultValue: 'Sign In' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 5),
                  cm.sp('py', 2),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'bg-primary hover:bg-primary-hover text-white rounded-lg shadow-sm transition-colors active:scale-95',
                )}
              >
                {t(
                  'landing.nav.cta',
                  { appName: APP_NAME },
                  { defaultValue: 'Get {{appName}} Free' },
                )}
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'relative overflow-hidden')}>
        <div className={cm.cn(cm.maxW('7xl'), 'mx-auto grid lg:grid-cols-2 gap-12 items-center')}>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }), cm.maxW('2xl'))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                cm.roundedFull,
                'self-start bg-primary-light text-primary-dark border border-primary-light',
              )}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                verified_user
              </span>
              {t('landing.hero.eyebrow', {}, { defaultValue: 'Trust-first password security' })}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl tracking-[-0.02em] leading-[0.95] text-on-surface font-headline',
                cm.fontWeight('bold'),
              )}
            >
              <span className="font-extrabold">
                {t('landing.hero.headline.line1', {}, { defaultValue: 'Your secrets,' })}
              </span>
              <br />
              <span className="font-extrabold">
                {t('landing.hero.headline.line2', {}, { defaultValue: 'sealed.' })}
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'text-on-surface-variant max-w-lg leading-relaxed',
              )}
            >
              {t(
                'landing.hero.body',
                { appName: APP_NAME },
                {
                  defaultValue:
                    'Protect your digital life with zero-knowledge encryption. {{appName}} generates, stores, and auto-fills your passwords across every device — without ever holding the keys.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-col sm:flex-row')}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  'bg-primary hover:bg-primary-hover text-white rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl active:scale-95 transition-all',
                )}
              >
                {t(
                  'landing.hero.primaryCta',
                  { appName: APP_NAME },
                  { defaultValue: 'Get {{appName}} Free' },
                )}
              </Link>
              <a
                href="#features"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('px', 8),
                  cm.sp('py', 4),
                  cm.fontWeight('bold'),
                  cm.textSize('lg'),
                  'bg-surface hover:bg-surface-container-low text-primary border border-primary-light rounded-xl transition-all',
                )}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  play_circle
                </span>
                {t('landing.hero.secondaryCta', {}, { defaultValue: 'See how it works' })}
              </a>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'flex-wrap')}>
              {HERO_CHIPS.map((chip) => (
                <span
                  key={chip.icon}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant',
                  )}
                >
                  <span
                    className="material-symbols-outlined text-[var(--color-accent-emerald)] text-[18px]"
                    aria-hidden="true"
                  >
                    {chip.icon}
                  </span>
                  {t(chip.labelKey, {}, { defaultValue: chip.defaultLabel })}
                </span>
              ))}
            </div>
          </div>
          <div className={cm.cn('relative')}>
            <VaultHeroCard
              itemCount={294}
              strengthScore={92}
              syncedLabel={t(
                'landing.hero.preview.synced',
                {},
                { defaultValue: 'Last sync 2 min ago · Mac, iPhone, Web' },
              )}
            />
            <div
              className={cm.cn(
                cm.sp('p', 5),
                cm.sp('mt', 4),
                'bg-surface rounded-2xl border border-primary-light/40 shadow-md flex items-center gap-3',
              )}
            >
              <span
                className="material-symbols-outlined text-success"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                shield
              </span>
              <div className={cm.cn(cm.flex({ direction: 'col' }))}>
                <span
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  {t(
                    'landing.hero.preview.title',
                    {},
                    { defaultValue: 'Re-encrypted locally on every change' },
                  )}
                </span>
                <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                  {APP_TAGLINE}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className={cm.cn(cm.sp('px', 6), cm.sp('py', 16), 'bg-surface')}>
        <div className={cm.cn(cm.maxW('7xl'), 'mx-auto')}>
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.textCenter,
              cm.sp('mb', 12),
            )}
          >
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'uppercase tracking-widest text-primary',
              )}
            >
              {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
            </span>
            <h2 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
              {t(
                'landing.features.heading',
                {},
                { defaultValue: 'Crystalline security, surfaced as software.' },
              )}
            </h2>
          </div>
          <div className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3')}>
            {FEATURES.map((f) => (
              <article
                key={f.icon}
                className={cm.cn(
                  cm.sp('p', 8),
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.accentCard({ tone: 'primary' }),
                  'bg-surface-container-low/60 rounded-2xl hover:-translate-y-0.5 transition-transform',
                )}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('p', 3),
                    'self-start bg-primary-light text-primary rounded-xl',
                  )}
                >
                  <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'tracking-tight')}>
                  {t(f.titleKey, {}, { defaultValue: f.titleDefault })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(f.bodyKey, { appName: APP_NAME }, { defaultValue: f.bodyDefault })}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="security"
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 12), 'bg-primary-dark text-white')}
      >
        <div className={cm.cn(cm.maxW('7xl'), 'mx-auto')}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 6))}>
            <span
              className="material-symbols-outlined text-[var(--color-accent-emerald)]"
              aria-hidden="true"
            >
              analytics
            </span>
            <h3
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                'uppercase tracking-widest text-primary-light',
              )}
            >
              {t('landing.trust.heading', {}, { defaultValue: 'Trust by the numbers' })}
            </h3>
          </div>
          <div
            className={cm.cn(
              cm.grid({ gap: 'lg' }),
              'grid-cols-2 md:grid-cols-4 divide-x divide-white/10',
            )}
          >
            {TRUST.map((stat, i) => (
              <div
                key={stat.labelKey}
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'xs' }),
                  cm.sp('px', 4),
                  i === 0 && 'pl-0',
                )}
              >
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('medium'),
                    'text-primary-light/70',
                  )}
                >
                  {t(stat.labelKey, {}, { defaultValue: stat.defaultLabel })}
                </span>
                <span
                  className={cm.cn(
                    cm.textSize('3xl'),
                    cm.fontWeight('bold'),
                    'tracking-tight text-white',
                  )}
                >
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 12),
          'bg-surface border-t border-primary-light/40',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.flex({ align: 'center', justify: 'between' }),
            'mx-auto gap-6 flex-col md:flex-row',
          )}
        >
          <BrandWordmark size="sm" footer />
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
            {t(
              'landing.footer.copyright',
              { year: new Date().getFullYear(), appName: APP_NAME },
              { defaultValue: '© {{year}} {{appName}} Security. All rights reserved.' },
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
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'flex-wrap')}>
            <Link
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
              to="/privacy"
            >
              {t('footer.privacyPolicy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
            <Link
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
              to="/terms"
            >
              {t('footer.termsOfService', {}, { defaultValue: 'Terms of Service' })}
            </Link>
            <Link
              className={cm.cn(
                cm.textSize('xs'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
              to="/pricing"
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
