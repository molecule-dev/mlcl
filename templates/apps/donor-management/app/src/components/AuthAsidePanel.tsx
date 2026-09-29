import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Marketing aside for the auth views — the stacked equivalent of the
 * Stitch design's left panel: compliance eyebrow, mission headline
 * (rendered as an `<h2>`; the AuthBrandHeader wordmark stays the page's
 * single `<h1>`), and the trust-badge row. Copy comes from the design via
 * per-view props so each auth screen carries its own headline.
 */
export function AuthAsidePanel({
  eyebrowKey,
  eyebrowDefault,
  headlineKey,
  headlineDefault,
}: {
  eyebrowKey: string
  eyebrowDefault: string
  headlineKey: string
  headlineDefault: string
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const BADGES = [
    {
      icon: 'lock',
      key: 'auth.aside.badgeEncryption',
      def: 'AES-256 encrypted donor vault',
    },
    {
      icon: 'verified_user',
      key: 'auth.aside.badgeSoc2',
      def: 'SOC-2 Type II certified',
    },
    {
      icon: 'volunteer_activism',
      key: 'auth.aside.badgeTrusted',
      def: 'Trusted by 1,800+ 501(c)(3) nonprofits',
    },
  ] as const
  return (
    <section
      data-mol-id="auth-aside"
      className={cm.cn(
        cm.sp('mb', 8),
        cm.sp('px', 2),
        cm.textCenter,
        'flex flex-col items-center gap-3',
      )}
    >
      <p
        className={cm.cn(
          cm.textSize('xs'),
          cm.fontWeight('bold'),
          'uppercase tracking-widest text-primary',
        )}
      >
        <span className={'material-symbols-outlined text-sm align-middle mr-1'} aria-hidden="true">
          verified_user
        </span>
        {t(eyebrowKey, {}, { defaultValue: eyebrowDefault })}
      </p>
      <h2
        className={cm.cn(
          cm.textSize('2xl'),
          cm.fontWeight('bold'),
          'font-display tracking-tight text-on-surface max-w-xl',
        )}
      >
        {t(headlineKey, {}, { defaultValue: headlineDefault })}
      </h2>
      <ul className={cm.cn(cm.flex({ gap: 'md', wrap: 'wrap' }), 'justify-center')}>
        {BADGES.map((b) => (
          <li
            key={b.key}
            className={cm.cn(
              cm.flex({ align: 'center', gap: 2 }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              'rounded-full bg-surface-container text-on-surface-variant',
            )}
          >
            <span className={'material-symbols-outlined text-primary text-sm'} aria-hidden="true">
              {b.icon}
            </span>
            {t(b.key, {}, { defaultValue: b.def })}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default AuthAsidePanel
