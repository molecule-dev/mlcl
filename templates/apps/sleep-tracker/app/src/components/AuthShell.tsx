import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { AuthShellCardColumn } from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Somnia auth shell — wordmark + crescent-moon mark in the header,
 * decorative violet/indigo orbs (the night-sky palette from DESIGN.md),
 * a centered card slot with a primary top-stripe, and a "your nights are
 * private" trust footer.
 *
 * Catalog §13.1 (Centered Card) variant adapted to the night palette.
 * Translated from mental-health-journal/AuthShell.tsx — same orb
 * decoration, but the gradient hues lean into deep-indigo bedtime tones
 * instead of dawn violet.
 */

interface AuthShellProps {
  eyebrow: string
  heading: string
  subheading?: string
  footer?: ReactNode
  children: ReactNode
}

export function AuthShell({ eyebrow, heading, subheading, footer, children }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col' }),
        'bg-background text-on-surface relative overflow-hidden',
      )}
    >
      <div
        className={cm.cn(
          'absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full blur-3xl pointer-events-none',
        )}
        style={{ background: 'rgba(108, 92, 231, 0.28)' }}
      />
      <div
        className={cm.cn(
          'absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full blur-3xl pointer-events-none',
        )}
        style={{ background: 'rgba(167, 139, 250, 0.28)' }}
      />
      <div
        className={cm.cn(
          'absolute top-1/3 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-2xl pointer-events-none',
        )}
        style={{ background: 'rgba(67, 56, 202, 0.22)' }}
      />
      <div className={cm.cn('absolute top-12 left-24 w-1 h-1 rounded-full bg-on-surface/30')} />
      <div className={cm.cn('absolute top-32 right-32 w-1 h-1 rounded-full bg-on-surface/40')} />
      <div
        className={cm.cn('absolute top-24 left-1/3 w-1.5 h-1.5 rounded-full bg-on-surface/30')}
      />

      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'relative z-10',
        )}
      >
        <Link
          to="/"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.fontWeight('extrabold'),
            cm.textSize('xl'),
          )}
        >
          <BrandWordmark as="span" size="md" />
        </Link>
        <ThemeToggle />
      </header>

      <AuthShellCardColumn
        as="main"
        className={cm.cn(cm.flex1, cm.sp('px', 4), cm.sp('py', 8), 'relative z-10')}
      >
        <div className={cm.cn(cm.maxW('md'), cm.w('full'))}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 6))}>
            <p
              className={cm.cn(
                'text-[11px] font-bold uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {eyebrow}
            </p>
            <h1
              className={cm.cn(
                'text-3xl md:text-4xl font-extrabold tracking-tight',
                cm.sp('mt', 2),
              )}
            >
              {heading}
            </h1>
            {subheading ? (
              <p className={cm.cn(cm.textSize('base'), cm.sp('mt', 3), 'text-on-surface-variant')}>
                {subheading}
              </p>
            ) : null}
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 8),
              'bg-surface-container-lowest rounded-3xl shadow-xl border-t-4',
            )}
            style={{ borderTopColor: 'var(--color-border-focus)' }}
          >
            {children}
          </div>
          {footer ? <div className={cm.cn(cm.sp('mt', 6), cm.textCenter)}>{footer}</div> : null}
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
              cm.sp('mt', 6),
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-on-surface-variant',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              shield_moon
            </span>
            {t(
              'authShell.privacyBadge',
              {},
              { defaultValue: 'Your nights stay private — encrypted at rest.' },
            )}
          </div>
        </div>
      </AuthShellCardColumn>

      <footer
        className={cm.cn(
          cm.textCenter,
          cm.sp('py', 6),
          cm.textSize('xs'),
          'relative z-10 text-on-surface-variant',
        )}
      >
        <p>
          {t(
            'authShell.tagline',
            { app: APP_NAME, tagline: APP_TAGLINE },
            { defaultValue: '{{app}} — {{tagline}}' },
          )}
        </p>
      </footer>
    </div>
  )
}
