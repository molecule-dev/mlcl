import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { AuthShellCardColumn, AuthShellPanel } from '@molecule/app-auth-shell-react'
import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { loadContent } from '../config.js'

/**
 * §13.3 split-panel auth shell — rose/plum gradient brand panel on
 * the left with a wedding-invitation "save the date" preview, branded
 * form card on the right. Layout collapses to a single column under
 * `lg`.
 *
 * Follows the fleet auth-shell pattern (donor: event-ticketing's
 * ticket-stub showcase) restyled for Everly's rose/plum invitation
 * palette.
 */
interface AuthShellProps {
  eyebrow: string
  heading: string
  subtext: string
  children: ReactNode
  bottomLinkLabel: string
  bottomLinkText: string
  bottomLinkTo: string
}

/** The design's four studio pillars, shown on the brand panel of every
 *  auth view. */
const STUDIO_PILLARS = [
  {
    key: 'guests',
    icon: 'group',
    defaultLabel: 'Interactive Guest & RSVP Studio',
  },
  {
    key: 'seating',
    icon: 'table_restaurant',
    defaultLabel: 'Drag-and-Drop Seating Studio',
  },
  {
    key: 'vendors',
    icon: 'storefront',
    defaultLabel: 'Collaborative Vendor & Master Timeline',
  },
  {
    key: 'budget',
    icon: 'savings',
    defaultLabel: 'Calm Budget & Milestone Vault',
  },
] as const

export function AuthShell({
  eyebrow,
  heading,
  subtext,
  children,
  bottomLinkLabel,
  bottomLinkText,
  bottomLinkTo,
}: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })
  return (
    <div className={cm.cn(cm.minH('screen'), cm.flex({}), 'bg-background antialiased')}>
      {/* Brand panel */}
      <AuthShellPanel
        className={cm.cn(
          cm.sp('p', 12),
          'w-[45%] flex-col justify-between text-white relative overflow-hidden',
        )}
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-mid) 50%, var(--color-secondary) 100%)',
        }}
      >
        <div
          className={cm.cn(
            'absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn('absolute left-12 top-12 w-32 h-32 rounded-full opacity-30 blur-2xl')}
          style={{ background: 'var(--color-accent)' }}
          aria-hidden="true"
        />

        <Link to="/" className={cm.cn('relative z-10 flex items-center gap-3')}>
          <BrandWordmark as="span" size="lg" invert withTagline />
        </Link>

        <div className={cm.cn('relative z-10 stack-y space-y-6')}>
          <p className={cm.cn('text-xs font-black uppercase tracking-widest opacity-70')}>
            {t('authShell.brandEyebrow', {}, { defaultValue: 'One place · Every detail' })}
          </p>
          <h1
            className={cm.cn('text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.05]')}
          >
            {APP_TAGLINE}
          </h1>
          <div className={cm.cn('w-24 h-1 rounded-full bg-surface/30')} aria-hidden="true" />
          <p className={cm.cn('text-base text-white/80 max-w-md leading-relaxed')}>
            {t(
              'authShell.brandBody',
              {},
              {
                defaultValue:
                  'Guest list, RSVPs, budget, vendors, and seating — the whole wedding, calmly organized.',
              },
            )}
          </p>
        </div>

        {/* Glass invitation showcase */}
        <figure
          className={cm.cn(
            'relative z-10 p-6 rounded-2xl backdrop-blur-md border border-surface/10',
          )}
          style={{ background: 'var(--color-auth-panel-card, rgba(0, 0, 0, 0.25))' }}
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              'mb-3 text-[10px] font-black uppercase tracking-widest',
            )}
          >
            <span
              className={cm.cn('px-2 py-1 rounded-md text-white')}
              style={{ background: 'var(--color-accent)' }}
            >
              {t('authShell.inviteChip', {}, { defaultValue: 'RSVP by Jun 1' })}
            </span>
            <span className="text-white/60 font-mono">WEDD1NG202</span>
          </div>
          <h2 className={cm.cn('text-base font-bold leading-snug mb-1')}>
            {t('authShell.inviteNames', {}, { defaultValue: 'Clara & Julian' })}
          </h2>
          <p className={cm.cn('text-xs font-medium text-white/70 mb-4')}>
            {t(
              'authShell.inviteWhen',
              {},
              { defaultValue: 'Sat · Jun 21 · 4:00 PM · Linden Hall Estate' },
            )}
          </p>
          <p className={cm.cn('text-sm leading-snug mb-3')}>
            {t(
              'authShell.testimonialQuote',
              { appName: APP_NAME },
              {
                defaultValue:
                  '“{{appName}} turned 14 spreadsheets and a group chat into one calm checklist.”',
              },
            )}
          </p>
          <figcaption className={cm.cn('text-xs font-semibold mb-5')}>
            {t(
              'authShell.testimonialAttribution',
              {},
              { defaultValue: '— Priya & Sam, married August 2026' },
            )}
          </figcaption>
          <ul className={cm.cn(cm.stack(2), 'border-t border-surface/15 pt-4')}>
            {STUDIO_PILLARS.map((pillar) => (
              <li key={pillar.key} className="flex items-center gap-2.5">
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-7 h-7 shrink-0 rounded-lg bg-surface/15',
                  )}
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    {pillar.icon}
                  </span>
                </span>
                <span className="text-xs font-semibold tracking-wide">
                  {t(`authShell.studio.${pillar.key}`, {}, { defaultValue: pillar.defaultLabel })}
                </span>
              </li>
            ))}
          </ul>
        </figure>
      </AuthShellPanel>

      {/* Form panel */}
      <AuthShellCardColumn className={cm.cn('flex-1 relative')}>
        <Link
          to="/"
          className={cm.cn('lg:hidden absolute top-6 left-6 inline-flex items-center gap-2')}
        >
          <BrandWordmark as="span" size="md" />
        </Link>

        <div
          className={cm.cn(
            cm.w('full'),
            cm.maxW('md'),
            cm.sp('px', 6),
            cm.sp('py', 12),
            cm.stack(6),
          )}
        >
          <div className={cm.stack(2)}>
            <p className={cm.cn('text-xs font-black uppercase tracking-widest text-primary')}>
              {eyebrow}
            </p>
            <h2 className={cm.cn('text-3xl font-extrabold tracking-tight')}>{heading}</h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
              {subtext}
            </p>
          </div>

          <div
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-2xl bg-surface border border-outline-variant/40 shadow-sm stack-y space-y-5',
            )}
          >
            {children}
          </div>

          <p className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-on-surface-variant')}>
            {bottomLinkText}{' '}
            <Link
              to={bottomLinkTo}
              className={cm.cn('font-bold text-primary hover:underline ml-1')}
            >
              {bottomLinkLabel}
            </Link>
          </p>

          <footer
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between' }),
              'pt-6 border-t border-outline-variant/40 text-xs text-on-surface-variant',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <button type="button" onClick={openTerms} className={cm.cn('hover:text-on-surface')}>
                {t('nav.terms', {}, { defaultValue: 'Terms' })}
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={openPrivacy}
                className={cm.cn('hover:text-on-surface')}
              >
                {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              </button>
            </div>
            <span className={cm.flex({ align: 'center', gap: 'xs' })}>
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                verified_user
              </span>
              {t('authShell.secure', {}, { defaultValue: 'Secure sign-in' })}
            </span>
          </footer>
        </div>
      </AuthShellCardColumn>
      {modals}
    </div>
  )
}

export default AuthShell
