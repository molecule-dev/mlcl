import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { loadContent } from '../config.js'
import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Branded auth-page shell — split layout with lavender hero on the left
 * (gradient + decorative orbs + sample classroom card) and a polished
 * card on the right.
 *
 * Translated from §13.3 (Decorated-Card with Brand Panel) — uses Aula
 * gradient + classroom-tile illustration in place of the per-app
 * branded panel content.
 */
export interface AulaAuthShellProps {
  eyebrow?: string
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function AulaAuthShell({ eyebrow, title, subtitle, children, footer }: AulaAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const eyebrowLabel = eyebrow ?? t('aulaAuthShell.eyebrow', {}, { defaultValue: APP_TAGLINE })

  return (
    <div className={cm.cn('min-h-screen bg-background text-on-surface antialiased flex flex-col')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'border-b border-outline-variant/15',
        )}
      >
        <BrandWordmark />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
          <ThemeToggle />
          <Link
            to="/"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('aulaAuthShell.backHome', {}, { defaultValue: '← Back home' })}
          </Link>
        </div>
      </header>

      <main className={cm.cn(cm.flex1, cm.grid({ cols: 12, gap: 'none' }))}>
        <section
          className={cm.cn(
            'col-span-12 lg:col-span-6 relative overflow-hidden text-on-primary p-12 hidden lg:flex flex-col justify-between',
            'bg-gradient-to-br from-primary via-primary-dark to-tertiary',
          )}
        >
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -right-32 -top-32 h-96 w-96 rounded-full bg-secondary/40 blur-3xl',
            )}
          ></div>
          <div
            aria-hidden="true"
            className={cm.cn(
              'absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-surface/15 blur-3xl',
            )}
          ></div>
          <div className={cm.cn(cm.stack(4), 'relative z-10 max-w-md')}>
            <span
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                'self-start rounded-full bg-surface/20 backdrop-blur-md text-[10px] uppercase tracking-widest',
              )}
            >
              {t('aulaAuthShell.brandEyebrow', {}, { defaultValue: 'Where learning comes alive' })}
            </span>
            <h2 className={cm.cn(cm.fontWeight('bold'), 'text-4xl tracking-tight leading-[1.1]')}>
              {t(
                'aulaAuthShell.brandTitle',
                {},
                { defaultValue: 'Live classrooms with the warmth of being in the room.' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('base'), 'opacity-90 leading-relaxed')}>
              {t(
                'aulaAuthShell.brandBody',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '{{appName}} brings video, whiteboard, breakouts, chat, and grading into one focused tab — built for instructors who want to teach, not herd tabs.',
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'relative z-10 rounded-2xl bg-surface/15 backdrop-blur-md border border-surface/15',
            )}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mb', 4))}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 1 }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.fontWeight('bold'),
                  'rounded-full bg-error/90 text-on-error text-[10px] uppercase tracking-widest',
                )}
              >
                <span
                  className={cm.cn('h-2 w-2 rounded-full bg-surface animate-pulse')}
                  aria-hidden="true"
                ></span>
                {t('aulaAuthShell.sampleLive', {}, { defaultValue: 'Live now' })}
              </span>
              <span className={cm.cn('text-[11px] uppercase tracking-widest opacity-80 font-bold')}>
                {t('aulaAuthShell.sampleCourse', {}, { defaultValue: 'Calculus II · MTH 202' })}
              </span>
            </div>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.fontWeight('bold'),
                'leading-tight',
                cm.sp('mb', 3),
              )}
            >
              {t(
                'aulaAuthShell.sampleTitle',
                {},
                { defaultValue: 'Lecture 14 — Vector fields & flux' },
              )}
            </p>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
              <div className={cm.cn(cm.flex(), '-space-x-2')}>
                {['Aiyana', 'Kenji', 'Priya', 'Liam'].map((seed, i) => (
                  <img
                    key={seed}
                    alt=""
                    src={`https://picsum.photos/seed/aula-auth-${i}/120/120`}
                    className={cm.cn(
                      'h-8 w-8 rounded-full border-2 border-surface/70 object-cover',
                    )}
                  />
                ))}
              </div>
              <span className={cm.cn('text-[11px] uppercase tracking-widest opacity-90 font-bold')}>
                {t('aulaAuthShell.sampleAttending', {}, { defaultValue: '+24 more attending' })}
              </span>
            </div>
          </div>
        </section>

        <section
          className={cm.cn(
            'col-span-12 lg:col-span-6 flex items-center justify-center',
            cm.sp('p', 8),
          )}
        >
          <div className={cm.cn(cm.w('full'), cm.maxW('md'), cm.stack(6))}>
            <div className={cm.stack(2)}>
              <span
                className={cm.cn('text-[11px] font-black uppercase tracking-widest text-primary')}
              >
                {eyebrowLabel}
              </span>
              <h1
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface leading-tight',
                )}
              >
                {title}
              </h1>
              {subtitle ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            <div
              className={cm.cn(
                cm.sp('p', 8),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm',
              )}
            >
              {children}
            </div>
            {footer}
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              <LegalModalLinks
                linkClassName={cm.cn('hover:text-primary transition-colors')}
                appName={APP_NAME}
                loadContent={loadContent}
                privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AulaAuthShell
