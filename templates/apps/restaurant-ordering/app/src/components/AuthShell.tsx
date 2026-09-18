import type { ReactNode } from 'react'
import { Link } from 'react-router'

import {
  AuthShellCardColumn,
  AuthShellPanel,
  AuthShellSplit,
  AuthShellSplitRow,
} from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { AuthBrandHeader } from './AuthBrandHeader.js'
import { Footer } from './Footer.js'

interface AuthShellProps {
  /** The form/content area (Login form, Signup form, etc.). */
  children: ReactNode
  /** Footer link below the card (e.g. signup prompt). */
  footer?: ReactNode
}

/**
 * §13.3 Decorated brand-panel + centered card shell.
 *
 * Composes the shared `@molecule/app-auth-shell-react` split primitives
 * (`AuthShellSplit` / `AuthShellSplitRow` / `AuthShellPanel` /
 * `AuthShellCardColumn`); the bespoke brand-panel content — hearth
 * glyph, decorative orbs, sample revenue card — stays as panel children.
 */
export function AuthShell({ children, footer }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <AuthShellSplit className="bg-surface-container-low font-body text-on-surface">
      <AuthShellSplitRow className="grid grid-cols-1 lg:grid-cols-2">
        <AuthShellPanel className="relative overflow-hidden flex-col justify-between p-12 bg-gradient-to-br from-primary via-tertiary to-primary text-on-primary">
          <Link
            to="/"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.textSize('xl'),
              'relative z-10 font-extrabold tracking-tight font-display',
            )}
          >
            <span
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface/20 backdrop-blur-md',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-on-primary text-lg')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                local_fire_department
              </span>
            </span>
            {APP_NAME}
          </Link>

          <div className={cm.cn('relative z-10 max-w-md')}>
            <p className={cm.cn('text-xs uppercase tracking-widest font-bold opacity-80 mb-4')}>
              {t('authShell.eyebrow', {}, { defaultValue: 'Welcome back to service' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('4xl'),
                'font-extrabold tracking-tight leading-tight font-display',
              )}
            >
              {t('authShell.heading', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}.' })}
            </h2>
            <p className={cm.cn('mt-6 text-base opacity-90 leading-relaxed')}>
              {t(
                'authShell.subheading',
                {},
                {
                  defaultValue:
                    'A warm, fast point of sale for hospitality teams. Sign in to your kitchen and pick up where you left off.',
                },
              )}
            </p>

            <div
              className={cm.cn(
                cm.sp('mt', 10),
                cm.sp('p', 6),
                'rounded-2xl bg-surface/10 backdrop-blur-md border border-surface/20',
              )}
            >
              <p className={cm.cn('text-[10px] uppercase tracking-widest font-bold opacity-80')}>
                {t('authShell.sampleLabel', {}, { defaultValue: 'Live, since opening' })}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.sp('mt', 1),
                  'font-extrabold tracking-tighter tabular-nums font-display',
                )}
              >
                $5,970
              </p>
              <div
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.flex({ align: 'baseline', gap: 'md', wrap: 'wrap' }),
                )}
              >
                <span className={cm.cn('text-xs font-bold opacity-90')}>12 active · 3 ready</span>
                <span className={cm.cn('text-xs font-bold opacity-90')}>9/14 tables seated</span>
              </div>
            </div>
          </div>

          <p className={cm.cn('relative z-10 text-xs opacity-70')}>
            {t(
              'authShell.tip',
              {},
              { defaultValue: 'Pro tip: keyboard shortcuts work everywhere — press / to search.' },
            )}
          </p>

          <div
            className={cm.cn(
              'absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-surface/10 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute right-12 top-12 w-24 h-24 rounded-full bg-on-primary/15 blur-xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute -left-16 top-1/2 w-64 h-64 rounded-full bg-tertiary/30 blur-3xl',
            )}
            aria-hidden="true"
          />
        </AuthShellPanel>

        <AuthShellCardColumn className={cm.sp('p', 6)}>
          <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xl' }),
                cm.sp('p', 10),
                'bg-surface-container-lowest rounded-3xl shadow-xl shadow-on-surface/5',
              )}
            >
              <AuthBrandHeader />
              {children}
            </div>
            {footer && <footer className={cm.cn(cm.sp('mt', 8), cm.textCenter)}>{footer}</footer>}
          </div>
        </AuthShellCardColumn>
      </AuthShellSplitRow>
      <Footer />
    </AuthShellSplit>
  )
}
