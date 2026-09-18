import { Link } from 'react-router'

import { AuthShellCardColumn, AuthShellPanel } from '@molecule/app-auth-shell-react'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { loadContent } from '../config.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Decorated split shell used by Login/Signup/Forgot/Reset.
 *
 * Translated from project-management's LoginCard + the catalog §13.3
 * Decorated-Card with Brand Panel recipe. The left panel is a stylised canvas
 * preview (dot-grid, sticky notes, connector arrows + cursor labels) that
 * mirrors the Slate live-canvas vibe; the right panel is a centered card.
 */
export interface AuthShellProps {
  eyebrow: string
  heading: string
  subheading: string
  /** Optional bottom-of-card prompt link ("Already have an account? Sign in"). */
  bottomLink?: { to: string; prompt: string; cta: string }
  /** OAuth row toggle — Login + Signup show it, Forgot/Reset don't. */
  showOAuth?: boolean
  /** Optional OAuth slot (ignored when showOAuth is false). */
  oauth?: React.ReactNode
  children: React.ReactNode
}

export function AuthShell({
  eyebrow,
  heading,
  subheading,
  bottomLink,
  showOAuth = false,
  oauth,
  children,
}: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-surface text-on-surface antialiased')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'absolute top-0 left-0 right-0 z-30',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(9),
              cm.h(9),
              'bg-gradient-to-br from-primary to-primary-hover rounded-xl text-white shadow-md',
            )}
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              dashboard_customize
            </span>
          </span>
          <span className={cm.cn(cm.textSize('lg'), 'font-extrabold tracking-tight')}>
            {APP_NAME}
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <div className={cm.cn(cm.grid({ cols: 12, gap: 'none' }), cm.minH('screen'))}>
        <AuthShellPanel
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'between' }),
            cm.sp('p', 12),
            'col-span-5 relative overflow-hidden text-white',
          )}
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 50%, var(--color-text) 120%)',
          }}
        >
          <div
            className={cm.cn(
              cm.w(80),
              cm.h(80),
              cm.roundedFull,
              'absolute -top-20 -right-20 bg-surface/10 blur-3xl',
            )}
          ></div>
          <div
            className={cm.cn(
              cm.w(60),
              cm.h(60),
              cm.roundedFull,
              'absolute -bottom-20 -left-20 bg-secondary/30 blur-3xl',
            )}
          ></div>

          <div className={cm.cn(cm.stack(3), 'relative z-10')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'w-fit text-[10px] uppercase tracking-widest bg-surface/15 backdrop-blur-md text-white/90',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[14px]')}>auto_awesome</span>
              {APP_TAGLINE}
            </span>
            <h2
              className={cm.cn(
                'text-4xl xl:text-5xl font-extrabold tracking-tighter leading-[0.95]',
              )}
            >
              {t(
                'authShell.brandHeading',
                {},
                { defaultValue: 'Multiplayer canvases for design teams who think out loud.' },
              )}
            </h2>
          </div>

          <div className={cm.cn('relative z-10', cm.sp('my', 12))}>
            <svg
              viewBox="0 0 480 320"
              preserveAspectRatio="xMidYMid meet"
              className={cm.cn(cm.w('full'), 'opacity-95')}
            >
              <defs>
                <pattern
                  id="auth-dots"
                  x="0"
                  y="0"
                  width="22"
                  height="22"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="2" cy="2" r="1.4" fill="rgba(255,255,255,0.32)" />
                </pattern>
              </defs>
              <rect width="480" height="320" fill="url(#auth-dots)" />
              <rect x="40" y="40" width="120" height="80" rx="6" fill="#fef08a" />
              <text x="56" y="72" fill="#1e1e2e" fontFamily="Inter" fontSize="14" fontWeight="700">
                Generous
              </text>
              <text x="56" y="92" fill="#1e1e2e" fontFamily="Inter" fontSize="11">
                Make space for the
              </text>
              <text x="56" y="106" fill="#1e1e2e" fontFamily="Inter" fontSize="11">
                reader, not just
              </text>
              <rect x="200" y="80" width="120" height="80" rx="6" fill="#bfdbfe" />
              <text
                x="216"
                y="112"
                fill="#1e1e2e"
                fontFamily="Inter"
                fontSize="14"
                fontWeight="700"
              >
                Precise
              </text>
              <text x="216" y="132" fill="#1e1e2e" fontFamily="Inter" fontSize="11">
                Concrete nouns. Drop
              </text>
              <text x="216" y="146" fill="#1e1e2e" fontFamily="Inter" fontSize="11">
                hedges. Earn it.
              </text>
              <rect x="320" y="60" width="120" height="80" rx="6" fill="#e9d5ff" />
              <text x="336" y="92" fill="#1e1e2e" fontFamily="Inter" fontSize="14" fontWeight="700">
                Playful
              </text>
              <text x="336" y="112" fill="#1e1e2e" fontFamily="Inter" fontSize="11">
                Wink, then a fact.
              </text>
              <rect x="120" y="200" width="160" height="80" rx="6" fill="#bbf7d0" />
              <text
                x="136"
                y="234"
                fill="#1e1e2e"
                fontFamily="Inter"
                fontSize="14"
                fontWeight="700"
              >
                Anti-pattern
              </text>
              <text x="136" y="254" fill="#1e1e2e" fontFamily="Inter" fontSize="11">
                "Effortlessly leverage
              </text>
              <text x="136" y="268" fill="#1e1e2e" fontFamily="Inter" fontSize="11">
                synergy" — strike.
              </text>

              <path d="M160 80 L200 110" stroke="#fff" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M320 110 L320 100" stroke="#fff" strokeWidth="2" />
              <path d="M200 220 L240 200" stroke="#fff" strokeWidth="2" />

              <g transform="translate(360,200)">
                <path
                  d="M0 0 L0 16 L5 12 L8 20 L11 19 L8 11 L14 11 Z"
                  fill="#00c4a8"
                  stroke="#fff"
                  strokeWidth="1"
                />
                <rect x="14" y="18" width="36" height="14" rx="3" fill="#00c4a8" />
                <text
                  x="32"
                  y="28"
                  fill="#fff"
                  fontFamily="Inter"
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  Theo
                </text>
              </g>
              <g transform="translate(110,150)">
                <path
                  d="M0 0 L0 16 L5 12 L8 20 L11 19 L8 11 L14 11 Z"
                  fill="#a855f7"
                  stroke="#fff"
                  strokeWidth="1"
                />
                <rect x="14" y="18" width="32" height="14" rx="3" fill="#a855f7" />
                <text
                  x="30"
                  y="28"
                  fill="#fff"
                  fontFamily="Inter"
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  Lin
                </text>
              </g>
            </svg>
          </div>

          <div className={cm.cn(cm.stack(2), 'relative z-10')}>
            <p
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-white/85 leading-relaxed max-w-md',
              )}
            >
              {t(
                'authShell.brandFooter',
                { appName: APP_NAME },
                {
                  defaultValue:
                    '“We replaced four tools with {{appName}} the week we shipped our rebrand. The retro saved itself.” — Atlas Studio',
                },
              )}
            </p>
            <span
              className={cm.cn(
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest text-white/60',
              )}
            >
              {t(
                'authShell.brandFooterMeta',
                {},
                { defaultValue: 'Trusted by 12,400+ design teams' },
              )}
            </span>
          </div>
        </AuthShellPanel>

        <AuthShellCardColumn
          as="main"
          className={cm.cn(cm.sp('px', 6), cm.sp('py', 24), 'col-span-12 lg:col-span-7')}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.stack(8),
              cm.sp('p', 10),
              cm.maxW('md'),
              cm.w('full'),
              'bg-surface-container-lowest rounded-3xl shadow-xl border border-outline-variant/30',
            )}
          >
            <div className={cm.cn(cm.stack(2))}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-primary',
                )}
              >
                {eyebrow}
              </span>
              <h1
                className={cm.cn(
                  cm.textSize('3xl'),
                  'font-extrabold tracking-tight text-on-surface',
                )}
              >
                {heading}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {subheading}
              </p>
            </div>

            {children}

            {showOAuth && oauth && <div className={cm.cn(cm.stack(3))}>{oauth}</div>}

            {bottomLink && (
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.fontWeight('semibold'),
                  cm.textSize('sm'),
                  'text-on-surface-variant',
                )}
              >
                {bottomLink.prompt}
                <Link
                  to={bottomLink.to}
                  className={cm.cn(cm.fontWeight('bold'), 'text-primary hover:underline')}
                >
                  {bottomLink.cta}
                </Link>
              </p>
            )}
          </div>

          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
              cm.sp('mt', 6),
              cm.maxW('md'),
              cm.w('full'),
              cm.fontWeight('semibold'),
              'text-[10px] uppercase tracking-widest text-on-surface-variant',
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
        </AuthShellCardColumn>
      </div>
    </div>
  )
}

export default AuthShell
