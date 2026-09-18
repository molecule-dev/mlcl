import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { AuthShellCardColumn, AuthShellPanel } from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

interface AuthShellProps {
  /** Heading for the right pane card. */
  heading: string
  /** Sub-heading paragraph. */
  subheading: string
  /** Form / OAuth / etc. */
  children: ReactNode
  /** Footer prompt at bottom of card (e.g. "Already have an account? Sign in"). */
  footerPrompt?: ReactNode
}

/**
 * Decorated split-pane auth layout — brand panel on the left
 * (gradient + decorative orbs + sample objective preview), centered card
 * on the right with branded logo mark above the heading.
 *
 * Translated from crm/LoginCard.tsx + property-listing/LoginBranding.tsx
 * (split-pane decorated card, §13.3 in POLISHED-PATTERN-CATALOG.md),
 * recolored to the indigo→sky Ascent palette.
 */
export function AuthShell({ heading, subheading, children, footerPrompt }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), cm.flex({}), 'bg-bg-secondary')}>
      {/* Brand panel — hidden on mobile */}
      <AuthShellPanel
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 12),
          'relative w-1/2 overflow-hidden text-white',
        )}
        style={{
          background:
            'var(--color-auth-hero-grad, linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0c4a6e 100%))',
        }}
      >
        <div
          aria-hidden
          className={cm.cn(
            'absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-sky-400/30 blur-3xl',
          )}
        />
        <div
          aria-hidden
          className={cm.cn(
            'absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-indigo-400/30 blur-3xl',
          )}
        />
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative z-10')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'w-11 h-11 rounded-xl bg-surface/15 backdrop-blur-md text-white',
            )}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              arrow_upward
            </span>
          </div>
          <span className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-white')}>
            {APP_NAME}
          </span>
        </Link>

        <div className={cm.cn(cm.stack(6), 'relative z-10 max-w-md')}>
          <span
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-[0.22em] text-sky-200',
            )}
          >
            {t('authShell.eyebrow', {}, { defaultValue: 'OKRs that move teams' })}
          </span>
          <h2
            className={cm.cn(
              'text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] text-white',
            )}
          >
            {t(
              'authShell.brandTitle',
              {},
              { defaultValue: 'Set the summit. Score the climb. Coach the team.' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('lg'), 'text-indigo-100/90 leading-relaxed')}>
            {t(
              'authShell.brandBody',
              { appName: APP_NAME },
              {
                defaultValue:
                  '{{appName}} threads objectives through key results and weekly check-ins so progress is always visible — and always honest.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.sp('p', 5),
              cm.flex({ direction: 'col', gap: 'sm' }),
              'rounded-2xl bg-surface/10 backdrop-blur-md border border-surface/10',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-sky-200',
                )}
              >
                {t('authShell.samplePeriod', {}, { defaultValue: 'Q2 2026 · sample objective' })}
              </span>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200',
                )}
              >
                {t('authShell.sampleStatus', {}, { defaultValue: 'On track' })}
              </span>
            </div>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('semibold'),
                'tracking-tight text-white',
              )}
            >
              {t(
                'authShell.sampleTitle',
                {},
                { defaultValue: 'Cut customer onboarding time in half' },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
              <div className={cm.cn('flex-1 h-1.5 rounded-full bg-surface/15 overflow-hidden')}>
                <div
                  className={cm.cn(
                    'h-full rounded-full bg-gradient-to-r from-sky-300 to-emerald-300',
                  )}
                  style={{ width: '68%' }}
                />
              </div>
              <span className={cm.cn(cm.textSize('sm'), 'font-bold tabular-nums text-white')}>
                68%
              </span>
            </div>
          </div>
        </div>

        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            'relative z-10 text-[10px] uppercase tracking-[0.18em] text-indigo-200/80',
          )}
        >
          {t('authShell.brandFooter', { tagline: APP_TAGLINE }, { defaultValue: '— {{tagline}}' })}
        </p>
      </AuthShellPanel>

      {/* Card pane */}
      <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col' }), 'relative')}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 8),
            cm.sp('py', 5),
          )}
        >
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'lg:hidden')}>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                'w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white shadow-lg',
              )}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                arrow_upward
              </span>
            </div>
            <span
              className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            >
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'ml-auto')}>
            <ThemeToggle />
          </div>
        </div>

        <AuthShellCardColumn className={cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('pb', 12))}>
          <div
            className={cm.cn(
              cm.w('full'),
              cm.sp('p', 8),
              cm.stack(6),
              'max-w-[440px] bg-surface rounded-2xl shadow-sm border border-outline-variant/40',
            )}
          >
            <div className={cm.cn(cm.stack(2))}>
              <h1
                className={cm.cn(
                  cm.textSize('2xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {heading}
              </h1>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                {subheading}
              </p>
            </div>
            {children}
            {footerPrompt && (
              <div
                className={cm.cn(
                  cm.textCenter,
                  cm.textSize('sm'),
                  cm.sp('pt', 4),
                  'border-t border-outline-variant/40 text-on-surface-variant',
                )}
              >
                {footerPrompt}
              </div>
            )}
          </div>
        </AuthShellCardColumn>
      </div>
    </div>
  )
}

export default AuthShell
