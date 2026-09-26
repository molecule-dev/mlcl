import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { AuthShellCardColumn, AuthShellPanel } from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { LustraWordmark } from './LustraWordmark.js'
import { ThemeToggle } from './ThemeToggle.js'

/**
 * Decorated split-shell used by Login / Signup / Forgot / Reset.
 *
 * Translated from design-canvas's AuthShell.tsx + catalog §13.3 Decorated
 * Card with Brand Panel — a violet→magenta gradient panel on the left
 * with a stylised "darkroom canvas" SVG + tagline; the right side hosts
 * a centered glassmorphic dark card with brand eyebrow + heading +
 * children form slot. Recoloured for Lustra's #0c0c1d background and
 * violet/magenta palette per DESIGN.md.
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
  oauth?: ReactNode
  children: ReactNode
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
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-[var(--photo-background)] text-[var(--photo-text)] antialiased',
      )}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'absolute top-0 left-0 right-0 z-30',
        )}
      >
        <LustraWordmark size="md" to="/" />
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
              'linear-gradient(135deg, var(--photo-hero-from) 0%, var(--photo-hero-via) 35%, var(--photo-hero-to) 110%)',
          }}
        >
          <div
            className={cm.cn(
              'absolute -top-20 -right-20 w-80 h-80 rounded-full bg-surface/15 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-[var(--photo-secondary)]/30 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute top-1/3 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full bg-[var(--photo-accent)]/25 blur-3xl',
            )}
            aria-hidden="true"
          />

          <div className={cm.cn('relative z-10')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                'w-fit text-[10px] uppercase tracking-widest bg-surface/15 backdrop-blur-md text-white/95 rounded-full',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-[14px]')}
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                image
              </span>
              {t('authShell.tagline', {}, { defaultValue: 'Light bends to your will' })}
            </span>
            <h2
              className={cm.cn(
                'text-4xl xl:text-5xl font-extrabold tracking-tighter leading-[0.95] mt-5',
              )}
            >
              {t(
                'authShell.brandHeading',
                {},
                { defaultValue: 'A precision photo editor for creators who shape light.' },
              )}
            </h2>
          </div>

          {/* Stylised darkroom canvas SVG */}
          <div className={cm.cn('relative z-10 my-12')}>
            <svg
              viewBox="0 0 480 320"
              preserveAspectRatio="xMidYMid meet"
              className={cm.cn('w-full opacity-95')}
              aria-hidden="true"
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
                <linearGradient id="frame-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="var(--photo-hero-from)" />
                  <stop offset="0.5" stopColor="var(--photo-hero-via)" />
                  <stop offset="1" stopColor="var(--photo-hero-to)" />
                </linearGradient>
              </defs>
              <rect width="480" height="320" fill="url(#auth-dots)" />

              {/* Editor canvas frame */}
              <rect
                x="40"
                y="40"
                width="320"
                height="220"
                rx="14"
                fill="url(#frame-grad)"
                stroke="#ffffff"
                strokeOpacity="0.45"
                strokeWidth="1.5"
              />
              <rect
                x="40"
                y="40"
                width="320"
                height="220"
                rx="14"
                fill="url(#auth-dots)"
                opacity="0.35"
              />

              {/* Histogram overlay */}
              <g transform="translate(56, 200)">
                {Array.from({ length: 32 }).map((_, i) => {
                  const h = 6 + Math.abs(Math.sin(i * 0.6)) * 36 + (i > 24 ? 10 : 0)
                  return (
                    <rect
                      key={i}
                      x={i * 9}
                      y={48 - h}
                      width="6"
                      height={h}
                      rx="1"
                      fill="rgba(255, 255, 255, 0.85)"
                    />
                  )
                })}
              </g>

              {/* Histogram baseline */}
              <line
                x1="56"
                y1="252"
                x2="344"
                y2="252"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="1"
              />

              {/* Crop corners */}
              <rect
                x="64"
                y="64"
                width="14"
                height="14"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <rect
                x="320"
                y="64"
                width="14"
                height="14"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <rect
                x="64"
                y="184"
                width="14"
                height="14"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              <rect
                x="320"
                y="184"
                width="14"
                height="14"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              {/* Right rail — adjustment sliders */}
              <rect x="380" y="40" width="60" height="220" rx="8" fill="var(--photo-surface)" />
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i} transform={`translate(0, ${i * 36})`}>
                  <rect x="392" y={62} width="36" height="3" rx="1.5" fill="var(--photo-border)" />
                  <rect
                    x="392"
                    y={62}
                    width={20 - i * 3}
                    height="3"
                    rx="1.5"
                    fill="var(--photo-accent)"
                  />
                  <circle cx={412 - i * 3} cy={63.5} r="3" fill="#ffffff" />
                </g>
              ))}

              {/* Tool rail (left) */}
              <rect x="20" y="40" width="14" height="220" rx="6" fill="var(--photo-surface)" />
              {[0, 1, 2, 3, 4].map((i) => (
                <rect
                  key={i}
                  x="22.5"
                  y={50 + i * 22}
                  width="9"
                  height="9"
                  rx="2"
                  fill={i === 0 ? 'var(--photo-danger)' : 'var(--photo-accent)'}
                  opacity={i === 0 ? 1 : 0.55}
                />
              ))}

              {/* Cursor */}
              <g transform="translate(220, 150)">
                <path
                  d="M0 0 L0 18 L6 14 L9 22 L13 21 L9 12 L17 12 Z"
                  fill="var(--photo-secondary)"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
                <rect x="18" y="18" width="48" height="14" rx="3" fill="var(--photo-secondary)" />
                <text
                  x="42"
                  y="28"
                  fill="#ffffff"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="10"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  +38 EV
                </text>
              </g>
            </svg>
          </div>

          <div className={cm.cn('relative z-10')}>
            <p className={cm.cn('text-sm font-medium text-white/85 leading-relaxed max-w-md')}>
              {t(
                'authShell.brandFooter',
                {},
                {
                  defaultValue:
                    '“We swapped Lightroom for Lustra on the basement-studio rig — keystrokes-per-edit dropped by half.” — Atelier 7th & Pine',
                },
              )}
            </p>
            <span
              className={cm.cn(
                'font-bold text-[10px] uppercase tracking-widest text-white/65 mt-3 block',
              )}
            >
              {t(
                'authShell.brandFooterMeta',
                {},
                { defaultValue: 'Trusted by 4,800+ photographers · 32-bit float pipeline' },
              )}
            </span>
          </div>
        </AuthShellPanel>

        <AuthShellCardColumn
          as="main"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 24),
            'col-span-12 lg:col-span-7 relative overflow-hidden',
          )}
        >
          <div
            className={cm.cn(
              'absolute -top-20 right-1/4 w-[400px] h-[400px] rounded-full bg-[var(--photo-accent)]/15 blur-[120px] pointer-events-none',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute -bottom-20 left-1/4 w-[320px] h-[320px] rounded-full bg-[var(--photo-danger)]/10 blur-[120px] pointer-events-none',
            )}
            aria-hidden="true"
          />

          <div
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.stack(8),
              cm.sp('p', 10),
              cm.maxW('md'),
              cm.w('full'),
              'relative bg-[var(--photo-surface)]/85 backdrop-blur-md rounded-3xl shadow-2xl shadow-black/60 border border-[var(--photo-border)]',
            )}
          >
            <div className={cm.cn(cm.stack(2))}>
              <span
                className={cm.cn(
                  'font-mono text-[10px] uppercase tracking-widest font-bold text-[var(--photo-panel-text-accent)]',
                )}
              >
                {eyebrow}
              </span>
              <h1
                className={cm.cn('text-3xl font-extrabold tracking-tight text-[var(--photo-text)]')}
              >
                {heading}
              </h1>
              <p
                className={cm.cn(
                  'text-sm font-medium text-[var(--photo-text-muted)] leading-relaxed',
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
                  'font-semibold text-sm text-[var(--photo-text-muted)]',
                )}
              >
                {bottomLink.prompt}
                <Link
                  to={bottomLink.to}
                  className={cm.cn(
                    'font-bold text-[var(--photo-panel-text-highlight)] hover:text-[var(--photo-danger)] hover:underline transition-colors',
                  )}
                >
                  {bottomLink.cta}
                </Link>
              </p>
            )}
          </div>
        </AuthShellCardColumn>
      </div>
    </div>
  )
}

export default AuthShell
