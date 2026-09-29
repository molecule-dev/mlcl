/**
 * Auth shell — soft violet background with brand-mark header, decorated
 * card with corner orbs + frosted-glass sample flashcard preview, slot for
 * the form, footer link slot.
 *
 * Catalog §13.3 (decorated-card) + §13.4 (decoration recipes) +
 * §13.7 (brand header on auth pages). Used by Login/Signup/Forgot/Reset.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { AuthShellPanel } from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

export interface AuthShellProps {
  heading: string
  subtitle?: string
  showSamplePreview?: boolean
  children: ReactNode
  footer?: ReactNode
}

export function AuthShell({
  heading,
  subtitle,
  showSamplePreview = true,
  children,
  footer,
}: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'relative overflow-hidden bg-gradient-to-br from-surface via-primary-container/30 to-surface',
      )}
    >
      {/* Corner orbs */}
      <div
        aria-hidden="true"
        className={cm.cn('absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl')}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-tertiary/15 blur-3xl',
        )}
      />

      <header className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), cm.sp('py', 6))}>
        <Link
          to="/"
          className={cm.flex({ align: 'center', gap: 'sm' })}
          data-mol-id="auth-brand-link"
        >
          <BrandMark />
          <span className={cm.cn(cm.fontWeight('bold'), 'text-xl tracking-tight text-on-surface')}>
            {APP_NAME}
          </span>
        </Link>
      </header>

      <main
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'center' }),
          'relative z-10 px-6 pb-16',
        )}
      >
        <div
          className={cm.cn(
            cm.w('full'),
            'grid gap-8 max-w-5xl lg:grid-cols-[1.1fr_1fr] lg:items-stretch',
          )}
        >
          {/* Left: form card */}
          <div
            className={cm.cn(
              cm.sp('p', 10),
              'relative w-full rounded-[2rem] bg-surface-container-lowest shadow-xl border border-outline-variant/20',
            )}
          >
            <div className={cm.cn(cm.sp('mb', 8))}>
              <h1
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-3xl md:text-4xl tracking-tight font-extrabold text-on-surface',
                )}
              >
                {heading}
              </h1>
              {subtitle && (
                <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                  {subtitle}
                </p>
              )}
            </div>
            {children}
            {footer && (
              <div className={cm.cn(cm.sp('mt', 6), 'text-sm text-on-surface-variant')}>
                {footer}
              </div>
            )}
          </div>

          {/* Right: sample preview */}
          {showSamplePreview && (
            <AuthShellPanel
              className={cm.cn(
                cm.sp('p', 10),
                'relative flex-col justify-between rounded-[2rem] overflow-hidden text-white',
                'bg-gradient-to-br from-primary via-primary to-primary-container',
              )}
              aria-hidden="true"
            >
              <div
                className={cm.cn(
                  'absolute -top-10 -right-10 h-48 w-48 rounded-full bg-surface/15 blur-2xl',
                )}
              />
              <span className="material-symbols-outlined absolute -bottom-6 -right-2 text-[160px] text-white/10 select-none">
                psychology
              </span>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">
                  {t(
                    'authShell.sampleEyebrow',
                    {},
                    { defaultValue: 'A card from your future deck' },
                  )}
                </p>
                <p
                  className={cm.cn('mt-6 text-3xl leading-snug font-medium text-white')}
                  style={{ fontFamily: 'var(--mol-font-serif)' }}
                >
                  {t('authShell.sampleFront', {}, { defaultValue: '“The capital of Lithuania.”' })}
                </p>
                <p
                  className={cm.cn('mt-4 text-lg italic text-white/85')}
                  style={{ fontFamily: 'var(--mol-font-serif)' }}
                >
                  {t(
                    'authShell.sampleBack',
                    {},
                    { defaultValue: 'Vilnius — recalled in 1.2 seconds.' },
                  )}
                </p>
              </div>

              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 8))}>
                <span
                  className={cm.cn(
                    'rounded-full bg-surface/20 backdrop-blur-md px-3 py-1 text-xs font-bold inline-flex items-center gap-1',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    local_fire_department
                  </span>
                  {t(
                    'authShell.sampleStreak',
                    { days: 47 },
                    { defaultValue: '{{days}}-day streak' },
                  )}
                </span>
                <span
                  className={cm.cn(
                    'rounded-full bg-surface/20 backdrop-blur-md px-3 py-1 text-xs font-bold',
                  )}
                >
                  {t(
                    'authShell.sampleRetention',
                    { pct: 92 },
                    { defaultValue: '{{pct}}% retention' },
                  )}
                </span>
              </div>
            </AuthShellPanel>
          )}
        </div>
      </main>
    </div>
  )
}

function BrandMark() {
  const cm = getClassMap()
  return (
    <span
      aria-hidden="true"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        'h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-container shadow-md',
      )}
    >
      <span
        className={cm.cn('material-symbols-outlined text-white text-xl')}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        psychology
      </span>
    </span>
  )
}
