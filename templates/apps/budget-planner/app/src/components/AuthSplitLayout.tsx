/**
 * Coffer auth split — brand panel on the left (primary-violet gradient,
 * envelope-glyph orbs, app mark, sample-card peek) + form canvas on the right
 * (centered card with brand header, slot for form, OAuth row, footer).
 *
 * Implements §13.3 Decorated-Card with Brand Panel from
 * POLISHED-PATTERN-CATALOG.md. Brand panel decoration mirrors §13.4
 * "corner orb" recipe — three concentric blurred circles in white/15-20%.
 *
 * Used by Login / Signup / ForgotPassword / ResetPassword.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

interface AuthSplitLayoutProps {
  heading: string
  subheading?: string
  children: ReactNode
  footer?: ReactNode
  showSamplePeek?: boolean
}

export function AuthSplitLayout({
  heading,
  subheading,
  children,
  footer,
  showSamplePeek = true,
}: AuthSplitLayoutProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-background text-on-surface antialiased flex flex-col md:flex-row',
      )}
    >
      {/* Left: Brand panel */}
      <aside
        className={cm.cn(
          'hidden md:flex md:w-1/2 lg:w-2/5 relative overflow-hidden',
          'bg-gradient-to-br from-primary via-primary to-primary-container text-white',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('p', 12),
            'relative z-10 w-full',
          )}
        >
          <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })} aria-label={APP_NAME}>
            <span
              className={cm.cn(
                cm.w(10),
                cm.h(10),
                cm.roundedFull,
                cm.flex({ align: 'center', justify: 'center' }),
                'bg-surface/15 backdrop-blur-md',
              )}
              aria-hidden="true"
            >
              <span
                className={cm.cn('material-symbols-outlined text-white text-2xl')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                savings
              </span>
            </span>
            <span
              className={cm.cn(cm.textSize('2xl'), cm.fontWeight('extrabold'), 'tracking-tight')}
            >
              {APP_NAME}
            </span>
          </Link>

          <div className={cm.cn('space-y-6 max-w-md')}>
            <h2
              className={cm.cn(
                cm.fontWeight('extrabold'),
                'text-5xl tracking-tighter leading-[0.95]',
              )}
            >
              {t('authSplitLayout.brandHeadline', {}, { defaultValue: 'Give every dollar a job.' })}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-white/85 leading-relaxed')}>
              {t(
                'authSplitLayout.brandBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} is the envelope-budget app for households who plan their month before it spends them. Income in, jobs assigned, every category accounted for.',
                },
              )}
            </p>

            {showSamplePeek ? (
              <div
                className={cm.cn(
                  cm.sp('p', 5),
                  cm.sp('mt', 6),
                  'rounded-2xl bg-surface/10 backdrop-blur-md border border-surface/15',
                )}
                aria-hidden="true"
              >
                <div className={cm.flex({ align: 'center', justify: 'between' })}>
                  <p
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-white/70',
                    )}
                  >
                    {t(
                      'authSplitLayout.sampleEyebrow',
                      {},
                      { defaultValue: 'April · Available to assign' },
                    )}
                  </p>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      'rounded-full bg-surface/20 text-[10px] font-bold',
                    )}
                  >
                    {t('authSplitLayout.sampleStatus', {}, { defaultValue: 'On track' })}
                  </span>
                </div>
                <p
                  className={cm.cn(
                    cm.sp('mt', 2),
                    'text-3xl font-extrabold tracking-tight tabular-nums',
                  )}
                >
                  $72.00
                </p>
                <div className={cm.cn(cm.sp('mt', 4), 'space-y-2')}>
                  <SampleEnvelope
                    label={t('authSplitLayout.sampleGroceries', {}, { defaultValue: 'Groceries' })}
                    pct={80}
                  />
                  <SampleEnvelope
                    label={t('authSplitLayout.sampleDining', {}, { defaultValue: 'Dining' })}
                    pct={130}
                    over
                  />
                  <SampleEnvelope
                    label={t(
                      'authSplitLayout.sampleSavings',
                      {},
                      { defaultValue: 'Emergency fund' },
                    )}
                    pct={100}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <p className={cm.cn(cm.textSize('xs'), 'text-white/60')}>{APP_TAGLINE}</p>
        </div>

        {/* Decorative orbs (§13.4 corner-orb variant) */}
        <span
          className={cm.cn(
            cm.w(80),
            cm.h(80),
            cm.roundedFull,
            'absolute -right-32 -bottom-32 bg-surface/10 blur-3xl pointer-events-none',
          )}
          aria-hidden="true"
        />
        <span
          className={cm.cn(
            cm.w(20),
            cm.h(20),
            cm.roundedFull,
            'absolute right-12 top-12 bg-surface/15 blur-xl pointer-events-none',
          )}
          aria-hidden="true"
        />
        <span
          className={cm.cn(
            cm.w(16),
            cm.h(16),
            cm.roundedFull,
            'absolute left-12 bottom-1/3 bg-surface/10 blur-2xl pointer-events-none',
          )}
          aria-hidden="true"
        />
      </aside>

      {/* Right: Form canvas */}
      <main
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'center', align: 'center' }),
          cm.sp('p', 6),
          'flex-1 bg-surface relative',
        )}
      >
        {/* Mobile brand mark fallback */}
        <Link to="/" className={cm.cn('md:hidden mb-8', cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              cm.flex({ align: 'center', justify: 'center' }),
              'bg-primary text-white',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn(cm.textSize('2xl'), 'material-symbols-outlined')}>savings</span>
          </span>
          <span
            className={cm.cn(
              cm.textSize('2xl'),
              cm.fontWeight('extrabold'),
              cm.textPrimary,
              'tracking-tight',
            )}
          >
            {APP_NAME}
          </span>
        </Link>

        <div className={cm.cn('w-full max-w-[440px] space-y-7')}>
          <header className={cm.stack(2)}>
            <h1
              className={cm.cn(
                cm.fontWeight('extrabold'),
                'text-3xl tracking-tight text-on-surface leading-tight',
              )}
            >
              {heading}
            </h1>
            {subheading ? (
              <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>{subheading}</p>
            ) : null}
          </header>

          {children}

          {footer ? <div className={cm.cn(cm.sp('pt', 2), 'text-center')}>{footer}</div> : null}
        </div>
      </main>
    </div>
  )
}

function SampleEnvelope({ label, pct, over }: { label: string; pct: number; over?: boolean }) {
  const cm = getClassMap()
  return (
    <div>
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.textSize('xs'),
          'text-white/85',
        )}
      >
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className={cm.cn('h-1.5 mt-1 rounded-full bg-surface/15 overflow-hidden')}>
        <div
          className={cm.cn('h-full rounded-full', over ? 'bg-amber-300' : 'bg-surface')}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  )
}
