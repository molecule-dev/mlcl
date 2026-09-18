import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Decorated brand-panel auth shell — left brand panel with Verso's
 * indigo gradient + decorative orbs + sample note preview; right card
 * slot receives the form (login / signup / forgot / reset).
 *
 * Translated from kanban-board's DriftboardAuthShell (catalog §13.3
 * Decorated-Card with Brand Panel). Adapted for Verso: serif accent
 * line on the headline, "today's daily note" sample card, and the
 * tagline "Where thoughts take shape" pinned to the bottom of the
 * brand panel.
 */
interface VersoAuthShellProps {
  /** Eyebrow above headline on brand panel. */
  eyebrow: string
  /** Main brand-panel headline. */
  headline: string
  /** Supporting copy under headline. */
  subline: string
  /** Title shown above the form on the right. */
  formTitle: string
  /** Subtitle shown above the form on the right. */
  formSubtitle: string
  /** Form contents — typically <form> + OAuthButtons. */
  children: ReactNode
  /** Footer below the form. */
  footer?: ReactNode
}

export function VersoAuthShell({
  eyebrow,
  headline,
  subline,
  formTitle,
  formSubtitle,
  children,
  footer,
}: VersoAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'flex flex-col bg-background text-on-surface')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
        )}
      >
        <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.w(9),
              cm.h(9),
              cm.flex({ align: 'center', justify: 'center' }),
              'rounded-xl text-white shadow-md',
              'bg-gradient-to-br from-primary to-primary-container',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              menu_book
            </span>
          </span>
          <span
            className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
            style={{
              fontFamily: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
            }}
          >
            {APP_NAME}
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main
        className={cm.cn(
          cm.flex1,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.sp('px', 6),
          cm.sp('py', 6),
        )}
      >
        <div
          className={cm.cn('grid w-full max-w-6xl grid-cols-1 lg:grid-cols-2 gap-8 items-stretch')}
        >
          <section
            className={cm.cn(
              cm.sp('p', 10),
              cm.flex({ direction: 'col', justify: 'between' }),
              cm.stack(8),
              'relative overflow-hidden rounded-[2rem] text-white min-h-[520px]',
              'bg-gradient-to-br from-primary via-primary to-primary-container',
              'shadow-[0_30px_70px_-30px_rgba(59,95,192,0.55)]',
            )}
          >
            <div
              className={cm.cn(
                'absolute -right-24 -bottom-28 h-80 w-80 rounded-full bg-surface/15 blur-3xl pointer-events-none',
              )}
            />
            <div
              className={cm.cn(
                'absolute -left-20 -top-24 h-72 w-72 rounded-full bg-surface/10 blur-3xl pointer-events-none',
              )}
            />

            <div className={cm.cn('relative z-10')}>
              <p
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-[0.32em] text-white/70 mb-3',
                )}
              >
                {eyebrow}
              </p>
              <h1
                className={cm.cn(
                  'text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] mb-4',
                )}
                style={{
                  fontFamily:
                    'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                }}
              >
                {headline}
              </h1>
              <p className={cm.cn('text-white/85 max-w-md')}>{subline}</p>
            </div>

            <div
              className={cm.cn(
                cm.sp('p', 5),
                'relative z-10 rounded-2xl bg-surface/15 backdrop-blur-md text-white shadow-lg',
              )}
            >
              <div className={cm.cn('flex items-center justify-between mb-3')}>
                <span
                  className={cm.cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-300/30',
                  )}
                >
                  {t('versoAuthShell.sample.label', {}, { defaultValue: 'Daily note' })}
                </span>
                <span className={cm.cn('text-[11px] font-semibold text-white/80')}>
                  {t('versoAuthShell.sample.timestamp', {}, { defaultValue: 'Today · 9:14am' })}
                </span>
              </div>
              <p
                className={cm.cn('text-lg font-bold leading-snug mb-2')}
                style={{
                  fontFamily:
                    'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                }}
              >
                {t(
                  'versoAuthShell.sample.title',
                  {},
                  { defaultValue: 'On letting drafts breathe' },
                )}
              </p>
              <p className={cm.cn('text-[13px] leading-relaxed text-white/85 mb-3')}>
                {t(
                  'versoAuthShell.sample.body',
                  {},
                  {
                    defaultValue:
                      'A second pass tomorrow always reads better than a first pass tonight. Park the rough cut in the deep work folder…',
                  },
                )}
              </p>
              <div
                className={cm.cn('flex items-center gap-2 text-[11px] text-white/80 font-semibold')}
              >
                <span className={cm.cn('px-2 py-0.5 rounded-full bg-surface/15')}>#writing</span>
                <span className={cm.cn('px-2 py-0.5 rounded-full bg-surface/15')}>#process</span>
                <span className={cm.cn('ml-auto flex items-center gap-1')}>
                  <span className={cm.cn('material-symbols-outlined text-[14px]')}>link</span>3
                </span>
              </div>
            </div>

            <p
              className={cm.cn(
                'relative z-10 text-xs uppercase tracking-[0.32em] text-white/65 font-black',
              )}
              style={{
                fontFamily:
                  'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
              }}
            >
              {APP_TAGLINE}
            </p>
          </section>

          <section
            className={cm.cn(
              cm.sp('p', 10),
              cm.flex({ direction: 'col', justify: 'center' }),
              cm.stack(6),
              'rounded-[2rem] bg-surface-container-lowest border border-outline-variant/20 shadow-sm',
            )}
          >
            <div>
              <h2
                className={cm.cn(
                  cm.textSize('2xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
                style={{
                  fontFamily:
                    'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                }}
              >
                {formTitle}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
                {formSubtitle}
              </p>
            </div>
            {children}
            {footer ? <div className={cm.textSize('sm')}>{footer}</div> : null}
          </section>
        </div>
      </main>
    </div>
  )
}

export default VersoAuthShell
