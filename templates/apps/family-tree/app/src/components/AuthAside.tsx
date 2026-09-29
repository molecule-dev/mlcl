import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BRAND_COLOR } from '../branding.js'

/**
 * Design aside for the auth screens — the marketing column the Stitch
 * designs place next to each auth form (hero line, recovery/standards
 * cards, sample lineage ledger). Rendered beside the form card on `lg+`
 * screens; hidden on phones where the form card is the whole screen.
 */

type AuthAsideVariant = 'login' | 'signup' | 'forgot' | 'reset'

interface Step {
  icon: string
  title: string
  titleKey: string
  body: string
  bodyKey: string
}

const SIGNUP_STEPS: Step[] = [
  {
    icon: 'person',
    title: 'Yourself',
    titleKey: 'authAside.signup.step1Title',
    body: 'Anchor the modern ledger as the living genealogical custodian.',
    bodyKey: 'authAside.signup.step1Body',
  },
  {
    icon: 'diversity_3',
    title: 'Immediate Kin',
    titleKey: 'authAside.signup.step2Title',
    body: 'Weave parents, grandparents, partners, and siblings in moments.',
    bodyKey: 'authAside.signup.step2Body',
  },
  {
    icon: 'park',
    title: 'Branching Outwards',
    titleKey: 'authAside.signup.step3Title',
    body: 'Expand through centuries, migrations, and family stories at your own calm pace.',
    bodyKey: 'authAside.signup.step3Body',
  },
]

const RECOVERY_STANDARDS: Step[] = [
  {
    icon: 'mark_email_read',
    title: 'A single-use recovery link',
    titleKey: 'authAside.forgot.step1Title',
    body: 'Dispatched only to your registered email, and it expires — request a fresh one any time.',
    bodyKey: 'authAside.forgot.step1Body',
  },
  {
    icon: 'key_vertical',
    title: 'Passphrase reset',
    titleKey: 'authAside.forgot.step2Title',
    body: 'Follow the link to set a new passphrase and sign straight back into your tree.',
    bodyKey: 'authAside.forgot.step2Body',
  },
  {
    icon: 'inventory_2',
    title: 'Records untouched',
    titleKey: 'authAside.forgot.step3Title',
    body: 'Every person, relationship, and note stays exactly as you left it — nothing is lost in a reset.',
    bodyKey: 'authAside.forgot.step3Body',
  },
]

const PASSPHRASE_STANDARDS: Step[] = [
  {
    icon: 'password',
    title: 'Archival Entropy',
    titleKey: 'authAside.reset.entropyTitle',
    body: 'Long passphrases score stronger on the live meter below — 16+ characters recommended for generational security.',
    bodyKey: 'authAside.reset.entropyBody',
  },
  {
    icon: 'enhanced_encryption',
    title: 'Immediate Re-encryption',
    titleKey: 'authAside.reset.reencryptTitle',
    body: 'Your new passphrase is hashed the moment you save it — there is nothing to re-import and your records are unchanged.',
    bodyKey: 'authAside.reset.reencryptBody',
  },
  {
    icon: 'devices_off',
    title: 'Session Termination',
    titleKey: 'authAside.reset.sessionsTitle',
    body: 'After resetting, sign out any shared devices from Settings → devices so old sessions end with the old secret.',
    bodyKey: 'authAside.reset.sessionsBody',
  },
]

