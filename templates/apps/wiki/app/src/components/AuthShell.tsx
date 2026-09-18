import { Link } from 'react-router'

import { AuthShellCardColumn, AuthShellPanel } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { loadContent } from '../config.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Decorated-card auth shell — catalog §13.3 (brand panel + centered card).
 * Left brand panel (~55%) is an indigo→amber gradient with corner orbs,
 * frosted-glass tagline pill, and a sample knowledge card overlay so
 * logged-out visitors see what the app looks like inside. Right form panel
 * (~45%) hosts the per-page form. Top header band carries the brand mark
 * + theme toggle; bottom footer band carries the brand-reinforcing legal
 * row.
 *
 * Translated from crm/LoginCard + helpdesk-ticketing/LoginCard — same
 * anatomy (header → split → footer) recoloured to Cairn's indigo+amber
 * palette and editorial type.
 */

export interface AuthShellProps {
  eyebrow?: string
  heading: string
  subheading?: string
  children: React.ReactNode
  /** Optional link rendered below the form (e.g. "Already have an account?"). */
  meta?: React.ReactNode
}

export function AuthShell({ eyebrow, heading, subheading, children, meta }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(cm.flex({ direction: 'col' }), 'min-h-screen bg-surface-container-lowest')}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          'h-16 border-b border-outline-variant/30',
        )}
      >
        <Link to="/" className={cm.flex({ align: 'center', gap: 'sm' })}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-secondary text-white',
            )}
            aria-hidden="true"
          >
            <span className={cm.cn('material-symbols-outlined text-[20px]')}>layers</span>
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

      <main className={cm.cn('grid flex-1 grid-cols-1 lg:grid-cols-[55%_45%]')}>
        {/* Brand panel */}
        <AuthShellPanel
          className={cm.cn(
            cm.sp('p', 10),
            cm.flex({ direction: 'col', justify: 'between' }),
            'relative overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary text-white',
          )}
        >
          <div
            className={cm.cn(
              'pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full bg-surface/15 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'pointer-events-none absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-surface/10 blur-3xl',
            )}
            aria-hidden="true"
          />

          <div className={cm.stack(4)}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                'inline-block w-fit rounded-full bg-surface/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest',
              )}
            >
              {t(
                'authShell.eyebrow',
                { appName: APP_NAME },
                { defaultValue: 'Knowledge base · {{appName}}' },
              )}
            </span>
            <h2
              className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight leading-[1.05]')}
            >
              {APP_TAGLINE}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-white/85 max-w-md leading-relaxed')}>
              {t(
                'authShell.brandBlurb',
                {},
                {
                  defaultValue:
                    'A calm, editorial wiki for teams that read deeply. Versioned pages, AI summaries, and a page tree that finally feels like furniture.',
                },
              )}
            </p>
          </div>

          {/* Sample knowledge card overlay */}
          <div
            className={cm.cn(
              cm.sp('p', 6),
              cm.stack(3),
              'rounded-2xl bg-surface/15 backdrop-blur-md text-white border border-surface/20',
            )}
          >
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-8 w-8 rounded-md bg-surface/15',
                )}
                aria-hidden="true"
              >
                <span className={cm.cn('material-symbols-outlined text-[18px]')}>description</span>
              </span>
              <div className={cm.stack(0)}>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-white/80',
                  )}
                >
                  {t(
                    'authShell.samplePageEyebrow',
                    {},
                    { defaultValue: 'Engineering · Reference' },
                  )}
                </p>
                <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(
                    'authShell.samplePageTitle',
                    {},
                    { defaultValue: 'Architecture overview — 2026' },
                  )}
                </p>
              </div>
            </div>
            <p className={cm.cn(cm.textSize('sm'), 'text-white/85 leading-relaxed')}>
              {t(
                'authShell.samplePageSummary',
                {},
                {
                  defaultValue:
                    'The 2026 stack runs on a sharded Postgres cluster behind a thin GraphQL gateway. Edge cache hit-rate is 89%, cost per million dropped 38% YoY.',
                },
              )}
            </p>
            <div className={cm.flex({ align: 'center', gap: 'sm' })}>
              <span
                className={cm.cn(
                  cm.sp('px', 2),
                  cm.sp('py', 0),
                  'rounded-full bg-surface/25 text-[10px] font-black uppercase tracking-widest',
                )}
              >
                {t('status.published', {}, { defaultValue: 'Published' })}
              </span>
              <span className={cm.cn(cm.textSize('xs'), 'text-white/80')}>
                {t(
                  'authShell.sampleEdited',
                  {},
                  { defaultValue: 'Updated 2 minutes ago by Alex Lin' },
                )}
              </span>
            </div>
          </div>
        </AuthShellPanel>

        {/* Form panel */}
        <AuthShellCardColumn className={cm.cn(cm.sp('px', 8), cm.sp('py', 12))}>
          <div className={cm.cn(cm.stack(8), 'w-full max-w-md')}>
            <header className={cm.stack(2)}>
              {eyebrow ? (
                <span
                  className={cm.cn(
                    cm.textSize('xs'),
                    'font-black uppercase tracking-widest text-primary',
                  )}
                >
                  {eyebrow}
                </span>
              ) : null}
              <h1
                className={cm.cn(
                  cm.textSize('3xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
                style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
              >
                {heading}
              </h1>
              {subheading ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {subheading}
                </p>
              ) : null}
            </header>

            {children}

            {meta ? <div className={cm.cn(cm.textCenter)}>{meta}</div> : null}
          </div>
        </AuthShellCardColumn>
      </main>

      <footer
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 4),
          'border-t border-outline-variant/30 text-xs text-on-surface-variant',
        )}
      >
        <span>
          {t('authShell.footer.copyright', { name: APP_NAME }, { defaultValue: '© {{name}}' })}
        </span>
        <div className={cm.flex({ align: 'center', gap: 'md' })}>
          <Link to="/" className={cm.cn('hover:text-on-surface transition-colors')}>
            {t('authShell.footer.home', {}, { defaultValue: 'Home' })}
          </Link>
          <LegalModalLinks
            linkClassName={cm.cn('hover:text-on-surface transition-colors')}
            appName={APP_NAME}
            loadContent={loadContent}
            privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
            termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
          />
          <a
            href="https://www.molecule.dev"
            target="_blank"
            rel="noopener noreferrer"
            className={cm.cn('hover:text-on-surface transition-colors')}
          >
            {t('authShell.footer.poweredBy', {}, { defaultValue: 'Powered by Molecule.dev' })}
          </a>
        </div>
      </footer>
    </div>
  )
}
