import { Link } from 'react-router'

import { AuthShellCardColumn, AuthShellPanel } from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Decorated split shell used by Login/Signup/Forgot/Reset.
 *
 * Translated from whiteboard's AuthShell.tsx + catalog §13.3 Decorated-Card
 * with Brand Panel recipe. The left panel is a stylised vector-canvas
 * preview (frame + ellipse + pen path + cursor labels in violet/magenta);
 * the right panel is a centered card with brand eyebrow + heading + body.
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
  /**
   * Optional fine-print slot rendered at the very bottom of the card —
   * used by Login/Signup for the Privacy/Terms legal-consent links.
   */
  legal?: React.ReactNode
  children: React.ReactNode
}

export function AuthShell({
  eyebrow,
  heading,
  subheading,
  bottomLink,
  showOAuth = false,
  oauth,
  legal,
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
              'bg-gradient-to-br from-primary to-secondary rounded-xl text-white shadow-md',
            )}
          >
            <span
              className={cm.cn(cm.textSize('lg'), 'material-symbols-outlined')}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              brush
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
              'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 55%, var(--color-canvas-bg-dark) 130%)',
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
              'absolute -bottom-20 -left-20 bg-tertiary/40 blur-3xl',
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
                { defaultValue: 'Pixel-perfect canvases for design teams that ship together.' },
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

              {/* Phone mockup frame */}
              <rect
                x="40"
                y="40"
                width="120"
                height="200"
                rx="14"
                fill="#ffffff"
                stroke="#ffffff"
                strokeOpacity="0.4"
                strokeWidth="1.5"
              />
              <rect x="56" y="60" width="88" height="14" rx="4" fill="#7c3aed" fillOpacity="0.9" />
              <rect x="56" y="84" width="88" height="6" rx="3" fill="#1e1535" fillOpacity="0.55" />
              <rect x="56" y="96" width="60" height="6" rx="3" fill="#1e1535" fillOpacity="0.35" />
              <rect x="56" y="116" width="88" height="46" rx="6" fill="#fce7f3" />
              <circle cx="86" cy="139" r="10" fill="#ec4899" />
              <rect x="56" y="174" width="40" height="20" rx="6" fill="#06b6d4" />
              <rect
                x="104"
                y="174"
                width="40"
                height="20"
                rx="6"
                fill="#7c3aed"
                fillOpacity="0.85"
              />

              {/* Card mockup */}
              <rect x="200" y="50" width="160" height="100" rx="10" fill="#ffffff" />
              <rect x="216" y="68" width="62" height="6" rx="3" fill="#1e1535" fillOpacity="0.55" />
              <rect x="216" y="80" width="100" height="14" rx="4" fill="#1e1535" />
              <rect
                x="216"
                y="104"
                width="120"
                height="6"
                rx="3"
                fill="#1e1535"
                fillOpacity="0.35"
              />
              <rect
                x="216"
                y="116"
                width="80"
                height="6"
                rx="3"
                fill="#1e1535"
                fillOpacity="0.35"
              />
              <rect x="216" y="132" width="64" height="14" rx="6" fill="#7c3aed" />

              {/* Color tokens swatch */}
              <rect x="200" y="170" width="160" height="80" rx="10" fill="#ffffff" />
              <circle cx="220" cy="200" r="12" fill="#7c3aed" />
              <circle cx="252" cy="200" r="12" fill="#ec4899" />
              <circle cx="284" cy="200" r="12" fill="#06b6d4" />
              <circle cx="316" cy="200" r="12" fill="#10b981" />
              <circle cx="348" cy="200" r="12" fill="#f59e0b" />
              <rect
                x="216"
                y="220"
                width="120"
                height="8"
                rx="4"
                fill="#1e1535"
                fillOpacity="0.4"
              />
              <rect x="216" y="234" width="80" height="8" rx="4" fill="#1e1535" fillOpacity="0.3" />

              {/* Pen tool path connecting items */}
              <path
                d="M160 140 Q190 90 200 100"
                stroke="#ffffff"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4 4"
              />
              <path
                d="M160 200 Q200 220 200 220"
                stroke="#ffffff"
                strokeWidth="2"
                fill="none"
                strokeDasharray="4 4"
              />

              {/* Cursor labels */}
              <g transform="translate(360,200)">
                <path
                  d="M0 0 L0 16 L5 12 L8 20 L11 19 L8 11 L14 11 Z"
                  fill="#06b6d4"
                  stroke="#fff"
                  strokeWidth="1"
                />
                <rect x="14" y="18" width="36" height="14" rx="3" fill="#06b6d4" />
                <text
                  x="32"
                  y="28"
                  fill="#fff"
                  fontFamily="Inter"
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  Mara
                </text>
              </g>
              <g transform="translate(110,150)">
                <path
                  d="M0 0 L0 16 L5 12 L8 20 L11 19 L8 11 L14 11 Z"
                  fill="#ec4899"
                  stroke="#fff"
                  strokeWidth="1"
                />
                <rect x="14" y="18" width="32" height="14" rx="3" fill="#ec4899" />
                <text
                  x="30"
                  y="28"
                  fill="#fff"
                  fontFamily="Inter"
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  Niko
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
                    '“{{appName}} replaced three tools the week we shipped the rebrand. The handoff to engineering took an afternoon.” — Northwind Studio',
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
                { defaultValue: 'Trusted by 9,200+ design teams worldwide' },
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

            {legal}
          </div>
        </AuthShellCardColumn>
      </div>
    </div>
  )
}

export default AuthShell