export function AuthAside({ variant }: { variant: AuthAsideVariant }) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const heroLine =
    variant === 'login'
      ? t('authAside.login.hero', {}, { defaultValue: 'Return to your ancestral sanctuary.' })
      : variant === 'signup'
        ? t(
            'authAside.signup.hero',
            {},
            { defaultValue: 'Plant the first leaf of your family tree.' },
          )
        : variant === 'forgot'
          ? t(
              'authAside.forgot.hero',
              {},
              { defaultValue: 'Reclaim the key to your family sanctuary.' },
            )
          : null

  const heroBody =
    variant === 'login'
      ? t(
          'authAside.login.body',
          {},
          {
            defaultValue:
              'A quiet, private space where your family’s stories, delicate documents, and verified lineage lines remain preserved and permanently yours.',
          },
        )
      : variant === 'signup'
        ? t(
            'authAside.signup.body',
            {},
            {
              defaultValue:
                'A tranquil, private sanctuary where generational stories and verified lineage lines remain preserved and permanently unindexed by commercial data warehouses.',
            },
          )
        : variant === 'forgot'
          ? t(
              'authAside.forgot.body',
              {},
              {
                defaultValue:
                  'Your lineage records and ancestral heirlooms remain safely sealed. We’ll dispatch a secure recovery link straight to your registered email.',
              },
            )
          : t(
              'authAside.reset.body',
              {},
              {
                defaultValue:
                  'A strong passphrase is the master key to your family’s archive. The standards opposite keep it worthy of the records it protects.',
              },
            )

  const steps =
    variant === 'signup'
      ? SIGNUP_STEPS
      : variant === 'forgot'
        ? RECOVERY_STANDARDS
        : variant === 'reset'
          ? PASSPHRASE_STANDARDS
          : null

  const standardsTitle =
    variant === 'forgot'
      ? t(
          'authAside.forgot.standardsTitle',
          {},
          { defaultValue: 'The Custodian Recovery Standard' },
        )
      : t(
          'authAside.reset.standardsTitle',
          {},
          { defaultValue: 'The Passphrase Architecture Standard' },
        )

  return (
    <aside
      className={cm.cn('hidden lg:flex lg:flex-1 flex-col justify-center min-w-0', cm.sp('pr', 12))}
      aria-hidden="false"
    >
      {heroLine && (
        <h1
          className={cm.cn(
            cm.textSize('4xl'),
            cm.fontWeight('bold'),
            'tracking-tight font-display',
          )}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {heroLine}
        </h1>
      )}
      <p
        className={cm.cn(
          cm.textSize('base'),
          'leading-relaxed text-on-surface-variant',
          cm.sp('mt', 4),
          cm.maxW('lg'),
        )}
      >
        {heroBody}
      </p>

      {/* Login carries the sample lineage-ledger card; the other variants
          carry their standards list. */}
      {variant === 'login' ? (
        <div
          className={cm.cn(cm.sp('p', 6), 'rounded-2xl border mt-8 max-w-lg')}
          style={{
            backgroundColor: 'var(--color-linen)',
            borderColor: 'var(--color-linen-border)',
          }}
          data-mol-id="login-aside-ledger"
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <div
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
              )}
              style={{
                backgroundColor: 'var(--color-vault-chip)',
                color: 'var(--color-on-vault-chip)',
              }}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </div>
            <h2
              className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-display')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {t(
                'authAside.login.ledgerTitle',
                {},
                { defaultValue: 'The Vance–Lin Lineage Ledger' },
              )}
            </h2>
          </div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mt', 3),
            )}
          >
            {t(
              'authAside.login.ledgerMeta',
              {},
              { defaultValue: 'Sample archive · 6 generations · 142 preserved souls' },
            )}
          </p>
          <p
            className={cm.cn(
              cm.textSize('sm'),
              'leading-relaxed text-on-surface-variant',
              cm.sp('mt', 3),
            )}
          >
            {t(
              'authAside.login.ledgerQuote',
              {},
              {
                defaultValue:
                  '“Returning to our family tree here feels like opening a cherished, linen-bound family album in quiet morning light.”',
              },
            )}
          </p>
        </div>
      ) : (
        steps && (
          <div className={cm.cn(cm.sp('mt', 8), cm.maxW('lg'))}>
            {(variant === 'forgot' || variant === 'reset') && (
              <h2
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                  cm.sp('mb', 4),
                )}
              >
                {standardsTitle}
              </h2>
            )}
            <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              {steps.map((s, i) => (
                <li key={s.titleKey} className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
                  <div
                    className={cm.cn(
                      cm.w(9),
                      cm.h(9),
                      cm.roundedFull,
                      cm.flex({ align: 'center', justify: 'center' }),
                      'shrink-0',
                    )}
                    style={{
                      backgroundColor: 'var(--color-vault-chip)',
                      color: 'var(--color-on-vault-chip)',
                    }}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                      {variant === 'signup' || variant === 'forgot' ? null : (
                        <span
                          className={cm.cn(cm.sp('mr', 2), 'text-on-surface-variant tabular-nums')}
                          aria-hidden="true"
                        >
                          {i + 1}.
                        </span>
                      )}
                      {t(s.titleKey, {}, { defaultValue: s.title })}
                    </h3>
                    <p
                      className={cm.cn(
                        cm.textSize('sm'),
                        'text-on-surface-variant leading-relaxed',
                      )}
                    >
                      {t(s.bodyKey, {}, { defaultValue: s.body })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )
      )}

      {variant === 'signup' && (
        <figure
          className={cm.cn('border-l-2 pl-4', cm.sp('mt', 8), cm.maxW('lg'))}
          style={{ borderColor: BRAND_COLOR }}
        >
          <blockquote
            className={cm.cn(cm.textSize('sm'), 'leading-relaxed text-on-surface-variant')}
          >
            {t(
              'authAside.signup.quote',
              {},
              {
                defaultValue:
                  '“The past is not a database to be monetized; it is a quiet library kept for those who come after.”',
              },
            )}
          </blockquote>
        </figure>
      )}

      {variant === 'forgot' && (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            'text-on-surface-variant',
            cm.sp('mt', 8),
            cm.maxW('lg'),
          )}
        >
          {t(
            'authAside.forgot.quote',
            {},
            {
              defaultValue:
                '“A family’s story is never truly lost so long as its custodians hold the care to seek it.” — Branches Historical Preservation Society',
            },
          )}
        </p>
      )}

      {variant === 'reset' && (
        <p
          className={cm.cn(
            cm.textSize('sm'),
            'text-on-surface-variant',
            cm.sp('mt', 8),
            cm.maxW('lg'),
          )}
        >
          {t(
            'authAside.reset.quote',
            {},
            {
              defaultValue:
                '“The memories we pass down are only as permanent as the care we take to protect them.”',
            },
          )}
        </p>
      )}
    </aside>
  )
}

export default AuthAside
