/**
 * Rushes dark auth shell — kinetic SVG film-strip background, gradient orbs,
 * centered glass-tinted card, brand wordmark header.
 *
 * Bespoke per Rushes DESIGN.md (dark-first, cinematic palette). Pattern
 * source: animation-tool/VivaceAuthShell.tsx (catalog §13.1 Centered Card +
 * §13.4 corner-orb decoration). Background path motif evokes filmstrip
 * sprockets / scrubbing playhead trails.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'

interface RushesAuthShellProps {
  heading: string
  subheading: string
  children: ReactNode
  footer?: ReactNode
}

export function RushesAuthShell({ heading, subheading, children, footer }: RushesAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-[var(--video-input-bg)] text-[var(--video-text-primary)] font-body relative overflow-hidden',
      )}
    >
      <div aria-hidden className={cm.cn('absolute inset-0 pointer-events-none')}>
        <svg
          className={cm.cn('w-full h-full opacity-30')}
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1000 1000"
        >
          <defs>
            <linearGradient id="rushes-violet" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="var(--video-cta-from)" stopOpacity="0" />
              <stop offset="50%" stopColor="var(--video-cta-from)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--video-cta-from)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rushes-pink" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="var(--video-cta-to)" stopOpacity="0" />
              <stop offset="50%" stopColor="var(--video-cta-to)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--video-cta-to)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M-100 240 C 280 380, 720 120, 1100 480"
            fill="none"
            stroke="url(#rushes-violet)"
            strokeWidth="2"
          />
          <path
            d="M-100 760 C 360 600, 640 880, 1100 420"
            fill="none"
            stroke="url(#rushes-pink)"
            strokeWidth="1.5"
          />
          <path
            d="M-100 520 C 240 280, 760 740, 1100 220"
            fill="none"
            stroke="url(#rushes-violet)"
            strokeWidth="1.2"
          />
          {[120, 220, 320, 420, 520, 620, 720, 820, 920].map((x) => (
            <rect
              key={x}
              x={x}
              y={950}
              width={20}
              height={8}
              rx={1}
              fill="var(--video-cta-from)"
              fillOpacity="0.18"
            />
          ))}
        </svg>
        <div
          className={cm.cn(
            'absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-[var(--video-cta-from)]/20 blur-[120px]',
          )}
        />
        <div
          className={cm.cn(
            'absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full bg-[var(--video-link-hover)]/20 blur-[120px]',
          )}
        />
      </div>

      <main
        className={cm.cn(
          cm.flex1,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('px', 4),
          'relative z-10',
        )}
      >
        <div className={cm.cn(cm.w('full'), 'max-w-[440px]')}>
          <div className={cm.cn(cm.textCenter, cm.sp('mb', 8))}>
            <BrandWordmark size="xl" as="span" />
            <p
              className={cm.cn(
                cm.sp('mt', 3),
                'font-mono text-[11px] uppercase tracking-widest text-[var(--video-text-dim)]',
              )}
            >
              {t('rushesAuthShell.tagline', {}, { defaultValue: APP_TAGLINE })}
            </p>
          </div>

          <div
            className={cm.cn(
              cm.sp('p', 8),
              'rounded-2xl bg-[var(--video-panel-bg)]/80 border border-[var(--video-border-subtle)] backdrop-blur-md shadow-[0_0_60px_-15px_color-mix(in_srgb,var(--video-cta-from)_45%,transparent)]',
            )}
          >
            <div className={cm.cn(cm.textCenter, cm.sp('mb', 6))}>
              <h2
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('bold'),
                  'text-[var(--video-text-primary)] tracking-tight',
                )}
              >
                {heading}
              </h2>
              <p
                className={cm.cn(
                  cm.sp('mt', 1),
                  cm.textSize('sm'),
                  'text-[var(--video-text-muted-alt)]',
                )}
              >
                {subheading}
              </p>
            </div>
            {children}
          </div>

          {footer && (
            <div
              className={cm.cn(
                cm.textCenter,
                cm.sp('mt', 6),
                cm.textSize('sm'),
                'text-[var(--video-text-muted-alt)]',
              )}
            >
              {footer}
            </div>
          )}
        </div>
      </main>

      <footer
        className={cm.cn(
          cm.flex({ justify: 'center', gap: 6 }),
          cm.sp('py', 6),
          'relative z-10 font-mono text-[10px] uppercase tracking-widest text-[var(--video-text-dim)]',
        )}
      >
        <Link to="/privacy" className={cm.cn('hover:text-[var(--video-link)] transition-colors')}>
          {t('rushesAuthShell.footer.privacy', {}, { defaultValue: 'Privacy' })}
        </Link>
        <Link to="/terms" className={cm.cn('hover:text-[var(--video-link)] transition-colors')}>
          {t('nav.terms', {}, { defaultValue: 'Terms' })}
        </Link>
        <span className={cm.cn('hover:text-[var(--video-link)] transition-colors')}>
          {t('nav.status', {}, { defaultValue: 'Status' })}
        </span>
        <span className={cm.cn('text-[var(--video-link)] font-bold')}>
          {t(
            'rushesAuthShell.footer.copyright',
            { appName: APP_NAME },
            { defaultValue: '© {{appName}} Studio' },
          )}
        </span>
      </footer>
    </div>
  )
}

export default RushesAuthShell
