import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Decorated brand-panel auth shell — left brand panel with the Driftboard
 * gradient, decorative orbs, and a sample-card preview; right card slot
 * receives the form (login / signup / forgot / reset).
 *
 * Translated from catalog §13.3 (Decorated-Card with Brand Panel) +
 * crm/property-listing brand-panel pattern. Holds Driftboard's primary→
 * primary-container gradient and a sample card "Migrate dashboard charts"
 * so visitors see what the app looks like inside.
 */
interface DriftboardAuthShellProps {
  /** Eyebrow above heading on brand panel ("welcome back", "join your team"). */
  eyebrow: string
  /** Main brand-panel headline. */
  headline: string
  /** Supporting copy under the headline. */
  subline: string
  /** Title shown above the form on the right. */
  formTitle: string
  /** Subtitle shown above the form on the right. */
  formSubtitle: string
  /** Form contents — typically <form> + OAuthButtons. */
  children: ReactNode
  /** Footer below the form (e.g., "Don't have an account? Sign up"). */
  footer?: ReactNode
}

export function DriftboardAuthShell({
  eyebrow,
  headline,
  subline,
  formTitle,
  formSubtitle,
  children,
  footer,
}: DriftboardAuthShellProps) {
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
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              dashboard
            </span>
          </span>
          <span
            className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight text-on-surface')}
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
          className={cm.cn(`grid w-full max-w-6xl grid-cols-1 lg:grid-cols-2 gap-8 items-stretch`)}
        >
          <section
            className={cm.cn(
              cm.sp('p', 10),
              cm.flex({ direction: 'col', justify: 'between' }),
              cm.stack(8),
              'relative overflow-hidden rounded-[2rem] text-white min-h-[520px]',
              'bg-gradient-to-br from-primary via-primary to-primary-container',
              'shadow-[0_30px_70px_-30px_rgba(37,99,235,0.55)]',
            )}
            aria-hidden="false"
          >
            <div
              className={cm.cn(
                `absolute -right-24 -bottom-28 h-80 w-80 rounded-full bg-surface/15 blur-3xl pointer-events-none`,
              )}
            />
            <div
              className={cm.cn(
                `absolute -left-20 -top-24 h-72 w-72 rounded-full bg-surface/10 blur-3xl pointer-events-none`,
              )}
            />

            <div className="relative z-10">
              <p
                className={cm.cn(
                  `text-[10px] font-black uppercase tracking-[0.32em] text-white/70 mb-3`,
                )}
              >
                {eyebrow}
              </p>
              <h1
                className={cm.cn(
                  `text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] mb-4`,
                )}
              >
                {headline}
              </h1>
              <p className="text-white/85 max-w-md">{subline}</p>
            </div>

            <div
              className={cm.cn(
                cm.sp('p', 5),
                'relative z-10 rounded-2xl bg-surface/15 backdrop-blur-md text-white shadow-lg',
              )}
            >
              <div className={cm.cn(`flex items-center justify-between mb-3`)}>
                <span
                  className={cm.cn(
                    `px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-300/30`,
                  )}
                >
                  {t('driftboardAuthShell.sample.label', {}, { defaultValue: 'Frontend' })}
                </span>
                <span className="text-[11px] font-semibold text-white/80">
                  {t('driftboardAuthShell.sample.status', {}, { defaultValue: 'In Progress' })}
                </span>
              </div>
              <p className={cm.cn(`font-bold leading-snug mb-2`)}>
                {t(
                  'driftboardAuthShell.sample.title',
                  {},
                  { defaultValue: 'Migrate dashboard charts to the new color tokens' },
                )}
              </p>
              <div
                className={cm.cn(
                  `flex items-center justify-between text-[11px] text-white/80 font-semibold`,
                )}
              >
                <span className={cm.cn(`flex items-center gap-1`)}>
                  <span className="material-symbols-outlined text-[14px]">checklist</span>5/8
                </span>
                <span className={cm.cn(`flex items-center gap-1`)}>
                  <span className="material-symbols-outlined text-[14px]">chat_bubble</span>7
                </span>
                <span className={cm.cn(`flex items-center gap-1`)}>
                  <span className="material-symbols-outlined text-[14px]">event</span>Apr 30
                </span>
                <div className={cm.cn(`flex -space-x-2`)}>
                  <img
                    src="https://i.pravatar.cc/64?img=12"
                    alt=""
                    className={cm.cn(`w-6 h-6 rounded-full ring-2 ring-white/40 object-cover`)}
                  />
                  <img
                    src="https://i.pravatar.cc/64?img=1"
                    alt=""
                    className={cm.cn(`w-6 h-6 rounded-full ring-2 ring-white/40 object-cover`)}
                  />
                </div>
              </div>
            </div>

            <p
              className={cm.cn(
                `relative z-10 text-xs uppercase tracking-[0.32em] text-white/65 font-black`,
              )}
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

export default DriftboardAuthShell
