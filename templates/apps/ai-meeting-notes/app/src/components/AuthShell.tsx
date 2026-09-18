import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

interface AuthShellProps {
  heading: string
  subheading: string
  children: React.ReactNode
  altPrompt?: string
  altLinkText?: string
  altLinkTo?: string
}

/**
 * Shared shell for all Murmur auth pages — renders the brand-mark, the
 * centered glass card, decorative gradient orbs, and a consistent footer
 * link below the card. Each page only supplies its heading / subheading /
 * form fields / footer-link copy.
 */
export function AuthShell({
  heading,
  subheading,
  children,
  altPrompt,
  altLinkText,
  altLinkTo,
}: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        'relative overflow-hidden bg-background text-on-surface antialiased',
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          'absolute -top-40 -left-40 h-[28rem] w-[28rem] bg-primary/30 blur-3xl pointer-events-none',
          cm.roundedFull,
        )}
      />
      <span
        aria-hidden="true"
        className={cm.cn(
          'absolute -bottom-40 -right-32 h-[26rem] w-[26rem] bg-secondary/25 blur-3xl pointer-events-none',
          cm.roundedFull,
        )}
      />
      <span
        aria-hidden="true"
        className={cm.cn(
          'absolute top-1/3 right-1/4 h-72 w-72 bg-tertiary/20 blur-3xl pointer-events-none',
          cm.roundedFull,
        )}
      />

      <header
        className={cm.cn('relative z-10', cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 8))}
      >
        <span
          aria-hidden="true"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'h-11 w-11 bg-gradient-to-br from-primary to-primary-container shadow-lg',
            cm.roundedFull,
          )}
        >
          <span
            className={cm.cn('material-symbols-outlined text-on-primary')}
            style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}
          >
            graphic_eq
          </span>
        </span>
        <span
          className={cm.cn(
            cm.textSize('3xl'),
            cm.fontWeight('bold'),
            cm.textPrimary,
            'tracking-tight',
          )}
        >
          {APP_NAME}
        </span>
      </header>

      <main
        className={cm.cn(
          'relative z-10 w-full max-w-[440px] bg-surface-container-lowest ambient-shadow',
          cm.sp('px', 8),
          cm.sp('py', 10),
          cm.flex({ direction: 'col' }),
          cm.stack(6),
          'rounded-2xl',
        )}
      >
        <div className={cm.cn(cm.textCenter, cm.stack(2))}>
          <h1 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'tracking-tight')}>
            {heading}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{subheading}</p>
        </div>

        {children}

        {altPrompt && altLinkText && altLinkTo ? (
          <p className={cm.cn(cm.textSize('sm'), cm.textCenter, 'text-on-surface-variant')}>
            {altPrompt}{' '}
            <Link
              to={altLinkTo}
              className={cm.cn(cm.textPrimary, cm.fontWeight('semibold'), 'hover:underline')}
            >
              {altLinkText}
            </Link>
          </p>
        ) : null}
      </main>

      <footer
        className={cm.cn(
          'relative z-10',
          cm.sp('mt', 8),
          cm.textSize('xs'),
          cm.textCenter,
          'text-on-surface-variant',
        )}
      >
        {t(
          'auth.footer',
          { year: new Date().getFullYear(), app: APP_NAME },
          { defaultValue: '© {{year}} {{app}}. Every word, distilled.' },
        )}
      </footer>
    </div>
  )
}
