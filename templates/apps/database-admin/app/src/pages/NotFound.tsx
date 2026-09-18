import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CommandHint } from '../components/CommandHint.js'
import { QuarryBrandMark } from '../components/QuarryBrandMark.js'

/**
 * Quarry 404 — terminal-aesthetic centered card mirroring the auth shell
 * decoration (green/cyan glow + dark Quarry surface) so a wrong URL still
 * lands the user in the brand.
 *
 * Translated from catalog §16 (Empty State) recipe with the
 * api-documentation Prism-dark monospace 404 pattern noted in the polish
 * prompt for dev-tools apps.
 */
export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div
      className={cm.cn(
        'relative flex min-h-screen items-center justify-center overflow-hidden bg-background font-body antialiased',
      )}
    >
      <div className="glow-green" aria-hidden="true" />
      <div className="glow-cyan" aria-hidden="true" />

      <main
        className={cm.cn(
          'relative z-10 mx-6 flex w-full max-w-md flex-col items-center gap-6 rounded-lg border border-border bg-surface p-10 text-center shadow-2xl',
        )}
      >
        <QuarryBrandMark size="md" />

        <div
          aria-hidden="true"
          className={cm.cn('font-mono text-7xl font-black tracking-tighter text-primary')}
          style={{
            textShadow: '0 0 24px color-mix(in srgb, var(--color-primary) 35%, transparent)',
          }}
        >
          404
        </div>

        <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
          <h1 className={cm.cn('font-headline text-xl font-semibold text-text')}>
            {t('notFound.heading', {}, { defaultValue: 'Query returned no rows' })}
          </h1>
          <p className={cm.cn('font-mono text-sm text-muted')}>
            {t(
              'notFound.subheading',
              {},
              { defaultValue: 'This route is not part of any pinned connection.' },
            )}
          </p>
        </div>

        <pre
          className={cm.cn(
            'w-full overflow-x-auto rounded border border-border bg-bg p-3 text-left font-mono text-[12px] text-muted',
          )}
        >
          <code>
            <span className={cm.cn('text-sql-keyword')}>SELECT</span>{' '}
            <span className={cm.cn('text-sql-column')}>route</span>{' '}
            <span className={cm.cn('text-sql-keyword')}>FROM</span>{' '}
            <span className={cm.cn('text-sql-table')}>app.routes</span>
            {'\n'}
            <span className={cm.cn('text-sql-keyword')}>WHERE</span>{' '}
            <span className={cm.cn('text-sql-column')}>path</span> ={' '}
            <span
              className={cm.cn('text-sql-string')}
            >{`'${typeof window !== 'undefined' ? window.location.pathname : '/'}'`}</span>
            ;
          </code>
        </pre>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap justify-center')}>
          <Link
            to="/connections"
            className={cm.cn(
              'inline-flex h-9 items-center gap-2 rounded bg-primary px-4 font-headline font-bold text-on-primary',
              'transition-colors hover:bg-primary/90',
            )}
          >
            {t('notFound.goConnections', {}, { defaultValue: 'Go to connections' })}
            <CommandHint size="xs">⌘1</CommandHint>
          </Link>
          <Link
            to="/history"
            className={cm.cn(
              'inline-flex h-9 items-center gap-2 rounded border border-border bg-surface2 px-4 font-headline text-sm text-text',
              'transition-colors hover:bg-surface',
            )}
          >
            {t('notFound.goQueries', {}, { defaultValue: 'Recent queries' })}
            <CommandHint size="xs">⌘H</CommandHint>
          </Link>
        </div>
      </main>
    </div>
  )
}

export default NotFound
