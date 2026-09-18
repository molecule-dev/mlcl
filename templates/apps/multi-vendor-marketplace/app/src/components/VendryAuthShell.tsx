import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

interface VendryAuthShellProps {
  /** Heading shown above the form. */
  heading: string
  /** Subheading / supporting copy beneath the heading. */
  subheading?: string
  /** The form/CTA card content. */
  children: React.ReactNode
  /** Optional bottom prompt (link to sister auth page). */
  bottomPrompt?: React.ReactNode
}

/**
 * Two-panel auth shell — left brand panel (gradient + decorative orbs +
 * marketing pitch + sample storefront pill); right card with the form.
 *
 * Translated from property-listing's two-panel decorated-card pattern
 * (catalog §13.3 — Decorated-Card with Brand Panel) and tinted with the
 * Vendry palette.
 */
export function VendryAuthShell({
  heading,
  subheading,
  children,
  bottomPrompt,
}: VendryAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-background relative overflow-hidden grid lg:grid-cols-[1.05fr_1fr]',
      )}
    >
      {/* LEFT — brand panel (hidden on mobile) */}
      <aside
        className={cm.cn(
          cm.sp('p', 12),
          'hidden lg:flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-primary via-primary-container to-info text-on-primary',
        )}
      >
        <Link
          to="/"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.fontWeight('bold'),
            cm.textSize('xl'),
            'relative z-10',
          )}
        >
          <span
            className={cm.cn(
              'flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-primary',
            )}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden
            >
              storefront
            </span>
          </span>
          {APP_NAME}
        </Link>

        <div className="relative z-10 max-w-md">
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.sp('mb', 4),
              cm.sp('px', 3),
              cm.sp('py', 1),
              cm.roundedFull,
              'inline-flex items-center uppercase tracking-widest bg-surface/15 backdrop-blur-md',
            )}
          >
            {t('vendryAuthShell.eyebrow', {}, { defaultValue: 'Marketplace · 2026' })}
          </p>
          <h2
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-4xl md:text-5xl tracking-tight leading-[1.05] font-extrabold',
            )}
          >
            {APP_TAGLINE}
          </h2>
          <p className={cm.cn(cm.sp('mt', 6), cm.textSize('lg'), 'opacity-85 leading-relaxed')}>
            {t(
              'vendryAuthShell.pitch',
              {},
              {
                defaultValue:
                  'Sign in to manage your shop, track orders across every vendor, and discover bold collections from independent makers.',
              },
            )}
          </p>

          {/* Sample storefront pill — gives logged-out visitors a peek inside */}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('p', 4),
              cm.sp('mt', 8),
              'rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/20',
            )}
          >
            <img
              src="https://picsum.photos/seed/vendry-auth-vendor/72/72"
              alt=""
              className={'h-12 w-12 rounded-xl object-cover ring-2 ring-white/40'}
            />
            <div className={'min-w-0 flex-1'}>
              <p className={cm.cn(cm.fontWeight('bold'), 'text-base')}>
                {t('vendryAuthShell.sampleVendorName', {}, { defaultValue: 'Mira & Co. Ceramics' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'opacity-70')}>
                {t(
                  'vendryAuthShell.sampleVendorMeta',
                  {},
                  { defaultValue: 'Verified · 4.9 ★ · 1,240 sales' },
                )}
              </p>
            </div>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                cm.sp('px', 2),
                cm.sp('py', 1),
                cm.roundedFull,
                'uppercase tracking-widest bg-surface/20',
              )}
            >
              {t('vendryAuthShell.sampleVendorTag', {}, { defaultValue: 'Featured' })}
            </span>
          </div>
        </div>

        <p className={cm.cn(cm.textSize('xs'), 'relative z-10 opacity-70')}>
          {t(
            'vendryAuthShell.footerNote',
            { appName: APP_NAME },
            { defaultValue: '© {{appName}} — every maker, one marketplace.' },
          )}
        </p>

        {/* Decorative blurred orbs */}
        <div
          className={
            'absolute -right-32 -top-24 w-[28rem] h-[28rem] rounded-full bg-surface/15 blur-3xl'
          }
          aria-hidden
        />
        <div
          className={
            'absolute -left-24 bottom-[-12rem] w-[26rem] h-[26rem] rounded-full bg-info/40 blur-3xl'
          }
          aria-hidden
        />
      </aside>

      {/* RIGHT — form card */}
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'center', align: 'center' }),
          cm.sp('p', 6),
          cm.minH('screen'),
        )}
      >
        <div className={cm.cn(cm.w('full'), cm.maxW('md'), cm.stack(6))}>
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.fontWeight('bold'),
              cm.textSize('lg'),
              'lg:hidden text-primary',
            )}
          >
            <span
              className={cm.cn(
                'flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-on-primary',
              )}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden
              >
                storefront
              </span>
            </span>
            {APP_NAME}
          </Link>
          <header className={cm.cn(cm.stack(2))}>
            <h1
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-3xl md:text-4xl tracking-tight font-extrabold text-on-surface',
              )}
            >
              {heading}
            </h1>
            {subheading && (
              <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>{subheading}</p>
            )}
          </header>
          <div
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-3xl border border-outline-variant bg-surface shadow-sm',
            )}
          >
            {children}
          </div>
          {bottomPrompt && (
            <div className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-on-surface-variant')}>
              {bottomPrompt}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default VendryAuthShell
