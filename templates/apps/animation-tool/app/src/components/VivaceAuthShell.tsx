/**
 * Vivace dark auth shell — kinetic SVG bezier-curve background, gradient
 * orb, centered glass-tinted card, brand wordmark header.
 *
 * Bespoke per Vivace DESIGN.md (Login screen). Pattern source: catalog
 * §13.1 Centered Card with §13.4 corner-orb decoration, kinetic background
 * adapted from the Stitch baseline.
 */
import type { ReactNode } from 'react'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
import { VivaceWordmark } from './VivaceWordmark.js'

interface VivaceAuthShellProps {
  heading: string
  subheading: string
  children: ReactNode
  footer?: ReactNode
}

export function VivaceAuthShell({ heading, subheading, children, footer }: VivaceAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'font-body relative overflow-hidden',
      )}
      style={{ backgroundColor: 'var(--anim-background)', color: 'var(--anim-text)' }}
    >
      <div aria-hidden className={cm.cn('absolute inset-0 pointer-events-none')}>
        <svg
          className={cm.cn('w-full h-full opacity-40')}
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1000 1000"
        >
          <defs>
            <linearGradient id="violet-trail" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="var(--anim-primary)" stopOpacity="0" />
              <stop offset="50%" stopColor="var(--anim-primary)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--anim-primary)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="magenta-trail" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="var(--anim-secondary)" stopOpacity="0" />
              <stop offset="50%" stopColor="var(--anim-secondary)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--anim-secondary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M-100 200 C 300 400, 700 100, 1100 500"
            fill="none"
            stroke="url(#violet-trail)"
            strokeWidth="2"
          />
          <path
            d="M-100 800 C 400 600, 600 900, 1100 400"
            fill="none"
            stroke="url(#magenta-trail)"
            strokeWidth="1.5"
          />
          <path
            d="M-100 500 C 250 250, 750 750, 1100 200"
            fill="none"
            stroke="url(#violet-trail)"
            strokeWidth="1.5"
          />
        </svg>
        <div
          className={cm.cn(
            'absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full blur-[120px]',
          )}
          style={{ backgroundColor: 'color-mix(in srgb, var(--anim-primary) 15%, transparent)' }}
        />
        <div
          className={cm.cn(
            'absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full blur-[120px]',
          )}
          style={{ backgroundColor: 'color-mix(in srgb, var(--anim-secondary) 15%, transparent)' }}
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
            <VivaceWordmark size="xl" />
            <p
              className={cm.cn(cm.sp('mt', 3), 'font-mono text-[11px] uppercase tracking-widest')}
              style={{ color: 'var(--anim-text-muted)' }}
            >
              {t('vivaceAuthShell.tagline', {}, { defaultValue: 'Motion brought to life' })}
            </p>
          </div>

          <div
            className={cm.cn(cm.sp('p', 8), 'rounded-2xl backdrop-blur-md')}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--anim-surface) 80%, transparent)',
              border: '1px solid var(--anim-border)',
              boxShadow: '0 0 60px -15px color-mix(in srgb, var(--anim-primary) 40%, transparent)',
            }}
          >
            <div className={cm.cn(cm.textCenter, cm.sp('mb', 6))}>
              <h2
                className={cm.cn(
                  cm.textSize('2xl'),
                  cm.fontWeight('bold'),
                  'font-headline tracking-tight',
                )}
                style={{ color: 'var(--anim-text)' }}
              >
                {heading}
              </h2>
              <p
                className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'))}
                style={{ color: 'var(--anim-text-secondary)' }}
              >
                {subheading}
              </p>
            </div>
            {children}
          </div>

          {footer && (
            <div
              className={cm.cn(cm.textCenter, cm.sp('mt', 6), cm.textSize('sm'))}
              style={{ color: 'var(--anim-text-secondary)' }}
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
          'relative z-10 font-mono text-[10px] uppercase tracking-widest',
        )}
        style={{ color: 'var(--anim-text-muted)' }}
      >
        <LegalModalLinks
          linkClassName={cm.cn('transition-colors')}
          appName={APP_NAME}
          loadContent={loadContent}
          privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
          termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
        />
        <span className={cm.cn('font-bold')} style={{ color: 'var(--anim-primary)' }}>
          {t(
            'vivaceAuthShell.footer.copyright',
            { appName: APP_NAME },
            { defaultValue: '© {{appName}} Motion' },
          )}
        </span>
      </footer>
    </div>
  )
}

export default VivaceAuthShell
