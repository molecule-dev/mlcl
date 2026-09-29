import { Link } from 'react-router'

import { AuthShellCardColumn } from '@molecule/app-auth-shell-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'
import { Footer } from './Footer.js'
import { ThemeToggle } from './ThemeToggle.js'
import { useIsMobile } from './useIsMobile.js'

/**
 * Centered-card auth shell with a brand-mark header and a teal sample-invoice
 * panel on desktop. Catalog §13.0 anatomy + §13.7 brand-mark header — Remit's
 * mark is a coral "R" tile beside the wordmark.
 *
 * Translated from personal-finance/LoginBrandingHeader composition + the
 * online-store split-pane auth pattern. Intentionally brand-rich because the
 * §13.99 audit calls out that auth is the single highest-ROI surface to brand.
 */
interface AuthShellProps {
  eyebrow?: string
  title: string
  subtitle?: string
  children: React.ReactNode
  footnote?: React.ReactNode
}

export function AuthShell({ eyebrow, title, subtitle, children, footnote }: AuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  return (
    <div
      data-mol-id="auth-shell"
      className={cm.cn(cm.flex({ direction: 'col' }))}
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--mol-color-primary-light)',
        color: 'var(--mol-color-text)',
      }}
    >
      <header
        className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}
        style={{ padding: '20px 32px' }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <BrandWordmark as="span" />
        </Link>
        <ThemeToggle />
      </header>

      <AuthShellCardColumn as="main" className={cm.cn(cm.flex1)} style={{ padding: '24px' }}>
        <div
          style={{
            display: 'grid',
            // Below 768px the brand panel drops — the form card is the whole show.
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, 380px) minmax(0, 460px)',
            gap: '32px',
            alignItems: 'stretch',
            maxWidth: '900px',
            width: '100%',
          }}
        >
          {isMobile ? null : (
            <div
              className={cm.cn(cm.flex({ direction: 'col', justify: 'between' }))}
              style={{
                borderRadius: '24px',
                padding: '28px',
                background:
                  'linear-gradient(155deg, var(--color-primary-dark) 0%, var(--color-sidebar-hover) 60%, var(--color-auth-gradient-end) 100%)',
                color: 'var(--color-sidebar-text-active)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <span
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 700,
                  }}
                >
                  {t(
                    'authShell.tagline.eyebrow',
                    {},
                    { defaultValue: 'Send invoices, get paid faster' },
                  )}
                </span>
                <h2
                  style={{
                    marginTop: '14px',
                    fontSize: '26px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.15,
                  }}
                >
                  {t(
                    'authShell.tagline.title',
                    {},
                    { defaultValue: 'Polished invoices.\nReal-time payments.' },
                  )}
                </h2>
              </div>

              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  marginTop: '24px',
                  padding: '20px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: 700,
                  }}
                >
                  INV-1042
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                    marginTop: '4px',
                  }}
                >
                  $4,800.00
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                  {t('authShell.sample.client', {}, { defaultValue: 'Aperture Studio · Net 14' })}
                </div>
                <div
                  className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
                  style={{
                    marginTop: '14px',
                    padding: '6px 12px',
                    backgroundColor: 'var(--color-paid-light)',
                    color: 'var(--color-paid)',
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    borderRadius: '9999px',
                    width: 'fit-content',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--color-paid)',
                    }}
                  />
                  {t('authShell.sample.paid', {}, { defaultValue: 'Paid 2 minutes ago' })}
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  right: '-80px',
                  bottom: '-80px',
                  width: '260px',
                  height: '260px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-accent-shadow)',
                  filter: 'blur(60px)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '-40px',
                  top: '40px',
                  width: '160px',
                  height: '160px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  filter: 'blur(40px)',
                }}
              />
            </div>
          )}

          <section
            className={cm.cn(cm.flex({ direction: 'col' }), 'bg-surface rounded-2xl shadow-sm')}
            style={{
              border: '1px solid var(--mol-color-border)',
              padding: '28px',
            }}
          >
            {eyebrow ? (
              <span
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--color-primary-dark)',
                  fontWeight: 700,
                }}
              >
                {eyebrow}
              </span>
            ) : null}
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: 'var(--color-primary-dark)',
                letterSpacing: '-0.02em',
                margin: eyebrow ? '6px 0 0' : 0,
              }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--mol-color-text-secondary)',
                  marginTop: '6px',
                }}
              >
                {subtitle}
              </p>
            ) : null}
            <div style={{ marginTop: '20px', flex: 1 }}>{children}</div>
            {footnote ? <div style={{ marginTop: '16px' }}>{footnote}</div> : null}
          </section>
        </div>
      </AuthShellCardColumn>

      <Footer />
    </div>
  )
}

export default AuthShell
