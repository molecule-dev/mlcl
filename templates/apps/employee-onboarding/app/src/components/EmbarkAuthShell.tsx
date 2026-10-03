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
 * Centered + decorated auth shell — brand panel on the left (gradient with copy
 * + sample dashboard pill stats), card on the right with Embark brand mark,
 * heading, form children, footer link, and Privacy/Terms IN-PLACE modal links
 * (`LegalModalLinks`) shown under every auth view (Login/Signup/Forgot/Reset).
 * The legal HTML is pre-loaded via `loadContent` so the modals never render
 * empty — the standalone `/privacy` and `/terms` routes still exist for deep
 * links, and the app-shell footer keeps its own legal modals.
 *
 * Translated from §13.3 (Decorated-Card with Brand Panel) of POLISHED-PATTERN-CATALOG.md
 * + crm/LoginCard.tsx.
 */

export interface EmbarkAuthShellProps {
  /** Heading shown above the form (e.g. "Welcome back"). */
  heading: string
  /** Sub-heading copy under the heading. */
  subheading?: string
  /** Optional sales-y left panel headline override. */
  panelHeadline?: string
  /** Optional sales-y left panel body override. */
  panelBody?: string
  /** Form content slot. */
  children: ReactNode
  /** Footer link slot — e.g. "New here? Create an account". */
  footer?: ReactNode
  /** Optional error banner content. */
  error?: ReactNode
}

export function EmbarkAuthShell({
  heading,
  subheading,
  panelHeadline,
  panelBody,
  children,
  footer,
  error,
}: EmbarkAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const legalLinkClass = cm.cn(
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    'hover:text-primary transition-colors',
  )

  return (
    <div
      className={cm.cn(cm.flex(), cm.minH('screen'), 'bg-background text-on-surface antialiased')}
    >
      {/* Decorative left brand panel — hidden on small screens */}
      <aside
        className={cm.cn(
          cm.flex({ direction: 'col', justify: 'between' }),
          cm.sp('p', 12),
          // `flex: '0 0 480px'` below is an inline style, so a media-query class
          // is the only way to take the panel off the phone layout — without it
          // the 480px basis overflows every <768px viewport (mobileOverflow).
          'max-md:hidden',
        )}
        style={{
          flex: '0 0 480px',
          background:
            'linear-gradient(135deg, var(--mol-color-primary) 0%, var(--mol-color-primary-dark) 50%, var(--mol-color-secondary) 100%)',
          color: 'var(--mol-color-surface)',
          position: 'relative',
          overflow: 'hidden',
        }}
        aria-hidden
      >
        <div
          style={{
            position: 'absolute',
            right: '-100px',
            top: '-100px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '-80px',
            bottom: '-80px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.4)',
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />

        <Link
          to="/"
          // The whole aside is aria-hidden (decorative duplicate of the form
          // panel's brand link), so this link must also leave the tab order —
          // axe `aria-hidden-focus`.
          tabIndex={-1}
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <BrandWordmark as="span" size="lg" invert />
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              {APP_TAGLINE}
            </p>
          </div>
        </Link>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2
            className="font-extrabold tracking-tight"
            style={{ fontSize: 'clamp(28px, 3vw, 40px)', lineHeight: 1.05 }}
          >
            {panelHeadline ??
              t(
                'auth.panel.headline',
                {},
                { defaultValue: 'A confident first 90 days starts here.' },
              )}
          </h2>
          <p style={{ marginTop: '16px', maxWidth: '380px', color: 'rgba(255,255,255,0.92)' }}>
            {panelBody ??
              t(
                'auth.panel.body',
                {},
                {
                  defaultValue:
                    'Your personal checklist, training milestones, and team intros — all in one calm place.',
                },
              )}
          </p>
          <div className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('mt', 6), 'flex-wrap')}>
            {[
              { label: 'Tasks', value: '12/18' },
              { label: 'Milestones', value: '2/3' },
            ].map((p) => (
              <span
                key={p.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              >
                <span style={{ fontWeight: 800, fontSize: '14px' }}>{p.value}</span>
                <span
                  className="text-[10px] uppercase tracking-[0.18em]"
                  style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}
                >
                  {p.label}
                </span>
              </span>
            ))}
          </div>
        </div>

        <p
          className="uppercase tracking-[0.18em]"
          style={{ color: 'rgba(255,255,255,0.7)', position: 'relative', zIndex: 1 }}
        >
          {t(
            'auth.panel.footnote',
            { appName: APP_NAME },
            { defaultValue: '© {{appName}} — onboarding people-first since today.' },
          )}
        </p>
      </aside>

      {/* Right column — form */}
      <main className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1)} style={{ minWidth: 0 }}>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), cm.sp('px', 8))}
          style={{ height: '64px' }}
        >
          <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            {/* as="span" — the wrapping Link already provides navigation;
                the default `as="link"` would nest <a> inside <a> here. */}
            <BrandWordmark as="span" />
          </Link>
          <ThemeToggle />
        </div>

        <div
          className={cm.cn(
            cm.flex({ direction: 'col', justify: 'center' }),
            cm.flex1,
            cm.sp('px', 8),
            cm.sp('py', 10),
          )}
        >
          <div
            className={cm.cn(cm.maxW('full'))}
            style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}
          >
            <h1 className={cm.cn(cm.fontWeight('bold'), 'text-3xl tracking-tight')}>{heading}</h1>
            {subheading && <p className={cm.cn(cm.textMuted, cm.sp('mt', 2))}>{subheading}</p>}

            {error && (
              <div
                role="alert"
                className={cm.cn(cm.sp('mt', 6), cm.sp('p', 4))}
                style={{
                  borderRadius: '12px',
                  background: 'color-mix(in srgb, var(--mol-color-error) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--mol-color-error) 28%, transparent)',
                  color: 'var(--embark-status-overdue)',
                  fontSize: '13px',
                }}
              >
                {error}
              </div>
            )}

            <div className={cm.sp('mt', 8)}>{children}</div>

            {footer && (
              <div className={cm.cn(cm.sp('mt', 8), cm.textCenter, cm.textMuted, 'text-sm')}>
                {footer}
              </div>
            )}

            <div
              className={cm.cn(
                cm.sp('mt', 6),
                cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'sm' }),
                cm.textMuted,
              )}
            >
              <LegalModalLinks
                linkClassName={legalLinkClass}
                appName={APP_NAME}
                loadContent={loadContent}
                privacyLabel={t('nav.privacy', {}, { defaultValue: 'Privacy' })}
                termsLabel={t('nav.terms', {}, { defaultValue: 'Terms' })}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
