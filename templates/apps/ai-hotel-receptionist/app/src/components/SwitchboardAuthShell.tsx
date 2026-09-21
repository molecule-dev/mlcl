/**
 * Brand-panel auth shell for Switchboard. Ops flavor: a deep-teal brand
 * panel on the left (app mark, the multilingual pitch, a sample greeting in
 * several languages) + a centered form card on the right. Collapses to one
 * column under `lg`.
 *
 * Used by Login / Signup / ForgotPassword / ResetPassword.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useLegalModals } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker } from '@molecule/app-ui-react'

import { APP_NAME } from '../branding.js'
import { loadContent } from '../config.js'
import { ThemeToggle } from './ThemeToggle.js'

interface SwitchboardAuthShellProps {
  eyebrow: string
  heading: string
  subheading: string
  children: ReactNode
  footer?: ReactNode
}

/** Greetings the voice agent actually speaks — the brand panel's texture. */
const SAMPLE_GREETINGS: ReadonlyArray<{ lang: string; text: string }> = [
  { lang: 'EN', text: 'Thank you for calling — how may I help you?' },
  { lang: 'ES', text: 'Gracias por llamar — ¿en qué puedo ayudarle?' },
  { lang: 'FR', text: 'Merci de votre appel — comment puis-je vous aider ?' },
  { lang: 'DE', text: 'Danke für Ihren Anruf — wie kann ich helfen?' },
  { lang: '中文', text: '感谢来电 — 请问有什么可以帮您？' },
  { lang: '日本語', text: 'お電話ありがとうございます — ご用件をどうぞ' },
]

export function SwitchboardAuthShell({
  eyebrow,
  heading,
  subheading,
  children,
  footer,
}: SwitchboardAuthShellProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { openPrivacy, openTerms, modals } = useLegalModals({ appName: APP_NAME, loadContent })
  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        'bg-background text-on-surface antialiased flex flex-col',
      )}
    >
      {/* Slim top header */}
      <header
        className={cm.cn('border-b border-outline-variant/40 bg-surface/95 backdrop-blur-md')}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.sp('px', 6),
            cm.sp('py', 4),
            cm.flex({ align: 'center', justify: 'between' }),
            cm.mxAuto,
          )}
        >
          <Link
            to="/"
            className={cm.flex({ align: 'center', gap: 'sm' })}
            data-mol-id="auth-brand-home"
          >
            <span
              className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-primary')}
              aria-hidden="true"
            >
              <span className="material-symbols-outlined">support_agent</span>
            </span>
            <span className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'text-primary')}>
              {APP_NAME}
            </span>
          </Link>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            <LanguagePicker display="icon" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Split body */}
      <div className={cm.cn('flex-1 grid grid-cols-1 lg:grid-cols-2')}>
        {/* Brand panel */}
        <aside
          className={cm.cn('relative hidden lg:block bg-primary text-on-primary overflow-hidden')}
        >
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary/95 via-primary-container/90 to-primary/85',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.w(96),
              cm.h(96),
              cm.roundedFull,
              'absolute -right-24 -top-24 bg-accent/20 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.w(64),
              cm.h(64),
              cm.roundedFull,
              'absolute -left-16 -bottom-16 bg-surface/10 blur-3xl',
            )}
            aria-hidden="true"
          />

          <div
            className={cm.cn(
              'relative z-10 h-full',
              cm.sp('p', 12),
              cm.flex({ direction: 'col', justify: 'between' }),
            )}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-[0.25em] text-tertiary',
                )}
              >
                {t(
                  'switchboardAuthShell.brand.eyebrow',
                  {},
                  { defaultValue: 'Every call answered, in every language' },
                )}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('bold'),
                  cm.sp('mt', 4),
                  'leading-tight text-white',
                )}
              >
                {t(
                  'switchboardAuthShell.brand.heading',
                  {},
                  {
                    defaultValue:
                      'The AI receptionist that picks up in the caller\u2019s own language — and books the room on the same call.',
                  },
                )}
              </h2>
            </div>

            {/* Sample greetings in the agent's languages */}
            <figure
              className={cm.cn(
                cm.sp('p', 6),
                'bg-surface/15 backdrop-blur-xl rounded-2xl ring-1 ring-white/20',
              )}
              aria-label={t(
                'switchboardAuthShell.brand.sampleGreetingLabel',
                {},
                { defaultValue: 'Sample agent greetings' },
              )}
            >
              <span
                className="material-symbols-outlined text-3xl text-tertiary"
                aria-hidden="true"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                graphic_eq
              </span>
              <ul className={cm.cn(cm.sp('mt', 3), cm.flex({ direction: 'col', gap: 'xs' }))}>
                {SAMPLE_GREETINGS.map((g) => (
                  <li key={g.lang} className={cm.cn(cm.textSize('sm'), 'text-white/90')}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'uppercase tracking-widest text-tertiary',
                      )}
                    >
                      {g.lang}
                    </span>{' '}
                    {g.text}
                  </li>
                ))}
              </ul>
            </figure>
          </div>
        </aside>

        {/* Form panel */}
        <main
          className={cm.cn('flex items-center justify-center', cm.sp('px', 6), cm.sp('py', 12))}
        >
          <div className={cm.cn(cm.w('full'), cm.maxW('md'))}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'uppercase tracking-[0.25em] text-primary',
              )}
            >
              {eyebrow}
            </p>
            <h1
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('bold'),
                cm.sp('mt', 2),
                'leading-tight',
              )}
            >
              {heading}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mt', 3),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {subheading}
            </p>

            <div className={cm.sp('mt', 8)}>{children}</div>

            {footer ? (
              <div className={cm.cn(cm.sp('mt', 8), cm.textSize('sm'), cm.textCenter)}>
                {footer}
              </div>
            ) : null}

            <div
              className={cm.cn(
                cm.sp('mt', 8),
                cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
                cm.textSize('xs'),
                'text-on-surface-variant',
              )}
            >
              <button
                type="button"
                onClick={openPrivacy}
                className={'-my-2 inline-block py-2 hover:text-primary transition-colors'}
                data-mol-id="auth-privacy-link"
              >
                {t('nav.privacy', {}, { defaultValue: 'Privacy' })}
              </button>
              <button
                type="button"
                onClick={openTerms}
                className={'-my-2 inline-block py-2 hover:text-primary transition-colors'}
                data-mol-id="auth-terms-link"
              >
                {t('nav.terms', {}, { defaultValue: 'Terms' })}
              </button>
            </div>
          </div>
        </main>
      </div>
      {modals}
    </div>
  )
}
