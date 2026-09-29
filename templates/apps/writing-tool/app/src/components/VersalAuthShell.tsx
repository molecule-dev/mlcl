import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Decorated brand-panel auth shell — left brand panel with Versal's
 * violet gradient, decorative blurred orbs and a sample manuscript
 * preview; right card slot receives the form (login/signup/forgot/reset).
 *
 * Translated from note-taking's VersoAuthShell (catalog §13.3 Decorated
 * Card with Brand Panel). The sample card mirrors the editor surface a
 * logged-in writer sees — Charter-Georgia headline, serif body excerpt,
 * a tag pill row, and the literary tagline pinned bottom-right so the
 * brand promise lands before the form does.
 */
interface VersalAuthShellProps {
  /** Eyebrow above the brand-panel headline. */
  eyebrow: string
  /** Main brand-panel headline (rendered as h1, serif, extrabold). */
  headline: string
  /** Supporting copy beneath the headline. */
  subline: string
  /** Title shown above the form on the right. */
  formTitle: string
  /** Subtitle shown above the form on the right. */
  formSubtitle: string
  /** Form contents — typically <form> + OAuthButtons. */
  children: ReactNode
  /** Footer block under the form (sign-in / sign-up cross-link). */
  footer?: ReactNode
}

export function VersalAuthShell({
  eyebrow,
  headline,
  subline,
  formTitle,
  formSubtitle,
  children,
  footer,
}: VersalAuthShellProps) {
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
        <BrandWordmark />
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
              'shadow-[0_30px_70px_-30px_rgba(124,58,237,0.55)]',
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
                    'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                }}
              >
                {headline}
              </h1>
              <p className={cm.cn('text-white/85 max-w-md leading-relaxed')}>{subline}</p>
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
                    'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-300/30',
                  )}
                >
                  {t('versalAuthShell.sample.label', {}, { defaultValue: 'Manuscript · Draft 7' })}
                </span>
                <span className={cm.cn('text-[11px] font-semibold text-white/80')}>
                  {t('versalAuthShell.sample.timestamp', {}, { defaultValue: 'Today · 9:14am' })}
                </span>
              </div>
              <p
                className={cm.cn('text-xl font-extrabold leading-snug mb-2')}
                style={{
                  fontFamily:
                    'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                }}
              >
                {t(
                  'versalAuthShell.sample.title',
                  {},
                  { defaultValue: 'Chapter Three — A Quiet Hour Before Sunrise' },
                )}
              </p>
              <p
                className={cm.cn('text-[13px] leading-[1.7] text-white/90 mb-3')}
                style={{
                  fontFamily:
                    'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
                }}
              >
                {t(
                  'versalAuthShell.sample.body',
                  {},
                  {
                    defaultValue:
                      'The kettle finally settled, and the words came in the order they had been waiting for. She set the page down once, twice — then trusted the line and let it stand.',
                  },
                )}
              </p>
              <div
                className={cm.cn('flex items-center gap-2 text-[11px] text-white/85 font-semibold')}
              >
                <span className={cm.cn('px-2 py-0.5 rounded-full bg-surface/15')}>#novel</span>
                <span className={cm.cn('px-2 py-0.5 rounded-full bg-surface/15')}>#chapter-3</span>
                <span className={cm.cn('ml-auto flex items-center gap-1')}>
                  <span
                    className={cm.cn('material-symbols-outlined text-[14px]')}
                    aria-hidden="true"
                  >
                    edit_note
                  </span>
                  <span className={cm.cn('whitespace-nowrap')}>248 words</span>
                </span>
              </div>
            </div>

            <p
              className={cm.cn(
                'relative z-10 text-xs uppercase tracking-[0.32em] text-white/65 font-black',
              )}
              style={{
                fontFamily:
                  'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
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
                    'Charter, Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
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

export default VersalAuthShell
