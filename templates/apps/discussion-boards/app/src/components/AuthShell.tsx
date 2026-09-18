/**
 * Auth split-panel shell — brand panel left (gradient + decorative orbs +
 * sample thread row teaser), centered card right. Used by Login, Signup,
 * ForgotPassword, and ResetPassword.
 *
 * Translated from catalog §13.3 (Decorated-Card with Brand Panel) +
 * §13.4 (corner orbs / mesh-gradient / sample-card overlay) and the
 * polished crm/helpdesk treatment.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { AuthShellCardColumn } from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

interface AuthShellProps {
  eyebrow: string
  eyebrowKey?: string
  defaultEyebrow?: string
  heading: string
  headingKey?: string
  defaultHeading?: string
  subheading?: string
  subheadingKey?: string
  defaultSubheading?: string
  brandHighlights?: Array<{ icon: string; label: string; labelKey?: string; defaultLabel?: string }>
  children: ReactNode
  footer?: ReactNode
}

const DEFAULT_HIGHLIGHTS = [
  {
    icon: 'shield',
    label: 'Considered moderation',
    labelKey: 'landing.values.moderation.title',
    defaultLabel: 'Considered moderation',
  },
  {
    icon: 'menu_book',
    label: 'Markdown that ages',
    labelKey: 'landing.values.markdown.title',
    defaultLabel: 'Markdown that ages',
  },
  {
    icon: 'military_tech',
    label: 'Reputation that compounds',
    labelKey: 'landing.values.reputation.title',
    defaultLabel: 'Reputation that compounds',
  },
]

export function AuthShell({
  eyebrow,
  eyebrowKey,
  defaultEyebrow,
  heading,
  headingKey,
  defaultHeading,
  subheading,
  subheadingKey,
  defaultSubheading,
  brandHighlights = DEFAULT_HIGHLIGHTS,
  children,
  footer,
}: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const resolvedEyebrow = eyebrowKey
    ? t(eyebrowKey, {}, { defaultValue: defaultEyebrow ?? eyebrow })
    : eyebrow
  const resolvedHeading = headingKey
    ? t(headingKey, {}, { defaultValue: defaultHeading ?? heading })
    : heading
  const resolvedSubheading = subheading
    ? subheadingKey
      ? t(subheadingKey, {}, { defaultValue: defaultSubheading ?? subheading })
      : subheading
    : undefined
  return (
    <div className={cm.cn('relative min-h-screen w-full bg-background')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'absolute inset-x-0 top-0 z-30',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            aria-hidden
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-gradient-to-br from-primary to-secondary text-white text-sm shadow-md shadow-primary/30',
            )}
          >
            S
          </span>
          <span
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'text-on-surface tracking-tight',
            )}
          >
            {APP_NAME}
          </span>
        </Link>
        <ThemeToggle />
      </header>
      <div className={cm.cn(cm.grid({ cols: 1 }), 'lg:grid-cols-2 min-h-screen')}>
        <aside
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'center' }),
            cm.sp('p', 12),
            'relative overflow-hidden text-white bg-gradient-to-br from-primary via-primary-dark to-[var(--color-hero-gradient-end)]',
          )}
        >
          <div
            aria-hidden
            className={cm.cn(
              cm.roundedFull,
              cm.w(64),
              cm.h(64),
              'absolute -right-20 -top-20 bg-secondary/30 blur-3xl',
            )}
          />
          <div
            aria-hidden
            className={cm.cn(
              cm.roundedFull,
              cm.w(64),
              cm.h(64),
              'absolute -left-24 -bottom-24 bg-surface/10 blur-3xl',
            )}
          />
          <div className={cm.cn('relative z-10 max-w-md mx-auto', cm.stack(8))}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'self-start text-[10px] uppercase tracking-[0.3em] bg-surface/20 backdrop-blur-md',
              )}
            >
              {APP_TAGLINE}
            </span>
            <div className={cm.stack(3)}>
              <h2
                className={cm.cn(
                  'text-4xl md:text-5xl font-extrabold tracking-tighter leading-[1.05]',
                )}
              >
                {t(
                  'authShell.brandPanel.title',
                  { appName: APP_NAME },
                  {
                    defaultValue: 'Bring your community to {{appName}}.',
                  },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('base'), 'text-white/85 leading-relaxed')}>
                {t(
                  'authShell.brandPanel.body',
                  {},
                  {
                    defaultValue:
                      'A threaded discussion space for considered conversation — reputation that compounds, moderation that respects dissent, markdown that ages.',
                  },
                )}
              </p>
            </div>
            <ul className={cm.stack(3)}>
              {brandHighlights.map((h) => (
                <li
                  key={h.label}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.textSize('sm'),
                    'text-white/90',
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.w(8),
                      cm.h(8),
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.roundedFull,
                      'bg-surface/15 backdrop-blur-md text-white border border-surface/20',
                    )}
                    aria-hidden
                  >
                    <span className={cm.cn('material-symbols-outlined text-base')}>{h.icon}</span>
                  </span>
                  {h.labelKey
                    ? t(h.labelKey, {}, { defaultValue: h.defaultLabel ?? h.label })
                    : h.label}
                </li>
              ))}
            </ul>
            <div
              className={cm.cn(
                cm.sp('p', 5),
                cm.stack(3),
                'rounded-2xl bg-surface/10 backdrop-blur-md border border-surface/20',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'inline-flex items-center gap-1 py-0.5 text-[10px] uppercase tracking-widest bg-amber-300/30 text-amber-100',
                  )}
                >
                  <span className="material-symbols-outlined text-[12px]" aria-hidden>
                    push_pin
                  </span>
                  {t('threadRow.status.pinned', {}, { defaultValue: 'Pinned' })}
                </span>
                <span
                  className={cm.cn(
                    cm.sp('px', 2),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    'inline-flex items-center gap-1 py-0.5 text-[10px] uppercase tracking-widest bg-red-300/25 text-red-100',
                  )}
                >
                  <span className="material-symbols-outlined text-[12px]" aria-hidden>
                    local_fire_department
                  </span>
                  {t('threadRow.status.hot', {}, { defaultValue: 'Hot' })}
                </span>
              </div>
              <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'leading-snug')}>
                {t(
                  'authShell.sampleThread.title',
                  {},
                  {
                    defaultValue: 'Is "the obstacle is the way" actually Stoic? — A close reading',
                  },
                )}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-white/75')}>
                {t(
                  'authShell.sampleThread.meta',
                  {},
                  { defaultValue: '@helena.k · 218 replies · 22.4k views · 12m ago' },
                )}
              </p>
            </div>
          </div>
        </aside>
        <AuthShellCardColumn
          as="main"
          className={cm.cn(cm.sp('p', 6), 'min-h-screen lg:min-h-0 lg:py-16 bg-background')}
        >
          <div className={cm.cn(cm.stack(6), 'w-full max-w-md')}>
            <div className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-[0.3em] text-primary',
                )}
              >
                {resolvedEyebrow}
              </span>
              <h1
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {resolvedHeading}
              </h1>
              {resolvedSubheading && (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {resolvedSubheading}
                </p>
              )}
            </div>
            <div
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(5),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-md shadow-primary/5',
              )}
            >
              {children}
            </div>
            {footer && (
              <div className={cm.cn(cm.textCenter, cm.textSize('sm'), 'text-on-surface-variant')}>
                {footer}
              </div>
            )}
          </div>
        </AuthShellCardColumn>
      </div>
    </div>
  )
}

export default AuthShell
