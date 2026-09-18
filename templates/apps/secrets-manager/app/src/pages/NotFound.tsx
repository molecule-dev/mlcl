import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ArcanumBrandMark } from '../components/ArcanumBrandMark.js'

/**
 * Arcanum 404 — terminal-aesthetic centered card mirroring the auth
 * shell's emerald + violet glow, with a syntax-highlighted "secret not
 * found" diagnostic instead of generic copy.
 *
 * Translated from database-admin's NotFound.tsx (catalog §16 empty-state
 * recipe + dev-tools mono diagnostic block) into Arcanum's idiom.
 */
export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'

  return (
    <div
      className={cm.cn(
        'relative flex min-h-screen items-center justify-center overflow-hidden bg-background font-body antialiased',
      )}
    >
      <div className="glow-emerald" aria-hidden="true" />
      <div className="glow-violet" aria-hidden="true" />

      <main
        className={cm.cn(
          'relative z-10 mx-6 flex w-full max-w-md flex-col items-center gap-6 rounded-xl border border-border bg-surface p-10 text-center shadow-2xl',
        )}
      >
        <ArcanumBrandMark size="md" />

        <div
          aria-hidden="true"
          className={cm.cn('font-mono text-7xl font-black tracking-tighter text-primary')}
          style={{ textShadow: '0 0 28px rgba(0, 217, 146, 0.35)' }}
        >
          404
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <h1 className={cm.cn('font-headline text-xl font-semibold text-text')}>
            {t('notFound.heading', {}, { defaultValue: 'Secret not found in this scope' })}
          </h1>
          <p className={cm.cn('font-mono text-sm text-muted')}>
            {t(
              'notFound.subheading',
              {},
              { defaultValue: 'This route is not bound to any active vault.' },
            )}
          </p>
        </div>

        <pre
          className={cm.cn(
            'w-full overflow-x-auto rounded border border-border bg-background p-3 text-left font-mono text-[12px] text-muted',
          )}
        >
          <code>
            <span className={cm.cn('text-primary')}>arcanum</span>{' '}
            <span className={cm.cn('text-text')}>secrets read</span>{' '}
            <span className={cm.cn('text-secret-inherited')}>{path}</span>
            {'\n'}
            <span className={cm.cn('text-error')}>
              ✗ ARC_E404 · path "{path}" is not part of any vault you can read.
            </span>
          </code>
        </pre>

        <div className={cm.cn('flex flex-wrap items-center justify-center gap-2')}>
          <Link
            to="/vaults"
            className={cm.cn(
              'inline-flex h-9 items-center gap-2 rounded bg-primary px-4 font-headline text-sm font-bold text-on-primary transition-colors hover:bg-primary/90',
            )}
          >
            {t('notFound.goVaults', {}, { defaultValue: 'Go to vaults' })}
            <span
              aria-hidden="true"
              className="material-symbols-outlined"
              style={{ fontSize: '0.875rem' }}
            >
              arrow_forward
            </span>
          </Link>
          <Link
            to="/audit"
            className={cm.cn(
              'inline-flex h-9 items-center gap-2 rounded border border-border bg-surface px-4 font-headline text-sm text-text transition-colors hover:border-primary hover:text-primary',
            )}
          >
            {t('notFound.goAudit', {}, { defaultValue: 'Recent audit' })}
          </Link>
        </div>
      </main>
    </div>
  )
}

export default NotFound
