import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { AuthShellCard, AuthShellContainer } from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { AmbientOrbs } from './AmbientOrbs.js'

interface AuthShellProps {
  heading: string
  subheading?: string
  children: ReactNode
  footer?: ReactNode
}

/**
 * AuthShell — shared scaffolding for Wayfarer's auth pages.
 *
 * Dark Wayfarer backdrop with ambient violet/cyan orbs, brand mark
 * (mic glyph + APP_NAME), heading + subheading, frosted-glass card.
 */
export function AuthShell({ heading, subheading, children, footer }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <AuthShellContainer
      layout="column"
      className={cm.cn('bg-background text-foreground antialiased')}
    >
      <AmbientOrbs />
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.sp('px', 4),
          cm.sp('py', 12),
          'flex-1 relative z-10',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 8))}>
          <BrandWordmark as="span" size="lg" />
        </Link>
        <AuthShellCard
          outerClassName={cm.cn(cm.w('full'), 'max-w-[440px]')}
          surfaceClassName={cm.cn(
            'rounded-2xl bg-surface/70 backdrop-blur-xl border border-border shadow-2xl shadow-primary/10',
          )}
          className={cm.cn(cm.sp('p', 8), cm.flex({ direction: 'col' }), cm.stack(6))}
        >
          <header className={cm.cn(cm.flex({ direction: 'col' }), cm.stack(2), cm.textCenter)}>
            <h1
              className={cm.cn(
                cm.textSize('3xl'),
                cm.fontWeight('bold'),
                'tracking-tight bg-gradient-to-r from-foreground to-secondary bg-clip-text text-transparent',
              )}
            >
              {heading}
            </h1>
            {subheading ? (
              <p className={cm.cn(cm.textMuted, cm.textSize('sm'))}>{subheading}</p>
            ) : null}
          </header>
          {children}
          {footer ? <div>{footer}</div> : null}
        </AuthShellCard>
        <p
          className={cm.cn(
            cm.sp('mt', 8),
            cm.textSize('xs'),
            cm.textSubtle,
            cm.textCenter,
            'tracking-wide',
          )}
        >
          {t(
            'authShell.tagline',
            { tagline: APP_TAGLINE, brand: APP_NAME },
            { defaultValue: '{{tagline}} — {{brand}}' },
          )}
        </p>
      </main>
    </AuthShellContainer>
  )
}
