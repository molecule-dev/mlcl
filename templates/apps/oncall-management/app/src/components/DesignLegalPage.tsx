import { type JSX, type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Footer } from './Footer.js'

const CONTENT_KEY: Record<'privacy' | 'terms', string> = {
  privacy: 'content.privacyPolicy',
  terms: 'content.termsOfService',
}

const MODULE: Record<'privacy' | 'terms', 'privacyPolicy' | 'termsOfService'> = {
  privacy: 'privacyPolicy',
  terms: 'termsOfService',
}

interface DesignLegalPageProps {
  /** Which bonded document the "full policy" block renders. */
  kind: 'privacy' | 'terms'
  /**
   * Lazy-loader for the bonded legal HTML (pass `loadContent` from the
   * app's `src/config.ts`). Required — without it the full-policy block
   * renders empty, out of sync with the footer modal.
   */
  loadContent: (key: 'privacyPolicy' | 'termsOfService') => Promise<void> | void
  /** i18n key for the page hero title. */
  titleKey: string
  /** English fallback for the hero title. */
  titleDefault: string
  /** i18n key for the hero intro paragraph. */
  introKey: string
  /** English fallback for the intro paragraph. */
  introDefault: string
  /** The design's commitment sections (headings h2 + real copy). */
  children: ReactNode
  /** i18n key for the closing CTA heading. */
  ctaKey: string
  /** English fallback for the closing CTA heading. */
  ctaDefault: string
  /** i18n key for the closing CTA body. */
  ctaBodyKey: string
  /** English fallback for the closing CTA body. */
  ctaBodyDefault: string
}

/**
 * Shared shell for the design-shaped Privacy / Terms pages: the design's
 * section stack, then the SAME bonded legal HTML the footer modal shows
 * (one source of legal copy, two surfaces), then the closing CTA.
 */
export function DesignLegalPage({
  kind,
  loadContent,
  titleKey,
  titleDefault,
  introKey,
  introDefault,
  children,
  ctaKey,
  ctaDefault,
  ctaBodyKey,
  ctaBodyDefault,
}: DesignLegalPageProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Re-render once the bonded content has been registered for the current
  // locale so `t(content.*)` resolves to the real HTML.
  const [, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.resolve(loadContent(MODULE[kind])).then(
      () => {
        if (!cancelled) setReady(true)
      },
      () => {
        if (!cancelled) setReady(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [loadContent, kind])

  const html = t(CONTENT_KEY[kind], {}, { defaultValue: '' })
  const card = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
  }

  return (
    <ContentPageShell
      dataMolId={`page-${kind}`}
      footer={<Footer />}
      eyebrow={t('nav.legal', {}, { defaultValue: 'Legal & trust' })}
      title={t(titleKey, {}, { defaultValue: titleDefault })}
      subtitle={t(introKey, {}, { defaultValue: introDefault })}
      containerSize="lg"
    >
      <div className={cm.cn('max-w-4xl mx-auto space-y-10 py-4')}>
        {children}

        {/* The bonded legal document — same copy as the footer modal */}
        <section
          data-mol-id={`${kind}-full-policy`}
          className={cm.cn('rounded-2xl p-6')}
          style={card}
        >
          <h2
            className={cm.cn('text-lg font-bold tracking-tight mb-4')}
            style={{ color: 'var(--color-text)' }}
          >
            {t(
              `${kind}.fullPolicyHeading` as 'privacy.fullPolicyHeading',
              {},
              { defaultValue: 'Full legal policy' },
            )}
          </h2>
          <div className={cm.cn('prose max-w-none')} dangerouslySetInnerHTML={{ __html: html }} />
        </section>

        {/* Closing CTA */}
        <section
          data-mol-id={`${kind}-cta`}
          className={cm.cn('rounded-2xl p-8 text-center')}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 35%, transparent)',
          }}
        >
          <h2
            className={cm.cn('text-2xl font-extrabold tracking-tight')}
            style={{ color: 'var(--color-text)' }}
          >
            {t(ctaKey, {}, { defaultValue: ctaDefault })}
          </h2>
          <p
            className={cm.cn('text-sm mt-2 max-w-2xl mx-auto')}
            style={{ color: 'color-mix(in srgb, var(--color-text) 62%, transparent)' }}
          >
            {t(ctaBodyKey, {}, { defaultValue: ctaBodyDefault })}
          </p>
          <Link
            to="/signup"
            data-mol-id={`${kind}-cta-start`}
            className={cm.cn(
              'inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-md font-mono text-sm font-bold uppercase tracking-widest hover:opacity-90',
            )}
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            {t('legal.ctaStart', {}, { defaultValue: 'Start 14-day free trial' })}
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default DesignLegalPage
