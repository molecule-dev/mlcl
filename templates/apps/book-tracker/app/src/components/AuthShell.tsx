import type { ReactNode } from 'react'
import { Link } from 'react-router'

import {
  AuthShellCard,
  AuthShellContainer,
  AuthShellDecoration,
} from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Brand-consistent auth shell — Pagebound wordmark + book mark in the header,
 * decorative orbs, centered card slot.
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
    <AuthShellContainer layout="column" className={cm.cn('bg-background text-on-surface')}>
      <AuthShellDecoration>
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full blur-3xl pointer-events-none',
          )}
          style={{ background: 'color-mix(in srgb, var(--color-primary) 18%, transparent)' }}
        />
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full blur-3xl pointer-events-none',
          )}
          style={{ background: 'color-mix(in srgb, var(--color-secondary) 18%, transparent)' }}
        />
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute top-1/3 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full blur-2xl pointer-events-none',
          )}
          style={{ background: 'rgba(217, 119, 6, 0.18)' }}
        />
      </AuthShellDecoration>

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
            cm.fontWeight('bold'),
            cm.textSize('xl'),
          )}
        >
          <span
            aria-hidden="true"
            className={cm.cn('material-symbols-outlined text-2xl')}
            style={{ color: 'var(--color-flame)', fontVariationSettings: "'FILL' 1" }}
          >
            auto_stories
          </span>
          <span>{APP_NAME}</span>
        </Link>
        <ThemeToggle />
      </header>

      <main
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
          cm.flex1,
          cm.sp('px', 4),
          cm.sp('py', 8),
          'relative z-10',
        )}
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
          <AuthShellCard
            outerClassName={cm.cn(cm.w('full'))}
            surfaceClassName={cm.cn('bg-surface-container-lowest rounded-3xl shadow-xl border-t-4')}
            className={cm.cn(cm.sp('p', 8))}
            style={{ borderTopColor: 'var(--mol-color-primary)' }}
          >
            {children}
          </AuthShellCard>
          {footer ? <div className={cm.cn(cm.sp('mt', 6), cm.textCenter)}>{footer}</div> : null}
        </div>
      </main>

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
    </AuthShellContainer>
  )
}
