import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Decorated two-panel auth shell — left "brand panel" with a gradient,
 * blurred orbs, and a branching SVG glyph; right white card hosts the form.
 * Catalog §13.3 (decorated brand panel) + §13.7 (brand mark) applied to
 * Dendrite's mind-map identity.
 *
 * Used by Login, Signup, ForgotPassword, ResetPassword.
 */

export interface DendriteAuthCardProps {
  heading: string
  subheading?: string
  brandStatement?: string
  children: ReactNode
  footer?: ReactNode
}

export function DendriteAuthCard({
  heading,
  subheading,
  brandStatement,
  children,
  footer,
}: DendriteAuthCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface text-on-surface antialiased selection:bg-primary-fixed selection:text-primary',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
        )}
      >
        <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })} aria-label={APP_NAME}>
          <BrandWordmark as="span" size="md" />
        </Link>
        <ThemeToggle />
      </header>
      <main
        className={cm.cn(
          cm.flex1,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('px', 6),
          cm.sp('py', 8),
        )}
      >
        <div
          className={cm.cn(
            cm.w('full'),
            'max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-[2rem] overflow-hidden bg-surface-container-lowest shadow-2xl',
          )}
        >
          <aside
            className={cm.cn(
              'relative hidden lg:block bg-gradient-to-br from-primary to-primary-container text-on-primary',
            )}
          >
            <div
              className={cm.cn(
                'absolute -right-20 -top-20 w-72 h-72 rounded-full bg-surface/15 blur-3xl',
              )}
              aria-hidden
            />
            <div
              className={cm.cn(
                'absolute -left-16 -bottom-16 w-72 h-72 rounded-full bg-surface/10 blur-3xl',
              )}
              aria-hidden
            />
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'between' }),
                cm.sp('p', 12),
                cm.h('full'),
                'relative',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.fontWeight('bold'),
                  'self-start bg-surface/20 backdrop-blur-md text-[10px] uppercase tracking-widest rounded-full',
                )}
              >
                <span className={cm.cn(cm.textSize('sm'), 'material-symbols-outlined')}>
                  auto_awesome
                </span>
                {t('auth.brandEyebrow', {}, { defaultValue: 'Where ideas branch out' })}
              </span>
              <svg
                viewBox="0 0 320 220"
                className={cm.cn(cm.w('full'), 'max-w-[300px] mx-auto')}
                aria-hidden
              >
                <g stroke="rgba(255,255,255,0.45)" strokeWidth="2" fill="none">
                  <path d="M160 110 C 110 80, 80 60, 40 50" />
                  <path d="M160 110 C 210 80, 240 60, 280 50" />
                  <path d="M160 110 C 110 140, 80 160, 40 170" />
                  <path d="M160 110 C 210 140, 240 160, 280 170" />
                </g>
                <g fill="rgba(255,255,255,0.92)">
                  <circle cx="160" cy="110" r="22" />
                  <circle cx="40" cy="50" r="11" />
                  <circle cx="280" cy="50" r="11" />
                  <circle cx="40" cy="170" r="11" />
                  <circle cx="280" cy="170" r="11" />
                </g>
              </svg>
              <p
                className={cm.cn(
                  cm.textSize('xl'),
                  'font-extrabold tracking-tight text-on-primary/95 max-w-sm',
                )}
              >
                {brandStatement ||
                  t(
                    'auth.brandStatement',
                    {},
                    {
                      defaultValue:
                        'A spacious canvas for your boldest ideas. Drag, branch, and connect — the map grows with you.',
                    },
                  )}
              </p>
            </div>
          </aside>
          <section
            className={cm.cn(
              cm.flex({ direction: 'col', justify: 'center' }),
              cm.sp('p', 10),
              cm.stack(6),
            )}
          >
            <div className={cm.stack(2)}>
              <h1
                className={cm.cn(
                  cm.textSize('3xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {heading}
              </h1>
              {subheading && (
                <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant')}>
                  {subheading}
                </p>
              )}
            </div>
            {children}
            {footer && (
              <div className={cm.cn(cm.textCenter, cm.textSize('sm'), cm.textMuted)}>{footer}</div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default DendriteAuthCard
